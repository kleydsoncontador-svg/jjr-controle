/* ═══════════════════════════════════════════════════════════════════════════
   Extrato Itaú C/C em PDF — SEM IA — dois modelos:
     A) "Itaú Empresas" (Extrato de dd/mm/aaaa até dd/mm/aaaa; colunas Data | Lançamento | Ag./Origem | Valor | Saldo;
        data dd/mm; linhas "SDO CTA/APL AUTOMATICAS" são saldo do dia, não lançamento).
     B) "Lançamentos do período" (data completa; colunas Data | Lançamentos | Razão Social | CNPJ/CPF | Valor | Saldo;
        histórico e razão social em 2–3 linhas ao redor da linha da data; "SALDO TOTAL DISPONÍVEL DIA" é saldo do dia).
   Entrada: páginas [{num, items:[{str,x,y,w}]}] (pdf.js). Saída no contrato do módulo de extrato:
     {layout, lancamentos:[{data:'AAAA-MM-DD', historico, valor_entrada, valor_saida, documento}], saldoAnteriorDoc?, saldoFinalDoc?, ...}
   Valor pela COLUNA e pelo sinal impresso (negativo = saída). Nenhum lançamento é descartado em silêncio.
   Roda no navegador (window.ItauExtratoParsers) e no Node (module.exports).
   ═══════════════════════════════════════════════════════════════════════════ */
