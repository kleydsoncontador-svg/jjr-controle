const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CONFIG_FILE = path.join(app.getPath('userData'), 'jjr_controle_config.json');

function lerConfig() {
  try { if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch(e) {}
  return {};
}
function salvarConfig(cfg) {
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8'); } catch(e) {}
}

let mainWindow;
let pastaData = '';

function criarJanela() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    title: 'JJR Controle Contábil',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
    backgroundColor: '#1A1F2E', show: false,
  });
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.send('pasta-data', pastaData);
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.on('closed', () => { mainWindow = null; });
}

// IPC: verificar timestamps
ipcMain.handle('verificar-timestamps', async () => {
  if (!pastaData || !fs.existsSync(pastaData)) return {};
  try {
    const arquivos = fs.readdirSync(pastaData).filter(f => f.endsWith('.json'));
    const ts = {};
    for (const f of arquivos) { const st = fs.statSync(path.join(pastaData, f)); ts[f] = st.mtimeMs; }
    return ts;
  } catch(e) { return {}; }
});

ipcMain.handle('ler-arquivo', async (event, nome) => {
  if (!pastaData) return null;
  const fp = path.join(pastaData, nome);
  try { if (!fs.existsSync(fp)) return null; return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch(e) { return null; }
});

ipcMain.handle('gravar-arquivo', async (event, nome, dados) => {
  if (!pastaData) return false;
  try {
    if (!fs.existsSync(pastaData)) fs.mkdirSync(pastaData, { recursive: true });
    fs.writeFileSync(path.join(pastaData, nome), JSON.stringify(dados), 'utf8');
    return true;
  } catch(e) { return false; }
});

ipcMain.handle('listar-arquivos', async () => {
  if (!pastaData || !fs.existsSync(pastaData)) return [];
  try { return fs.readdirSync(pastaData).filter(f => f.endsWith('.json')); } catch(e) { return []; }
});

ipcMain.handle('excluir-arquivo', async (event, nome) => {
  if (!pastaData) return false;
  try { const fp = path.join(pastaData, nome); if (fs.existsSync(fp)) fs.unlinkSync(fp); return true; } catch(e) { return false; }
});

ipcMain.handle('obter-pasta-data', async () => pastaData);

ipcMain.handle('escolher-pasta-data', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecione a pasta de dados (OneDrive)',
    properties: ['openDirectory'],
    defaultPath: pastaData || path.join(os.homedir(), 'OneDrive - JJR ORGANIZACAO CONTABIL S S', 'Depto. Contábil', 'APP JJR Controle Contábil'),
  });
  if (result.canceled || !result.filePaths.length) return null;
  const nova = path.join(result.filePaths[0], 'JJR_Dados APP JJR Controle Contábil');
  pastaData = nova;
  const cfg = lerConfig(); cfg.pastaData = nova; salvarConfig(cfg);
  mainWindow.webContents.send('pasta-data', nova);
  return nova;
});

ipcMain.handle('abrir-pasta', async () => { if (pastaData && fs.existsSync(pastaData)) shell.openPath(pastaData); });
ipcMain.handle('info-sistema', async () => ({ pastaData, versao: app.getVersion(), plataforma: process.platform, usuario: os.userInfo().username }));

// Auto-update
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;
async function verificarAtualizacao() {
  if (!pastaData) return;
  try {
    const updateFile = path.join(path.dirname(pastaData), 'update.json');
    if (!fs.existsSync(updateFile)) return;
    const info = JSON.parse(fs.readFileSync(updateFile, 'utf8'));
    const versaoAtual = app.getVersion();
    if (!info.versao || info.versao === versaoAtual) return;
    const exePath = info.exePath;
    if (!exePath || !fs.existsSync(exePath)) return;
    const resposta = await dialog.showMessageBox(mainWindow, {
      type: 'info', title: 'Atualização disponível',
      message: `Nova versão disponível: ${info.versao}`,
      detail: `Versão atual: ${versaoAtual}\n\nDeseja instalar agora?`,
      buttons: ['Instalar agora', 'Depois'], defaultId: 0,
    });
    if (resposta.response === 0) {
      const { exec } = require('child_process');
      exec(`"${exePath}"`);
      setTimeout(() => app.quit(), 1000);
    }
  } catch(e) {}
}

app.whenReady().then(async () => {
  const cfg = lerConfig();
  if (cfg.pastaData) {
    pastaData = cfg.pastaData;
  } else {
    const candidatas = [
      path.join(os.homedir(), 'OneDrive - JJR ORGANIZACAO CONTABIL S S', 'Depto. Contábil', 'APP JJR Controle Contábil', 'JJR_Dados APP JJR Controle Contábil'),
      path.join(os.homedir(), 'JJR ORGANIZACAO CONTABIL S S', 'Kleydson Brito - Depto. Contábil', 'APP JJR Controle Contábil', 'JJR_Dados APP JJR Controle Contábil'),
    ];
    for (const c of candidatas) {
      if (fs.existsSync(path.dirname(c))) { pastaData = c; cfg.pastaData = c; salvarConfig(cfg); break; }
    }
  }
  criarJanela();
  setTimeout(verificarAtualizacao, 5000);
  setInterval(verificarAtualizacao, UPDATE_CHECK_INTERVAL);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) criarJanela(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
