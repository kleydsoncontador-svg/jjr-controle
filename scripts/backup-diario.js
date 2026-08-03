// Backup diário automático de dados_app (Supabase) — roda via GitHub Actions,
// sem depender de nenhum PC ligado. Usa a service_role key (bypassa RLS, lê
// tudo) e grava em <pastaDestino>/AAAA-MM/backup_AAAA-MM-DD.json — um arquivo
// por dia, nunca sobrescreve os anteriores.
//
// Variáveis de ambiente necessárias:
//   SUPABASE_URL              (opcional — usa o projeto real da JJR por padrão)
//   SUPABASE_SERVICE_ROLE_KEY (obrigatória — Supabase Dashboard → Project Settings → API)
//   BACKUP_DEST_DIR           (opcional — pasta onde salvar; padrão: ./backups)

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hzotkhxmvausugzfkgbf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEST_DIR = process.env.BACKUP_DEST_DIR || path.join(__dirname, '..', 'backups');

async function main() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('🔄 Buscando todos os registros de dados_app...');
  const { data, error } = await supabase.from('dados_app').select('*');
  if (error) {
    console.error('❌ Erro ao buscar dados:', error);
    process.exit(1);
  }

  const agora = new Date();
  const ano = agora.getUTCFullYear();
  const mes = String(agora.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(agora.getUTCDate()).padStart(2, '0');

  const pastaMes = path.join(DEST_DIR, `${ano}-${mes}`);
  fs.mkdirSync(pastaMes, { recursive: true });
  const arquivo = path.join(pastaMes, `backup_${ano}-${mes}-${dia}.json`);

  const backup = {
    timestamp: agora.toISOString(),
    total_registros: data.length,
    dados: data,
  };
  fs.writeFileSync(arquivo, JSON.stringify(backup, null, 2), 'utf8');

  const tamanho = (fs.statSync(arquivo).size / 1024).toFixed(2);
  console.log(`✅ Backup criado: ${arquivo} (${tamanho} KB, ${data.length} registros)`);
}

main();
