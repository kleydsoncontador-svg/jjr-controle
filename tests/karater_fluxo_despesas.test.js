// Teste de regressão do leitor KARATER_RELATORIO_DESPESAS (index.html, bloco "Relatório de Despesas").
// Uso (precisa de pdfjs-dist instalado, ex.: npm i pdfjs-dist@3):  node tests/karater_fluxo_despesas.test.js
const fs=require('fs'), path=require('path'), pdfjs=require('pdfjs-dist/legacy/build/pdf.js');
var _lancctbEidAtual=15;
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const a=src.indexOf('let _krResultado=null;'), b=src.indexOf('function _krPreviewHtml(){');
eval(src.slice(a,b).replace(/^let _krResultado=null;/,'var _krResultado=null;').replace(/^(async )?function (\w+)/gm,(m,as,n)=>`${as||''}function ${n}`)+';globalThis._krParsearPdf=_krParsearPdf;globalThis._krFmtCentavos=_krFmtCentavos;');
(async()=>{
  const ler=async m=>_krParsearPdf(await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(path.join(__dirname,'fixtures',`Fluxo de Caixa - Pagamentos_2026-${m}.pdf`))),useSystemFonts:true}).promise);
  const ag=(await ler('08')).registros, se=(await ler('09')).registros; let falhas=0;
  const T=[[ag,'2026-08-03','Condomínio Vila Normanda - Bloco A - Loja 03',694800],[ag,'2026-08-03','IR - Aplicação',26392],[ag,'2026-08-03','Tarifa',1385,2],[ag,'2026-08-04','Cláudio José de carvalho',800000],
    [ag,'2026-08-30','JJR Contabilidade',235965],[ag,'2026-08-31','REFIS - 33ª Parcela',260822],[se,'2026-09-02','Maria Celeste',20000],[se,'2026-09-03','Cláudio José de carvalho',800000],
    [se,'2026-09-04','Enel - Karater escritório',16566],[se,'2026-09-08','Vivo - Escritório São Bento',13440],[se,'2026-09-14','Prefeitura Municipal de São Paulo',29144,3],[se,'2026-09-18','Darf - Pró-Labore',100502],
    [se,'2026-09-25','PIS/COFINS',836584],[se,'2026-09-30','REFIS - 34ª Parcela',262964],[se,'2026-09-30','JJR Contabilidade',235965],[se,'2026-09-30','Maria Celeste',20000]];
  T.forEach(([rs,d,f,c,n])=>{ const q=rs.filter(x=>x.data===d&&x.favorecido===f&&x.centavos===c).length; if(q!==(n||1)){ falhas++; console.log('FALHOU',d,f,c,'esperado',n||1,'achou',q); } });
  if(ag.length!==37||se.length!==49){ falhas++; console.log('contagem inesperada',ag.length,se.length); }
  if(new Set(ag.map(x=>x.chave)).size!==ag.length||new Set(se.map(x=>x.chave)).size!==se.length){ falhas++; console.log('chaves repetidas'); }
  console.log(falhas?`${falhas} FALHA(S)`:'OK — '+T.length+' conferências + contagens + chaves únicas'); process.exit(falhas?1:0);
})();
