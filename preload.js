const { contextBridge, ipcRenderer } = require('electron');

// Expõe API segura para o HTML acessar o sistema de arquivos
// via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // Verificar timestamps dos arquivos (para sync automático)
  verificarTimestamps: () =>
    ipcRenderer.invoke('verificar-timestamps'),

  // Ler um arquivo JSON da pasta de dados
  lerArquivo: (nomeArquivo) =>
    ipcRenderer.invoke('ler-arquivo', nomeArquivo),

  // Gravar um arquivo JSON na pasta de dados
  gravarArquivo: (nomeArquivo, dados) =>
    ipcRenderer.invoke('gravar-arquivo', nomeArquivo, dados),

  // Listar arquivos .json na pasta de dados
  listarArquivos: () =>
    ipcRenderer.invoke('listar-arquivos'),

  // Excluir um arquivo
  excluirArquivo: (nomeArquivo) =>
    ipcRenderer.invoke('excluir-arquivo', nomeArquivo),

  // Obter caminho da pasta de dados atual
  obterPastaData: () =>
    ipcRenderer.invoke('obter-pasta-data'),

  // Abre um diálogo para o usuário escolher a pasta de dados
  escolherPastaData: () =>
    ipcRenderer.invoke('escolher-pasta-data'),

  // Abre a pasta de dados no Windows Explorer
  abrirPasta: () =>
    ipcRenderer.invoke('abrir-pasta'),

  // Info do sistema
  infoSistema: () =>
    ipcRenderer.invoke('info-sistema'),

  // Recebe notificação quando a pasta de dados muda
  onPastaData: (callback) =>
    ipcRenderer.on('pasta-data', (event, pasta) => callback(pasta)),
});
