# 📁 Sistema de Backup Automático

## Localização dos Backups
```
C:\jjr-controle\backups\
```

## Como Funciona

✅ **Automático**: Executa diariamente às 02:00 (madrugada)
✅ **Formato**: JSON com todos os dados da Supabase
✅ **Nomeação**: `backup_YYYY-MM-DD.json` (um por dia)
✅ **Retenção**: Mantém últimos 30 dias automaticamente
✅ **Execução Extra**: Primeiro backup 5 minutos após servidor iniciar

## Sincronizar com OneDrive

### Opção 1: Sincronização Automática (RECOMENDADO)

1. Abra **Explorador de Arquivos**
2. Navegue para `C:\jjr-controle\backups\`
3. Clique com botão direito → **Enviar para** → **OneDrive**
4. A pasta agora sincroniza automaticamente!

### Opção 2: Adicionar ao OneDrive manualmente

1. Abra **Configurações do OneDrive**
2. Vá para **Pasta do OneDrive**
3. Crie uma pasta `JJR-Backups-Contábil`
4. Copie `C:\jjr-controle\backups\*.json` para lá

### Opção 3: Script de Sincronização (manual)

```powershell
# Execute no PowerShell para copiar para OneDrive
Copy-Item "C:\jjr-controle\backups\*.json" `
  "C:\Users\kleyd\OneDrive\JJR-Backups-Contábil" -Force
```

## Restaurar um Backup

Se precisar restaurar dados:

1. Faça download do arquivo `backup_YYYY-MM-DD.json`
2. Abra em um editor de texto
3. Copie os dados da seção `dados`
4. Entre em contato para restauração manual (ou implemente via API)

## Verificar Backups

```bash
# Listar todos os backups
dir C:\jjr-controle\backups\

# Ver tamanho dos backups
dir C:\jjr-controle\backups\ /s
```

## Log de Execução

Os backups automáticos aparecem no console do servidor:

```
⏰ Executando backup automático diário...
✅ Backup criado: backup_2026-06-26.json (45.32 KB)
📁 Localização: C:\jjr-controle\backups\backup_2026-06-26.json
📊 Total de registros: 12
```

---

**Dica de Ouro**: Sincronize a pasta `backups\` com OneDrive para ter redundância de dados em 3 lugares:
1. Local (C:\jjr-controle\backups\)
2. Supabase (banco de dados)
3. OneDrive (nuvem da Microsoft)

🔒 Seus dados estão segurísimos!
