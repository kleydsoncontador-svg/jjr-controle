// Valida a sintaxe do JavaScript inline do index.html
// Uso: node check.js
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

// Extrai todos os blocos <script> (exceto src externos)
const scriptRegex = /<script(?![^>]*\ssrc)[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let ok = true;

while ((match = scriptRegex.exec(html)) !== null) {
  const code = match[1].trim();
  if (!code) continue;

  try {
    new vm.Script(code);
    console.log('✓ Bloco <script> OK (linha ' + (html.slice(0, match.index).split('\n').length) + ')');
  } catch (e) {
    console.error('✗ ERRO DE SINTAXE:', e.message);
    const lineMatch = e.message.match(/line (\d+)/i);
    if (lineMatch) {
      const errLine = parseInt(lineMatch[1]);
      const codeLines = code.split('\n');
      console.error('\nContexto:');
      for (let i = Math.max(0, errLine - 3); i < Math.min(codeLines.length, errLine + 2); i++) {
        const marker = i === errLine - 1 ? '>>>' : '   ';
        console.error(`  ${marker} ${i + 1}: ${codeLines[i].substring(0, 100)}`);
      }
    }
    ok = false;
  }
}

if (ok) {
  console.log('\n✓ Tudo OK! index.html sem erros de sintaxe.');
  process.exit(0);
} else {
  console.error('\n✗ Corrija os erros antes de fazer commit!');
  process.exit(1);
}
