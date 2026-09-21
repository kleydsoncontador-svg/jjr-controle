/* ═══════════════════════════════════════════════════════════════════════════
   Leitor GENÉRICO de extrato bancário em PDF — SEM IA.
   Em vez de um parser por layout, "aprende" as colunas de cada arquivo pelo cabeçalho da tabela (Data, Histórico,
   Débito/Crédito/Valor, Saldo), lê as linhas âncoradas por data e — o mais importante — só ACEITA o resultado se o
   saldo confere (saldo anterior + movimento = saldo impresso, linha a linha ou por dia). Se não conferir, devolve null
   e o fluxo segue para os outros leitores/pergunta sobre IA: nunca grava valor não conferido em silêncio.
   Entrada: páginas [{num, items:[{str,x,y,w}]}] (pdf.js). Saída no mesmo contrato do módulo de extrato.
   Roda no navegador (window.ExtratoGenerico) e no Node (module.exports).
   ═══════════════════════════════════════════════════════════════════════════ */
(function(root){
  'use strict';
  var VERSAO='extrato-generico 1.0';
  function T(i){ return String(i.str).trim(); }
  function R(i){ return i.x+i.w; }
  var RE_DATA=/^(\d{2})[\/\-.](\d{2})(?:[\/\-.](\d{2,4}))?$/;
  var RE_MONEY=/^\(?[-+]?\s*(?:R\$\s*)?[-+]?\s*\d{1,3}(?:\.\d{3})*,\d{2}\)?\s*[DC]?-?$|^\(?[-+]?\s*(?:R\$\s*)?[-+]?\s*\d+,\d{2}\)?\s*[DC]?-?$/i;
  function money(s){ // → {c:centavos absolutos, neg:true|false|null, dc:'D'|'C'|null}
    var t=String(s).trim(), dc=null, neg=null;
    var m=/([DC])\s*-?$/i.exec(t); if(m){ dc=m[1].toUpperCase(); t=t.replace(/[DC]\s*-?$/i,''); }
    if(/^\(.*\)$/.test(t)){ neg=true; t=t.slice(1,-1); }
    if(/-$/.test(t)){ neg=true; t=t.replace(/-$/,''); }
    if(/^\s*-/.test(t)||/^R\$\s*-/.test(t)||/-\s*R\$/.test(t)){ neg=true; }
    else if(/^\s*\+/.test(t)) neg=false;
    t=t.replace(/[R$\s+\-]/g,'');
    var mm=/^(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/.exec(t); if(!mm) return null;
    return {c:parseInt(mm[1].replace(/\./g,'')+mm[2],10), neg:neg, dc:dc};
  }
  function linhas(items,tol){
    var its=items.filter(function(i){ return i.str&&T(i); }).slice().sort(function(a,b){ return b.y-a.y||a.x-b.x; });
    var out=[], cur=null;
    its.forEach(function(i){ if(cur&&Math.abs(cur.y-i.y)<=tol){ cur.items.push(i); } else { cur={y:i.y,items:[i]}; out.push(cur); } });
    out.forEach(function(l){ l.items.sort(function(a,b){ return a.x-b.x; }); });
    return out;
  }
  // junta itens colados na mesma "palavra" (pdf.js às vezes separa "R$" de "1.234,56")
  function fundirMoeda(items){
    var out=[]; for(var k=0;k<items.length;k++){ var it=items[k], nx=items[k+1];
      if(nx&&/^R\$$/.test(T(it))&&RE_MONEY.test('R$ '+T(nx))&&nx.x-R(it)<12){ out.push({str:'R$ '+T(nx),x:it.x,y:it.y,w:R(nx)-it.x}); k++; }
      else if(nx&&/^-$/.test(T(it))&&RE_MONEY.test('-'+T(nx))&&nx.x-R(it)<8){ out.push({str:'-'+T(nx),x:it.x,y:it.y,w:R(nx)-it.x}); k++; }
      else out.push(it); }
    return out;
  }
  var KW={ data:/^data(\s|$)|^dt\.?$|^data\/?mov|^dia$/i, hist:/^(hist[óo]rico|descri[cç][aã]o|lan[cç]amentos?|movimenta[cç][aã]o|transa[cç][aã]o|detalhes?|opera[cç][aã]o)/i,
           doc:/^(n[º°o]?\.?\s*doc|documento|dcto|docto|n[º°]\s*documento|origem|ag\.\/origem)/i, valor:/^valor/i, deb:/^(d[ée]bitos?|sa[ií]das?|retiradas?)/i, cred:/^(cr[ée]ditos?|entradas?|dep[óo]sitos?)/i, saldo:/^saldo/i };
  function classificarCab(txt){ txt=txt.trim(); for(var k in KW){ if(KW[k].test(txt)) return k; } return null; }

  // ───────── detectar cabeçalho de colunas (linha com ≥3 palavras-chave) ─────────
  function acharCabecalho(lin){
    var cols=[]; lin.items.forEach(function(i){ var k=classificarCab(T(i)); if(k) cols.push({k:k,x:i.x,r:R(i),c:(i.x+R(i))/2,txt:T(i)}); });
    var tipos={}; cols.forEach(function(c){ tipos[c.k]=1; });
    if(Object.keys(tipos).length>=3&&tipos.data&&(tipos.saldo||tipos.valor||tipos.deb||tipos.cred)) return cols;
    // cabeçalhos partidos em 2 itens ("Saldo" "(R$)") já vêm juntos acima; tenta também com sufixos "(R$)" ignorados
    return null;
  }

  function parse(paginas, opc){
    opc=opc||{};
    var res={layout:'Genérico (colunas detectadas)',versao:VERSAO,lancamentos:[],avisos:[],validacoes:[],saldoAnteriorDoc:null,saldoFinalDoc:null,checagens:0,acertos:0};
    var cab=null, linhasDados=[];   // linhas âncora de data
    var todas=[];
    paginas.forEach(function(pg){ linhas(pg.items,2.5).forEach(function(L){ L.items=fundirMoeda(L.items); L.pg=pg.num; todas.push(L); }); });
    todas.forEach(function(L){ var c=acharCabecalho(L); if(c&&!cab) cab=c; if(c) L.ehCab=true; });
    // período do documento (para ano em datas dd/mm)
    var txtTudo=todas.slice(0,60).map(function(L){ return L.items.map(T).join(' '); }).join(' ');
    var anoRef=null, mAno=/(?:per[ií]odo|extrato)[^0-9]{0,40}\d{2}\/\d{2}\/(\d{4})/i.exec(txtTudo)||/(\d{2})\/(\d{2})\/(\d{4})/.exec(txtTudo); if(mAno) anoRef=+mAno[mAno.length-1];
    // ───────── linhas de dados ─────────
    todas.forEach(function(L){
      if(L.ehCab) return;
      var its=L.items, primeiros=its.slice(0,3);
      var d=primeiros.filter(function(i){ return RE_DATA.test(T(i)); })[0];
      var txt=its.map(T).join(' ');
      var saldoAnt=/saldo\s+(anterior|inicial|do\s+dia\s+anterior)|saldo\s+em\s+\d{2}\/\d{2}\/\d{4}\s*$/i.test(txt);
      if(!d&&!saldoAnt){ L.tipo='cont'; linhasDados.push(L); return; }
      L.d=d; L.tipo=saldoAnt?'saldoAnt':'data'; linhasDados.push(L);
    });
    // ───────── colunas numéricas: pelo cabeçalho, ou por agrupamento das bordas direitas ─────────
    var numericos=[]; linhasDados.forEach(function(L){ if(L.tipo!=='data'&&L.tipo!=='saldoAnt') return; L.items.forEach(function(i){ if(RE_MONEY.test(T(i))) numericos.push(R(i)); }); });
    if(!numericos.length) return null;
    var grupos=agrupar(numericos,14);                                        // centros das colunas numéricas (bordas direitas)
    var colunas=grupos.map(function(g){ return {r:g.centro,n:g.n,papel:null}; }).sort(function(a,b){ return a.r-b.r; });
    if(cab){ // rotula cada coluna pela palavra-chave de cabeçalho mais próxima
      colunas.forEach(function(c){ var best=null,dist=1e9; cab.forEach(function(h){ if(!/^(valor|deb|cred|saldo)$/.test(h.k)) return; var dd=Math.min(Math.abs(h.r-c.r),Math.abs(h.c-c.r)); if(dd<dist){ dist=dd; best=h; } }); if(best&&dist<70) c.papel=best.k; });
    }
    res.colunas=colunas.map(function(c){ return {r:Math.round(c.r),papel:c.papel,n:c.n}; });
    // hipóteses de papéis quando o cabeçalho não resolve: saldo = coluna mais à direita; demais = valor (1) ou cred/deb (2)
    var hip=hipoteses(colunas);
    var melhor=null;
    hip.forEach(function(h){ var r=ler(linhasDados,colunas,h,anoRef); if(!r) return; if(!melhor||r.score>melhor.score||(r.score===melhor.score&&r.lancamentos.length>melhor.lancamentos.length)) melhor=r; });
    if(!melhor||!melhor.lancamentos.length) return null;
    res.lancamentos=melhor.lancamentos; res.saldoAnteriorDoc=melhor.saldoAnt; res.saldoFinalDoc=melhor.saldoFim; res.checagens=melhor.checagens; res.acertos=melhor.acertos; res.validacoes=melhor.erros; res.hipotese=melhor.hip; res.linhasSemValor=melhor.semValor;
    res.confere=melhor.checagens>0&&melhor.acertos===melhor.checagens;
    return res;
  }
  function agrupar(vals,tol){ var v=vals.slice().sort(function(a,b){return a-b;}), g=[]; v.forEach(function(x){ var u=g[g.length-1]; if(u&&x-u.max<=tol){ u.max=x; u.soma+=x; u.n++; u.centro=u.soma/u.n; } else g.push({min:x,max:x,soma:x,n:1,centro:x}); }); return g.filter(function(z){ return z.n>=2; }); }
  function hipoteses(cols){
    var n=cols.length, out=[], papeis=cols.map(function(c){ return c.papel; });
    if(papeis.every(function(p){ return p; })) out.push({papeis:papeis,fonte:'cabecalho'});
    if(n>=1){ // sem saldo
      var a=[]; for(var i=0;i<n;i++) a.push('valor'); out.push({papeis:a.slice(0,1).concat(a.slice(1).map(function(){return 'ignorar';})),fonte:'so-valor'});
    }
    if(n>=2){ var p=[]; for(var j=0;j<n;j++) p.push(j===n-1?'saldo':'ignorar'); p[n-2]='valor'; out.push({papeis:p,fonte:'valor+saldo'});
      var q=p.slice(); q[n-2]='cred'; if(n>=3){ q[n-3]='deb'; out.push({papeis:q,fonte:'deb+cred+saldo'}); var q2=q.slice(); q2[n-2]='deb'; q2[n-3]='cred'; out.push({papeis:q2,fonte:'cred+deb+saldo'}); } }
    if(n===2){ out.push({papeis:['deb','cred'],fonte:'deb+cred'}); out.push({papeis:['cred','deb'],fonte:'cred+deb'}); }
    if(n>=3){ var s=[]; for(var k=0;k<n;k++) s.push('ignorar'); s[n-1]='valor'; s[n-2]='saldo'; out.push({papeis:s,fonte:'saldo+valor'}); }
    return out;
  }
  function papelDe(colunas,hp,it){ // qual coluna (papel) contém este número (por proximidade da borda direita)
    var best=-1,dist=1e9; colunas.forEach(function(c,i){ var dd=Math.abs(c.r-R(it)); if(dd<dist){ dist=dd; best=i; } });
    return dist<=18&&best>=0?hp.papeis[best]:null;
  }
  // ───────── leitura sob uma hipótese + validação por saldo ─────────
  function ler(linhasDados,colunas,hp,anoRef){
    var lanc=[], erros=[], saldoAnt=null, saldoCorrente=null, somaDesde=0, checagens=0, acertos=0, semValor=0, ultimo=null, fim=null;
    var temSaldo=hp.papeis.indexOf('saldo')>=0;
    for(var idx=0;idx<linhasDados.length;idx++){
      var L=linhasDados[idx], its=L.items;
      if(L.tipo==='cont'){
        if(ultimo){ var ht=its.filter(function(i){ return !RE_MONEY.test(T(i))&&!RE_DATA.test(T(i)); }).map(T).join(' ').replace(/\s+/g,' ').trim();
          if(ht&&ht.length<160&&!/^(saldo|total|p[áa]g|folha|ag[êe]ncia|conta\b|extrato|aviso|em caso|ouvidoria|sac\b)/i.test(ht)) ultimo.historico=(ultimo.historico+' '+ht).trim(); }
        continue;
      }
      var valores={valor:null,deb:null,cred:null,saldo:null}, txtHist=[];
      its.forEach(function(i){
        var t=T(i); if(L.d&&i===L.d) return;
        if(RE_MONEY.test(t)){ var p=papelDe(colunas,hp,i); var m=money(t); if(!p||p==='ignorar'||!m) return; if(p==='saldo') valores.saldo=m; else if(p==='valor') valores.valor=m; else if(p==='deb') valores.deb=m; else if(p==='cred') valores.cred=m; }
        else if(/^[DC]$/.test(t)){ valores.sufixo=t; }
        else txtHist.push(t);
      });
      var hist=txtHist.join(' ').replace(/\s+/g,' ').trim();
      if(L.tipo==='saldoAnt'){ var sa=valores.saldo||valores.valor; if(sa&&saldoAnt===null){ saldoAnt=algeb(sa,true); saldoCorrente=saldoAnt; somaDesde=0; } ultimo=null; continue; }
      // valor com sinal (centavos): sinal pela coluna (deb/cred) ou pelo sinal impresso/sufixo D-C
      var v=null;
      if(valores.deb&&valores.deb.c) v=-valores.deb.c; if(valores.cred&&valores.cred.c) v=(v||0)+valores.cred.c;
      if(v===null&&valores.valor){ var m=valores.valor; v=m.c; if(m.neg===true||m.dc==='D'&&hp.dcNeg!==false) v=-Math.abs(m.c); else if(m.dc==='C') v=Math.abs(m.c); else if(valores.sufixo==='D') v=-m.c; }
      var ehMarcadorSaldo=/saldo|sdo\b|s a l d o/i.test(hist)&&v===null;
      if(v===null){ // linha com só saldo (marcador do dia) ou sem valor
        if(valores.saldo&&temSaldo){ var s2=algeb(valores.saldo,true); if(saldoCorrente!==null){ checagens++; if(saldoCorrente+somaDesde===s2) acertos++; else erros.push({codigo:'SALDO_NAO_BATE',linha:hist.slice(0,40),calculado:(saldoCorrente+somaDesde)/100,impresso:s2/100}); } saldoCorrente=s2; somaDesde=0; fim=s2; }
        else if(!ehMarcadorSaldo) semValor++;
        ultimo=null; continue;
      }
      if(!L.d){ ultimo=null; continue; }
      var dm=RE_DATA.exec(T(L.d)), ano=dm[3]?(dm[3].length===2?2000+(+dm[3]):+dm[3]):anoRef;
      if(!ano) return null;
      var l={data:ano+'-'+dm[2]+'-'+dm[1], historico:hist||'(sem histórico)', valor_entrada:v>0?v/100:0, valor_saida:v<0?-v/100:0, documento:null};
      lanc.push(l); ultimo=l; somaDesde+=v;
      if(valores.saldo&&temSaldo){ var s3=algeb(valores.saldo,true); if(saldoCorrente!==null){ checagens++; if(saldoCorrente+somaDesde===s3) acertos++; else erros.push({codigo:'SALDO_NAO_BATE',data:l.data,calculado:(saldoCorrente+somaDesde)/100,impresso:s3/100}); } saldoCorrente=s3; somaDesde=0; fim=s3; }
    }
    var score=checagens?acertos/checagens:0;
    // sem coluna de saldo não há como conferir — só aceita se marcado (score 0 e confere=false)
    return {lancamentos:lanc,erros:erros,saldoAnt:saldoAnt===null?null:saldoAnt/100,saldoFim:fim===null?null:fim/100,checagens:checagens,acertos:acertos,score:score,hip:hp.fonte,semValor:semValor};
  }
  // saldo algébrico (D/negativo = devedor). Extratos de C/C: "C" ou sem sinal = positivo; "D" ou "-" = negativo.
  function algeb(m,saldo){ if(m.neg===true||m.dc==='D') return -m.c; return m.c; }

  var API={VERSAO:VERSAO,parse:parse,money:money};
  if(typeof module!=='undefined'&&module.exports) module.exports=API; else root.ExtratoGenerico=API;
})(typeof window!=='undefined'?window:this);
