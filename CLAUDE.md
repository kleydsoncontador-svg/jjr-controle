# JJR Controle Contábil

Sistema web de controle contábil para a JJR Organização Contábil.

## Estrutura do projeto

- `index.html` — página principal com sidebar e todos os módulos (arquivo grande, HTML/CSS/JS inline)
- `composicao.html` — módulo Composição de Saldos (carregado via iframe no index.html)
- `serve.js` — servidor HTTP Node.js local (porta 3000)
- `supabase-config.js` — configuração do cliente Supabase
- `supabase-schema.sql` — schema do banco de dados

## Como rodar

```
node serve.js
```
Acesse: http://localhost:3000

Ou clique duas vezes em `INICIAR_SERVER.bat`.

Node.js instalado em: `C:\Program Files\nodejs\node.exe` (v24.17.0)

## Stack

- Frontend: HTML + CSS + JavaScript puro (sem framework)
- Banco de dados: Supabase (PostgreSQL via API REST)
- Servidor local: Node.js (serve.js) — necessário para evitar CORS com iframe

## Localização do projeto

`C:\Users\Pichau\OneDrive - JJR ORGANIZACAO CONTABIL S S\Depto. Contábil\Site-JJR\jjr-controle\`

## Observações

- O `index.html` é um arquivo extenso com todo CSS e JS inline — ao editar, usar busca por palavras-chave
- O módulo `composicao.html` é embutido via `<iframe>` dentro do `index.html`
- Sem build step — editar os arquivos e recarregar o browser já reflete as mudanças
- Git repo conectado ao GitHub: `kleydsoncontador-svg/jjr-controle`
