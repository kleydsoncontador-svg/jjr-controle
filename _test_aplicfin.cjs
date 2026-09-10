const pdfjs = require('./node_modules/pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');

// extrai um trecho do index.html entre duas âncoras
function slice(a,b){ const i=html.indexOf(a); const j=html.indexOf(b,i); if(i<0||j<0) throw new Error('anchor '+a); return html.slice(i,j); }

const pdfjsLib = pdfjs;
function _convItauGarantirWorker(){}
function _convCobrParseValor(s){ if(s==null)return null; if(typeof s==='number')return s; s=String(s).trim(); if(!s)return null; const neg=s.startsWith('-'); s=s.replace(/^-/,'').replace(/\./g,'').replace(',','.'); const v=parseFloat(s); if(isNaN(v))return null; return neg?-v:v; }

const code = slice("const APLICFIN_PARSER_VERSION='v1';", "// Dispatcher SEM IA (contrato padrão)");
eval(code);

(async()=>{
  for(const f of process.argv.slice(2)){
    const buf = new Uint8Array(fs.readFileSync(f));
    const pdf = await pdfjs.getDocument({data:buf}).promise;
    let r = await _aplicfinParseItauAplicAutMais(pdf);
    if(!r){ const pdf2=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(f))}).promise; r = await _aplicfinParseBradescoPadrao(pdf2); }
    console.log('\n===', f.split(/[\\/]/).pop());
    if(!r){ console.log('  (nenhum parser reconheceu)'); continue; }
    console.log('  bank',r.bank,'model',r.model,'competence',r.competence,'produto',r.products);
    console.log('  fingerprint',r.fingerprint);
    r.sources.forEach(s=>console.log('   ',s.key.padEnd(48), s.value));
    r.validations.forEach(v=>console.log('   VALID', v.ok?'OK':'FAIL', v.detail));
    r.warnings.forEach(w=>console.log('   WARN', w));
  }
})();
