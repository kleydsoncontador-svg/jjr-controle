/* ═══════════════════════════════════════════════════════════════════════════
   Leitor de Livro Razão em PDF (Sistema Domínio) — SEM IA.
   Recebe os itens de texto do pdf.js (texto + coordenadas) e devolve dados estruturados.
   Roda igual no navegador (window.RazaoParser) e no Node (module.exports) para poder ser
   testado com o PDF real.

   Regras principais (pedido do usuário, 21/09/2026):
   - Empresa/CNPJ/período vêm do cabeçalho; nunca do nome do arquivo.
   - Só contas PATRIMONIAIS (classificação começando com 1 ou 2) viram registros próprios;
     3/4/5/6 (resultado) são reconhecidas só para NÃO virarem bloco — mas continuam aparecendo
     como contrapartida dos lançamentos patrimoniais.
   - A decisão é pela CLASSIFICAÇÃO por segmentos ("1.1" ≠ "11"), nunca pelo código reduzido.
   - Débito/crédito pela COLUNA física (posição x), nunca pelo sinal. Valores em centavos inteiros.
   - Saldo D/C mantido separado do valor. SALDO ANTERIOR não é lançamento.
   - Uma conta continua entre páginas; muda só quando aparece outro cabeçalho de conta.
   - Histórico multilinha reconstruído por coordenadas; cópias repetidas da camada de texto
     (x≈1, 146, 288, 416) são ignoradas — o texto real da coluna Histórico começa em x≈81.
   - "Total do mês" é totalizador (conferência), não lançamento.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(root){
  'use strict';
  var VERSAO='razao-parser 1.0';

  // ── utilidades numéricas (centavos inteiros, sem ponto flutuante) ────────
  function centavos(str){
    var m=/^(\d{1,3}(?:\.\d{3})*|\d+),(\d\d)$/.exec(String(str||'').trim());
    if(!m) return null;
    return parseInt(m[1].replace(/\./g,'')+m[2],10);
  }
  function parseSaldo(str){
    var s=String(str||'').trim(), m=/^(.*?)([DC])?$/.exec(s);
    var c=centavos(m[1]); if(c===null) return null;
    return {cents:c, lado:c===0&&!m[2]?null:(m[2]||null)};
  }
  function algebrico(s){ if(!s) return 0; return s.lado==='C'?-s.cents:s.cents; }
  function deAlgebrico(v){ return v===0?{cents:0,lado:null}:{cents:Math.abs(v),lado:v>0?'D':'C'}; }
  function fmtCent(c){ var neg=c<0; c=Math.abs(c); var s=String(c); while(s.length<3) s='0'+s; var i=s.slice(0,-2), d=s.slice(-2); i=i.replace(/\B(?=(\d{3})+(?!\d))/g,'.'); return (neg?'-':'')+i+','+d; }

  // ── grupo patrimonial pela CLASSIFICAÇÃO (por segmentos) ────────────────
  function grupoDaClassificacao(classif, cfg){
    var seg=String(classif||'').split('.');
    var s0=seg[0], s1=seg[1];
    var pl=(cfg&&cfg.plPrefixos)||['2.3','2.4'];
    if(s0==='1'){ if(s1==='1') return 'Ativo Circulante'; if(s1==='2') return 'Ativo Não Circulante'; return 'Ativo'; }
    if(s0==='2'){
      if(pl.indexOf(s0+'.'+s1)>=0) return 'Patrimônio Líquido';
      if(s1==='1') return 'Passivo Circulante';
      if(s1==='2') return 'Passivo Não Circulante';
      return 'Passivo';
    }
    return null; // 3,4,5,6 (resultado) ou desconhecido → não é conta principal
  }

  // ── geometria das colunas (pontos PDF, medidos no modelo "MRS Razão.pdf") ─
  var COL={ data:{xmax:8}, numero:{rmin:70,rmax:84}, hist:{xmin:78,xmax:90},
            contra:{xmin:330,rmin:340,rmax:372}, deb:{rmin:405,rmax:428}, cred:{rmin:466,rmax:487}, saldo:{rmin:550,rmax:580},
            desc:{xmin:205,xmax:215}, totalx:{xmin:315,xmax:330} };
  function r(it){ return it.x+it.w; }
  var RE_DATA=/^\d{2}\/\d{2}\/\d{4}$/, RE_VAL=/^\d{1,3}(?:\.\d{3})*,\d\d$|^\d+,\d\d$/, RE_SALDO=/^(?:\d{1,3}(?:\.\d{3})*|\d+),\d\d[DC]?$/;

  // agrupa itens em linhas visuais (mesma linha = y a menos de 1,6 pt)
  function agruparLinhas(items){
    var its=items.filter(function(i){ return i.str && String(i.str).trim(); }).slice().sort(function(a,b){ return b.y-a.y || a.x-b.x; });
    var linhas=[], cur=null;
    its.forEach(function(i){
      if(cur && Math.abs(cur.yUlt-i.y)<=1.6){ cur.items.push(i); cur.yUlt=i.y; }
      else { cur={y:i.y, yUlt:i.y, items:[i]}; linhas.push(cur); }
    });
    return linhas;
  }
  function textoHistorico(items){
    // só a coluna Histórico "de verdade" (x≈81); cópias em x=1/146/288/416 são artefato da camada de texto
    var h=items.filter(function(i){ return i.x>=COL.hist.xmin && i.x<=COL.hist.xmax && !RE_DATA.test(i.str); })
               .sort(function(a,b){ return a.x-b.x; }).map(function(i){ return String(i.str).replace(/\s+/g,' ').trim(); });
    // se por acaso a mesma linha veio duplicada exatamente, mantém uma
    var out=[]; h.forEach(function(t){ if(out.indexOf(t)<0) out.push(t); });
    return out.join(' ').trim();
  }

  function parse(paginas, opts){
    opts=opts||{};
    var cfg={plPrefixos:opts.plPrefixos||['2.3','2.4']};
    var res={versao:VERSAO, cabecalho:{empresa:'',cnpj:'',periodoIni:'',periodoFim:''}, paginas:paginas.length,
             contas:[], excluidas:[], avisos:[], info:[], mismatches:[], totaisMes:[], resumo:[], config:cfg};
    var contaAtual=null, ultimoLanc=null, aguardandoDescricao=false, cnpjsVistos={};
    function aviso(cod,pag,msg){ res.avisos.push({codigo:cod,pagina:pag,mensagem:msg}); }

    paginas.forEach(function(pg){
      var linhas=agruparLinhas(pg.items);
      linhas.forEach(function(L){
        var its=L.items, y=L.y;
        var textos=its.map(function(i){ return String(i.str).trim(); });
        // ── cabeçalho do relatório (topo) ──
        var iEmp=its.filter(function(i){ return String(i.str).trim()==='Empresa:'; })[0];
        if(iEmp){ var nome=its.filter(function(i){ return i.x>=60&&i.x<400&&String(i.str).trim()!=='Empresa:'; }).map(function(i){return String(i.str).trim();}).join(' ');
                  if(!res.cabecalho.empresa) res.cabecalho.empresa=nome; return; }
        var iCnpj=its.filter(function(i){ return /^C\.N\.P\.J\.:?$/.test(String(i.str).trim()); })[0];
        if(iCnpj){ var c=its.filter(function(i){ return i.x>=60&&/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(i.str); })[0];
                   if(c){ var cn=(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.exec(c.str)||[''])[0]; cnpjsVistos[cn]=true; if(!res.cabecalho.cnpj) res.cabecalho.cnpj=cn; } return; }
        var iPer=its.filter(function(i){ return /^Per[ií]odo:?$/.test(String(i.str).trim()); })[0];
        if(iPer){ var pm=/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/.exec(textos.join(' '));
                  if(pm&&!res.cabecalho.periodoIni){ res.cabecalho.periodoIni=pm[1]; res.cabecalho.periodoFim=pm[2]; } return; }
        if(y>770 || y<8) return; // título/colunas do relatório e rodapé "Sistema licenciado…"

        // ── cabeçalho de conta ──
        var iConta=its.filter(function(i){ return String(i.str).trim()==='Conta:' && i.x<8; })[0];
        if(iConta){
          var cod=its.filter(function(i){ return i.x>=20&&r(i)>=56&&r(i)<=72&&/^\d+$/.test(String(i.str).trim()); })[0];
          var cls=its.filter(function(i){ return i.x>=70&&i.x<200&&/^\d+(\.\d+)+$/.test(String(i.str).trim()); })[0];
          var dsc=its.filter(function(i){ return i.x>=COL.desc.xmin&&i.x<=COL.desc.xmax; }).map(function(i){return String(i.str).trim();}).join(' ');
          if(!cod||!cls){ aviso('CABECALHO_CONTA_ILEGIVEL',pg.num,'Linha "Conta:" sem código/classificação legíveis.'); contaAtual=null; return; }
          var codigo=String(cod.str).trim(), classif=String(cls.str).trim();
          ultimoLanc=null;
          if(contaAtual && contaAtual.codigo===codigo){ aguardandoDescricao=false; return; } // continuação (mudança de folha)
          var grupo=grupoDaClassificacao(classif,cfg);
          contaAtual={codigo:codigo, classificacao:classif, descricao:dsc, grupo:grupo, incluida:!!grupo, saldoAnt:null, lancs:[], paginaIni:pg.num, totais:[]};
          aguardandoDescricao=true;
          (grupo?res.contas:res.excluidas).push(contaAtual);
          return;
        }
        if(!contaAtual) return;
        // descrição da conta em mais de uma linha (x≈210, logo abaixo do cabeçalho)
        if(aguardandoDescricao){
          var soDesc=its.every(function(i){ return (i.x>=COL.desc.xmin&&i.x<=COL.desc.xmax) || i.x<8 || Math.abs(i.x-146)<2 || Math.abs(i.x-288)<2 || Math.abs(i.x-416)<2 || (i.x>=0&&i.x<3); });
          var d2=its.filter(function(i){ return i.x>=COL.desc.xmin&&i.x<=COL.desc.xmax; }).map(function(i){return String(i.str).trim();}).join(' ');
          var temX81=its.some(function(i){ return i.x>=COL.hist.xmin&&i.x<=COL.hist.xmax; });
          var temDataOuTotal=its.some(function(i){ return RE_DATA.test(String(i.str).trim())||String(i.str).trim()==='Total do mês:'; });
          if(soDesc && !temX81 && !temDataOuTotal){ if(d2) contaAtual.descricao=(contaAtual.descricao+' '+d2).trim(); return; }
          aguardandoDescricao=false;
        }
        // ── SALDO ANTERIOR ──
        var iSA=its.filter(function(i){ return String(i.str).trim()==='SALDO ANTERIOR'; })[0];
        if(iSA){
          var vs=its.filter(function(i){ return r(i)>=COL.saldo.rmin&&r(i)<=COL.saldo.rmax&&RE_SALDO.test(String(i.str).trim()); })[0];
          if(vs && !contaAtual.saldoAnt) contaAtual.saldoAnt=parseSaldo(vs.str);
          else if(!vs) aviso('SALDO_ANTERIOR_SEM_VALOR',pg.num,'Conta '+contaAtual.codigo+': SALDO ANTERIOR sem valor.');
          ultimoLanc=null; return;
        }
        // ── Total do mês ──
        if(textos.indexOf('Total do mês:')>=0){
          var td=its.filter(function(i){ return r(i)>=COL.deb.rmin&&r(i)<=COL.deb.rmax&&RE_VAL.test(String(i.str).trim()); })[0];
          var tc=its.filter(function(i){ return r(i)>=COL.cred.rmin&&r(i)<=COL.cred.rmax&&RE_VAL.test(String(i.str).trim()); })[0];
          contaAtual.totais.push({pagina:pg.num, deb:td?centavos(td.str):null, cred:tc?centavos(tc.str):null, aposLanc:contaAtual.lancs.length});
          ultimoLanc=null; return;
        }
        // ── lançamento ──
        var iData=its.filter(function(i){ return i.x<COL.data.xmax&&RE_DATA.test(String(i.str).trim()); })[0];
        if(iData){
          var dt=String(iData.str).trim();
          var num=its.filter(function(i){ return r(i)>=COL.numero.rmin&&r(i)<=COL.numero.rmax&&/^\d+$/.test(String(i.str).trim()); })[0];
          var ct=its.filter(function(i){ return i.x>=COL.contra.xmin&&r(i)>=COL.contra.rmin&&r(i)<=COL.contra.rmax; }).map(function(i){return String(i.str).trim();}).join(' ');
          var dItem=its.filter(function(i){ return r(i)>=COL.deb.rmin&&r(i)<=COL.deb.rmax&&RE_VAL.test(String(i.str).trim()); })[0];
          var cItem=its.filter(function(i){ return r(i)>=COL.cred.rmin&&r(i)<=COL.cred.rmax&&RE_VAL.test(String(i.str).trim()); })[0];
          var sItem=its.filter(function(i){ return r(i)>=COL.saldo.rmin&&r(i)<=COL.saldo.rmax&&RE_SALDO.test(String(i.str).trim()); })[0];
          var lc={ pagina:pg.num, data:dt.slice(6)+'-'+dt.slice(3,5)+'-'+dt.slice(0,2), numero:num?String(num.str).trim():'',
                   historico:textoHistorico(its), contrapartida:ct, deb:dItem?centavos(dItem.str):0, cred:cItem?centavos(cItem.str):0,
                   saldo:sItem?parseSaldo(sItem.str):null };
          if(dItem&&cItem) aviso('DEB_E_CRED_NA_MESMA_LINHA',pg.num,'Conta '+contaAtual.codigo+' lançamento '+lc.numero+' com valor em débito e crédito.');
          if(!dItem&&!cItem) aviso('LANCAMENTO_SEM_VALOR',pg.num,'Conta '+contaAtual.codigo+' lançamento '+lc.numero+' sem valor.');
          if(!num) aviso('LANCAMENTO_SEM_NUMERO',pg.num,'Conta '+contaAtual.codigo+' em '+dt+' sem número de lançamento.');
          if(!ct) res.info.push({codigo:'PARTIDA_MULTIPLA',pagina:pg.num,mensagem:'Conta '+contaAtual.codigo+' lançamento '+lc.numero+': contrapartida em branco no PDF (partida múltipla).'});
          contaAtual.lancs.push(lc); ultimoLanc=lc; return;
        }
        // ── continuação do histórico (linhas só com texto na coluna Histórico) ──
        var ht=textoHistorico(its);
        var soHist=its.every(function(i){ return (i.x>=COL.hist.xmin&&i.x<=COL.hist.xmax) || Math.abs(i.x-1)<2 || Math.abs(i.x-146)<2 || Math.abs(i.x-288)<2 || Math.abs(i.x-416)<2 || (i.x>=COL.hist.xmax && r(i)<330) || i.str==='-'; });
        if(ht && soHist && ultimoLanc){ ultimoLanc.historico=(ultimoLanc.historico+' '+ht).trim(); return; }
        if(ht && contaAtual && !ultimoLanc && soHist){ return; } // rótulo solto
        // linha desconhecida com números → avisar (nada é descartado em silêncio)
        if(its.some(function(i){ return RE_VAL.test(String(i.str).trim()); })) aviso('LINHA_NAO_RECONHECIDA',pg.num,'Linha não reconhecida: '+textos.join(' | ').slice(0,120));
      });
    });

    if(Object.keys(cnpjsVistos).length>1) aviso('CNPJ_DIFERENTE_ENTRE_PAGINAS',0,'Mais de um CNPJ nos cabeçalhos: '+Object.keys(cnpjsVistos).join(', '));

    // ── validações e resumo mensal (só contas patrimoniais) ─────────────────
    res.contas.forEach(function(c){
      var alg=algebrico(c.saldoAnt);
      if(!c.saldoAnt) aviso('CONTA_SEM_SALDO_ANTERIOR',c.paginaIni,'Conta '+c.codigo+' sem SALDO ANTERIOR (assumido zero).');
      var meses={}, ordem=[];
      c.lancs.forEach(function(l,idx){
        alg+=l.deb-l.cred;
        if(l.saldo){
          var imp=algebrico(l.saldo);
          if(imp!==alg){ var f=deAlgebrico(alg); res.mismatches.push({codigo:'BALANCE_MISMATCH',conta:c.codigo,pagina:l.pagina,numero:l.numero,data:l.data,
                            calculado:fmtCent(f.cents)+(f.lado||''),impresso:fmtCent(l.saldo.cents)+(l.saldo.lado||'')}); alg=imp; }
        }
        var am=l.data.slice(0,7);
        if(!meses[am]){ meses[am]={anoMes:am, saldoInicial:null, deb:0, cred:0, saldoFinal:null, n:0, idxIni:idx}; ordem.push(am); }
        var M=meses[am]; M.deb+=l.deb; M.cred+=l.cred; M.n++; M.idxFim=idx;
        if(/^Apura[cç][aã]o do Resultado/i.test(l.historico)){ M.apuDeb=(M.apuDeb||0)+l.deb; M.apuCred=(M.apuCred||0)+l.cred; }
      });
      // saldo inicial/final por mês, encadeando pelo saldo corrente
      var corrente=algebrico(c.saldoAnt);
      ordem.forEach(function(am){
        var M=meses[am]; M.saldoInicial=deAlgebrico(corrente); corrente=corrente+M.deb-M.cred; M.saldoFinal=deAlgebrico(corrente);
      });
      // conferência com "Total do mês" impresso: o total pertence ao mês do último lançamento anterior a ele
      c.totais.forEach(function(t){
        if(t.aposLanc===0) return; // total sem movimento (ex.: conta só com saldo anterior)
        var l=c.lancs[t.aposLanc-1], am=l.data.slice(0,7), M=meses[am];
        if(!M.impresso) M.impresso={deb:t.deb,cred:t.cred};
      });
      ordem.forEach(function(am){
        var M=meses[am]; var ok=!!M.impresso && M.impresso.deb===M.deb && M.impresso.cred===M.cred;
        if(M.impresso&&!ok) res.mismatches.push({codigo:'TOTAL_MES_DIVERGE',conta:c.codigo,anoMes:am,calculado:fmtCent(M.deb)+' / '+fmtCent(M.cred),impresso:fmtCent(M.impresso.deb)+' / '+fmtCent(M.impresso.cred)});
        if(!M.impresso) aviso('MES_SEM_TOTAL_IMPRESSO',0,'Conta '+c.codigo+' '+am+': total do mês não encontrado no PDF.');
        res.resumo.push({conta:c.codigo, anoMes:am, saldoInicial:M.saldoInicial, deb:M.deb, cred:M.cred, saldoFinal:M.saldoFinal, qtd:M.n, aberturaAlg:algebrico(M.saldoInicial), fechamentoAlg:algebrico(M.saldoFinal), apuDeb:M.apuDeb||0, apuCred:M.apuCred||0, totalImpressoDeb:M.impresso?M.impresso.deb:null, totalImpressoCred:M.impresso?M.impresso.cred:null, conferido:ok});
      });
      c.saldoFinalCalculado=deAlgebrico(corrente);
    });
    return res;
  }

  // ── identificação estável de lançamento (para não duplicar em reimportação) ──
  function chaveTexto(empresaEid, conta, l, ocorrencia){
    return [empresaEid, conta, l.data, l.numero, l.contrapartida, l.deb, l.cred, ocorrencia].join('|');
  }
  function numerarOcorrencias(eid, conta){
    var vistos={}, out=[];
    conta.lancs.forEach(function(l){
      var base=[eid,conta.codigo,l.data,l.numero,l.contrapartida,l.deb,l.cred].join('|');
      vistos[base]=(vistos[base]||0)+1;
      out.push(chaveTexto(eid,conta.codigo,l,vistos[base]));
    });
    return out;
  }

  var API={VERSAO:VERSAO, parse:parse, grupoDaClassificacao:grupoDaClassificacao, centavos:centavos, parseSaldo:parseSaldo, algebrico:algebrico, deAlgebrico:deAlgebrico, fmtCent:fmtCent, numerarOcorrencias:numerarOcorrencias, chaveTexto:chaveTexto};
  if(typeof module!=='undefined'&&module.exports) module.exports=API; else root.RazaoParser=API;
})(typeof window!=='undefined'?window:this);