(function(root){
  'use strict';
  var VERSAO='itau-extrato-parsers 1.0';
  function T(i){ return String(i.str).trim(); }
  function r(i){ return i.x+i.w; }
  function valorBR(s){ var m=/^(-?)(\d{1,3}(?:\.\d{3})*|\d+),(\d\d)$/.exec(String(s).trim()); if(!m) return null; var c=parseInt(m[2].replace(/\./g,'')+m[3],10); return (m[1]?-c:c)/100; }
  function cents(v){ return Math.round(v*100); }
  var RE_VAL=/^-?(?:\d{1,3}(?:\.\d{3})*|\d+),\d\d$/;

  function linhas(items,tol){
    var its=items.filter(function(i){ return i.str&&T(i); }).slice().sort(function(a,b){ return b.y-a.y||a.x-b.x; });
    var out=[], cur=null;
    its.forEach(function(i){ if(cur&&Math.abs(cur.y-i.y)<=tol){ cur.items.push(i); } else { cur={y:i.y,items:[i]}; out.push(cur); } });
    out.forEach(function(l){ l.items.sort(function(a,b){ return a.x-b.x; }); });
    return out;
  }
  function textoPag(p){ return p.items.map(T).join(' '); }
  function anoDe(dd,mm,ini,fim){ // data dd/mm dentro de um período que pode cruzar o ano
    var mi=+ini.slice(3,5), ai=+ini.slice(6), mf=+fim.slice(3,5), af=+fim.slice(6);
    if(ai===af) return af; return mm>=mi?ai:af;
  }
  function iso(a,m,d){ return a+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }

  // ───────────────────────── reconhecimento ─────────────────────────
  function reconhecer(paginas){
    var t=textoPag(paginas[0]||{items:[]});
    if(/Lançamentos do período:/.test(t)&&/Razão Social/.test(t)&&/CNPJ\/CPF/.test(t)) return 'B';
    if(/Extrato de \d{2}\/\d{2}\/\d{4} até \d{2}\/\d{2}\/\d{4}/.test(t)&&/Ag\.\/Origem/.test(t)&&/Valor \(R\$\)/.test(t)) return 'A';
    return null;
  }

  // ───────────────────────── MODELO A ─────────────────────────
  function parseA(paginas){
    var t=textoPag(paginas[0]), pm=/Extrato de (\d{2}\/\d{2}\/\d{4}) até (\d{2}\/\d{2}\/\d{4})/.exec(t);
    if(!pm) return null;
    var ini=pm[1], fim=pm[2];
    var ac=/Agência\/Conta:\s*(\d+)\/([\d-]+)/.exec(t), nome=(/Nome:\s*(.*?)\s+Agência\/Conta:/.exec(t)||[])[1]||'';
    var res={layout:'Itaú Empresas (extrato mensal)', versao:VERSAO, periodo:{ini:ini,fim:fim}, agencia:ac?ac[1]:null, contaCorrente:ac?ac[2]:null, empresaNome:nome.trim(),
             lancamentos:[], saldos:{anterior:null,final:null}, saldosDoDia:[], avisos:[], validacoes:[]};
    var ultimo=null, somaDesdeSaldo=0, saldoAnteriorTotal=null, primeiroSaldoDia=true;
    paginas.forEach(function(pg){
      linhas(pg.items,3).forEach(function(L){
        var its=L.items, primeiro=T(its[0]), todoTxt=its.map(T).join(' ');
        if(L.y<20) return;                                  // rodapé (nº da página)
        if(/^(Itaú|Nome:|Data:|Extrato de)/.test(primeiro)||/Ag\.\/Origem/.test(todoTxt)) return;   // título e cabeçalho de colunas, sem depender de y
        var data=its.filter(function(i){ return i.x<100&&/^\d{2}\/\d{2}$/.test(T(i)); })[0];
        var hist=its.filter(function(i){ return i.x>=100&&i.x<280; }).map(T).join(' ').replace(/\s+/g,' ').trim();
        var valIt=its.filter(function(i){ return r(i)>=430&&r(i)<=485&&RE_VAL.test(T(i)); })[0];
        var salIt=its.filter(function(i){ return r(i)>=540&&r(i)<=595&&RE_VAL.test(T(i)); })[0];
        var origem=its.filter(function(i){ return i.x>=280&&i.x<340; }).map(T).join(' ');
        if(!data){ // linha de continuação do histórico
          if(hist&&ultimo&&!valIt&&!salIt&&!/^Data\b/.test(hist)&&!/^Lançamento/.test(hist)) ultimo.historico=(ultimo.historico+' '+hist).trim();
          return;
        }
        var dd=+data.str.slice(0,2), mm=+data.str.slice(3,5), dataIso=iso(anoDe(dd,mm,ini,fim),mm,dd);
        if(/^SALDO ANTERIOR$/i.test(hist)){ if(salIt) res.saldos.anterior=valorBR(T(salIt)); ultimo=null; return; }
        if(/^S\s*A\s*L\s*D\s*O$/i.test(hist)){ if(salIt) res.saldos.final=valorBR(T(salIt)); ultimo=null; return; }
        if(/^SDO CTA\/APL AUTOMATICAS$/i.test(hist)){                 // saldo (conta + aplicação automática) do dia — não é lançamento
          var s=salIt?valorBR(T(salIt)):null;
          if(s!==null){
            if(!primeiroSaldoDia&&saldoAnteriorTotal!==null){ var esp=cents(saldoAnteriorTotal)+cents(somaDesdeSaldo), real=cents(s); if(esp!==real) res.validacoes.push({codigo:'SALDO_DIA_NAO_BATE',data:dataIso,calculado:esp/100,impresso:s}); }
            res.saldosDoDia.push({data:dataIso,saldo:s}); saldoAnteriorTotal=s; somaDesdeSaldo=0; primeiroSaldoDia=false;
          }
          ultimo=null; return;
        }
        if(!valIt){ res.avisos.push({codigo:'LINHA_SEM_VALOR',pagina:pg.num,mensagem:data.str+' '+hist}); ultimo=null; return; }
        var v=valorBR(T(valIt));
        var l={data:dataIso, historico:hist||'(sem histórico)', valor_entrada:v>0?v:0, valor_saida:v<0?-v:0, documento:origem?origem.trim():null};
        res.lancamentos.push(l); ultimo=l; somaDesdeSaldo+=v;
      });
    });
    if(!res.lancamentos.length) return null;
    // Este modelo NÃO lista as aplicações/resgates automáticos: saldo anterior + movimento ≠ saldo final. Só o saldo do dia é conferido.
    res.observacao=res.saldosDoDia.length>1?('Saldos do dia (conta + aplicação automática) conferidos: '+(res.validacoes.length?res.validacoes.length+' divergência(s).':'todos batem com o movimento.')):'';
    return res;
  }

  // ───────────────────────── MODELO B ─────────────────────────
  function parseB(paginas){
    var t=textoPag(paginas[0]), pm=/Lançamentos do período:\s*(\d{2}\/\d{2}\/\d{4}) até (\d{2}\/\d{2}\/\d{4})/.exec(t);
    if(!pm) return null;
    var ac=/Agência\s+(\d+)\s+Conta\s+([\d-]+)/.exec(t), cn=/CNPJ\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/.exec(t);
    var res={layout:'Itaú Empresas (lançamentos do período)', versao:VERSAO, periodo:{ini:pm[1],fim:pm[2]}, agencia:ac?ac[1]:null, contaCorrente:ac?ac[2]:null, cnpj:cn?cn[1]:null,
             lancamentos:[], saldosDoDia:[], avisos:[], validacoes:[], saldoAnteriorDoc:null, saldoFinalDoc:null};
    // As colunas variam alguns pontos entre arquivos (Lançamentos x=85..90, Razão Social 222..226, Valor r=509..511):
    // derivadas do cabeçalho da tabela na página 1.
    var g={hist:88,raz:222,cnpj:360,valR:511,salR:558,cabY:640};
    (function(){ var its=paginas[0].items;
      var h=function(re){ return its.filter(function(i){ return re.test(T(i))&&i.y<700&&i.y>500; })[0]; };
      var a=h(/^Lançamentos$/), b=h(/^Razão Social$/), c=h(/^CNPJ\/CPF$/), d=h(/^Valor \(R\$\)$/), e=h(/^Saldo \(R\$\)$/);
      if(a&&b&&c&&d&&e){ g={hist:a.x-3,raz:b.x-4,cnpj:c.x-4,valR:r(d),salR:r(e),cabY:a.y}; }
    })();
    var colV=[g.valR-70,g.valR+6], colS=[g.salR-35,g.salR+6], xIni=g.hist, xRaz=g.raz, xCnpj=g.cnpj, xCnpjFim=g.valR-60;
    paginas.forEach(function(pg,ipg){
      var todas=linhas(pg.items,2);
      // âncoras = linhas com data dd/mm/aaaa na primeira coluna; o texto solto ao redor pertence à âncora mais próxima (±9 pt)
      var ancoras=[], soltas=[];
      todas.forEach(function(L){
        if(L.y<30) return;
        if(ipg===0&&L.y>g.cabY-1) return;                    // topo da página 1 até a linha de títulos das colunas (inclusive)
        var d=L.items.filter(function(i){ return i.x<xIni&&/^\d{2}\/\d{2}\/\d{4}$/.test(T(i)); })[0];
        if(/^(Data$|aviso:|novos lançamentos|atualizado em|Em caso de dúvidas)/.test(T(L.items[0]))||/Lançamentos.*Razão Social/.test(L.items.map(T).join(' '))) return;
        if(d) ancoras.push({y:L.y,d:d,its:L.items,antes:[],depois:[]}); else soltas.push(L);
      });
      soltas.forEach(function(L){
        var melhor=null, dist=1e9; ancoras.forEach(function(a){ var dy=Math.abs(a.y-L.y); if(dy<dist){ dist=dy; melhor=a; } });
        if(melhor&&dist<=9){ (L.y>melhor.y?melhor.antes:melhor.depois).push(L); }
        else if(L.items.some(function(i){ return i.x>=xIni; })) res.avisos.push({codigo:'TEXTO_SOLTO',pagina:pg.num,mensagem:L.items.map(T).join(' ').slice(0,100)});
      });
      ancoras.sort(function(a,b){ return b.y-a.y; }).forEach(function(a){
        var partes=function(its,x0,x1){ return its.filter(function(i){ return i.x>=x0&&i.x<x1; }).map(T).join(' '); };
        var histAncora=partes(a.its,xIni,xRaz), razAncora=partes(a.its,xRaz,xCnpj), cnpjAncora=partes(a.its,xCnpj,xCnpjFim);
        var hist=[].concat(a.antes.map(function(L){ return partes(L.items,xIni,xRaz); }),[histAncora],a.depois.map(function(L){ return partes(L.items,xIni,xRaz); })).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
        var raz=[].concat(a.antes.map(function(L){ return partes(L.items,xRaz,xCnpj); }),[razAncora],a.depois.map(function(L){ return partes(L.items,xRaz,xCnpj); })).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
        var cnpj=[cnpjAncora].concat(a.antes.map(function(L){ return partes(L.items,xCnpj,xCnpjFim); }),a.depois.map(function(L){ return partes(L.items,xCnpj,xCnpjFim); })).filter(Boolean).join(' ').trim();
        var vIt=a.its.filter(function(i){ return r(i)>=colV[0]&&r(i)<=colV[1]&&RE_VAL.test(T(i)); })[0], sIt=a.its.filter(function(i){ return r(i)>=colS[0]&&r(i)<=colS[1]&&RE_VAL.test(T(i)); })[0];
        var ds=T(a.d), dataIso=ds.slice(6)+'-'+ds.slice(3,5)+'-'+ds.slice(0,2);
        if(/^SALDO ANTERIOR$/i.test(hist)){ if(sIt) res.saldoAnteriorDoc=valorBR(T(sIt)); return; }
        if(/^SALDO TOTAL DISPONÍVEL DIA$/i.test(hist)){ if(sIt){ res.saldosDoDia.push({data:dataIso,saldo:valorBR(T(sIt))}); } return; }
        if(!vIt){ res.avisos.push({codigo:'LINHA_SEM_VALOR',pagina:pg.num,mensagem:ds+' '+hist}); return; }
        var v=valorBR(T(vIt));
        res.lancamentos.push({data:dataIso, historico:(hist+(raz?' — '+raz:'')).trim(), valor_entrada:v>0?v:0, valor_saida:v<0?-v:0, documento:cnpj||null, razaoSocial:raz||null, cnpjCpf:cnpj||null});
      });
    });
    if(!res.lancamentos.length) return null;
    // saldo do dia = saldo anterior + movimento acumulado até o dia (conferência exata); saldo final = último saldo do dia
    var acum=res.saldoAnteriorDoc===null?null:cents(res.saldoAnteriorDoc);
    if(acum!==null){
      var porDia={}; res.lancamentos.forEach(function(l){ porDia[l.data]=(porDia[l.data]||0)+cents(l.valor_entrada)-cents(l.valor_saida); });
      var dias=Object.keys(porDia).sort();
      res.saldosDoDia.slice().sort(function(a,b){ return a.data<b.data?-1:1; }).forEach(function(sd){
        dias.filter(function(d){ return d<=sd.data; }).forEach(function(d){ if(!porDia['__u'+d]){ porDia['__u'+d]=1; acum+=porDia[d]; } });
        if(acum!==cents(sd.saldo)) res.validacoes.push({codigo:'SALDO_DIA_NAO_BATE',data:sd.data,calculado:acum/100,impresso:sd.saldo});
      });
    }
    if(res.saldosDoDia.length) res.saldoFinalDoc=res.saldosDoDia.slice().sort(function(a,b){ return a.data<b.data?-1:1; }).pop().saldo;
    return res;
  }

  function parse(paginas){ var m=reconhecer(paginas); return m==='A'?parseA(paginas):(m==='B'?parseB(paginas):null); }
  var API={VERSAO:VERSAO, reconhecer:reconhecer, parse:parse, parseA:parseA, parseB:parseB};
  if(typeof module!=='undefined'&&module.exports) module.exports=API; else root.ItauExtratoParsers=API;
})(typeof window!=='undefined'?window:this);
