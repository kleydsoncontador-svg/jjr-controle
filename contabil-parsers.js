/* ═══════════════════════════════════════════════════════════════════════════
   Leitores de BALANCETE e DRE em PDF (Sistema Domínio) — SEM IA — e conferências entre
   Livro Razão × Balancete × DRE. Cada documento tem o SEU parser e as SUAS regras:
     • RAZÃO (razao-parser.js): só contas patrimoniais (1 e 2) como bloco.
     • BALANCETE: TODAS as contas (1 a 6), sintéticas e analíticas + RESUMO DO BALANCETE
       (inclui RESULTADO DO MES e RESULTADO DO EXERCÍCIO, que ficam fora da tabela de contas).
     • DRE: TODAS as linhas (contas, grupos, subtotais e resultado), valor entre parênteses = negativo.
   Entrada: itens do pdf.js [{str,x,y,w}] por página. Valores em centavos inteiros (sem float).
   Roda no navegador (window.ContabilParsers) e no Node (module.exports).
   ═══════════════════════════════════════════════════════════════════════════ */
(function(root){
  'use strict';
  var VERSAO_BAL='balancete-parser 1.0', VERSAO_DRE='dre-parser 1.0';

  // ── utilidades (centavos inteiros) ─────────────────────────────────────
  function centavos(str){ var m=/^(\d{1,3}(?:\.\d{3})*|\d+),(\d\d)$/.exec(String(str||'').trim()); return m?parseInt(m[1].replace(/\./g,'')+m[2],10):null; }
  function parseSaldo(str){ var m=/^(.*?)([DC])?$/.exec(String(str||'').trim()); var c=centavos(m[1]); if(c===null) return null; return {cents:c, lado:(c===0&&!m[2])?null:(m[2]||null)}; }
  function algeb(s){ return !s?0:(s.lado==='C'?-s.cents:s.cents); }            // D positivo, C negativo
  function fmtCent(c){ var neg=c<0; c=Math.abs(c); var s=String(c); while(s.length<3) s='0'+s; var i=s.slice(0,-2).replace(/\B(?=(\d{3})+(?!\d))/g,'.'); return (neg?'-':'')+i+','+s.slice(-2); }
  function r(it){ return it.x+it.w; }
  function T(it){ return String(it.str).trim(); }
  var RE_SALDO=/^(?:\d{1,3}(?:\.\d{3})*|\d+),\d\d[DC]?$/, RE_VAL=/^(?:\d{1,3}(?:\.\d{3})*|\d+),\d\d$/;
  var RE_CNPJ=/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/, RE_PER=/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/;
  function soDigitos(s){ return String(s||'').replace(/\D/g,''); }
  function isoDeBR(d){ return d? d.slice(6)+'-'+d.slice(3,5)+'-'+d.slice(0,2):''; }

  function agruparLinhas(items){
    var its=items.filter(function(i){ return i.str&&T(i); }).slice().sort(function(a,b){ return b.y-a.y||a.x-b.x; });
    var linhas=[], cur=null;
    its.forEach(function(i){ if(cur&&Math.abs(cur.yUlt-i.y)<=1.6){ cur.items.push(i); cur.yUlt=i.y; } else { cur={y:i.y,yUlt:i.y,items:[i]}; linhas.push(cur); } });
    linhas.forEach(function(l){ l.items.sort(function(a,b){ return a.x-b.x; }); });
    return linhas;
  }

  // ── cabeçalho comum (empresa, CNPJ, período) ────────────────────────────
  function lerCabecalho(paginas){
    var cab={empresa:'',cnpj:'',cnpjNum:'',periodoIni:'',periodoFim:'',titulo:''}, cnpjs={};
    paginas.forEach(function(pg,pi){
      agruparLinhas(pg.items).forEach(function(L){
        if(L.y<760) return;
        var its=L.items, txt=its.map(T).join(' ');
        var e=its.filter(function(i){ return T(i)==='Empresa:'; })[0];
        if(e&&!cab.empresa) cab.empresa=its.filter(function(i){ return i.x>e.x+5&&i.x<440&&T(i)!=='Empresa:'; }).map(T).join(' ');
        var c=its.filter(function(i){ return /^C\.N\.P\.J\.:?$/.test(T(i)); })[0];
        if(c){ var m=RE_CNPJ.exec(txt); if(m){ cnpjs[m[0]]=true; if(!cab.cnpj) cab.cnpj=m[0]; } }
        var p=its.filter(function(i){ return /^Per[ií]odo:?$/.test(T(i)); })[0];
        if(p&&!cab.periodoIni){ var pm=RE_PER.exec(txt); if(pm){ cab.periodoIni=pm[1]; cab.periodoFim=pm[2]; } }
        if(pi===0&&!cab.titulo){ var t=its.filter(function(i){ return /^(BALANCETE|RAZÃO|DEMONSTRAÇÃO DO RESULTADO)/.test(T(i)); })[0]; if(t) cab.titulo=T(t); }
      });
    });
    cab.cnpjNum=soDigitos(cab.cnpj); cab.cnpjsDistintos=Object.keys(cnpjs);
    return cab;
  }
  function tipoDoDocumento(paginas){
    var c=lerCabecalho(paginas.slice(0,1)), t=c.titulo||'';
    if(/^BALANCETE/.test(t)) return 'TRIAL_BALANCE';
    if(/^RAZÃO/.test(t)) return 'GENERAL_LEDGER';
    if(/^DEMONSTRAÇÃO DO RESULTADO/.test(t)) return 'INCOME_STATEMENT';
    return null;
  }
  function competencia(ini,fim){ // AAAA-MM se o período está dentro de um único mês; senão null
    if(!ini||!fim) return null; var a=isoDeBR(ini).slice(0,7), b=isoDeBR(fim).slice(0,7); return a===b?a:null;
  }

  // ═════════════════════════ BALANCETE ═════════════════════════════════════
  // Colunas da tabela principal (borda direita): Saldo Anterior≈369, Débito≈438, Crédito≈504, Saldo Atual≈569.
  // Colunas do RESUMO (borda direita): ≈398 / 452 / 507 / 569 (blocos diferentes → parser próprio).
  var BAL={ ant:[362,376], deb:[430,446], cred:[496,512], atu:[560,576], cod:{rmax:32}, cls:{xmin:28,xmax:34},
            rAnt:[380,420], rDeb:[430,470], rCred:[485,525], rAtu:[540,580], rotuloXmax:300 };
  var ROTULOS_RESUMO=[ ['RESULTADO DO EXERCÍCIO','RESULTADO_EXERCICIO'], ['RESULTADO DO EXERCICIO','RESULTADO_EXERCICIO'], ['RESULTADO DO MES','RESULTADO_MES'], ['RESULTADO DO MÊS','RESULTADO_MES'],
    ['CONTAS DE RESULTADO - RECEITAS','RECEITAS'], ['CONTAS DE RESULTADOS - CUSTOS E DESPESAS','CUSTOS_DESPESAS'], ['CONTAS DE RESULTADO - CUSTOS E DESPESAS','CUSTOS_DESPESAS'],
    ['CONTAS DE APURAÇÃO','APURACAO'], ['CONTAS DE COMPENSAÇÃO','COMPENSACAO'], ['CONTAS DEVEDORAS','DEVEDORAS'], ['CONTAS CREDORAS','CREDORAS'],
    ['PATRIMÔNIO LÍQUIDO','PATRIMONIO_LIQUIDO'], ['PATRIMONIO LIQUIDO','PATRIMONIO_LIQUIDO'], ['PASSIVO','PASSIVO'], ['ATIVO','ATIVO'] ];
  function chaveResumo(rotulo){ var u=String(rotulo||'').toUpperCase().replace(/\s+/g,' ').trim(); for(var k=0;k<ROTULOS_RESUMO.length;k++){ if(u===ROTULOS_RESUMO[k][0]) return ROTULOS_RESUMO[k][1]; } return null; }
  function naFaixa(it,f){ var x=r(it); return x>=f[0]&&x<=f[1]; }
  function tipoResultado(lado,cents){ if(!cents) return 'ZERO'; return lado==='D'?'PREJUIZO':'LUCRO'; }
  function assinado(lado,cents){ return !cents?0:(lado==='D'?-cents:cents); }   // resultado: C(+) lucro, D(−) prejuízo

  function parseBalancete(paginas){
    var res={versao:VERSAO_BAL, tipo:'TRIAL_BALANCE', cabecalho:lerCabecalho(paginas), contas:[], resumo:[], resultados:{}, avisos:[], validacoes:[], paginas:paginas.length};
    function aviso(cod,pg,msg){ res.avisos.push({codigo:cod,pagina:pg,mensagem:msg}); }
    var noResumo=false;
    paginas.forEach(function(pg){
      agruparLinhas(pg.items).forEach(function(L){
        var its=L.items, y=L.y; if(y>768||y<8) return;
        var txt=its.map(T).join(' ');
        if(/^RESUMO DO BALANCETE/.test(txt)){ noResumo=true; return; }
        if(noResumo){
          // linhas do RESUMO: rótulo à esquerda + 4 valores por FAIXA de coordenada (não pela ordem do texto)
          var rot=its.filter(function(i){ return i.x<BAL.rotuloXmax && !RE_SALDO.test(T(i)); }).map(T).join(' ').trim();
          var vals=its.filter(function(i){ return RE_SALDO.test(T(i)); });
          if(!rot||!vals.length) return;
          var A=vals.filter(function(i){ return naFaixa(i,BAL.rAnt); })[0], D=vals.filter(function(i){ return naFaixa(i,BAL.rDeb); })[0],
              C=vals.filter(function(i){ return naFaixa(i,BAL.rCred); })[0], U=vals.filter(function(i){ return naFaixa(i,BAL.rAtu); })[0];
          if(!A||!D||!C||!U){ aviso('RESUMO_LINHA_INCOMPLETA',pg.num,'Resumo "'+rot+'": não achei as 4 colunas por coordenada.'); return; }
          res.resumo.push({chave:chaveResumo(rot), rotulo:rot, ant:parseSaldo(T(A)), deb:centavos(T(D)), cred:centavos(T(C)), atu:parseSaldo(T(U))});
          return;
        }
        // linhas de conta: código (borda direita ≈25), classificação (x≈30), descrição, 4 valores
        var cls=its.filter(function(i){ return i.x>=BAL.cls.xmin&&i.x<=BAL.cls.xmax&&/^\d+(\.\d+)*$/.test(T(i)); })[0];
        if(!cls) return; // cabeçalho de coluna, cópias de texto (x≈1) etc.
        var cod=its.filter(function(i){ return r(i)<=BAL.cod.rmax&&/^\d+$/.test(T(i)); })[0];
        var desc=its.filter(function(i){ return i.x>=100&&i.x<312&&!RE_SALDO.test(T(i)); }).map(T).join(' ');
        var vA=its.filter(function(i){ return naFaixa(i,BAL.ant)&&RE_SALDO.test(T(i)); })[0], vD=its.filter(function(i){ return naFaixa(i,BAL.deb)&&RE_VAL.test(T(i)); })[0],
            vC=its.filter(function(i){ return naFaixa(i,BAL.cred)&&RE_VAL.test(T(i)); })[0], vU=its.filter(function(i){ return naFaixa(i,BAL.atu)&&RE_SALDO.test(T(i)); })[0];
        if(!cod||!vA||!vD||!vC||!vU){ aviso('CONTA_INCOMPLETA',pg.num,'Linha de conta ilegível: '+txt.slice(0,110)); return; }
        res.contas.push({pagina:pg.num, codigo:T(cod), classificacao:T(cls), descricao:desc.replace(/\s+/g,' ').trim(), nivel:T(cls).split('.').length,
                         ant:parseSaldo(T(vA)), deb:centavos(T(vD)), cred:centavos(T(vC)), atu:parseSaldo(T(vU))});
      });
    });
    // analítica = nenhuma outra classificação começa com ela + "."
    var todas={}; res.contas.forEach(function(c){ todas[c.classificacao]=true; });
    var prefixos={}; res.contas.forEach(function(c){ var s=c.classificacao.split('.'); for(var k=1;k<s.length;k++) prefixos[s.slice(0,k).join('.')]=true; });
    res.contas.forEach(function(c){ c.analitica=!prefixos[c.classificacao]; c.grupoRaiz=c.classificacao.split('.')[0]; });

    // ── validação linha a linha: saldo atual = saldo anterior + débito − crédito ──
    res.contas.forEach(function(c){
      var esp=algeb(c.ant)+c.deb-c.cred, real=algeb(c.atu);
      if(esp!==real) res.validacoes.push({codigo:'ROW_BALANCE_MISMATCH',conta:c.codigo,classificacao:c.classificacao,esperado:esp,impresso:real});
    });
    // ── resultado do mês / do exercício — lidos DIRETAMENTE das linhas do RESUMO ──
    var rm=res.resumo.filter(function(x){ return x.chave==='RESULTADO_MES'; })[0], re=res.resumo.filter(function(x){ return x.chave==='RESULTADO_EXERCICIO'; })[0];
    if(!rm) aviso('RESULTADO_MES_NAO_ENCONTRADO',paginas.length,'Linha "RESULTADO DO MES" não encontrada no resumo do balancete.');
    if(!re) aviso('RESULTADO_EXERCICIO_NAO_ENCONTRADO',paginas.length,'Linha "RESULTADO DO EXERCÍCIO" não encontrada no resumo do balancete.');
    var ini=res.cabecalho.periodoIni, fim=res.cabecalho.periodoFim;
    if(rm){
      var lado=rm.atu.lado, val=rm.atu.cents;
      res.resultados.mes={cents:val, lado:lado, tipo:tipoResultado(lado,val), assinado:assinado(lado,val), periodoIni:ini, periodoFim:fim, linha:rm};
      // movimentação: saldo anterior (D+) + débitos − créditos, invertido para "resultado" (C+ lucro): créditos − débitos (− saldo anterior devedor)
      var calc=-(algeb(rm.ant)+rm.deb-rm.cred);           // positivo = lucro
      if(calc!==res.resultados.mes.assinado) res.validacoes.push({codigo:'MONTH_RESULT_MISMATCH',calculado:calc,impresso:res.resultados.mes.assinado});
    }
    if(re){
      var lado2=re.atu.lado, val2=re.atu.cents;
      res.resultados.exercicio={cents:val2, lado:lado2, tipo:tipoResultado(lado2,val2), assinado:assinado(lado2,val2), periodoIni:(ini?('01/01/'+ini.slice(6)):ini), periodoFim:fim, linha:re};
      // conferência do usuário: créditos − débitos da própria linha = saldo final. Alternativa equivalente: saldo anterior + resultado do mês.
      var porLinha=re.cred-re.deb;
      var viaMes=rm?(-algeb(re.ant)+res.resultados.mes.assinado)+0:null; // ant (C=+) já convertido abaixo
      var antAss=assinado(re.ant.lado,re.ant.cents);
      var viaMes2=rm?(antAss+res.resultados.mes.assinado):null;
      var ok=(porLinha===res.resultados.exercicio.assinado)||(viaMes2!==null&&viaMes2===res.resultados.exercicio.assinado);
      if(!ok) res.validacoes.push({codigo:'EXERCISE_RESULT_MISMATCH',calculadoPorLinha:porLinha,calculadoPeloMes:viaMes2,impresso:res.resultados.exercicio.assinado});
    }
    // ── conferência do resumo com a tabela: ATIVO do resumo = conta sintética "1" ──
    var ativoRes=res.resumo.filter(function(x){ return x.chave==='ATIVO'; })[0], ativoTab=res.contas.filter(function(c){ return c.classificacao==='1'; })[0];
    if(ativoRes&&ativoTab&&algeb(ativoRes.atu)!==algeb(ativoTab.atu)) res.validacoes.push({codigo:'SUMMARY_MISMATCH',item:'ATIVO',resumo:algeb(ativoRes.atu),tabela:algeb(ativoTab.atu)});
    res.competencia=competencia(ini,fim);
    return res;
  }

  // ═════════════════════════ DRE ═══════════════════════════════════════════
  // Colunas: Código (borda direita ≈25), Classificação (x 30–60), Descrição (x≥110), Saldo Atual (borda direita ≈549).
  var DRE={ cod:{rmax:32}, cls:{xmin:28,xmax:70}, desc:{xmin:100,xmax:480}, val:[535,560] };
  function parseValorDRE(str){ // "(3.102,50)" → −310250 ; "85.000,00" → +8500000
    var s=String(str||'').trim(), neg=/^\(.*\)$/.test(s), core=neg?s.slice(1,-1):s, c=centavos(core);
    return c===null?null:(neg?-c:c);
  }
  function parseDRE(paginas){
    var res={versao:VERSAO_DRE, tipo:'INCOME_STATEMENT', cabecalho:lerCabecalho(paginas), linhas:[], avisos:[], validacoes:[], resultado:null, paginas:paginas.length};
    function aviso(cod,pg,msg){ res.avisos.push({codigo:cod,pagina:pg,mensagem:msg}); }
    var fim=false, seq=0;
    paginas.forEach(function(pg){
      agruparLinhas(pg.items).forEach(function(L){
        if(fim) return; var its=L.items, y=L.y; if(y>760||y<8) return;
        var txt=its.map(T).join(' ');
        if(/_{6,}/.test(txt)){ fim=true; return; }           // bloco de assinaturas: não é linha da DRE
        if(/^Código\s+Classificação/.test(txt)||/DEMONSTRAÇÃO DO RESULTADO/.test(txt)) return;
        var v=its.filter(function(i){ var x=r(i); return x>=DRE.val[0]&&x<=DRE.val[1]&&/^\(?(?:\d{1,3}(?:\.\d{3})*|\d+),\d\d\)?$/.test(T(i)); })[0];
        var junto=its.filter(function(i){ return i.x<DRE.cls.xmax&&/^\d+\s+\d+(?:\.\d+)+$/.test(T(i)); })[0];   // "535 4.2.3.01.000001" num único item
        var cls=junto?null:its.filter(function(i){ return i.x>=DRE.cls.xmin&&i.x<=DRE.cls.xmax&&/^\d+(\.\d+)+$/.test(T(i)); })[0];
        var cod=junto?null:its.filter(function(i){ return r(i)<=DRE.cod.rmax&&/^\d+$/.test(T(i)); })[0];
        var codTxt=junto?T(junto).split(/\s+/)[0]:(cod?T(cod):null), clsTxt=junto?T(junto).split(/\s+/)[1]:(cls?T(cls):null);
        var descIts=its.filter(function(i){ return i.x>=DRE.desc.xmin&&i.x<=DRE.desc.xmax&&!(v&&i===v)&&i!==cls&&i!==cod&&i!==junto; });
        var desc=descIts.map(T).join(' ').replace(/\s+/g,' ').trim();
        if(!desc&&!v) return;
        var recuo=descIts.length?Math.round(descIts[0].x):null;
        seq++;
        var l={ordem:seq, pagina:pg.num, codigo:codTxt, classificacao:clsTxt, descricao:desc, recuo:recuo,
                valor:v?parseValorDRE(T(v)):null, valorTexto:v?T(v):null};
        l.temValor=l.valor!==null;
        res.linhas.push(l);
      });
    });
    // resultado final: linha "LUCRO DO EXERCÍCIO"/"PREJUÍZO DO EXERCÍCIO" (o alcance é o PERÍODO DO CABEÇALHO)
    var fin=res.linhas.filter(function(l){ return l.temValor&&/^(LUCRO|PREJU[IÍ]ZO)\s+DO\s+(EXERC[IÍ]CIO|PER[IÍ]ODO)/i.test(l.descricao); }).pop();
    if(fin){
      var rotuloPrej=/^PREJU/i.test(fin.descricao), v=fin.valor;
      res.resultado={cents:Math.abs(v), tipo:v===0?'ZERO':(rotuloPrej?'PREJUIZO':'LUCRO'), assinado:rotuloPrej?-Math.abs(v):Math.abs(v), impresso:fin.valorTexto, rotulo:fin.descricao,
                     periodoIni:res.cabecalho.periodoIni, periodoFim:res.cabecalho.periodoFim, escopo:null};
      // coerência do rótulo com o sinal impresso: prejuízo vem entre parênteses (negativo)
      if((rotuloPrej&&v>0)||(!rotuloPrej&&v<0)) res.validacoes.push({codigo:'RESULT_SIGN_MISMATCH',rotulo:fin.descricao,impresso:fin.valorTexto});
      var comp=competencia(res.cabecalho.periodoIni,res.cabecalho.periodoFim);
      res.resultado.escopo=comp?'MENSAL':((res.cabecalho.periodoIni||'').slice(0,5)==='01/01'?'ACUMULADO_EXERCICIO':'PERIODO');
    } else aviso('RESULTADO_DRE_NAO_ENCONTRADO',paginas.length,'Linha "LUCRO/PREJUÍZO DO EXERCÍCIO" não encontrada na DRE.');
    res.competencia=competencia(res.cabecalho.periodoIni,res.cabecalho.periodoFim);
    return res;
  }

  // ═════════════════ CONFERÊNCIAS ENTRE OS DOCUMENTOS ══════════════════════
  // compara períodos: mesma data inicial e final?
  function mesmoPeriodo(a,b){ return a.periodoIni===b.periodoIni&&a.periodoFim===b.periodoFim; }
  // Balancete × DRE: resultado do MÊS (do balancete) contra o resultado da DRE, algebricamente e só se os períodos forem equivalentes
  function conciliarBalanceteDRE(bal, dre){
    if(bal.cabecalho.cnpjNum!==dre.cabecalho.cnpjNum) return {status:'COMPANY_MISMATCH'};
    var pb={periodoIni:bal.cabecalho.periodoIni,periodoFim:bal.cabecalho.periodoFim}, pd={periodoIni:dre.cabecalho.periodoIni,periodoFim:dre.cabecalho.periodoFim};
    if(!dre.resultado||!bal.resultados.mes) return {status:'INCOMPLETO'};
    if(mesmoPeriodo(pb,pd)){
      var a=bal.resultados.mes.assinado, b=dre.resultado.assinado;
      return {status:a===b?'CONCILIADO':'DIVERGENTE', comparacao:'RESULTADO_MENSAL', balancete:a, dre:b, diferenca:a-b};
    }
    // DRE acumulada do exercício × resultado do exercício do balancete
    if(bal.resultados.exercicio&&pd.periodoIni===bal.resultados.exercicio.periodoIni&&pd.periodoFim===bal.resultados.exercicio.periodoFim){
      var a2=bal.resultados.exercicio.assinado, b2=dre.resultado.assinado;
      return {status:a2===b2?'CONCILIADO':'DIVERGENTE', comparacao:'RESULTADO_ACUMULADO', balancete:a2, dre:b2, diferenca:a2-b2};
    }
    return {status:'PERIOD_MISMATCH', mensagem:'Períodos diferentes: balancete '+pb.periodoIni+' a '+pb.periodoFim+' × DRE '+pd.periodoIni+' a '+pd.periodoFim+' — não comparados automaticamente.'};
  }
  // O Razão precisa abranger o período do balancete
  function razaoCobre(razaoCab, ini, fim){
    var toN=function(d){ return d?parseInt(isoDeBR(d).replace(/-/g,''),10):0; };
    return toN(razaoCab.periodoIni)<=toN(ini)&&toN(razaoCab.periodoFim)>=toN(fim);
  }
  // Balancete × Razão, conta a conta, SÓ para a competência do balancete (o Razão pode ser de período maior:
  // jan–jun × balancete de junho → só os lançamentos de junho entram; o saldo encadeia desde o saldo anterior).
  // ── Modelo do Razão para conciliar: só o que importa (abertura, e por mês: débitos/créditos/fechamento/apuração).
  // Serve tanto para o resultado do parser (arquivo recém-lido) quanto para linhas lidas do Supabase.
  function modeloRazao(raz){
    var meses={}; (raz.resumo||[]).forEach(function(m){ (meses[m.conta]=meses[m.conta]||{})[m.anoMes]={deb:m.deb,cred:m.cred,fechAlg:m.fechamentoAlg,apuDeb:m.apuDeb||0,apuCred:m.apuCred||0}; });
    return {cabecalho:{cnpj:raz.cabecalho.cnpj, periodoIni:raz.cabecalho.periodoIni, periodoFim:raz.cabecalho.periodoFim},
            contas:(raz.contas||[]).map(function(c){ return {codigo:c.codigo, descricao:c.descricao, aberturaAlg:algeb(c.saldoAnt), meses:meses[c.codigo]||{}}; })};
  }
  // saldo (algébrico) da conta ao FIM da competência: mês com movimento → fechamento dele; senão o do último mês anterior com movimento; senão a abertura
  function estadoNaCompetencia(c, comp, semApuracao){
    var m=c.meses[comp], deb=0, cred=0, saldo;
    if(m){ deb=m.deb; cred=m.cred; saldo=m.fechAlg; if(semApuracao){ deb-=m.apuDeb; cred-=m.apuCred; saldo-= (m.apuDeb-m.apuCred); } }
    else { var ant=Object.keys(c.meses).filter(function(k){ return k<comp; }).sort().pop(); saldo=ant?c.meses[ant].fechAlg:c.aberturaAlg; }
    // a apuração de meses ANTERIORES continua valendo (só a do mês conciliado é desconsiderada na hipótese alternativa)
    return {deb:deb, cred:cred, saldo:saldo};
  }
  function conciliarBalanceteRazao(bal, razao){
    var mod=(razao.contas&&razao.contas[0]&&razao.contas[0].lancs)||(razao.resumo)?modeloRazao(razao):razao;
    if(bal.cabecalho.cnpjNum!==soDigitos(mod.cabecalho.cnpj)) return {status:'COMPANY_MISMATCH'};
    var comp=bal.competencia; if(!comp) return {status:'PERIOD_MISMATCH', mensagem:'Balancete não é de um único mês.'};
    if(!razaoCobre(mod.cabecalho,bal.cabecalho.periodoIni,bal.cabecalho.periodoFim)) return {status:'PERIOD_NOT_COVERED', mensagem:'O Livro Razão ('+mod.cabecalho.periodoIni+' a '+mod.cabecalho.periodoFim+') não cobre o período do balancete.'};
    var porConta={}; bal.contas.forEach(function(c){ if(c.analitica) porConta[c.codigo]=c; });
    var itens=[], n={CONCILIADO:0, CONCILIADO_ZERADA:0, DIVERGENTE_APURACAO:0, DIVERGENTE:0};
    mod.contas.forEach(function(c){
      var b=porConta[c.codigo], a=estadoNaCompetencia(c,comp,false);
      var alvo=b?{deb:b.deb,cred:b.cred,saldo:algeb(b.atu)}:{deb:0,cred:0,saldo:0};   // conta ausente do balancete = sem movimento e saldo zero
      var bate=function(x){ return x.deb===alvo.deb&&x.cred===alvo.cred&&x.saldo===alvo.saldo; };
      var situ, expl=null;
      if(bate(a)) situ=b?'CONCILIADO':'CONCILIADO_ZERADA';
      else { var sa=estadoNaCompetencia(c,comp,true);
        if(bate(sa)){ situ='DIVERGENTE_APURACAO'; expl='O Razão contém lançamento de "Apuração do Resultado" em '+comp+' que o Balancete não considera.'; }
        else situ='DIVERGENTE'; }
      n[situ]++;
      itens.push({conta:c.codigo, descricao:c.descricao, situacao:situ, explicacao:expl,
                  razao:{deb:a.deb,cred:a.cred,saldoFinal:a.saldo}, balancete:b?{deb:b.deb,cred:b.cred,saldoAtual:algeb(b.atu)}:null});
    });
    var semRazao=bal.contas.filter(function(c){ return c.analitica&&/^[12]/.test(c.classificacao)&&!mod.contas.some(function(x){ return x.codigo===c.codigo; }); }).map(function(c){ return c.codigo; });
    var status=n.DIVERGENTE||semRazao.length?'DIVERGENTE':(n.DIVERGENTE_APURACAO?'CONCILIADO_COM_RESSALVA':'CONCILIADO');
    return {status:status, competencia:comp, contas:itens.length, resumo:n, contasSemRazao:semRazao, itens:itens};
  }

  var API={ tipoDoDocumento:tipoDoDocumento, lerCabecalho:lerCabecalho, competencia:competencia, parseBalancete:parseBalancete, parseDRE:parseDRE,
            conciliarBalanceteDRE:conciliarBalanceteDRE, conciliarBalanceteRazao:conciliarBalanceteRazao, modeloRazao:modeloRazao, razaoCobre:razaoCobre,
            centavos:centavos, parseSaldo:parseSaldo, fmtCent:fmtCent, algeb:algeb, soDigitos:soDigitos, isoDeBR:isoDeBR, VERSAO_BAL:VERSAO_BAL, VERSAO_DRE:VERSAO_DRE };
  if(typeof module!=='undefined'&&module.exports) module.exports=API; else root.ContabilParsers=API;
})(typeof window!=='undefined'?window:this);
