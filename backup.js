// Script de Backup Automático - Supabase → JSON Local
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zzkyjyaxxutszovtfkkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6a3lqeWF4eHV0c3pvdnRma2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2NzI5OTAsImV4cCI6MjA0NjI0ODk5MH0.RZxmR5r1xO3tAl2dVEIvDGo-7SZM7UhDqfJoV6kzr0o';

const supabase = createClient(supabaseUrl, supabaseKey);
const backupDir = path.join(__dirname, 'backups');

async function criarBackup() {
  try {
    console.log('🔄 Iniciando backup...');

    // Buscar todos os dados da tabela dados_app
    const { data, error } = await supabase
      .from('dados_app')
      .select('*');

    if (error) {
      console.error('❌ Erro ao buscar dados:', error);
      return;
    }

    // Criar nome do arquivo com data
    const hoje = new Date().toISOString().split('T')[0];
    const nomeArquivo = `backup_${hoje}.json`;
    const caminhoCompleto = path.join(backupDir, nomeArquivo);

    // Preparar dados com metadados
    const backup = {
      timestamp: new Date().toISOString(),
      data_backup: hoje,
      total_registros: data.length,
      dados: data
    };

    // Salvar arquivo
    fs.writeFileSync(caminhoCompleto, JSON.stringify(backup, null, 2), 'utf8');

    const tamanho = (fs.statSync(caminhoCompleto).size / 1024).toFixed(2);
    console.log(`✅ Backup criado: ${nomeArquivo} (${tamanho} KB)`);
    console.log(`📁 Localização: ${caminhoCompleto}`);
    console.log(`📊 Total de registros: ${data.length}`);

    // Limpeza: manter apenas últimos 30 backups
    limparBackupsAntigos(30);

  } catch (err) {
    console.error('❌ Erro no backup:', err.message);
  }
}

function limparBackupsAntigos(diasRetencao) {
  try {
    const arquivos = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => ({
        nome: f,
        caminho: path.join(backupDir, f),
        data: fs.statSync(path.join(backupDir, f)).mtime
      }))
      .sort((a, b) => b.data - a.data);

    // Remover backups com mais de diasRetencao dias
    const agora = Date.now();
    arquivos.forEach(arquivo => {
      const idadeDias = (agora - arquivo.data.getTime()) / (1000 * 60 * 60 * 24);
      if (idadeDias > diasRetencao) {
        fs.unlinkSync(arquivo.caminho);
        console.log(`🗑️  Backup antigo removido: ${arquivo.nome}`);
      }
    });
  } catch (err) {
    console.error('⚠️  Erro na limpeza:', err.message);
  }
}

// Se executado diretamente
if (require.main === module) {
  criarBackup();
}

module.exports = { criarBackup };
