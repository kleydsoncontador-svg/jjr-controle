const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const cron = require('node-cron');
const { criarBackup } = require('./backup');

const PORT = 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // Add no-cache headers to all responses
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  let filePath = path.join(ROOT_DIR, url.parse(req.url).pathname);

  // Try to serve the requested file
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(fs.readFileSync(filePath));
      return;
    }
  }

  // Fallback: serve index.html for SPA routing
  const indexPath = path.join(ROOT_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(indexPath));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Agendar backup automático a cada hora
cron.schedule('0 * * * *', () => {
  console.log('\n⏰ Executando backup automático horário...');
  criarBackup();
});

// Fazer um backup também 5 minutos após o servidor iniciar
setTimeout(() => {
  console.log('\n⏰ Executando primeiro backup...');
  criarBackup();
}, 5 * 60 * 1000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✓ JJR Controle Contábil rodando em http://localhost:${PORT}`);
  console.log(`📁 Backups serão salvos em: C:\\jjr-controle\\backups\\`);
  console.log(`⏰ Backup automático agendado para 02:00 diariamente\n`);
});
