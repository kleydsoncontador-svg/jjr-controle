/* "Adicionar empresa" simplificado em TODAS as telas que têm esse bloco (pedido do usuário 12/11/2026):
   uma linha só — [🔎 buscar empresa por nome ou ID…] [— Escolha uma empresa —] [+ Adicionar Empresa] —, sem a caixa grande "Buscar empresa, CNPJ ou ID".
   Roda sobre o <select> de empresa que o busca-empresa.js já melhorou; não muda nenhuma tela por dentro (o <select> continua guardando o valor). */
(function(){
  'use strict';
  var PH='🔍 Buscar empresa, CNPJ ou ID';
  function ehBuscaGrande(el){ return el&&el.tagName==='INPUT'&&String(el.placeholder||'').indexOf(PH)===0; }
  function aplicar(sel){
    if(sel.__linhaOk||!sel.__buscaEmpresa) return;
    var pai=sel.parentElement; if(!pai) return;
    var label=null; [].slice.call(pai.children).forEach(function(c){ if(!label&&c.tagName==='LABEL') label=c; });
    var botoes=[].slice.call(pai.querySelectorAll('button'));
    if(pai.nextElementSibling&&pai.nextElementSibling.tagName==='BUTTON') botoes.push(pai.nextElementSibling);
    var botao=botoes.filter(function(b){ return /adicionar\s+empresa/i.test(b.textContent||''); })[0];
    if(!botao||!label||!/empresa/i.test(label.textContent||'')) return; // só no bloco "adicionar empresa"
    sel.__linhaOk=true;
    [].slice.call(pai.children).forEach(function(c){ if(ehBuscaGrande(c)||(c.querySelector&&ehBuscaGrande(c.querySelector('input')))) c.style.display='none'; });
    pai.style.display='flex'; pai.style.flexWrap='wrap'; pai.style.alignItems='center'; pai.style.gap='10px'; pai.style.marginBottom='0';
    label.style.flexBasis='100%'; label.style.margin='0 0 2px 0';
    var busca=sel.previousElementSibling; if(busca&&busca.tagName==='INPUT'&&!ehBuscaGrande(busca)){ busca.style.width='auto'; busca.style.flex='1 1 190px'; busca.style.minWidth='150px'; busca.style.maxWidth='300px'; busca.style.margin='0'; }
    sel.style.width='auto'; sel.style.minWidth='170px'; sel.style.flex='1 1 220px'; sel.style.maxWidth='360px'; sel.style.margin='0';
    if(botao.parentElement!==pai) pai.appendChild(botao);
    botao.style.margin='0';
  }
  function varrer(){ [].slice.call(document.querySelectorAll('select')).forEach(function(s){ try{ aplicar(s); }catch(e){} }); }
  setInterval(varrer,700); document.addEventListener('DOMContentLoaded',varrer); varrer();
})();
