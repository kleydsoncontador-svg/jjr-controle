/* ── Apuração do Lucro Presumido (trimestral) e da Apuração por Receita Bruta do Lucro Real (estimativa mensal) ──
   Pedido do usuário 12/11/2026, a partir do modelo "HKI - Lucro Presumido - Manual.xlsx". Mesmas cores da apuração do Lucro Real.
   • Tela principal POR COMPETÊNCIA; tela secundária POR CAIXA. Em cada uma: Contábil (vem do Balancete pela ⚙ ou digitado), Fiscal (digitado/copiado) e Divergências (Contábil − Fiscal).
   • Cálculo: CSLL 9% e IRPJ 15% + adicional 10% (sobre o que passa de R$ 60 mil por trimestre / R$ 20 mil por mês), com as deduções (retenções, IRRF, incentivos).
   • LC 224/2025: acréscimo de 10% no percentual de presunção sobre a receita bruta que passa de R$ 5 milhões no ano (R$ 1,25 milhão por trimestre). Parâmetros editáveis em "Parâmetros".
   Dados guardados em S: 'apuracao_pres_<modo>_<eid>_<ano>'. Só leitura do Balancete (nunca altera nada nele). */
(function(root){
  'use strict';
  var NUM=function(v){ return parseFloat(v)||0; };
  var R2=function(v){ return Math.round(v*100)/100; };
  var FMT=function(v){ return (Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var ESC=function(t){ return (typeof esc==='function')?esc(t):String(t==null?'':t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };

  // ── linhas do modelo (n = nome; neg = linha "(-)": entra positiva e é SUBTRAÍDA) ──
  var GRUPOS=[
    {id:'vendas',   t:'VENDAS DE PRODUTOS (indústria)', tot:'tot_vendas',   totN:'TOTAL — Vendas de Produtos', itens:[['v_prod','Vendas de Produtos'],['v_ext','Vendas de Produtos ao Exterior'],['v_desc','(-) Descontos Incondicionais',1],['v_canc','(-) Vendas Canceladas',1]]},
    {id:'revendas', t:'REVENDAS DE MERCADORIAS (comércio)', tot:'tot_revendas', totN:'TOTAL — Revendas de Mercadorias', itens:[['r_merc','Revendas de Mercadorias'],['r_ext','Revendas de Mercadorias ao Exterior'],['r_ipi','(-) Deduções de IPI',1],['r_st','(-) Deduções de ICMS-ST',1],['r_desc','(-) Descontos Incondicionais',1],['r_canc','(-) Revendas Canceladas',1]]},
    {id:'servicos', t:'SERVIÇOS PRESTADOS', tot:'tot_serv', totN:'TOTAL — Serviços Prestados', itens:[['s_prest','Serviços Prestados'],['s_ext','Serviços Prestados ao Exterior'],['s_desc','(-) Descontos Incondicionais',1],['s_canc','(-) Serviços Cancelados',1]]},
    {id:'fin',      t:'RECEITAS FINANCEIRAS', tot:'tot_fin', totN:'TOTAL — Receitas Financeiras', itens:[['f_vca','Variação Cambial Ativa'],['f_vcac','Variação Cambial Ativa - Regime de Caixa'],['f_vme','Variação Monetária s/ Empréstimos'],['f_avp','Juros - Ajuste a Valor Presente'],['f_mpr','Juros s/ Mútuo Partes Relacionadas'],['f_mut','Juros s/ Mútuo'],['f_mora','Juros de Mora'],['f_selic','Juros Selic'],['f_cli','Juros Recebidos de Clientes'],['f_mul','Multas Financeiras'],['f_rf','Receita de Aplicação Financeira - Renda Fixa'],['f_rv','Receita de Aplicação Financeira - Renda Variável'],['f_dfo','Descontos Financeiros Obtidos'],['f_vmc','Variação Monetária s/ Consórcios'],['f_mpre','Juros s/ Mútuo Partes Relacionadas no Exterior'],['f_mute','Juros s/ Mútuo no Exterior']]},
    {id:'demais',   t:'DEMAIS RECEITAS', tot:'tot_demais', totN:'TOTAL — Demais Receitas', itens:[['d_esticms','Estorno de Débito do ICMS'],['d_estdifal','Estorno de Débito do ICMS-DIFAL'],['d_outorg','ICMS Crédito Outorgado'],['d_alugi','Receita de Aluguel de Bens Imóveis'],['d_alugm','Receita de Aluguel de Bens Móveis'],['d_imp','Reversão das Perdas Estimadas Decorrentes Impairment'],['d_prov','Reversão dos Saldos das Provisões'],['d_jcp','Receitas de Juros sobre o Capital Próprio'],['d_nfat','Receita não Faturada'],['d_resc','Multas e Outras Vantagens por Rescisão Contratual']]},
    {id:'ganho',    t:'GANHO DE CAPITAL', tot:'tot_ganho', totN:'TOTAL — Ganho de Capital', itens:[['g_rec','Receita c/ Vendas Itens não Circulantes'],['g_custo','(-) Custo c/ Vendas Itens não Circulantes',1]]},
    {id:'lalup',    t:'LALUP - Parte A', tot:'tot_lalup', totN:'TOTAL — LALUP', itens:[['l_menos','(-) Variação Cambial Ativa - Regime Caixa',1],['l_mais','Variação Cambial Ativa - Regime Caixa']]}
  ];
  var DED=[['csll_ret','CSLL Retida na Fonte'],['inc_fisc','Incentivos Fiscais'],['ben_fisc','Benefícios Fiscais'],['irrf','Imposto de Renda Retido na Fonte (IRRF)'],['irrf_af','IRRF s/ Aplicações Financeiras']];
  var DED_CSLL=['csll_ret'], DED_IRPJ=['inc_fisc','ben_fisc','irrf','irrf_af'];
  var ROWIDS=[]; GRUPOS.forEach(function(g){ g.itens.forEach(function(i){ ROWIDS.push(i[0]); }); });
  var PER={ T:{n:4,rot:function(i){ return (i+1)+'º Trimestre'; },meses:function(i){ return [i*3+1,i*3+2,i*3+3]; },lim:60000,limRB:1250000},
            M:{n:12,rot:function(i){ return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i]; },meses:function(i){ return [i+1]; },lim:20000,limRB:null} };
  var PARAM_PADRAO={ servIrpj:0.32, servCsll:0.32, lc224:true, limiteAno:5000000, csllDesdeMes:4 };

  // ── cálculo (puro: recebe os valores e devolve tudo por período) ──
  function calcular(vals,ded,per,params){
    var P=PER[per], N=P.n, pr=Object.assign({},PARAM_PADRAO,params||{}), out={rows:{},ded:{}};
    var G=function(id,i){ var a=vals[id]; return NUM(a&&a[i]); };
    var acum=0, acumAnt=0;
    for(var i=0;i<N;i++){
      var o={};
      GRUPOS.forEach(function(g){ var t=0; g.itens.forEach(function(it){ t+=(it[2]?-1:1)*G(it[0],i); }); o[g.tot]=R2(t); });
      var com=o.tot_vendas+o.tot_revendas, srv=o.tot_serv, b100=R2(o.tot_fin+o.tot_lalup+o.tot_demais+o.tot_ganho);
      o.com=R2(com); o.srv=R2(srv); o.b100=b100; o.rb=R2(com+srv);
      // LC 224/2025: acréscimo de 10% no percentual de presunção sobre a receita bruta que passa do limite
      var exc=0; acumAnt=acum; acum+=o.rb;
      if(pr.lc224){ if(per==='T') exc=Math.max(0,o.rb-PER.T.limRB); else exc=Math.max(0,acum-pr.limiteAno)-Math.max(0,acumAnt-pr.limiteAno); }
      o.exc=R2(exc);
      var pI=o.rb>0?(com*0.08+srv*pr.servIrpj)/o.rb:0, pC=o.rb>0?(com*0.12+srv*pr.servCsll)/o.rb:0;
      var ult=P.meses(i)[P.meses(i).length-1], primeiro=P.meses(i)[0];
      o.csllAtiva=(primeiro>=pr.csllDesdeMes)||(ult>=pr.csllDesdeMes&&per==='T'&&false);
      // CSLL
      o.c12=R2(com*0.12); o.c32=R2(srv*pr.servCsll); o.c100=b100;
      o.cLC=pr.lc224&&o.csllAtiva?R2(exc*pC*0.10):0;
      o.cBase=R2(o.c12+o.c32+o.c100+o.cLC);
      o.cProv=R2(o.cBase*0.09);
      var dc=0; DED_CSLL.forEach(function(k){ dc+=NUM(ded[k]&&ded[k][i]); }); o.cDed=R2(dc);
      o.cPagar=R2(Math.max(0,o.cProv-o.cDed));
      // IRPJ
      o.i8=R2(com*0.08); o.i32=R2(srv*pr.servIrpj); o.i100=b100;
      o.iLC=pr.lc224?R2(exc*pI*0.10):0;
      o.iBase=R2(o.i8+o.i32+o.i100+o.iLC);
      o.iAdBase=R2(Math.max(0,o.iBase-P.lim));
      o.i15=R2(o.iBase*0.15); o.iAd=R2(o.iAdBase*0.10); o.iProv=R2(o.i15+o.iAd);
      var di=0; DED_IRPJ.forEach(function(k){ di+=NUM(ded[k]&&ded[k][i]); }); o.iDed=R2(di);
      o.iPagar=R2(Math.max(0,o.iProv-o.iDed));
      out.rows[i]=o;
    }
    return out;
  }

  // ── estado ──
  var ST={eid:null,modo:'presumido',ano:2026,regime:'comp',bloco:'fisc',calcCom:'fisc'};
  var chave=function(){ return 'apuracao_pres_'+ST.modo+'_'+ST.eid+'_'+ST.ano; };
  var per=function(){ return ST.modo==='rb'?'M':'T'; };
  function dados(){ var d=null; try{ d=S.g(chave()); }catch(e){} d=d||{}; d.comp=d.comp||{cont:{},fisc:{},ded:{}}; d.caixa=d.caixa||{cont:{},fisc:{},ded:{}}; ['comp','caixa'].forEach(function(r){ d[r].cont=d[r].cont||{}; d[r].fisc=d[r].fisc||{}; d[r].ded=d[r].ded||{}; }); d.params=d.params||{}; return d; }
  function salvar(d){ try{ S.s(chave(),d); }catch(e){ console.error('Apuração presumido: não salvou',e); toast('Erro ao salvar: '+(e.message||e),'err'); } }
  var mapKey=function(){ return 'apuracao_pres_balmap_'+ST.eid+(ST.regime==='caixa'?'_caixa':''); };
  function mapa(){ try{ return S.g(mapKey())||{}; }catch(e){ return {}; } }

  // ── tela ──
  function container(){
    var c=document.getElementById('apuracaoFormPres'); if(c) return c;
    var ref=document.getElementById('apuracaoFormAnual'); if(!ref) return null;
    c=document.createElement('div'); c.id='apuracaoFormPres'; c.style.cssText='display:none;flex-direction:column';
    ref.parentElement.insertBefore(c,ref.nextSibling); return c;
  }
  function abrir(modo,eid,ano){
    ST.modo=modo; ST.eid=String(eid||window._apuracaoEidAtual); ST.ano=ano||2026;
    try{ if(typeof apuracaoRegistrarForma==='function') apuracaoRegistrarForma(ST.eid,modo,ST.ano); }catch(e){} ST.regime='comp'; ST.bloco='cont'; ST.calcCom=(modo==='rb'?'cont':'fisc');
    ['apuracaoTipoModal','apuracaoGerenciador','apuracaoFormAnual','parteBFormAnual'].forEach(function(id){ var e=document.getElementById(id); if(e) e.style.display='none'; });
    var c=container(); if(!c){ toast('Tela de apuração não encontrada','err'); return; }
    c.style.display='flex'; desenhar();
    montarMapaBalancete().catch(function(e){ console.warn('Apuração × Balancete:',e); });
  }
  function voltar(){
    var c=document.getElementById('apuracaoFormPres'); if(c) c.style.display='none';
    var g=document.getElementById('apuracaoGerenciador'); if(g) g.style.display='flex';
    try{ if(ST.modo!=='rb'&&typeof renderApuracaoGerenciador==='function') renderApuracaoGerenciador(ST.eid); }catch(e){}
    var fa=document.getElementById('apuracaoFormAnual'); if(ST.modo==='rb'&&fa){ if(g) g.style.display='none'; fa.style.display='flex'; }
  }
  function titulo(){ return ST.modo==='rb'?('Apuração por Receita Bruta — Lucro Real — '+ST.ano+' (mensal)'):('Lucro Presumido — '+ST.ano+' (trimestral)'); }
  var TH='padding:8px;border:1px solid #2D3447;background:#2D3447;color:#fff;font-weight:700;text-align:center';
  var TDI='padding:3px;border:1px solid #ccc';
  // As duas tabelas da tela (linhas de entrada e CÁLCULO) usam a MESMA grade: layout fixo + mesmas colunas, então cada mês cai na mesma vertical nas duas (a descrição quebra de linha se for longa) — pedido do usuário 12/11/2026.
  function GRADE(N){ return {tab:'table-layout:fixed;width:100%;min-width:'+(34+380+N*108+120)+'px;', cols:'<colgroup><col style="width:34px"><col style="width:380px">'+new Array(N+1).join('<col>')+'<col style="width:120px"></colgroup>'}; }
  var INP='width:100%;border:none;padding:4px;text-align:right;background:transparent';
  function btn(txt,on,ativo,extra){ return '<button class="btn '+(ativo?'bp':'bo')+'" onclick="'+on+'" style="padding:6px 12px;'+(extra||'')+'">'+txt+'</button>'; }
  function desenhar(){
    var c=container(); if(!c) return; var P=PER[per()], N=P.n, D=dados(), R=D[ST.regime];
    var blocoLbl={cont:'Contábil',fisc:'Fiscal',div:'Divergências (Contábil − Fiscal)'}[ST.bloco];
    var h='<div class="ptitle" style="position:sticky;top:52px;z-index:50;background:var(--white);border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px">'
      +'<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:280px"><span style="font-size:1.6rem">'+(ST.modo==='rb'?'📈':'💼')+'</span><span>'+ESC(titulo())+'</span></div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
      +(ST.modo==='rb'?'':(btn('Por competência','ApPres.set(\'regime\',\'comp\')',ST.regime==='comp')+btn('Por caixa','ApPres.set(\'regime\',\'caixa\')',ST.regime==='caixa')
      +'<span style="width:10px"></span>'
      +btn('Contábil','ApPres.set(\'bloco\',\'cont\')',ST.bloco==='cont')+btn('Fiscal','ApPres.set(\'bloco\',\'fisc\')',ST.bloco==='fisc')+btn('Divergências','ApPres.set(\'bloco\',\'div\')',ST.bloco==='div')
      +'<span style="width:10px"></span>'))
      +'<button class="btn bo" onclick="ApPres.parametros()" style="padding:6px 12px">⚙ Parâmetros</button>'
      +'<button class="action-btn action-btn-excel" onclick="ApPres.excel()" style="padding:8px 14px;font-size:12.5px">📊 Gerar Excel</button>'
      +'<button class="btn bo bsm" onclick="ApPres.voltar()">← Voltar</button><button class="btn bo bsm" onclick="apuracaoVoltarEmpresas()">← Empresas</button><span id="apPresStatus" style="font-size:12px;color:#666;margin-left:8px"></span></div></div>';
    h+='<div style="padding:16px 20px 24px 20px"><div style="margin-bottom:10px;padding:10px 12px;background:#f5f5f5;border-radius:4px;color:#333;font-size:12.5px;display:flex;flex-wrap:wrap;gap:14px;align-items:center">'
      +'<b>'+(ST.modo==='rb'?'Apuração única, por competência (estimativa mensal pela receita bruta)':((ST.regime==='comp'?'Regime de COMPETÊNCIA (tela principal)':'Regime de CAIXA (tela secundária)')+' · '+blocoLbl))+'</b>'
      +(ST.modo!=='rb'&&ST.bloco==='fisc'?'<button class="btn bo bsm" onclick="ApPres.copiarContabil()">Copiar do Contábil para o Fiscal</button>':'')
      +(ST.bloco!=='div'?'<span style="color:#555">⚙ em cada linha: de quais contas ou grupos do Balancete o valor vem (preenche o Contábil).</span>':'')
      +(ST.bloco==='div'?'<span style="color:#555">Só leitura: Contábil menos Fiscal.</span>':'')
      +(ST.modo==='rb'?'':'<span style="margin-left:auto">Calcular com: '+btn('Fiscal','ApPres.set(\'calcCom\',\'fisc\')',ST.calcCom==='fisc','padding:3px 9px')+btn('Contábil','ApPres.set(\'calcCom\',\'cont\')',ST.calcCom==='cont','padding:3px 9px')+'</span>')+'</div>';
    h+='<div style="overflow:visible"><table style="'+GRADE(N).tab+'border-collapse:collapse;font-size:12px;background:white;color:#111">'+GRADE(N).cols+'<thead><tr><th style="width:34px;border:none;background:#2D3447;padding:0"></th><th style="'+TH+';text-align:left">DESCRIÇÃO</th>';
    for(var i=0;i<N;i++) h+='<th style="'+TH+'">'+P.rot(i)+'<br><small style="font-size:10px;opacity:.8">'+(ST.ano)+'</small></th>';
    h+='<th style="'+TH+'">TOTAL</th></tr></thead><tbody>';
    GRUPOS.forEach(function(g){
      h+='<tr style="background:#f0f4f8"><td colspan="'+(N+3)+'" style="padding:8px 12px;border:1px solid #ccc;font-weight:bold;color:#1E3558">'+g.t+'</td></tr>';
      g.itens.forEach(function(it){
        var id=it[0], editavel=(ST.bloco!=='div');
        var tem=(mapa()[id]||[]).length>0;
        h+='<tr><td style="width:34px;text-align:center;border:none;padding:0">'+(ST.bloco!=='div'?'<button type="button" class="appres-eng" title="'+(tem?'Valor vem do Balancete — ver/alterar as contas (preenche o Contábil'+(ST.regime==='caixa'?' do regime de caixa':'')+')':'Cadastrar de quais contas/grupos do Balancete vem esta linha (preenche o Contábil'+(ST.regime==='caixa'?' do regime de caixa':'')+')')+'" onclick="ApPres.engrenagem(\''+id+'\')" style="background:none;border:none;cursor:pointer;padding:0;font-size:1.05rem;'+(tem?'':'opacity:.45')+'">⚙</button>':'')+'</td>'
          +'<td style="padding:6px 12px;border:1px solid #ccc'+(it[2]?';color:#7f1d1d':'')+'">'+ESC(it[1])+'</td>';
        for(var i=0;i<N;i++){
          if(ST.bloco==='div'){ var dv=R2(NUM((R.cont[id]||[])[i])-NUM((R.fisc[id]||[])[i])); h+='<td style="'+TDI+';text-align:right;padding:4px 8px;'+(dv?'color:#b91c1c;font-weight:700':'color:#999')+'">'+FMT(dv)+'</td>'; }
          else h+='<td style="'+TDI+'"><input type="text" inputmode="decimal" id="ap_'+id+'_'+i+'" data-id="'+id+'" data-i="'+i+'" value="'+FMT(NUM((R[ST.bloco][id]||[])[i]))+'" onfocus="this.select()" onchange="ApPres.digitou(this)" style="'+INP+'"></td>';
        }
        h+='<td style="'+TDI+';text-align:right;padding:4px 8px;background:#fafafa" id="ap_tot_'+id+'"></td></tr>';
      });
      h+='<tr style="background:#fef9c3;font-weight:bold"><td style="border:none;background:#fef9c3"></td><td style="padding:6px 12px;border:1px solid #ccc">'+g.totN+'</td>';
      for(var j=0;j<N;j++) h+='<td style="'+TDI+';text-align:right;padding:4px 8px" id="ap_g_'+g.tot+'_'+j+'"></td>';
      h+='<td style="'+TDI+';text-align:right;padding:4px 8px" id="ap_g_'+g.tot+'_T"></td></tr>';
    });
    h+='</tbody></table></div>';
    h+='<div id="apPresCalc" style="margin-top:18px"></div></div>';
    c.innerHTML=h; atualizar();
  }
  function valsDe(bloco){ var D=dados(), R=D[ST.regime]; return R[bloco]||{}; }
  function atualizar(){
    var P=PER[per()], N=P.n, D=dados(), R=D[ST.regime];
    var blocoCalc=ST.calcCom; var vals=R[blocoCalc]||{};
    var usouAlt=false; var tem=false; ROWIDS.forEach(function(id){ (vals[id]||[]).forEach(function(v){ if(NUM(v)) tem=true; }); });
    if(!tem){ var alt=blocoCalc==='fisc'?'cont':'fisc'; var t2=false; ROWIDS.forEach(function(id){ ((R[alt]||{})[id]||[]).forEach(function(v){ if(NUM(v)) t2=true; }); }); if(t2){ vals=R[alt]; usouAlt=alt; } }
    // totais por linha e por grupo (do bloco exibido; em Divergências, da diferença)
    var show=ST.bloco==='div'?null:R[ST.bloco];
    var base=ST.bloco==='div'?null:calcular(show,{},per(),D.params);
    ROWIDS.forEach(function(id){ var el=document.getElementById('ap_tot_'+id); if(!el) return; var t=0; for(var i=0;i<N;i++){ t+=(ST.bloco==='div'?NUM((R.cont[id]||[])[i])-NUM((R.fisc[id]||[])[i]):NUM(((show||{})[id]||[])[i])); } el.textContent=FMT(R2(t)); });
    var gc=calcular(ST.bloco==='div'?R.cont:show,{},per(),D.params), gf=ST.bloco==='div'?calcular(R.fisc,{},per(),D.params):null;
    GRUPOS.forEach(function(g){ var tt=0; for(var i=0;i<N;i++){ var v=gc.rows[i][g.tot]-(gf?gf.rows[i][g.tot]:0); tt+=v; var el=document.getElementById('ap_g_'+g.tot+'_'+i); if(el) el.textContent=FMT(R2(v)); } var e2=document.getElementById('ap_g_'+g.tot+'_T'); if(e2) e2.textContent=FMT(R2(tt)); });
    // bloco de CÁLCULO
    var cc=calcular(vals,R.ded,per(),D.params), rows=cc.rows, tc=document.getElementById('apPresCalc'); if(!tc) return;
    var per0=PER[per()], lim=per0.lim;
    var linha=function(rot,fn,cfg){ cfg=cfg||{}; var s='<tr'+(cfg.bg?' style="background:'+cfg.bg+';font-weight:bold"':'')+'><td style="border:none;width:34px;background:'+(cfg.bg||'transparent')+'"></td><td style="padding:6px 12px;border:1px solid #ccc;'+(cfg.bg?'background:'+cfg.bg+';':'background:white;')+(cfg.cor?'color:'+cfg.cor+';':'')+'">'+rot+'</td>'; var tt=0; for(var i=0;i<N;i++){ var v=fn(rows[i],i); tt+=v; s+='<td style="'+TDI+';text-align:right;padding:4px 8px;'+(cfg.bg?'background:'+cfg.bg+';':'background:white;')+'">'+FMT(v)+'</td>'; } s+='<td style="'+TDI+';text-align:right;padding:4px 8px;background:'+(cfg.bg||'#fafafa')+'">'+(cfg.semTotal?'':FMT(R2(tt)))+'</td></tr>'; return s; };
    var barra=function(t,cor){ return '<tr style="background:'+cor+';color:white;font-weight:bold"><td colspan="'+(N+3)+'" style="padding:8px 12px;border:1px solid #ccc">'+t+'</td></tr>'; };
    var dedLinhas=function(ids,rotulo){ var s=''; DED.filter(function(d){ return ids.indexOf(d[0])>=0; }).forEach(function(d){ s+='<tr><td style="border:none;width:34px"></td><td style="padding:6px 12px;border:1px solid #ccc;background:white">'+ESC(d[1])+'</td>'; for(var i=0;i<N;i++) s+='<td style="'+TDI+';background:white"><input type="text" inputmode="decimal" data-ded="'+d[0]+'" data-i="'+i+'" value="'+FMT(NUM(((R.ded||{})[d[0]]||[])[i]))+'" onfocus="this.select()" onchange="ApPres.digitouDed(this)" style="'+INP+'"></td>'; s+='<td style="'+TDI+';background:#fafafa"></td></tr>'; }); return s; };
    var h='<div style="font-weight:700;color:#1E3558;margin:0 0 6px;font-size:13px">CÁLCULO'+(usouAlt?' <span style="font-weight:400;color:#b45309">— o bloco escolhido está vazio; calculando com o '+(usouAlt==='cont'?'Contábil':'Fiscal')+'</span>':'')+'</div>'
      +'<div style="overflow:visible"><table style="'+GRADE(N).tab+'border-collapse:collapse;font-size:12px;background:white;color:#111">'+GRADE(N).cols+'<thead><tr><th style="width:34px;border:none;background:#2D3447;padding:0"></th><th style="'+TH+';text-align:left">DESCRIÇÃO</th>';
    for(var k=0;k<N;k++) h+='<th style="'+TH+'">'+per0.rot(k)+'</th>'; h+='<th style="'+TH+'">TOTAL</th></tr></thead><tbody>';
    h+=barra('RECEITA BRUTA DAS ATIVIDADES (comércio / indústria + serviços) — base do limite da LC 224/2025','#2D3447');
    h+=linha('Comércio e indústria (vendas + revendas)',function(o){ return o.com; });
    h+=linha('Serviços',function(o){ return o.srv; });
    h+=linha('Receita bruta das atividades',function(o){ return o.rb; },{bg:'#fef9c3'});
    h+=linha('Receita bruta que excede o limite ('+(per()==='T'?'R$ 1.250.000 por trimestre':'acumulado acima de R$ '+FMT(NUM((D.params||{}).limiteAno||PARAM_PADRAO.limiteAno))+' no ano')+') — LC 224/2025',function(o){ return o.exc; },{cor:'#7c2d12'});
    h+=barra('CÁLCULO DA CSLL — 9%','#000');
    h+=linha('Base de Cálculo 12% (comércio e indústria)',function(o){ return o.c12; });
    h+=linha('Base de Cálculo '+Math.round(NUM((D.params||{}).servCsll||PARAM_PADRAO.servCsll)*100)+'% (serviços)',function(o){ return o.c32; });
    h+=linha('Base de Cálculo 100% (financeiras, demais receitas, ganho de capital, LALUP)',function(o){ return o.c100; });
    h+=linha('(+) Acréscimo de 10% no percentual de presunção — LC 224/2025'+(per()==='T'?' (CSLL a partir do 2º trimestre de 2026)':''),function(o){ return o.cLC; },{cor:'#7c2d12'});
    h+=linha('Total Base de Cálculo da CSLL',function(o){ return o.cBase; },{bg:'#fef9c3'});
    h+=linha('PROVISÃO DA CSLL (9%)',function(o){ return o.cProv; },{bg:'#f8d7da'});
    h+='<tr><td colspan="'+(N+3)+'" style="padding:4px 12px;border:1px solid #ccc;background:#f0f4f8;font-weight:bold;color:#1E3558">(-) DEDUÇÕES</td></tr>'+dedLinhas(DED_CSLL);
    h+=linha('CSLL A RECOLHER'+(ST.modo==='rb'?' (estimativa mensal — DARF 2484 ou 6012)':' (DARF 2372)'),function(o){ return o.cPagar; },{bg:'#FFD700'});
    h+=barra('CÁLCULO DO IRPJ — 15% + adicional de 10%','#000');
    h+=linha('Base de Cálculo 8% (comércio e indústria)',function(o){ return o.i8; });
    h+=linha('Base de Cálculo '+Math.round(NUM((D.params||{}).servIrpj||PARAM_PADRAO.servIrpj)*100)+'% (serviços)',function(o){ return o.i32; });
    h+=linha('Base de Cálculo 100% (financeiras, demais receitas, ganho de capital, LALUP)',function(o){ return o.i100; });
    h+=linha('(+) Acréscimo de 10% no percentual de presunção — LC 224/2025',function(o){ return o.iLC; },{cor:'#7c2d12'});
    h+=linha('Total Base de Cálculo do IRPJ — 15%',function(o){ return o.iBase; },{bg:'#fef9c3'});
    h+=linha('Base do Adicional — 10% (o que passa de R$ '+FMT(lim)+(per()==='T'?' no trimestre':' no mês')+')',function(o){ return o.iAdBase; });
    h+=linha('IRPJ — 15%',function(o){ return o.i15; });
    h+=linha('ADICIONAL IRPJ — 10%',function(o){ return o.iAd; });
    h+=linha('PROVISÃO DO IRPJ',function(o){ return o.iProv; },{bg:'#f8d7da'});
    h+='<tr><td colspan="'+(N+3)+'" style="padding:4px 12px;border:1px solid #ccc;background:#f0f4f8;font-weight:bold;color:#1E3558">(-) DEDUÇÕES</td></tr>'+dedLinhas(DED_IRPJ);
    h+=linha('IRPJ A RECOLHER'+(ST.modo==='rb'?' (estimativa mensal — DARF 2362 ou 5993)':' (DARF 2089)'),function(o){ return o.iPagar; },{bg:'#FFD700'});
    h+='</tbody></table></div><div style="font-size:11.5px;color:#666;margin-top:8px;line-height:1.5">Linhas "(-)" entram positivas e são subtraídas. Percentuais: comércio/indústria 8% (IRPJ) e 12% (CSLL); serviços e demais conforme <b>Parâmetros</b>. '
      +'Adicional de 10% do IRPJ sobre o que passa de R$ 60.000 por trimestre (R$ 20.000 por mês). Acréscimo da LC 224/2025 sobre a parcela que passa do limite, proporcional ao percentual de cada atividade.</div>';
    tc.innerHTML=h;
  }
  function set(k,v){ ST[k]=v; desenhar(); if(k==='regime'||k==='bloco') montarMapaBalancete().catch(function(){}); }
  function digitou(inp){
    var id=inp.getAttribute('data-id'), i=+inp.getAttribute('data-i'), D=dados(), R=D[ST.regime];
    var v=(typeof _parseInput==='function')?_parseInput(inp.value):NUM(inp.value);
    R[ST.bloco][id]=R[ST.bloco][id]||[]; R[ST.bloco][id][i]=v; inp.value=FMT(v); salvar(D); atualizar();
  }
  function digitouDed(inp){
    var id=inp.getAttribute('data-ded'), i=+inp.getAttribute('data-i'), D=dados(), R=D[ST.regime];
    var v=(typeof _parseInput==='function')?_parseInput(inp.value):NUM(inp.value);
    R.ded[id]=R.ded[id]||[]; R.ded[id][i]=v; inp.value=FMT(v); salvar(D); atualizar();
  }
  function copiarContabil(){
    if(!confirm('Copiar TODOS os valores do Contábil para o Fiscal (substitui o que já está no Fiscal deste regime)?')) return;
    var D=dados(), R=D[ST.regime]; R.fisc=JSON.parse(JSON.stringify(R.cont||{})); salvar(D); desenhar(); toast('Copiado do Contábil para o Fiscal.','ok');
  }
  function parametros(){
    var D=dados(), p=Object.assign({},PARAM_PADRAO,D.params||{});
    var velho=document.getElementById('apPresParam'); if(velho) velho.remove();
    var ov=document.createElement('div'); ov.id='apPresParam'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="background:#fff;color:#222;border-radius:10px;max-width:560px;width:100%;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.4)"><b style="font-size:15px">⚙ Parâmetros da apuração</b>'
      +'<div style="display:grid;gap:10px;margin:12px 0;font-size:13px">'
      +'<label>Percentual de presunção do IRPJ nos serviços <select id="apPmServI" style="padding:4px"><option value="0.32"'+(p.servIrpj===0.32?' selected':'')+'>32% (serviços em geral)</option><option value="0.16"'+(p.servIrpj===0.16?' selected':'')+'>16% (transporte de passageiros, receita até R$ 120 mil/ano)</option><option value="0.08"'+(p.servIrpj===0.08?' selected':'')+'>8% (serviços hospitalares, transporte de cargas)</option></select></label>'
      +'<label>Percentual de presunção da CSLL nos serviços <select id="apPmServC" style="padding:4px"><option value="0.32"'+(p.servCsll===0.32?' selected':'')+'>32%</option><option value="0.12"'+(p.servCsll===0.12?' selected':'')+'>12% (serviços hospitalares)</option></select></label>'
      +'<label><input type="checkbox" id="apPmLc"'+(p.lc224?' checked':'')+'> Aplicar o acréscimo de 10% da LC 224/2025 sobre a presunção</label>'
      +'<label>Limite anual da receita bruta (R$) <input id="apPmLim" value="'+FMT(p.limiteAno)+'" style="padding:4px;width:140px;text-align:right"> <span style="color:#777">(trimestral: R$ 1.250.000)</span></label>'
      +'<label>CSLL: acréscimo vale a partir do mês <select id="apPmCsll" style="padding:4px">'+[1,2,3,4,5,6,7].map(function(m){ return '<option value="'+m+'"'+(p.csllDesdeMes===m?' selected':'')+'>'+m+'</option>'; }).join('')+'</select> <span style="color:#777">(4 = abril/2026, anterioridade de 90 dias — confira na IN da Receita)</span></label>'
      +'</div><div style="display:flex;gap:8px;justify-content:flex-end"><button onclick="document.getElementById(\'apPresParam\').remove()" style="padding:7px 14px;border:1px solid #bbb;background:#fff;border-radius:6px;cursor:pointer">Cancelar</button><button id="apPmOk" style="padding:7px 16px;border:none;background:#166534;color:#fff;border-radius:6px;cursor:pointer;font-weight:700">Salvar</button></div></div>';
    document.body.appendChild(ov);
    document.getElementById('apPmOk').onclick=function(){
      var d=dados(); d.params={ servIrpj:parseFloat(document.getElementById('apPmServI').value), servCsll:parseFloat(document.getElementById('apPmServC').value), lc224:document.getElementById('apPmLc').checked, limiteAno:(typeof _parseInput==='function'?_parseInput(document.getElementById('apPmLim').value):NUM(document.getElementById('apPmLim').value))||5000000, csllDesdeMes:parseInt(document.getElementById('apPmCsll').value,10)||4 };
      salvar(d); ov.remove(); atualizar();
    };
  }
  // ── Balancete (só leitura): preenche o Contábil por competência das linhas com contas cadastradas ──
  async function montarMapaBalancete(){
    var m=mapa(); if(!Object.keys(m).length) return;
    var meses=await _apBalMeses(ST.eid,String(ST.ano)); var P=PER[per()], D=dados(), R=D[ST.regime], mudou=false;
    ROWIDS.forEach(function(id){
      var itens=m[id]; if(!itens||!itens.length) return;
      var neg=false; GRUPOS.forEach(function(g){ g.itens.forEach(function(it){ if(it[0]===id&&it[2]) neg=true; }); });
      for(var i=0;i<P.n;i++){
        var ms=P.meses(i), tem=false, tot=0;
        ms.forEach(function(mm){ var c=meses[String(mm).padStart(2,'0')]; if(c){ tem=true; tot+=_apBalValor(c,itens,neg?'D':'C'); } });
        if(!tem) continue;
        R.cont[id]=R.cont[id]||[]; if(R.cont[id][i]!==R2(tot)){ R.cont[id][i]=R2(tot); mudou=true; }
      }
    });
    if(mudou){ salvar(D); if(document.getElementById('apuracaoFormPres')&&document.getElementById('apuracaoFormPres').style.display!=='none') desenhar(); }
  }
  function engrenagem(id){
    var nome='', neg=false; GRUPOS.forEach(function(g){ g.itens.forEach(function(it){ if(it[0]===id){ nome=it[1]; neg=!!it[2]; } }); });
    var L={id:id,nome:nome,nat:neg?'D':'C'};
    _apBalAbrir(ST.eid,String(ST.ano),id,{
      periodico:true,
      linha:L,
      getItens:function(){ return (mapa()[id]||[]).slice(); },
      salvar:function(itens){ var m=mapa(); if(itens.length) m[id]=itens; else delete m[id]; S.s(mapKey(),m); },
      depois:async function(itens,tinhaAntes){
        if(!itens.length&&tinhaAntes){ var Dz=dados(), Rz=Dz[ST.regime]; Rz.cont[id]=[]; salvar(Dz); desenhar(); toast('Contas retiradas: o saldo desta linha foi zerado.','ok'); return; } // sem conta ligada, sem saldo
        if(typeof _apBalCache!=='undefined') _apBalCache={}; await montarMapaBalancete(); desenhar(); toast(itens.length?'Valores puxados do Balancete.':'Linha liberada para preenchimento manual.','ok'); }
    });
  }
  function excel(){
    var D=dados(), P=PER[per()], N=P.n; if(typeof XLSX==='undefined'){ toast('Biblioteca de Excel não carregada','err'); return; }
    var aoa=[[titulo()],[ST.regime==='comp'?'Regime de competência':'Regime de caixa'],[]];
    ['cont','fisc'].forEach(function(b){
      aoa.push([b==='cont'?'CONTÁBIL':'FISCAL'].concat(Array.apply(null,{length:N}).map(function(_,i){ return P.rot(i); }),['TOTAL']));
      GRUPOS.forEach(function(g){ aoa.push([g.t]); g.itens.forEach(function(it){ var a=D[ST.regime][b][it[0]]||[], r=[it[1]], t=0; for(var i=0;i<N;i++){ r.push(NUM(a[i])); t+=NUM(a[i]); } r.push(R2(t)); aoa.push(r); }); });
      aoa.push([]);
    });
    var vals=D[ST.regime][ST.calcCom]||{}, cc=calcular(vals,D[ST.regime].ded,per(),D.params).rows;
    var L=function(rot,k){ var r=[rot],t=0; for(var i=0;i<N;i++){ r.push(cc[i][k]); t+=cc[i][k]; } r.push(R2(t)); aoa.push(r); };
    aoa.push(['CÁLCULO'].concat(Array.apply(null,{length:N}).map(function(_,i){ return P.rot(i); }),['TOTAL']));
    L('Receita bruta das atividades','rb'); L('Receita bruta excedente (LC 224/2025)','exc'); L('CSLL — total base de cálculo','cBase'); L('CSLL — provisão 9%','cProv'); L('CSLL a recolher','cPagar'); L('IRPJ — total base de cálculo','iBase'); L('IRPJ 15%','i15'); L('Adicional IRPJ 10%','iAd'); L('IRPJ a recolher','iPagar');
    var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),'Apuração'); XLSX.writeFile(wb,'Apuracao_'+(ST.modo==='rb'?'ReceitaBruta':'LucroPresumido')+'_'+ST.eid+'_'+ST.ano+'.xlsx');
  }
  // Seção em formato neutro (usada pelo Excel/PDF do Lucro Real Anual): lançamentos + cálculo da Apuração por Receita Bruta, com as mesmas cores da tela
  function secao(modo,eid,ano){
    var chv='apuracao_pres_'+modo+'_'+eid+'_'+ano, d=null; try{ d=S.g(chv); }catch(e){} d=d||{};
    var comp=d.comp||{}, vals=comp.cont||{}, ded=comp.ded||{}, pr=d.params||{};
    var pk=modo==='rb'?'M':'T', P=PER[pk], N=P.n;
    var cc=calcular(vals,ded,pk,pr).rows;
    var cab=['DESCRIÇÃO'].concat(Array.apply(null,{length:N}).map(function(_,i){ return P.rot(i); }),['TOTAL']);
    var L=[{cells:cab.map(function(t){ return {v:t,b:1,fg:'#FFFFFF',bg:'#2D3447',al:'c'}; })}];
    var linha=function(rot,arr,o){ o=o||{}; var t=0, cells=[{v:rot,b:o.b,bg:o.bg,fg:o.fg}]; arr.forEach(function(x){ t+=x; cells.push({v:R2(x),n:1,b:o.b,bg:o.bg,fg:o.fg}); }); cells.push({v:R2(t),n:1,b:1,bg:o.bg||'#FAFAFA',fg:o.fg}); L.push({cells:cells}); };
    var barra=function(t,bg){ L.push({cells:[{v:t,b:1,bg:bg,fg:'#FFFFFF',span:N+2}]}); };
    var grupo=function(t){ L.push({cells:[{v:t,b:1,bg:'#F0F4F8',fg:'#1E3558',span:N+2}]}); };
    GRUPOS.forEach(function(g){
      grupo(g.t);
      g.itens.forEach(function(it){ var a=[]; for(var i=0;i<N;i++) a.push(NUM((vals[it[0]]||[])[i])); linha(it[1],a,{fg:it[2]?'#7F1D1D':null}); });
      var tt=[]; for(var j=0;j<N;j++) tt.push(cc[j][g.tot]); linha(g.totN,tt,{b:1,bg:'#FEF9C3'});
    });
    var F=function(k){ var a=[]; for(var i=0;i<N;i++) a.push(cc[i][k]); return a; };
    barra('RECEITA BRUTA DAS ATIVIDADES — base do limite da LC 224/2025','#2D3447');
    linha('Comércio e indústria (vendas + revendas)',F('com')); linha('Serviços',F('srv')); linha('Receita bruta das atividades',F('rb'),{b:1,bg:'#FEF9C3'});
    linha('Receita bruta que excede o limite — LC 224/2025',F('exc'),{fg:'#7C2D12'});
    barra('CÁLCULO DA CSLL — 9%','#000000');
    linha('Base de Cálculo 12% (comércio e indústria)',F('c12')); linha('Base de Cálculo dos serviços',F('c32')); linha('Base de Cálculo 100% (financeiras, demais, ganho de capital, LALUP)',F('c100'));
    linha('(+) Acréscimo de 10% no percentual de presunção — LC 224/2025',F('cLC'),{fg:'#7C2D12'});
    linha('Total Base de Cálculo da CSLL',F('cBase'),{b:1,bg:'#FEF9C3'}); linha('PROVISÃO DA CSLL (9%)',F('cProv'),{b:1,bg:'#F8D7DA'});
    DED.filter(function(x){ return DED_CSLL.indexOf(x[0])>=0; }).forEach(function(x){ var a=[]; for(var i=0;i<N;i++) a.push(NUM((ded[x[0]]||[])[i])); linha('(-) '+x[1],a); });
    linha('CSLL A RECOLHER',F('cPagar'),{b:1,bg:'#FFD700'});
    barra('CÁLCULO DO IRPJ — 15% + adicional de 10%','#000000');
    linha('Base de Cálculo 8% (comércio e indústria)',F('i8')); linha('Base de Cálculo dos serviços',F('i32')); linha('Base de Cálculo 100%',F('i100'));
    linha('(+) Acréscimo de 10% no percentual de presunção — LC 224/2025',F('iLC'),{fg:'#7C2D12'});
    linha('Total Base de Cálculo do IRPJ — 15%',F('iBase'),{b:1,bg:'#FEF9C3'}); linha('Base do Adicional — 10%',F('iAdBase')); linha('IRPJ — 15%',F('i15')); linha('ADICIONAL IRPJ — 10%',F('iAd'));
    linha('PROVISÃO DO IRPJ',F('iProv'),{b:1,bg:'#F8D7DA'});
    DED.filter(function(x){ return DED_IRPJ.indexOf(x[0])>=0; }).forEach(function(x){ var a=[]; for(var i=0;i<N;i++) a.push(NUM((ded[x[0]]||[])[i])); linha('(-) '+x[1],a); });
    linha('IRPJ A RECOLHER',F('iPagar'),{b:1,bg:'#FFD700'});
    return {nome:modo==='rb'?'Receita Bruta':'Lucro Presumido',titulo:titulo(),linhas:L,largs:[58].concat(Array.apply(null,{length:N+1}).map(function(){ return 15; }))};
  }
  // resultado mensal da Apuração por Receita Bruta (CSLL e IRPJ a recolher) para a tela "Melhor opção"
  function resumoRB(eid,ano){
    var d=null; try{ d=S.g('apuracao_pres_rb_'+eid+'_'+ano); }catch(e){} d=d||{};
    var comp=d.comp||{};
    return calcular(comp.cont||{},comp.ded||{},'M',d.params||{}).rows;
  }
  root.ApPres={secao:secao,resumoRB:resumoRB,abrir:abrir,voltar:voltar,set:set,digitou:digitou,digitouDed:digitouDed,copiarContabil:copiarContabil,parametros:parametros,engrenagem:engrenagem,excel:excel,calcular:calcular,_ST:ST};
})(typeof window!=='undefined'?window:this);

