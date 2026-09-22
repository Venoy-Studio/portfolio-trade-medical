const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3333;

// Carregar catálogo de produtos e base de representantes
const getCatalogo = () => {
  const catalogoPath = path.join(__dirname, 'data', 'catalogo.json');
  return fs.existsSync(catalogoPath) ? JSON.parse(fs.readFileSync(catalogoPath, 'utf8')) : [];
};

const getRepsData = () => {
  const repsPath = path.join(__dirname, 'data', 'representantes.json');
  return fs.existsSync(repsPath) ? JSON.parse(fs.readFileSync(repsPath, 'utf8')) : { representantes: [] };
};

// 1. Servir arquivos estáticos de _next/static
app.use('/_next/static', express.static(path.join(__dirname, '_next', 'static'), {
  maxAge: '365d',
  immutable: true
}));

// 2. Servir arquivos públicos (/banners, /marcas, /marca, icon.svg, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// 3. Handler do otimizador de imagens Next.js (/_next/image)
app.get('/_next/image', (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).send('Missing url parameter');
  }

  const decodedUrl = decodeURIComponent(imageUrl).split('?')[0];
  const localFilePath = path.join(__dirname, 'public', decodedUrl.replace(/^\//, ''));

  if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile()) {
    const ext = path.extname(localFilePath).toLowerCase();
    const mimeTypes = {
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.ico': 'image/x-icon'
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return fs.createReadStream(localFilePath).pipe(res);
  }

  // Fallback 404
  res.status(404).send('Image not found');
});

// 4. API de Busca (/api/busca?q=...)
app.get('/api/busca', (req, res) => {
  const q = (req.query.q || '').toString().trim().toLowerCase();
  if (q.length < 2) {
    return res.json({ items: [] });
  }

  const normalize = (str) =>
    str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

  const queryNorm = normalize(q);
  const catalogo = getCatalogo();

  const results = catalogo.filter((p) => {
    const nomeNorm = normalize(p.nome);
    const skuNorm = normalize(p.sku);
    const marcaNorm = normalize(p.marca);
    const slugNorm = normalize(p.slug);

    return (
      nomeNorm.includes(queryNorm) ||
      skuNorm.includes(queryNorm) ||
      marcaNorm.includes(queryNorm) ||
      slugNorm.includes(queryNorm)
    );
  });

  res.json({ items: results.slice(0, 6) });
});

// 5. API de Representantes (/api/representante?uf=...&cidade=...)
app.get('/api/representante', (req, res) => {
  const uf = (req.query.uf || '').toString().trim().toUpperCase();
  const cidade = (req.query.cidade || '').toString().trim();
  const origem = (req.query.origem || 'selecao_manual').toString();

  if (!uf) {
    return res.status(400).json({ error: 'UF obrigatória' });
  }

  const normalize = (str) =>
    str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

  let matchedRep = null;
  let motivo = 'uf';

  const repsData = getRepsData();

  // Se cidade foi informada, buscar representante específico para a cidade
  if (cidade) {
    const cidadeNorm = normalize(cidade);
    matchedRep = repsData.representantes.find(
      (r) =>
        r.ufsAtendidas.includes(uf) &&
        r.cidadesAtendidas &&
        r.cidadesAtendidas.some((c) => normalize(c) === cidadeNorm)
    );
    if (matchedRep) {
      motivo = 'cidade';
    }
  }

  // Se não achou por cidade, buscar representante padrão da UF
  if (!matchedRep) {
    matchedRep = repsData.representantes.find((r) => r.ufsAtendidas.includes(uf));
    motivo = 'uf';
  }

  if (matchedRep) {
    return res.json({
      representante: matchedRep,
      motivo,
      localizacao: {
        cidade: cidade || null,
        uf,
        origem
      }
    });
  }

  // Fallback comercial para estados sem representante exclusivo
  res.json({
    representante: null,
    motivo: 'fallback_comercial',
    localizacao: {
      cidade: cidade || null,
      uf,
      origem
    }
  });
});

// 6. Roteador de Páginas Pré-renderizadas e RSC Payloads
app.get('*', (req, res, next) => {
  // Ignorar arquivos estáticos com extensão que já deveriam ter sido pegos
  if (path.extname(req.path)) {
    return next();
  }

  const isRsc = req.headers['rsc'] === '1' || req.query._rsc !== undefined;
  let cleanPath = req.path.replace(/\/$/, '');
  if (cleanPath === '') {
    cleanPath = '/index';
  }

  const relativePath = cleanPath.replace(/^\//, '');

  if (isRsc) {
    const rscPath = path.join(__dirname, 'rsc', `${relativePath}.rsc`);
    if (fs.existsSync(rscPath)) {
      res.setHeader('Content-Type', 'text/x-component; charset=utf-8');
      return res.sendFile(rscPath);
    }
  }

  const htmlPath = path.join(__dirname, 'pages', `${relativePath}.html`);
  if (fs.existsSync(htmlPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(htmlPath);
  }

  // Fallback 404
  res.status(404).send('Página não encontrada');
});

// Iniciar servidor com fallback caso a porta padrão esteja em uso
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Trade Medical Clone rodando com sucesso!`);
    console.log(`🌐 Acesse no navegador: http://localhost:${port}`);
    console.log(`=======================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Porta ${port} em uso, tentando porta ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Erro no servidor:', err);
    }
  });
}

startServer(Number(PORT));
