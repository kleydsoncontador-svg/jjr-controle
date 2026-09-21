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
    var MESES={janeiro:1,fevereiro:2,'março':3,marco:3,abril:4,maio:5,junho:6,julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12};
    var secaoAtual=null;
    paginas.forEach(function(pg){ linhas(pg.items,2.5).forEach(function(L){
      L.items=fundirMoeda(L.items); L.pg=pg.num;
      var f=L.items[0]; if(f){ var mm=/^(\d{2}[\/\-.]\d{2}(?:[\/\-.]\d{2,4})?)\s+(\S.*)$/.exec(T(f)); if(mm&&RE_DATA.test(mm[1])){ L.items.splice(0,1,{str:mm[1],x:f.x,y:f.y,w:Math.min(f.w,50)},{str:mm[2],x:f.x+55,y:f.y,w:Math.max(f.w-55,5)}); } }
      var t0=L.items.map(T).join(' ');
      var se=/^(?:[A-Za-zçÇáéíóúãõâêô\-]+,\s*)?(\d{1,2})\s+de\s+([A-Za-zçÇ]+)\s+de\s+(\d{4})/i.exec(t0);
      if(se&&MESES[se[2].toLowerCase()]&&!L.items.some(function(i){ return RE_MONEY.test(T(i)); })){ secaoAtual=String(se[1]).padStart(2,'0')+'/'+String(MESES[se[2].toLowerCase()]).padStart(2,'0')+'/'+se[3]; L.secao=true; }
      else if(secaoAtual&&!RE_DATA.test(T(L.items[0]))&&L.items.some(function(i){ return RE_MONEY.test(T(i)); })&&!/saldo/i.test(t0)) L.itens_data_implicita=secaoAtual;
      todas.push(L); }); });
    todas.forEach(function(L){ var c=acharCabecalho(L); if(c&&!cab) cab=c; if(c) L.ehCab=true; });
    // período do documento (para ano em datas dd/mm)
    var txtTudo=todas.slice(0,60).map(function(L){ return L.items.map(T).join(' '); }).join(' ');
    var anoRef=null, mAno=/(?:per[ií]odo|extrato)[^0-9]{0,40}\d{2}\/\d{2}\/(\d{4})/i.exec(txtTudo)||/(\d{2})\/(\d{2})\/(\d{4})/.exec(txtTudo); if(mAno) anoRef=+mAno[mAno.length-1];
    // ───────── linhas de dados ─────────
    todas.forEach(function(L){
      if(L.ehCab) return;
      var its=L.items, primeiros=its.slice(0,3);
      if(L.secao){ L.tipo='secao'; return; }
      var d=primeiros.filter(function(i){ return RE_DATA.test(T(i)); })[0];
      if(!d&&L.itens_data_implicita){ d={str:L.itens_data_implicita,x:0,y:L.y,w:1}; L.itens_implicita=true; }
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
    // extrato em ordem cronológica INVERSA (mais recente primeiro): inverte só as linhas âncora de data, mantendo continuações coladas
    var ds=linhasDados.filter(function(L){ return L.tipo==='data'&&L.d; }).map(function(L){ var m=RE_DATA.exec(T(L.d)); return m?(+(m[3]?(m[3].length===2?'20'+m[3]:m[3]):'0')*10000+(+m[2])*100+(+m[1])):0; });
    var desc=0,asc=0; for(var q=1;q<ds.length;q++){ if(ds[q]<ds[q-1]) desc++; else if(ds[q]>ds[q-1]) asc++; }
    var invertido=desc>asc*2&&desc>3;
    var seqs=[linhasDados]; if(invertido){ seqs=[agruparBlocos(linhasDados).reverse().reduce(function(a,b){ return a.concat(b); },[])]; }
    linhasDados=seqs[0];
    var melhor=null;
    hip.forEach(function(h){ var r=ler(linhasDados,colunas,h,anoRef); if(!r) return; r.cx=conferirTotais(todas,r);
      var rk=function(x){ return [x.score>=1&&x.checagens>=3?2:(x.cx.ok?2:0), x.score, x.checagens>=3?1:0, x.lancamentos.length]; };
      if(!melhor){ melhor=r; return; } var a=rk(r), b=rk(melhor); for(var q=0;q<a.length;q++){ if(a[q]!==b[q]){ if(a[q]>b[q]) melhor=r; return; } } });
    if(!melhor||!melhor.lancamentos.length) return null;
    res.lancamentos=melhor.lancamentos; res.saldoAnteriorDoc=melhor.saldoAnt; res.saldoFinalDoc=melhor.saldoFim; res.checagens=melhor.checagens; res.acertos=melhor.acertos; res.validacoes=melhor.erros; res.hipotese=melhor.hip; res.linhasSemValor=melhor.semValor;
    var cx=conferirTotais(todas,melhor);
    res.confereTotais=cx; res.somaMov=melhor.somaFinal;
    res.confere=(melhor.checagens>0&&melhor.acertos===melhor.checagens)||cx.ok; res.invertido=invertido; res.marcadores={informativos:melhor.marcadoresInformativos,diferem:melhor.marcadoresDiferem};
    return res;
  }
  function money2(str){ var m=money(str); return m?m.c*(m.neg===true||m.dc==='D'?-1:1):null; }
  // Conferências que não dependem de saldo por linha: (a) saldo anterior + Σ movimento = saldo final impresso; (b) Σ entradas/Σ saídas = totais impressos
  function conferirTotais(todas,r){
    var ant=null,fim=null,totE=null,totS=null;
    todas.forEach(function(L){ var t=L.items.map(T).join(' ');
      var a=/saldo\s+(?:anterior|inicial|do\s+dia\s+anterior)\D{0,40}?(-?[\d.]+,\d{2}\s*[DC]?)/i.exec(t); if(a&&ant===null){ var v=money2(a[1]); if(v!==null) ant=v; }
      var f=/saldo\s+(?:final|atual|em\s+c\/?c|do\s+per[ií]odo)\D{0,40}?(-?[\d.]+,\d{2}\s*[DC]?)/i.exec(t); if(f){ var v2=money2(f[1]); if(v2!==null) fim=v2; }
      var e=/total\s+(?:de\s+)?(?:entradas|cr[eé]ditos?)\D{0,30}?([\d.]+,\d{2})/i.exec(t); if(e){ var v3=money2(e[1]); if(v3!==null) totE=v3; }
      var sa=/total\s+(?:de\s+)?(?:sa[ií]das|d[eé]bitos?)\D{0,30}?-?([\d.]+,\d{2})/i.exec(t); if(sa){ var v4=money2(sa[1]); if(v4!==null) totS=v4; }
    });
    var sumE=0,sumS=0; r.lancamentos.forEach(function(l){ sumE+=Math.round(l.valor_entrada*100); sumS+=Math.round(l.valor_saida*100); });
    var out={ant:ant,fim:fim,totE:totE,totS:totS,sumE:sumE,sumS:sumS,ok:false,modo:null};
    if(ant!==null&&fim!==null&&ant+sumE-sumS===fim){ out.ok=true; out.modo='saldo anterior+movimento=saldo final'; }
    else if(totE!==null&&totS!==null&&Math.abs(totE)===sumE&&Math.abs(totS)===sumS){ out.ok=true; out.modo='totais de entradas e saídas'; }
    return out;
  }
  function agruparBlocos(ls){ // cada bloco = uma linha âncora (data/saldoAnt) + as continuações que vêm depois
    var blocos=[], cur=null; ls.forEach(function(L){ if(L.tipo==='cont'&&cur){ cur.push(L); } else { cur=[L]; blocos.push(cur); } }); return blocos; }
  function agrupar(vals,tol){ var v=vals.slice().sort(function(a,b){return a-b;}), g=[]; v.forEach(function(x){ var u=g[g.length-1]; if(u&&x-u.max<=tol){ u.max=x; u.soma+=x; u.n++; u.centro=u.soma/u.n; } else g.push({min:x,max:x,soma:x,n:1,centro:x}); }); return g.filter(function(z){ return z.n>=2; }); }
  function hipoteses(cols){
    var n=cols.length, out=[], papeis=cols.map(function(c){ return c.papel; });
    var cont=function(k){ return papeis.filter(function(p){ return p===k; }).length; };
    if(papeis.every(function(p){ return p; })&&cont('valor')<=1&&cont('saldo')<=1&&cont('deb')<=1&&cont('cred')<=1) out.push({papeis:papeis,fonte:'cabecalho'});
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
    var marcadoresInformativos=0, marcadoresDiferem=0; var lanc=[], erros=[], saldoAnt=null, saldoCorrente=null, somaDesde=0, checagens=0, acertos=0, semValor=0, ultimo=null, fim=null;
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
        else if(RE_DATA.test(t)&&!txtHist.length) { /* data secundária (liquidação) */ }
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
        if(valores.saldo&&temSaldo){ var s2=algeb(valores.saldo,true); if(saldoCorrente!==null){ if(/total|dispon|aplic|invest|limite|bloq/i.test(hist)){ marcadoresInformativos++; if(saldoCorrente+somaDesde!==s2) marcadoresDiferem++; } else { checagens++; if(saldoCorrente+somaDesde===s2) acertos++; else erros.push({codigo:'SALDO_NAO_BATE',linha:hist.slice(0,40),calculado:(saldoCorrente+somaDesde)/100,impresso:s2/100}); } } saldoCorrente=s2; somaDesde=0; fim=s2; }
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
    return {lancamentos:lanc,erros:erros,saldoAnt:saldoAnt===null?null:saldoAnt/100,saldoFim:fim===null?null:fim/100,checagens:checagens,acertos:acertos,score:score,hip:hp.fonte,semValor:semValor,marcadoresInformativos:marcadoresInformativos,marcadoresDiferem:marcadoresDiferem,somaFinal:lanc.reduce(function(a,l){ return a+Math.round(l.valor_entrada*100)-Math.round(l.valor_saida*100); },0)};
  }
  // saldo algébrico (D/negativo = devedor). Extratos de C/C: "C" ou sem sinal = positivo; "D" ou "-" = negativo.
  function algeb(m,saldo){ if(m.neg===true||m.dc==='D') return -m.c; return m.c; }

  var API={VERSAO:VERSAO,parse:parse,money:money};
  if(typeof module!=='undefined'&&module.exports) module.exports=API; else root.ExtratoGenerico=API;
})(typeof window!=='undefined'?window:this);
