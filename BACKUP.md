# 📁 Sistema de Backup Automático Diário

## Como funciona

O backup roda sozinho, todos os dias, no **GitHub Actions** — não depende de
nenhum PC ligado nem de ninguém abrir o servidor local. Ele lê todos os
registros da tabela `dados_app` (Supabase) e salva num repositório **privado**
separado (não é o mesmo do site, que é público — assim os dados reais dos
clientes nunca ficam expostos).

- **Repositório dos backups**: `kleydsoncontador-svg/jjr-controle-backups` (privado)
- **Horário**: todo dia às 03:00 (horário de Brasília)
- **Formato dos arquivos**: `AAAA-MM/backup_AAAA-MM-DD.json` — uma pasta por
  mês, um arquivo por dia. **Nada é sobrescrito**: cada dia fica guardado
  pra sempre, dá pra voltar a qualquer data anterior.
- **Também dá pra rodar na hora**: no repositório do site, aba **Actions** →
  workflow **"Backup diário do banco de dados"** → botão **"Run workflow"**.

## Configuração necessária (só uma vez)

Pra esse sistema funcionar, dois segredos precisam estar cadastrados no
repositório do site (`jjr-controle` → Settings → Secrets and variables →
Actions → New repository secret):

1. **`SUPABASE_SERVICE_ROLE_KEY`** — a chave de administrador do Supabase
   (bypassa as regras de segurança pra conseguir ler tudo). Pegue em:
   Supabase Dashboard → seu projeto → Project Settings → API →
   "service_role" (não é a mesma chave pública "anon" usada pelo site).
   ⚠ Essa chave é sensível — nunca cole ela em nenhum arquivo do código,
   só no campo de secret do GitHub.

2. **`BACKUP_REPO_TOKEN`** — um Personal Access Token do GitHub com permissão
   de escrita só no repositório `jjr-controle-backups`. Gere em:
   GitHub → foto de perfil → Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token →
   selecione o repositório `jjr-controle-backups` → permissão
   "Contents: Read and write".

## Restaurar um backup

1. Acesse `github.com/kleydsoncontador-svg/jjr-controle-backups` (repositório
   privado).
2. Entre na pasta do mês e baixe o arquivo `backup_AAAA-MM-DD.json` do dia
   desejado.
3. O arquivo tem um campo `dados`, que é a lista de registros exatamente como
   estavam na tabela `dados_app` naquele dia — cada um com `key` e `value`.
4. Restaurar de volta no Supabase é uma operação manual e cuidadosa (não é
   automática de propósito, pra sempre ter uma revisão humana antes de
   sobrescrever dados em produção). Peça ajuda ao Claude Code quando precisar.

---

**Nota histórica**: existia antes um sistema de backup horário local
(`backup.js`, salvando em `C:\jjr-controle\backups\`), mas ele apontava pra
um projeto Supabase errado e só rodava enquanto alguém tivesse o servidor
local aberto — na prática, quase nunca protegeu os dados reais. Foi
substituído por este sistema em 2026-07-31.