/* ── Lucro Real Anual: engrenagem nas linhas de Adições/Exclusões Permanentes e Temporárias (pedido do usuário 12/11/2026) ──
   Escolhe contas do Balancete; cada conta vira uma linha filha logo abaixo do grupo (como o botão "+"), com o valor do mês do Balancete, e se pergunta se vale para os dois cálculos (CSLL e IRPJ) ou só um.
   Adição (despesa não dedutível): débito − crédito. Exclusão (receita não tributável): crédito − débito. Mapa guardado em 'apuracao_adex_balmap_<eid>'. */
var _AP_ADEX_TIPOS={
  ad_perm:{nome:'(+) Adições Permanentes',nat:'D',csll:'adicionarLinhaAdPerm',irpj:'adicionarLinhaAdPermIrpj'},
  ad_temp:{nome:'(+) Adições Temporárias',nat:'D',csll:'adicionarLinhaAdTemp',irpj:'adicionarLinhaAdTempIrpj'},
  excl_perm:{nome:'(-) Exclusões Permanentes',nat:'C',csll:'adicionarLinhaExclPerm',irpj:'adicionarLinhaExclPermIrpj'},
  excl_temp:{nome:'(-) Exclusões Temporárias',nat:'C',csll:'adicionarLinhaExclTemp',irpj:'adicionarLinhaExclTempIrpj'}
};
function _apAdExMapa(eid){ try{ return S.g('apuracao_adex_balmap_'+eid)||{}; }catch(e){ return {}; } }
function _apAdExPrefixo(tipo,calc){ return calc==='irpj'?(tipo+'_irpj'):tipo; }
function _apAdExInit(eid,ano){
  try{
    var mapa=_apAdExMapa(eid);
    Object.keys(_AP_ADEX_TIPOS).forEach(function(tipo){
      ['csll','irpj'].forEach(function(calc){
        var inp=document.getElementById(_apAdExPrefixo(tipo,calc)+'_total_0'); if(!inp) return;
        var tr=inp.closest('tr'); if(!tr||tr.querySelector('.apadex-eng')) return;
        var td=tr.cells[0]; if(!td) return;
        var tem=(mapa[tipo]||[]).length>0;
        td.style.whiteSpace='nowrap'; td.style.width='auto'; td.style.minWidth='56px';
        td.insertAdjacentHTML('beforeend','<button class="apadex-eng" type="button" title="'+(tem?'Contas do Balancete cadastradas — clique para ver/alterar':'Cadastrar contas do Balancete para esta linha')+'" onclick="_apAdExAbrir(\''+eid+'\',\''+ano+'\',\''+tipo+'\')" style="background:none;border:none;cursor:pointer;padding:0 0 0 6px;font-size:1.05rem;line-height:1;vertical-align:middle;'+(tem?'':'opacity:.45')+'">⚙</button>');
      });
    });
    if(Object.keys(mapa).length) _apAdExAplicar(eid,ano).catch(function(e){ console.warn('Adições/Exclusões × Balancete:',e); });
  }catch(e){ console.warn('Adições/Exclusões: engrenagens:',e); }
}
function _apAdExAbrir(eid,ano,tipo){
  var T=_AP_ADEX_TIPOS[tipo]; if(!T) return;
  _apBalAbrir(eid,ano,'adex_'+tipo,{
    linha:{id:'adex_'+tipo,nome:T.nome,nat:T.nat},
    perguntaAplica:true,
    getItens:function(){ return (_apAdExMapa(eid)[tipo]||[]).slice(); },
    salvar:function(itens){
      var m=_apAdExMapa(eid), antes=(m[tipo]||[]);
      antes.forEach(function(a){ if(!itens.some(function(n){ return n.cls===a.cls&&n.aplica===a.aplica; })) _apAdExRemoverLinhas(tipo,a); });
      if(itens.length) m[tipo]=itens; else delete m[tipo];
      S.s('apuracao_adex_balmap_'+eid,m);
    },
    depois:async function(itens){
      if(typeof _apBalCache!=='undefined') _apBalCache={};
      await _apAdExAplicar(eid,ano);
      try{ for(var i=0;i<12;i++) calcularMesApuracao(i); autoSalvarApuracao(); }catch(e){}
      toast(itens.length?'Contas do Balancete aplicadas nas linhas.':'Linha liberada.','ok');
    }
  });
}
function _apAdExRemoverLinhas(tipo,item){
  ['csll','irpj'].forEach(function(calc){
    if(item.aplica==='csll'&&calc==='irpj') return;
    if(item.aplica==='irpj'&&calc==='csll') return;
    var tr=document.querySelector('tr[data-apadex="'+tipo+'|'+calc+'|'+item.cls+'"]'); if(tr) tr.remove();
  });
}
async function _apAdExAplicar(eid,ano){
  var mapa=_apAdExMapa(eid), meses=await _apBalMeses(eid,String(ano));
  Object.keys(_AP_ADEX_TIPOS).forEach(function(tipo){
    var T=_AP_ADEX_TIPOS[tipo];
    (mapa[tipo]||[]).forEach(function(it){
      var calcs=it.aplica==='csll'?['csll']:(it.aplica==='irpj'?['irpj']:['csll','irpj']);
      calcs.forEach(function(calc){
        var key=tipo+'|'+calc+'|'+it.cls, tr=document.querySelector('tr[data-apadex="'+key+'"]');
        var pref=_apAdExPrefixo(tipo,calc);
        if(!tr){
          if(typeof window[T[calc]]!=='function') return;
          window[T[calc]](eid,it.nome+' ('+it.cls+')');
          var re=new RegExp('^'+pref+'_(\\d+)_0$');
          var js=Array.from(document.querySelectorAll('[id^="'+pref+'_"]')).map(function(el){ var m=el.id.match(re); return m?parseInt(m[1],10):-1; }).filter(function(n){ return n>=0; });
          if(!js.length) return;
          var j=Math.max.apply(null,js), i0=document.getElementById(pref+'_'+j+'_0'); if(!i0) return;
          tr=i0.closest('tr'); tr.setAttribute('data-apadex',key); tr.setAttribute('data-apadex-j',String(j));
        }
        var jj=tr.getAttribute('data-apadex-j');
        var acum=0; // acumulado desde janeiro, como as demais linhas da apuração anual
        for(var i=0;i<12;i++){
          var contas=meses[String(i+1).padStart(2,'0')]; if(!contas) continue;
          var inp=document.getElementById(pref+'_'+jj+'_'+i); if(!inp) continue;
          acum+=_apBalValor(contas,[it],it.nat||T.nat); var v=Math.round(acum*100)/100;
          inp.value=v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
          inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('blur',{bubbles:true}));
        }
      });
    });
  });
  try{ for(var i=0;i<12;i++) calcularMesApuracao(i); }catch(e){}
  try{ setTimeout(function(){ if(typeof _apAplicarPagoAnteriores==='function') _apAplicarPagoAnteriores(eid,ano); },400); }catch(e){} // as linhas filhas mudaram a base: refaz o "pago em meses anteriores"
}

