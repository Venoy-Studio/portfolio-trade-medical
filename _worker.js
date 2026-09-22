// Cloudflare Pages Advanced Mode Worker for Trade Medical
// Handles: /_next/image proxy, /api/busca, /api/representante, pretty URLs and static asset fallback

let catalogoCache = null;
let repsCache = null;

async function getCatalogo(env, request) {
  if (!catalogoCache) {
    try {
      const res = await env.ASSETS.fetch(new URL('/data/catalogo.json', request.url));
      catalogoCache = await res.json();
    } catch (e) {
      catalogoCache = [];
    }
  }
  return catalogoCache;
}

async function getRepsData(env, request) {
  if (!repsCache) {
    try {
      const res = await env.ASSETS.fetch(new URL('/data/representantes.json', request.url));
      repsCache = await res.json();
    } catch (e) {
      repsCache = { representantes: [] };
    }
  }
  return repsCache;
}

function normalize(str) {
  return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Next.js image optimizer handler: /_next/image?url=...
    if (pathname === '/_next/image') {
      const targetUrl = url.searchParams.get('url');
      if (targetUrl) {
        const decoded = decodeURIComponent(targetUrl).split('?')[0];
        const cleanPath = decoded.startsWith('/') ? decoded : `/${decoded}`;
        const assetUrl = new URL(cleanPath, request.url);
        const response = await env.ASSETS.fetch(new Request(assetUrl, request));
        if (response.ok) {
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
          return new Response(response.body, {
            status: response.status,
            headers: newHeaders
          });
        }
      }
    }

    // 2. API de Busca (/api/busca?q=...)
    if (pathname === '/api/busca') {
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      if (q.length < 2) {
        return Response.json({ items: [] });
      }
      const catalogo = await getCatalogo(env, request);
      const queryNorm = normalize(q);
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
      return Response.json({ items: results.slice(0, 6) });
    }

    // 3. API de Representantes (/api/representante?uf=...&cidade=...)
    if (pathname === '/api/representante') {
      const uf = (url.searchParams.get('uf') || '').trim().toUpperCase();
      const cidade = (url.searchParams.get('cidade') || '').trim();
      const origem = url.searchParams.get('origem') || 'selecao_manual';

      if (!uf) {
        return Response.json({ error: 'UF obrigatória' }, { status: 400 });
      }

      const repsData = await getRepsData(env, request);
      let matchedRep = null;
      let motivo = 'uf';

      if (cidade) {
        const cidadeNorm = normalize(cidade);
        matchedRep = (repsData.representantes || []).find(
          (r) =>
            r.ufsAtendidas.includes(uf) &&
            r.cidadesAtendidas &&
            r.cidadesAtendidas.some((c) => normalize(c) === cidadeNorm)
        );
        if (matchedRep) motivo = 'cidade';
      }

      if (!matchedRep) {
        matchedRep = (repsData.representantes || []).find((r) => r.ufsAtendidas.includes(uf));
        motivo = 'uf';
      }

      if (matchedRep) {
        return Response.json({
          representante: matchedRep,
          motivo,
          localizacao: {
            cidade: cidade || null,
            uf,
            origem
          }
        });
      }

      return Response.json({
        representante: null,
        motivo: 'fallback_comercial',
        localizacao: {
          cidade: cidade || null,
          uf,
          origem
        }
      });
    }

    // 4. RSC Payloads (Next.js server-components payloads)
    const isRsc = request.headers.get('rsc') === '1' || url.searchParams.has('_rsc');
    if (isRsc) {
      const cleanPath = pathname.replace(/\/$/, '') || '/index';
      const rscUrl = new URL(`/rsc${cleanPath}.rsc`, request.url);
      const rscRes = await env.ASSETS.fetch(new Request(rscUrl, request));
      if (rscRes.ok) {
        const headers = new Headers(rscRes.headers);
        headers.set('Content-Type', 'text/x-component; charset=utf-8');
        return new Response(rscRes.body, { status: 200, headers });
      }
    }

    // 5. Pretty URLs (e.g. /empresa -> /empresa.html)
    if (!pathname.includes('.') && pathname !== '/') {
      const htmlUrl = new URL(pathname.replace(/\/$/, '') + '.html', request.url);
      const htmlRes = await env.ASSETS.fetch(new Request(htmlUrl, request));
      if (htmlRes.ok) {
        return htmlRes;
      }
    }

    // 6. Fallback para static assets do Cloudflare Pages
    return env.ASSETS.fetch(request);
  }
};
