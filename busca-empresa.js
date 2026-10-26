/* Campos "Adicionar empresa" / "— Escolha uma empresa —" (pedido do usuário 24/10/2026: "em todo site, onde houver esses botões de adicionar empresas, deve-se dar pra pesquisar por nome ou ID").
   Todo <select> cuja 1ª opção é "Escolha/Selecione uma empresa" ganha uma caixinha de busca logo acima: digitar filtra as empresas por NOME ou ID e a lista abre mostrando só as que batem;
   clicar numa delas (ou Enter, que pega a 1ª) seleciona como sempre. O <select> original continua sendo quem guarda o valor, então nenhuma tela precisou mudar. */
(function(){
  function norm(t){ return String(t==null?'':t).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim(); }
  function ehSeletorDeEmpresa(sel){
    if(!sel||sel.tagName!=='SELECT'||sel.multiple||sel.__buscaEmpresa||!sel.options||!sel.options.length) return false;
    var t=norm(sel.options[0].text);
    return /(escolha|selecione)/.test(t)&&/empresa/.test(t);
  }
  function upgrade(sel){
    if(!ehSeletorDeEmpresa(sel)) return;
    sel.__buscaEmpresa=true;
    var inp=document.createElement('input');
    inp.type='search'; inp.className='fi'; inp.autocomplete='off';
    inp.placeholder='🔎 buscar empresa por nome ou ID…';
    inp.setAttribute('aria-label','Buscar empresa por nome ou ID');
    inp.style.cssText='display:block;margin:0 0 6px 0;min-width:260px;max-width:480px;width:100%;font-size:12.5px';
    sel.parentNode.insertBefore(inp,sel);
    function restaurar(){
      for(var i=0;i<sel.options.length;i++){ sel.options[i].hidden=false; }
      sel.size=0; sel.removeAttribute('size');
    }
    function filtrar(){
      var termo=norm(inp.value);
      if(!termo){ restaurar(); return; }
      var achou=0;
      for(var i=1;i<sel.options.length;i++){
        var o=sel.options[i];
        var ok=norm(o.text).indexOf(termo)>=0||norm(o.value).indexOf(termo)>=0;
        o.hidden=!ok; if(ok) achou++;
      }
      sel.options[0].hidden=true;
      sel.size=Math.max(2,Math.min(8,achou||1));
      if(!achou){ sel.options[0].hidden=false; sel.options[0].text='— nenhuma empresa com "'+inp.value+'" —'; }
    }
    var textoOrig=sel.options[0].text;
    inp.addEventListener('input',function(){ sel.options[0].text=textoOrig; filtrar(); });
    inp.addEventListener('keydown',function(ev){
      if(ev.key==='Enter'){
        ev.preventDefault();
        for(var i=1;i<sel.options.length;i++){ if(!sel.options[i].hidden){ sel.selectedIndex=i; sel.dispatchEvent(new Event('change',{bubbles:true})); break; } }
        inp.value=''; sel.options[0].text=textoOrig; restaurar();
      } else if(ev.key==='Escape'){ inp.value=''; sel.options[0].text=textoOrig; restaurar(); }
    });
    sel.addEventListener('change',function(){ if(inp.value){ inp.value=''; sel.options[0].text=textoOrig; restaurar(); } });
  }
  function varre(raiz){
    if(!raiz||raiz.nodeType!==1) return;
    if(raiz.tagName==='SELECT') upgrade(raiz);
    if(raiz.querySelectorAll){ var l=raiz.querySelectorAll('select'); for(var i=0;i<l.length;i++) upgrade(l[i]); }
  }
  new MutationObserver(function(ms){ ms.forEach(function(m){
    for(var i=0;i<m.addedNodes.length;i++) varre(m.addedNodes[i]);
    if(m.type==='childList'&&m.target&&m.target.tagName==='SELECT') upgrade(m.target); // opções preenchidas depois de o select já existir
  }); }).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState!=='loading') varre(document.body); else document.addEventListener('DOMContentLoaded',function(){ varre(document.body); });
})();