/* ── "Adições e Exclusões Temporárias": relação anual por mês e saldo acumulado (pedido do usuário 12/11/2026) ──
   Lê as linhas filhas das Adições/Exclusões TEMPORÁRIAS da própria apuração (CSLL e IRPJ). Saldo do mês = adições − exclusões; saldo acumulado = o que ainda falta excluir (ou adicionar) nos meses seguintes. */
function abrirAdExTemporarias(){
  var eid=window._currentApuracaoEid, ano=window._currentApuracaoAno||2026;
  var cont=document.getElementById('apuracaoFormAnoConteudo'); if(!eid||!cont){ toast('Abra a apuração do Lucro Real primeiro','err'); return; }
  var num=function(v){ v=String(v||'').trim(); if(!v) return 0; if(typeof desformatarNumero==='function') return desformatarNumero(v)||0; return parseFloat(v.replace(/\./g,'').replace(',','.'))||0; };
  var fmt=function(v){ return (Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var blocos=[{calc:'csll',tit:'CSLL — LACS (Parte A)',suf:''},{calc:'irpj',tit:'IRPJ — LALUR (Parte A)',suf:'_irpj'}];
  var coletar=function(prefixo){
    var linhas=[], re=new RegExp('^'+prefixo+'_(\\d+)_0$');
    Array.from(cont.querySelectorAll('input[id^="'+prefixo+'_"]')).forEach(function(el){
      var m=el.id.match(re); if(!m) return; var j=m[1], tr=el.closest('tr'); if(!tr) return;
      var nome=(tr.cells[1]?tr.cells[1].textContent:'').replace(/ /g,' ').trim()||('Linha '+j);
      var v=[]; for(var i=0;i<12;i++){ var e2=document.getElementById(prefixo+'_'+j+'_'+i); v.push(num(e2&&e2.value)); }
      linhas.push({nome:nome,v:v});
    });
    return linhas;
  };
  var th='padding:6px 8px;background:#2D3447;color:#fff;border:1px solid #2D3447;text-align:center;white-space:nowrap';
  var td='padding:4px 8px;border:1px solid #ccc;text-align:right;white-space:nowrap';
  var html='';
  blocos.forEach(function(b){
    var ad=coletar('ad_temp'+b.suf), ex=coletar('excl_temp'+b.suf);
    var totAd=[],totEx=[],i; for(i=0;i<12;i++){ totAd.push(ad.reduce(function(s,l){ return s+l.v[i]; },0)); totEx.push(ex.reduce(function(s,l){ return s+l.v[i]; },0)); }
    var saldoMes=totAd.map(function(a,k){ return a-totEx[k]; }), acum=[],c=0; saldoMes.forEach(function(s){ c+=s; acum.push(c); });
    html+='<div style="font-weight:700;color:#fff;background:#000;padding:8px 12px;margin-top:14px">'+b.tit+'</div><div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12px;width:100%;background:#fff;color:#111"><thead><tr><th style="'+th+';text-align:left;min-width:300px">DESCRIÇÃO</th>'+meses.map(function(m){ return '<th style="'+th+'">'+m+'</th>'; }).join('')+'<th style="'+th+'">TOTAL</th></tr></thead><tbody>';
    var linha=function(rot,v,bg,neg){ var t=v.reduce(function(s,x){ return s+x; },0); return '<tr'+(bg?' style="background:'+bg+';font-weight:bold"':'')+'><td style="padding:5px 10px;border:1px solid #ccc'+(neg?';color:#7f1d1d':'')+'">'+rot+'</td>'+v.map(function(x){ return '<td style="'+td+(bg?';background:'+bg:'')+'">'+fmt(x)+'</td>'; }).join('')+'<td style="'+td+';background:'+(bg||'#fafafa')+'">'+fmt(t)+'</td></tr>'; };
    html+='<tr><td colspan="14" style="padding:5px 10px;background:#f8d7da;font-weight:bold;color:#111">(+) ADIÇÕES TEMPORÁRIAS</td></tr>';
    html+=ad.length?ad.map(function(l){ return linha('&nbsp;&nbsp;'+l.nome,l.v); }).join(''):'<tr><td colspan="14" style="padding:6px 12px;color:#888;border:1px solid #ccc">Nenhuma adição temporária lançada.</td></tr>';
    html+=linha('Total das adições temporárias',totAd,'#f8d7da');
    html+='<tr><td colspan="14" style="padding:5px 10px;background:#d1ecf1;font-weight:bold;color:#111">(-) EXCLUSÕES TEMPORÁRIAS</td></tr>';
    html+=ex.length?ex.map(function(l){ return linha('&nbsp;&nbsp;'+l.nome,l.v,null,1); }).join(''):'<tr><td colspan="14" style="padding:6px 12px;color:#888;border:1px solid #ccc">Nenhuma exclusão temporária lançada.</td></tr>';
    html+=linha('Total das exclusões temporárias',totEx,'#d1ecf1');
    html+=linha('SALDO DO MÊS (adições − exclusões)',saldoMes,'#fef9c3');
    html+=linha('SALDO ACUMULADO (ainda a excluir / adicionar)',acum,'#FFD700');
    html+='</tbody></table></div>';
  });
  var velho=document.getElementById('apAdExTempModal'); if(velho) velho.remove();
  var ov=document.createElement('div'); ov.id='apAdExTempModal'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99998;display:flex;align-items:center;justify-content:center;padding:14px';
  ov.innerHTML='<div style="background:#fff;color:#111;border-radius:10px;width:min(1500px,100%);max-height:94vh;overflow:auto;padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,.4)">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b style="font-size:16px">➕➖ Adições e Exclusões Temporárias — '+ano+'</b><span style="display:flex;gap:8px"><button onclick="abrirAdicoesExclusoes()" style="padding:6px 12px;border:1px solid #bbb;background:#fff;border-radius:6px;cursor:pointer" title="Cadastro das contas usadas no botão +">Cadastro de contas</button><button onclick="document.getElementById(\'apAdExTempModal\').remove()" style="padding:6px 12px;border:1px solid #bbb;background:#fff;border-radius:6px;cursor:pointer">Fechar</button></span></div>'
    +'<div style="font-size:12px;color:#555;margin:6px 0 4px">Relação anual das adições e exclusões TEMPORÁRIAS lançadas na apuração, mês a mês, com o saldo do mês e o saldo acumulado. Para lançar: botão <b>+</b> ou <b>⚙</b> nas linhas "Adições/Exclusões Temporárias".</div>'+html+'</div>';
  document.body.appendChild(ov);
}

/* ── Melhor opção (Lucro Real Anual): compara, mês a mês, o que sai pelo Lucro Real × pela Receita Bruta (estimativa) — pedido do usuário 12/11/2026 ──
   Duas linhas por mês (CSLL e IRPJ a recolher em cada opção). A linha de MENOR total (ou zero) fica verde claro; o usuário marca qual escolheu (flag) e a coluna de saldo soma, mês a mês, o que foi escolhido. */
function _apMelhorChave(eid,ano){ return 'apuracao_melhor_'+eid+'_'+ano; }
function abrirMelhorOpcao(){
  var eid=window._currentApuracaoEid, ano=window._currentApuracaoAno||2026;
  var cont=document.getElementById('apuracaoFormAnoConteudo'); if(!eid||!cont){ toast('Abra a apuração do Lucro Real primeiro','err'); return; }
  var num=function(id){ var e=document.getElementById(id); var v=String(e?e.value:'').trim(); if(!v) return 0; if(typeof desformatarNumero==='function') return desformatarNumero(v)||0; return parseFloat(v.replace(/\./g,'').replace(',','.'))||0; };
  var real=[], rb=(window.ApPres&&ApPres.resumoRB)?ApPres.resumoRB(eid,ano):[];
  for(var i=0;i<12;i++){ real.push({c:Math.max(0,num('csll_recolher_'+i)),i:Math.max(0,num('irpj_recolher_'+i))}); }
  var rbv=[]; for(i=0;i<12;i++){ var o=rb[i]||{}; rbv.push({c:Number(o.cPagar)||0,i:Number(o.iPagar)||0}); }
  var escolha={}; try{ escolha=S.g(_apMelhorChave(eid,ano))||{}; }catch(e){}
  window._apMelhor={eid:eid,ano:ano,real:real,rb:rbv,escolha:escolha};
  _apMelhorDesenhar();
}
function _apMelhorDesenhar(){
  var M=window._apMelhor; if(!M) return;
  var fmt=function(v){ return (Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var th='padding:6px 8px;background:#2D3447;color:#fff;border:1px solid #2D3447;text-align:center;white-space:nowrap';
  var td='padding:5px 10px;border:1px solid #ccc;text-align:right;white-space:nowrap';
  var acC=0,acI=0,acT=0, linhas='';
  for(var i=0;i<12;i++){
    var r=M.real[i], b=M.rb[i], tr_=r.c+r.i, tb=b.c+b.i, esc=M.escolha[i]||'';
    var menor=Math.abs(tr_-tb)<0.005?'ambos':(tr_<tb?'real':'rb');
    var ac='';
    if(esc==='real'){ acC+=r.c; acI+=r.i; acT+=tr_; } else if(esc==='rb'){ acC+=b.c; acI+=b.i; acT+=tb; }
    var linha=function(op,rot,v,t){
      var verde=(menor===op||menor==='ambos');
      var bg=verde?'background:#dcfce7;':'';
      var marcado=(esc===op);
      return '<tr style="'+bg+'"'+(marcado?'':'')+'>'
        +(op==='real'?'<td rowspan="2" style="'+td+';text-align:left;font-weight:700;background:#f0f4f8;vertical-align:middle">'+meses[i]+'</td>':'')
        +'<td style="'+td+';text-align:left;'+bg+'">'+rot+(verde?' <span style="font-size:10.5px;color:#166534;font-weight:700">● menor valor</span>':'')+'</td>'
        +'<td style="'+td+';'+bg+'">'+fmt(v.c)+'</td><td style="'+td+';'+bg+'">'+fmt(v.i)+'</td><td style="'+td+';font-weight:700;'+bg+'">'+fmt(t)+'</td>'
        +'<td style="'+td+';text-align:center;'+bg+'"><label style="cursor:pointer"><input type="radio" name="apmel_'+i+'" '+(marcado?'checked':'')+' onclick="_apMelhorEscolher('+i+',\''+op+'\',this)"> escolhi</label></td>'
        +(op==='real'?'<td rowspan="2" style="'+td+';font-weight:700;background:#fef9c3;vertical-align:middle" data-ac="'+i+'">'+(esc?fmt(acC)+'<div style="font-size:10.5px;font-weight:400;color:#555">CSLL</div>':'—')+'</td><td rowspan="2" style="'+td+';font-weight:700;background:#fef9c3;vertical-align:middle">'+(esc?fmt(acI)+'<div style="font-size:10.5px;font-weight:400;color:#555">IRPJ</div>':'—')+'</td><td rowspan="2" style="'+td+';font-weight:800;background:#FFD700;vertical-align:middle">'+(esc?fmt(acT):'—')+'</td>':'')
        +'</tr>';
    };
    linhas+=linha('real','Lucro Real (balanço de suspensão/redução)',r,tr_)+linha('rb','Receita Bruta (estimativa)',b,tb);
  }
  var html='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b style="font-size:16px">🏆 Melhor opção — '+M.ano+'</b><span style="display:flex;gap:8px">'
    +'<button onclick="_apMelhorMarcarMenor()" style="padding:6px 12px;border:1px solid #bbb;background:#fff;border-radius:6px;cursor:pointer" title="Marca, em cada mês, a opção de menor valor (a de Lucro Real se empatar)">Marcar a menor em todos os meses</button>'
    +'<button onclick="_apMelhorLimpar()" style="padding:6px 12px;border:1px solid #bbb;background:#fff;border-radius:6px;cursor:pointer">Limpar escolhas</button>'
    +'<button onclick="document.getElementById(\'apMelhorModal\').remove()" style="padding:6px 12px;border:1px solid #bbb;background:#fff;border-radius:6px;cursor:pointer">Fechar</button></span></div>'
    +'<div style="font-size:12px;color:#555;margin:6px 0 8px">Valores mensais a recolher: <b>Lucro Real</b> (o que está na apuração anual) × <b>Receita Bruta</b> (apuração por estimativa). A linha <span style="background:#dcfce7;padding:0 6px">verde clara</span> é a de <b>menor valor</b> (ou zero) do mês. Marque <b>escolhi</b> na opção adotada: o saldo ao lado soma, mês a mês, só o que foi escolhido.</div>'
    +'<div style="overflow:visible"><table style="border-collapse:collapse;font-size:12.5px;width:100%;background:#fff;color:#111"><thead><tr><th style="'+th+'">MÊS</th><th style="'+th+';text-align:left">OPÇÃO</th><th style="'+th+'">CSLL A RECOLHER</th><th style="'+th+'">IRPJ A RECOLHER</th><th style="'+th+'">TOTAL DO MÊS</th><th style="'+th+'">ESCOLHA</th><th style="'+th+'">SALDO CSLL ACUMULADO</th><th style="'+th+'">SALDO IRPJ ACUMULADO</th><th style="'+th+'">SALDO ESCOLHIDO ACUMULADO</th></tr></thead><tbody>'+linhas+'</tbody></table></div>';
  var ov=document.getElementById('apMelhorModal'), pos=0;
  if(!ov){ ov=document.createElement('div'); ov.id='apMelhorModal'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99998;display:flex;align-items:center;justify-content:center;padding:14px'; ov.innerHTML='<div id="apMelhorCorpo" style="background:#fff;color:#111;border-radius:10px;width:min(1200px,100%);max-height:94vh;overflow:auto;padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,.4)"></div>'; document.body.appendChild(ov); }
  var corpo=document.getElementById('apMelhorCorpo'); pos=corpo.scrollTop; corpo.innerHTML=html; corpo.scrollTop=pos;
}
function _apMelhorSalvar(){ var M=window._apMelhor; try{ S.s(_apMelhorChave(M.eid,M.ano),M.escolha); }catch(e){ toast('Erro ao salvar a escolha: '+(e.message||e),'err'); } }
async function _apMelhorEscolher(i,op,el){ var M=window._apMelhor; if(M.escolha[i]===op){ delete M.escolha[i]; } else M.escolha[i]=op; _apMelhorSalvar(); await _apMelhorRecalcular(); _apMelhorDesenhar(); }
async function _apMelhorMarcarMenor(){ var M=window._apMelhor; for(var i=0;i<12;i++){ var a=M.real[i].c+M.real[i].i, b=M.rb[i].c+M.rb[i].i; M.escolha[i]=(b<a-0.005)?'rb':'real'; } _apMelhorSalvar(); await _apMelhorRecalcular(); _apMelhorDesenhar(); }
async function _apMelhorLimpar(){ var M=window._apMelhor; if(!confirm('Limpar as escolhas de todos os meses?')) return; M.escolha={}; _apMelhorSalvar(); await _apMelhorRecalcular(); _apMelhorDesenhar(); }

/* ── Resultado mensal (Lucro Real Anual) — pedido do usuário 12/11/2026 ──
   Listagem só informativa: o valor MENSAL (não acumulado) de cada linha ligada ao Balancete, mês a mês, com a coluna TOTAL. Não calcula nada. */
async function abrirResultadoMensal(){
  var eid=window._currentApuracaoEid, ano=window._currentApuracaoAno||2026;
  if(!eid){ toast('Abra a apuração do Lucro Real primeiro','err'); return; }
  var fmt=function(v){ return (Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var meses=await _apBalMeses(eid,String(ano)), mp=_apBalMapa(eid), ax=_apAdExMapa(eid);
  var linhas=[];
  _AP_BAL_LINHAS.forEach(function(L){ linhas.push({rot:L.nome,itens:mp[L.id]||[],nat:L.nat,grupo:'RECEITAS E DESPESAS'}); });
  Object.keys(_AP_ADEX_TIPOS).forEach(function(t){ (ax[t]||[]).forEach(function(it){ linhas.push({rot:_AP_ADEX_TIPOS[t].nome+' — '+it.nome+' ('+it.cls+')'+(it.aplica==='csll'?' · só CSLL':(it.aplica==='irpj'?' · só IRPJ':'')),itens:[it],nat:it.nat||_AP_ADEX_TIPOS[t].nat,grupo:'ADIÇÕES E EXCLUSÕES'}); }); });
  var nomes=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var th='padding:6px 8px;background:#2D3447;color:#fff;border:1px solid #2D3447;text-align:center;white-space:nowrap';
  var td='padding:4px 8px;border:1px solid #ccc;text-align:right;white-space:nowrap';
  var corpo='', grupoAtual='';
  linhas.forEach(function(l){
    // sem linha de grupo ("RECEITAS E DESPESAS"): só a descrição de cada linha, como pediu o usuário
    var tem=l.itens.length>0, tot=0, cel='';
    for(var i=0;i<12;i++){
      var c=meses[String(i+1).padStart(2,'0')];
      if(!tem||!c){ cel+='<td style="'+td+';color:#999">'+(tem?'—':'')+'</td>'; continue; }
      var v=_apBalValor(c,l.itens,l.nat); tot+=v; cel+='<td style="'+td+'">'+fmt(v)+'</td>';
    }
    corpo+='<tr><td style="padding:5px 10px;border:1px solid #ccc;'+(tem?'':'color:#999')+'">'+l.rot+(tem?'':' <span style="font-size:11px">(sem contas do Balancete ligadas — ⚙)</span>')+'</td>'+cel+'<td style="'+td+';font-weight:700;background:#fef9c3">'+(tem?fmt(tot):'')+'</td></tr>';
  });
  // Tela nova (não janelinha): esconde a apuração anual e mostra a listagem em tela cheia; "Voltar" devolve a apuração anual como estava
  var ref=document.getElementById('apuracaoFormAnual'); if(!ref) return;
  var c=document.getElementById('apuracaoFormResMensal');
  if(!c){ c=document.createElement('div'); c.id='apuracaoFormResMensal'; c.style.cssText='display:none;flex-direction:column'; ref.parentElement.insertBefore(c,ref.nextSibling); }
  c.innerHTML='<div style="padding:0 0 8px 4px"><button class="btn bo bsm" onclick="apuracaoVoltarEmpresas()">← Voltar às empresas</button></div>'
    +'<div class="ptitle" style="position:sticky;top:52px;z-index:50;background:var(--white);border-bottom:1px solid var(--border)"><div style="display:flex;align-items:center;gap:12px;flex:1"><span style="font-size:1.6rem">📋</span><span>Resultado mensal — Lucro Real Anual — '+ano+'</span></div>'
    +'<div style="display:flex;gap:8px"><button class="btn bo bsm" onclick="fecharResultadoMensal()">← Voltar à apuração anual</button></div></div>'
    +'<div style="padding:16px 20px 24px 20px"><div style="font-size:12.5px;color:#555;margin-bottom:10px;padding:10px 12px;background:#f5f5f5;border-radius:4px">Só informativo, sem cálculo: o valor <b>do mês</b> (não acumulado) de cada linha ligada ao Balancete pelo ⚙, e o <b>total</b> dos meses. Na tela principal os valores são acumulados desde janeiro. As contas que você ligar nas Adições e Exclusões também entram aqui.</div>'
    +'<div style="overflow:visible"><table style="border-collapse:collapse;font-size:13px;width:100%;background:#fff;color:#111"><thead><tr><th style="'+th+';text-align:left;min-width:380px">DESCRIÇÃO</th>'+nomes.map(function(n){ return '<th style="'+th+';min-width:104px">'+n+'</th>'; }).join('')+'<th style="'+th+';min-width:120px">TOTAL</th></tr></thead><tbody>'+corpo+'</tbody></table></div></div>';
  ['apuracaoTipoModal','apuracaoGerenciador','apuracaoFormAnual','parteBFormAnual','apuracaoFormPres'].forEach(function(id){ var e=document.getElementById(id); if(e) e.style.display='none'; });
  c.style.display='flex'; window.scrollTo(0,0);
}
function fecharResultadoMensal(){
  var c=document.getElementById('apuracaoFormResMensal'); if(c) c.style.display='none';
  var fa=document.getElementById('apuracaoFormAnual'); if(fa) fa.style.display='flex';
}

/* "Mês de Início do Exercício Fiscal" compacto, na barra de botões do topo (pedido do usuário 12/11/2026); a tabela sobe junto */
function _apMoverMesFiscal(){
  var sel=document.getElementById('mesFiscalInicio'); if(!sel) return;
  var wrap=sel.parentElement, barra=document.querySelector('#apuracaoFormAnual > .ptitle > div:last-child'); if(!wrap||!barra) return;
  if(wrap.parentElement===barra) return;
  wrap.style.cssText='display:flex;align-items:center;gap:6px;margin:0;padding:0;background:transparent;border-radius:0;white-space:nowrap';
  var lb=wrap.querySelector('label'); if(lb) lb.style.cssText='font-weight:600;font-size:12px;margin:0;color:inherit';
  sel.style.cssText='padding:3px 6px;font-size:12px;border:1px solid #ccc;border-radius:4px';
  barra.insertBefore(wrap,barra.querySelector('button[onclick*="voltarApuracao"]')||null);
  var corpo=document.getElementById('apuracaoFormAnoConteudo'); var raiz=corpo&&corpo.firstElementChild; if(raiz) raiz.style.padding='6px 20px 20px 52px';
}

/* Cabeçalho (descrição + meses/datas) CONGELADO nas telas de apuração: fica fixo logo abaixo da barra de título enquanto a tabela rola (pedido do usuário 12/11/2026) */
function _apAjustaTopo(){
  var ids=['apuracaoFormAnual','apuracaoFormPres','apuracaoFormResMensal','apuracaoFormMelhor','apuracaoFormAdEx'], vis=null;
  for(var i=0;i<ids.length;i++){ var e=document.getElementById(ids[i]); if(e&&e.style.display&&e.style.display!=='none'){ vis=e; break; } }
  if(!vis) return;
  var pt=vis.querySelector('.ptitle'), h=document.querySelector('header'), topo=(h?h.offsetHeight:52);
  var alt=pt?pt.offsetHeight:0, v=(topo+alt)+'px';
  if(document.documentElement.style.getPropertyValue('--ap-top')!==v) document.documentElement.style.setProperty('--ap-top',v);
}
setInterval(_apAjustaTopo,500);

/* ── "CSLL Paga em Meses Anteriores" e "IRPJ Pago em Meses Anteriores" vindos da Melhor opção (pedido do usuário 12/11/2026) ──
   Em cada mês, o campo traz a SOMA do que foi escolhido na Melhor opção nos meses anteriores (jan → o 0; fev → o escolhido de jan; mar → jan + fev ...). Escolher a opção errada em janeiro muda o que sobra a recolher dos meses seguintes.
   O "a recolher" já nunca fica negativo (se a provisão menos as deduções der negativo, fica zero). Só mexe nesses campos quando existe ao menos uma escolha; sem escolha, ficam livres para digitar. */
// Fila: só uma rodada por vez; se pedirem outra enquanto roda (ex.: as Adições/Exclusões do Balancete terminaram de entrar), roda de novo ao terminar — assim o valor nunca fica com a base de um momento anterior (12/11/2026).
var _apPagoRodando=false, _apPagoPendente=false;
async function _apAplicarPagoAnteriores(eid,ano){
  if(_apPagoRodando){ _apPagoPendente=true; return false; }
  _apPagoRodando=true; var ok=false;
  try{ do{ _apPagoPendente=false; ok=await _apAplicarPagoAnterioresCore(eid,ano); }while(_apPagoPendente); }
  finally{ _apPagoRodando=false; }
  return ok;
}
async function _apAplicarPagoAnterioresCore(eid,ano){
  var esc={}; try{ esc=S.g('apuracao_melhor_'+eid+'_'+ano)||{}; }catch(e){}
  var temEscolha=Object.keys(esc).some(function(k){ return esc[k]==='real'||esc[k]==='rb'; });
  var fmt=function(v){ return (Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var lerNum=function(id){ var e=document.getElementById(id), t=String(e?e.value:'').trim(); if(!t) return 0; return typeof desformatarNumero==='function'?(desformatarNumero(t)||0):parseFloat(t.replace(/\./g,'').replace(',','.'))||0; };
  var espera=function(ms){ return new Promise(function(r){ setTimeout(r,ms); }); };
  if(!document.getElementById('csll_paga_0')) return false;
  var rb=(window.ApPres&&ApPres.resumoRB)?ApPres.resumoRB(eid,ano):[], accC=0, accI=0;
  for(var i=0;i<12;i++){
    var c=document.getElementById('csll_paga_'+i), p=document.getElementById('irpj_pago_'+i);
    if(!c||!p) continue;
    if(temEscolha){
      c.value=fmt(accC); p.value=fmt(accI); c.readOnly=true; p.readOnly=true;
      c.title=p.title='Calculado pela Melhor opção: soma do que foi escolhido nos meses anteriores';
      try{ calcularTodosBCN(); }catch(e){}
      await espera(170);
      var op=esc[i], o=rb[i]||{};
      if(op==='real'){ accC+=lerNum('csll_recolher_'+i); accI+=lerNum('irpj_recolher_'+i); }
      else if(op==='rb'){ accC+=Number(o.cPagar)||0; accI+=Number(o.iPagar)||0; }
    } else if(c.readOnly||p.readOnly){ c.readOnly=false; p.readOnly=false; c.title=p.title=''; }
  }
  try{ calcularTodosBCN(); }catch(e){}
  try{ salvarApuracaoSupabase(); }catch(e){}
  return true;
}
async function _apMelhorRecalcular(){
  var M=window._apMelhor; if(!M) return;
  await _apAplicarPagoAnteriores(M.eid,M.ano);
  await new Promise(function(r){ setTimeout(r,250); });
  var num=function(id){ var e=document.getElementById(id), t=String(e?e.value:'').trim(); if(!t) return 0; return typeof desformatarNumero==='function'?(desformatarNumero(t)||0):parseFloat(t.replace(/\./g,'').replace(',','.'))||0; };
  for(var i=0;i<12;i++){ M.real[i]={c:Math.max(0,num('csll_recolher_'+i)),i:Math.max(0,num('irpj_recolher_'+i))}; }
}
