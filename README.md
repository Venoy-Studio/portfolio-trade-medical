# Trade Medical — Clone Exato

Clone completo, 100% idêntico e funcional do site [Trade Medical](https://trade-medical.vercel.app/).

## 📋 Recursos Incluídos

- **75 Páginas Pré-renderizadas**:
  - Início (`/`)
  - Catálogo de Produtos (`/produtos`)
  - Monte sua Cotação / Carrinho (`/cotacao`)
  - Representantes Comerciais (`/representantes`)
  - Empresa (`/empresa`)
  - Contato (`/contato`)
  - Trabalhe Conosco (`/trabalhe-conosco`)
  - Política de Privacidade (`/politica-de-privacidade`)
  - 8 Páginas de Categorias (`/categorias/*`)
  - 8 Páginas de Marcas Parceiras (`/marcas/*`)
  - 50 Páginas Detalhadas de Produtos (`/produtos/*`) com especificações técnicas e regularização ANVISA
- **Todos os Assets Estáticos**:
  - 71 imagens e banners em alta definição (`/banners/*`, `/marcas/*`, `/marca/*`, `icon.svg`)
  - Estilos CSS completos com Tailwind
  - Fontes originais IBM Plex Sans e IBM Plex Mono
  - Todos os chunks JavaScript originais
- **APIs Nativas e Interatividade**:
  - `/_next/image`: Servidor de imagens otimizadas para carregamento rápido
  - `/api/busca`: Autocomplete em tempo real com busca textual em todos os 50 produtos
  - `/api/representante`: Consulta regional por UF e Cidade com dados de todas as 6 regiões atendidas
  - Carrinho de cotação interativo com adição/remoção de itens e geração de cotação via WhatsApp
  - Suporte a navegação instantânea client-side com React Server Components (`RSC: 1`)

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js instalado (v18+)

### Instalação e Execução

1. Instale as dependências:
```bash
npm install
```

2. Inicie o servidor:
```bash
npm start
# ou
npm run dev
```

3. Abra no seu navegador:
```
http://localhost:3000
```
*(Caso a porta 3000 já esteja em uso por outro aplicativo, o servidor detectará automaticamente e subirá na porta 3001).*
