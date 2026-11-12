/* ── Lucro Real Anual: telas novas (Melhor opção, Adições e Exclusões Temporárias) e Excel/PDF com TODAS as abas, com as cores da versão clara ──
   Pedido do usuário 12/11/2026. Excel (ExcelJS): uma aba para cada parte — Apuração, Receita Bruta, Parte B, Adições e Exclusões Temporárias, Melhor opção, Resultado mensal.
   PDF: as mesmas partes, uma por página, com as cores. Cada parte é montada num formato neutro ("seção") que serve para o Excel e para o PDF. */
(function(root){
  'use strict';
  var NUM=function(v){ return parseFloat(v)||0; };
  var R2=function(v){ return Math.round((Number(v)||0)*100)/100; };
  var FMT=function(v){ return (Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var ESC=function(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var MAB=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var ctx=function(){ return {eid:window._currentApuracaoEid, ano:window._currentApuracaoAno||2026}; };
  var emp=function(){ try{ var e=S.emps().find(function(x){ return String(x.eid)===String(ctx().eid); }); return e?e.nome:''; }catch(x){ return ''; } };

  // ── cores de um atributo style inline (a tela pode estar no modo escuro; o arquivo sai sempre no tema claro) ──
  var NOMES={white:'#FFFFFF',black:'#000000',red:'#FF0000',transparent:null};
  function hex(v){ if(!v) return null; v=String(v).trim().toLowerCase(); if(v in NOMES) return NOMES[v]; var m=v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/); if(!m) return null; var h=m[1]; if(h.length===3) h=h.split('').map(function(c){ return c+c; }).join(''); return '#'+h.toUpperCase(); }
  function corDe(style,tipo){
    if(!style) return null; var m;
    if(tipo==='bg'){ m=style.match(/(?:^|;)\s*background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,6}|[a-zA-Z]+)/); return m?hex(m[1]):null; }
    m=style.match(/(?:^|;)\s*color\s*:\s*(#[0-9a-fA-F]{3,6}|[a-zA-Z]+)/); return m?hex(m[1]):null;
  }
  var negrito=function(style){ return /font-weight\s*:\s*(bold|[6-9]00)/i.test(style||''); };
  function numOuTexto(t){ t=String(t==null?'':t).trim(); if(/^-?\d{1,3}(\.\d{3})*,\d{2}$/.test(t)||/^-?\d+,\d{2}$/.test(t)) return {v:parseFloat(t.replace(/\./g,'').replace(',','.')),n:1}; return {v:t}; }

  // ── seções ──
  function secPrincipal(){
    var cont=document.getElementById('apuracaoFormAnoConteudo'), t=cont&&cont.querySelector('table'); if(!t) return null;
    var L=[];
    t.querySelectorAll('tr').forEach(function(tr){
      var cells=[].slice.call(tr.cells);
      // só descarta a 1ª coluna quando é a coluna estreita dos botões (+ e ⚙); linhas de título (colspan) começam direto na descrição
      if(cells.length&&cells[0].colSpan<=1&&(/width\s*:\s*36px/.test(cells[0].getAttribute('style')||'')||(!cells[0].textContent.trim()&&cells.length>2&&!cells[0].querySelector('input')))) cells=cells.slice(1);
      if(!cells.length) return;
      var trS=tr.getAttribute('style')||'', linha=[];
      cells.forEach(function(td){
        var inp=td.querySelector('input'), sty=td.getAttribute('style')||'', isty=inp?(inp.getAttribute('style')||''):'';
        if(!inp&&td.querySelector('button')&&!td.textContent.replace(/[❌×+⚙\s]/g,'')) return; // botões de excluir linha
        var txt=inp?inp.value:td.textContent.replace(/ /g,' ').replace(/\s+/g,' ').trim();
        var bg=corDe(sty,'bg')||corDe(isty,'bg')||corDe(trS,'bg'), fg=corDe(sty,'fg')||corDe(isty,'fg')||corDe(trS,'fg');
        if(td.tagName==='TH'){ bg=bg||'#2D3447'; fg=fg||'#FFFFFF'; }
        var o=numOuTexto(txt); if(!inp&&!o.n) o={v:txt};
        o.bg=(bg&&bg!=='#FFFFFF')?bg:null; o.fg=(fg&&fg!=='#000000')?fg:null; o.b=negrito(sty)||negrito(isty)||negrito(trS)||td.tagName==='TH'; if(td.colSpan>1) o.span=td.colSpan-1;
        if(td.tagName==='TH') o.al='c';
        linha.push(o);
      });
      if(linha.length) L.push({cells:linha});
    });
    return {nome:'Apuração',titulo:'Apuração CSLL e IRPJ — Lucro Real Anual',linhas:L,largs:[52].concat(Array.apply(null,{length:13}).map(function(){ return 14; }))};
  }
  function secRB(){ var c=ctx(); if(!window.ApPres||!ApPres.secao) return null; var s=ApPres.secao('rb',c.eid,c.ano); s.titulo='Apuração por Receita Bruta — Lucro Real (estimativa mensal)'; return s; }
  function secParteB(){
    var c=ctx(), L=[], H=function(t,w){ L.push({cells:[{v:t,b:1,bg:'#2D3447',fg:'#FFFFFF',span:4}]}); L.push({cells:['Data','Saldo inicial','Histórico','Débito','Crédito','Saldo'].map(function(x){ return {v:x,b:1,bg:'#F0F4F8',al:'c'}; })}); };
    var bloco=function(titulo,arr){
      H(titulo); (arr||[]).forEach(function(r){ var si=numOuTexto(r.saldoInicial), d=numOuTexto(r.debito), cr=numOuTexto(r.credito); var saldo=(typeof NUM==='function')?R2(NUM(String(r.saldoInicial).replace(/\./g,'').replace(',','.'))+NUM(String(r.credito).replace(/\./g,'').replace(',','.'))-NUM(String(r.debito).replace(/\./g,'').replace(',','.'))):null;
        L.push({cells:[{v:r.data||''},{v:si.v,n:si.n},{v:r.historico||''},{v:d.v,n:d.n},{v:cr.v,n:cr.n},{v:saldo,n:1}]}); });
      L.push({cells:[{v:''}]});
    };
    bloco('BASE DE CÁLCULO NEGATIVA DA CSLL',(typeof _parteBBCNCSLL!=='undefined')?_parteBBCNCSLL[c.eid]:[]);
    bloco('PREJUÍZO FISCAL (IRPJ)',(typeof _parteBPreJuizo!=='undefined')?_parteBPreJuizo[c.eid]:[]);
    return {nome:'Parte B',titulo:'Parte B — controle de BC negativa da CSLL e prejuízo fiscal',linhas:L,largs:[14,18,48,18,18,18]};
  }
  function coletarAdEx(prefixo){
    var cont=document.getElementById('apuracaoFormAnoConteudo'), re=new RegExp('^'+prefixo+'_(\\d+)_0$'), out=[];
    if(!cont) return out;
    [].slice.call(cont.querySelectorAll('input[id^="'+prefixo+'_"]')).forEach(function(el){
      var m=el.id.match(re); if(!m) return; var j=m[1], tr=el.closest('tr'); if(!tr) return;
      var nome=(tr.cells[1]?tr.cells[1].textContent:'').replace(/ /g,' ').trim()||('Linha '+j), v=[];
      for(var i=0;i<12;i++){ var e2=document.getElementById(prefixo+'_'+j+'_'+i), t=String(e2?e2.value:'').trim(); v.push(t?(typeof desformatarNumero==='function'?(desformatarNumero(t)||0):NUM(t.replace(/\./g,'').replace(',','.'))):0); }
      out.push({nome:nome,v:v});
    });
    return out;
  }
  function secAdExTemp(){
    var L=[], head=['DESCRIÇÃO'].concat(MAB,['TOTAL']);
    [{tit:'CSLL — LACS (Parte A)',suf:''},{tit:'IRPJ — LALUR (Parte A)',suf:'_irpj'}].forEach(function(b){
      var ad=coletarAdEx('ad_temp'+b.suf), ex=coletarAdEx('excl_temp'+b.suf), totAd=[],totEx=[],i;
      for(i=0;i<12;i++){ totAd.push(ad.reduce(function(s,l){ return s+l.v[i]; },0)); totEx.push(ex.reduce(function(s,l){ return s+l.v[i]; },0)); }
      var saldoMes=totAd.map(function(a,k){ return a-totEx[k]; }), acum=[],c=0; saldoMes.forEach(function(s){ c+=s; acum.push(c); });
      var lin=function(rot,v,o){ o=o||{}; var t=v.reduce(function(s,x){ return s+x; },0), cells=[{v:rot,b:o.b,bg:o.bg,fg:o.fg}]; v.forEach(function(x){ cells.push({v:R2(x),n:1,b:o.b,bg:o.bg,fg:o.fg}); }); cells.push({v:R2(t),n:1,b:1,bg:o.bg||'#FAFAFA',fg:o.fg}); L.push({cells:cells}); };
      L.push({cells:[{v:b.tit,b:1,bg:'#000000',fg:'#FFFFFF',span:13}]});
      L.push({cells:head.map(function(h){ return {v:h,b:1,bg:'#2D3447',fg:'#FFFFFF',al:'c'}; })});
      L.push({cells:[{v:'(+) ADIÇÕES TEMPORÁRIAS',b:1,bg:'#F8D7DA',span:13}]});
      if(ad.length) ad.forEach(function(l){ lin('   '+l.nome,l.v); }); else L.push({cells:[{v:'Nenhuma adição temporária lançada.',fg:'#888888',span:13}]});
      lin('Total das adições temporárias',totAd,{b:1,bg:'#F8D7DA'});
      L.push({cells:[{v:'(-) EXCLUSÕES TEMPORÁRIAS',b:1,bg:'#D1ECF1',span:13}]});
      if(ex.length) ex.forEach(function(l){ lin('   '+l.nome,l.v,{fg:'#7F1D1D'}); }); else L.push({cells:[{v:'Nenhuma exclusão temporária lançada.',fg:'#888888',span:13}]});
      lin('Total das exclusões temporárias',totEx,{b:1,bg:'#D1ECF1'});
      lin('SALDO DO MÊS (adições − exclusões)',saldoMes,{b:1,bg:'#FEF9C3'});
      lin('SALDO ACUMULADO (ainda a excluir / adicionar)',acum,{b:1,bg:'#FFD700'});
      L.push({cells:[{v:''}]});
    });
    return {nome:'Adições e Excl. Temporárias',titulo:'Adições e Exclusões Temporárias — relação anual com saldo mensal',linhas:L,largs:[52].concat(Array.apply(null,{length:13}).map(function(){ return 14; }))};
  }
  // ── Melhor opção ──
  function melhorDados(){
    var c=ctx(), num=function(id){ var e=document.getElementById(id), t=String(e?e.value:'').trim(); if(!t) return 0; return typeof desformatarNumero==='function'?(desformatarNumero(t)||0):NUM(t.replace(/\./g,'').replace(',','.')); };
    var rbv=(window.ApPres&&ApPres.resumoRB)?ApPres.resumoRB(c.eid,c.ano):[], real=[], rb=[], i;
    for(i=0;i<12;i++){ real.push({c:Math.max(0,num('csll_recolher_'+i)),i:Math.max(0,num('irpj_recolher_'+i))}); var o=rbv[i]||{}; rb.push({c:Number(o.cPagar)||0,i:Number(o.iPagar)||0}); }
    var escolha={}; try{ escolha=S.g('apuracao_melhor_'+c.eid+'_'+c.ano)||{}; }catch(e){}
    return {eid:c.eid,ano:c.ano,real:real,rb:rb,escolha:escolha};
  }
  function secMelhor(){
    var M=window._apMelhor&&window._apMelhor.eid===ctx().eid?window._apMelhor:melhorDados(), L=[], acC=0,acI=0,acT=0;
    L.push({cells:['MÊS','OPÇÃO','CSLL A RECOLHER','IRPJ A RECOLHER','TOTAL DO MÊS','ESCOLHA','SALDO CSLL ACUMULADO','SALDO IRPJ ACUMULADO','SALDO ESCOLHIDO ACUMULADO'].map(function(h){ return {v:h,b:1,bg:'#2D3447',fg:'#FFFFFF',al:'c'}; })});
    for(var i=0;i<12;i++){
      var r=M.real[i], b=M.rb[i], tr_=r.c+r.i, tb=b.c+b.i, esc=M.escolha[i]||'', menor=Math.abs(tr_-tb)<0.005?'ambos':(tr_<tb?'real':'rb');
      if(esc==='real'){ acC+=r.c; acI+=r.i; acT+=tr_; } else if(esc==='rb'){ acC+=b.c; acI+=b.i; acT+=tb; }
      [['real','Lucro Real',r,tr_],['rb','Receita Bruta (estimativa)',b,tb]].forEach(function(x,k){
        var verde=(menor===x[0]||menor==='ambos'), bg=verde?'#DCFCE7':null;
        L.push({cells:[{v:k===0?MESES[i]:'',b:1,bg:'#F0F4F8'},{v:x[1]+(verde?'  ● menor valor':''),bg:bg},{v:R2(x[2].c),n:1,bg:bg},{v:R2(x[2].i),n:1,bg:bg},{v:R2(x[3]),n:1,b:1,bg:bg},{v:esc===x[0]?'✔ escolhida':'',b:1,bg:bg,al:'c'},
          k===0&&esc?{v:R2(acC),n:1,b:1,bg:'#FEF9C3'}:{v:'',bg:null},k===0&&esc?{v:R2(acI),n:1,b:1,bg:'#FEF9C3'}:{v:'',bg:null},k===0&&esc?{v:R2(acT),n:1,b:1,bg:'#FFD700'}:{v:'',bg:null}]});
      });
    }
    return {nome:'Melhor opção',titulo:'Melhor opção — Lucro Real × Receita Bruta, mês a mês',linhas:L,largs:[14,34,20,20,18,16,22,22,26]};
  }
  async function secResMensal(){
    var c=ctx(), meses=await _apBalMeses(c.eid,String(c.ano)), mp=_apBalMapa(c.eid), ax=_apAdExMapa(c.eid), linhas=[];
    _AP_BAL_LINHAS.forEach(function(Lx){ linhas.push({rot:Lx.nome,itens:mp[Lx.id]||[],nat:Lx.nat}); });
    Object.keys(_AP_ADEX_TIPOS).forEach(function(t){ (ax[t]||[]).forEach(function(it){ linhas.push({rot:_AP_ADEX_TIPOS[t].nome+' — '+it.nome+' ('+it.cls+')',itens:[it],nat:it.nat||_AP_ADEX_TIPOS[t].nat}); }); });
    var L=[{cells:['DESCRIÇÃO'].concat(MAB,['TOTAL']).map(function(h){ return {v:h,b:1,bg:'#2D3447',fg:'#FFFFFF',al:'c'}; })}];
    linhas.forEach(function(l){
      var tem=l.itens.length>0, tot=0, cells=[{v:l.rot+(tem?'':' (sem contas do Balancete ligadas)'),fg:tem?null:'#999999'}];
      for(var i=0;i<12;i++){ var cc=meses[String(i+1).padStart(2,'0')]; if(!tem||!cc){ cells.push({v:''}); continue; } var v=_apBalValor(cc,l.itens,l.nat); tot+=v; cells.push({v:R2(v),n:1}); }
      cells.push({v:tem?R2(tot):'',n:tem,b:1,bg:'#FEF9C3'}); L.push({cells:cells});
    });
    return {nome:'Resultado mensal',titulo:'Resultado mensal — valores do mês (não acumulados), informativo',linhas:L,largs:[58].concat(Array.apply(null,{length:13}).map(function(){ return 14; }))};
  }
  async function todasSecoes(){
    var s=[secPrincipal(),secRB(),secParteB(),secAdExTemp(),secMelhor(),await secResMensal()];
    return s.filter(Boolean);
  }

  // ── Excel (ExcelJS) ──
  var argb=function(h){ return 'FF'+h.replace('#',''); };
  async function exportarExcel(){
    if(typeof ExcelJS==='undefined'){ toast('Gerador de Excel não carregado — confira a internet e tente de novo','err'); return; }
    var c=ctx(); if(!c.eid||!document.getElementById('apuracaoFormAnoConteudo')){ toast('Abra a apuração do Lucro Real primeiro','err'); return; }
    var secs=await todasSecoes(), wb=new ExcelJS.Workbook(); wb.creator='JJR Controle Contábil'; wb.created=new Date();
    var borda={style:'thin',color:{argb:'FFCCCCCC'}};
    secs.forEach(function(sec){
      var ws=wb.addWorksheet(sec.nome.slice(0,31),{views:[{state:'frozen',xSplit:1,ySplit:3}]});
      ws.addRow([sec.titulo+' — '+emp()+' — '+c.ano]).font={bold:true,size:13,color:{argb:'FF1E3558'}};
      ws.addRow([]);
      (sec.largs||[]).forEach(function(w,i){ ws.getColumn(i+1).width=w; });
      var inicio=3;
      sec.linhas.forEach(function(l){
        var vals=[], spans=[];
        l.cells.forEach(function(cl){ vals.push(cl.v===''||cl.v==null?null:cl.v); for(var k=0;k<(cl.span||0);k++) vals.push(null); });
        var row=ws.addRow(vals), col=1;
        l.cells.forEach(function(cl){
          var cell=row.getCell(col);
          if(cl.n) cell.numFmt='#,##0.00;-#,##0.00';
          if(cl.bg) cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:argb(cl.bg)}};
          var f={}; if(cl.b) f.bold=true; if(cl.fg) f.color={argb:argb(cl.fg)}; if(Object.keys(f).length) cell.font=f;
          cell.alignment={vertical:'middle',horizontal:cl.al==='c'?'center':(cl.n?'right':'left'),wrapText:false};
          cell.border={top:borda,bottom:borda,left:borda,right:borda};
          if(cl.span){ ws.mergeCells(row.number,col,row.number,col+cl.span); if(cl.bg) for(var k=1;k<=cl.span;k++) row.getCell(col+k).fill={type:'pattern',pattern:'solid',fgColor:{argb:argb(cl.bg)}}; }
          col+=1+(cl.span||0);
        });
      });
      ws.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};
    });
    var buf=await wb.xlsx.writeBuffer();
    var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    a.download='Apuracao_Lucro_Real_'+c.eid+'_'+c.ano+'.xlsx'; a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); },4000);
    toast('Excel gerado com '+secs.length+' abas.','ok');
  }

  // ── PDF (impressão do navegador, tema claro com as cores) ──
  function htmlSecao(sec){
    var h='<h2>'+ESC(sec.titulo)+'</h2><table>';
    sec.linhas.forEach(function(l){
      h+='<tr>';
      l.cells.forEach(function(cl){
        var st=[]; if(cl.bg) st.push('background:'+cl.bg); if(cl.fg) st.push('color:'+cl.fg); if(cl.b) st.push('font-weight:700'); st.push('text-align:'+(cl.al==='c'?'center':(cl.n?'right':'left')));
        h+='<td'+(cl.span?' colspan="'+(cl.span+1)+'"':'')+' style="'+st.join(';')+'">'+ESC(cl.n?FMT(cl.v):(cl.v==null?'':cl.v))+'</td>';
      });
      h+='</tr>';
    });
    return h+'</table>';
  }
  async function exportarPdf(){
    var c=ctx(); if(!c.eid||!document.getElementById('apuracaoFormAnoConteudo')){ toast('Abra a apuração do Lucro Real primeiro','err'); return; }
    var secs=await todasSecoes(), w=window.open('','PDF'); if(!w){ toast('O navegador bloqueou a janela do PDF — permita pop-ups para este site','err'); return; }
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Apuração Lucro Real '+c.ano+' — '+ESC(emp())+'</title><style>@page{size:A4 landscape;margin:8mm}body{font-family:Arial,sans-serif;font-size:9px;color:#111;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}h1{font-size:14px;margin:0 0 4px}h2{font-size:12px;margin:0 0 6px;color:#1E3558}table{border-collapse:collapse;width:100%;margin-bottom:6px}td{border:1px solid #ccc;padding:2px 4px;white-space:nowrap}section{page-break-after:always}section:last-child{page-break-after:auto}</style></head><body>'
      +'<h1>'+ESC(emp())+' — Apuração CSLL e IRPJ — Lucro Real Anual '+c.ano+'</h1>'
      +secs.map(function(s){ return '<section>'+htmlSecao(s)+'</section>'; }).join('')+'</body></html>');
    w.document.close(); setTimeout(function(){ try{ w.focus(); w.print(); }catch(e){} },600);
  }
  root.exportarParaExcel=function(){ exportarExcel().catch(function(e){ console.error(e); toast('Erro ao gerar o Excel: '+(e.message||e),'err'); }); };
  root.exportarParaPDF=function(){ exportarPdf().catch(function(e){ console.error(e); toast('Erro ao gerar o PDF: '+(e.message||e),'err'); }); };

  // ── telas novas ──
  function telaCheia(id,icone,titulo,corpo,extraBtns){
    var ref=document.getElementById('apuracaoFormAnual'); if(!ref) return null;
    var c=document.getElementById(id); if(!c){ c=document.createElement('div'); c.id=id; c.style.cssText='display:none;flex-direction:column'; ref.parentElement.insertBefore(c,ref.nextSibling); }
    var y=window.scrollY;
    c.innerHTML='<div style="padding:0 0 8px 4px"><button class="btn bo bsm" onclick="apuracaoVoltarEmpresas()">← Voltar às empresas</button></div>'
      +'<div class="ptitle" style="position:sticky;top:52px;z-index:50;background:var(--white);border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px"><div style="display:flex;align-items:center;gap:12px;flex:1"><span style="font-size:1.6rem">'+icone+'</span><span>'+ESC(titulo)+'</span></div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap">'+(extraBtns||'')+'<button class="btn bo bsm" onclick="fecharTelaApuracao(\''+id+'\')">← Voltar à apuração anual</button></div></div>'
      +'<div style="padding:16px 20px 24px 20px">'+corpo+'</div>';
    ['apuracaoTipoModal','apuracaoGerenciador','apuracaoFormAnual','parteBFormAnual','apuracaoFormPres','apuracaoFormResMensal','apuracaoFormMelhor','apuracaoFormAdEx'].forEach(function(x){ var e=document.getElementById(x); if(e) e.style.display='none'; });
    c.style.display='flex'; window.scrollTo(0,y); return c;
  }
  root.fecharTelaApuracao=function(id){ var c=document.getElementById(id); if(c) c.style.display='none'; var fa=document.getElementById('apuracaoFormAnual'); if(fa) fa.style.display='flex'; };

  // Melhor opção em tela nova
  root._apMelhorDesenhar=function(){
    var M=window._apMelhor; if(!M) return;
    var th='padding:6px 8px;background:#2D3447;color:#fff;border:1px solid #2D3447;text-align:center;white-space:nowrap', td='padding:5px 10px;border:1px solid #ccc;text-align:right;white-space:nowrap';
    var acC=0,acI=0,acT=0, linhas='';
    for(var i=0;i<12;i++){
      var r=M.real[i], b=M.rb[i], tr_=r.c+r.i, tb=b.c+b.i, esc=M.escolha[i]||'', menor=Math.abs(tr_-tb)<0.005?'ambos':(tr_<tb?'real':'rb');
      if(esc==='real'){ acC+=r.c; acI+=r.i; acT+=tr_; } else if(esc==='rb'){ acC+=b.c; acI+=b.i; acT+=tb; }
      var linha=function(op,rot,v,t){
        var verde=(menor===op||menor==='ambos'), bg=verde?'background:#dcfce7;':'', marcado=(esc===op);
        return '<tr style="'+bg+'">'+(op==='real'?'<td rowspan="2" style="'+td+';text-align:left;font-weight:700;background:#f0f4f8;vertical-align:middle">'+MESES[i]+'</td>':'')
          +'<td style="'+td+';text-align:left;'+bg+'">'+rot+(verde?' <span style="font-size:10.5px;color:#166534;font-weight:700">● menor valor</span>':'')+'</td>'
          +'<td style="'+td+';'+bg+'">'+FMT(v.c)+'</td><td style="'+td+';'+bg+'">'+FMT(v.i)+'</td><td style="'+td+';font-weight:700;'+bg+'">'+FMT(t)+'</td>'
          +'<td style="'+td+';text-align:center;'+bg+'"><label style="cursor:pointer"><input type="radio" name="apmel_'+i+'" '+(marcado?'checked':'')+' onclick="_apMelhorEscolher('+i+',\''+op+'\',this)"> escolhi</label></td>'
          +(op==='real'?'<td rowspan="2" style="'+td+';font-weight:700;background:#fef9c3;vertical-align:middle">'+(esc?FMT(acC):'—')+'</td><td rowspan="2" style="'+td+';font-weight:700;background:#fef9c3;vertical-align:middle">'+(esc?FMT(acI):'—')+'</td><td rowspan="2" style="'+td+';font-weight:800;background:#FFD700;vertical-align:middle">'+(esc?FMT(acT):'—')+'</td>':'')+'</tr>';
      };
      linhas+=linha('real','Lucro Real (balanço de suspensão/redução)',r,tr_)+linha('rb','Receita Bruta (estimativa)',b,tb);
    }
    var corpo='<div style="font-size:12.5px;color:#555;margin:0 0 10px;padding:10px 12px;background:#f5f5f5;border-radius:4px">Valores mensais a recolher: <b>Lucro Real</b> (o que está na apuração anual) × <b>Receita Bruta</b> (apuração por estimativa). A linha <span style="background:#dcfce7;padding:0 6px">verde clara</span> é a de <b>menor valor</b> (ou zero) do mês. Marque <b>escolhi</b> na opção adotada: o saldo ao lado soma, mês a mês, só o que foi escolhido.</div>'
      +'<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:13px;width:100%;background:#fff;color:#111"><thead><tr><th style="'+th+'">MÊS</th><th style="'+th+';text-align:left">OPÇÃO</th><th style="'+th+'">CSLL A RECOLHER</th><th style="'+th+'">IRPJ A RECOLHER</th><th style="'+th+'">TOTAL DO MÊS</th><th style="'+th+'">ESCOLHA</th><th style="'+th+'">SALDO CSLL ACUMULADO</th><th style="'+th+'">SALDO IRPJ ACUMULADO</th><th style="'+th+'">SALDO ESCOLHIDO ACUMULADO</th></tr></thead><tbody>'+linhas+'</tbody></table></div>';
    telaCheia('apuracaoFormMelhor','🏆','Melhor opção — Lucro Real Anual — '+M.ano,corpo,'<button class="btn bo bsm" onclick="_apMelhorMarcarMenor()">Marcar a menor em todos os meses</button><button class="btn bo bsm" onclick="_apMelhorLimpar()">Limpar escolhas</button>');
  };
  root.abrirMelhorOpcao=function(){
    var c=ctx(); if(!c.eid||!document.getElementById('apuracaoFormAnoConteudo')){ toast('Abra a apuração do Lucro Real primeiro','err'); return; }
    window._apMelhor=melhorDados(); window._apMelhor.eid=c.eid; root._apMelhorDesenhar(); window.scrollTo(0,0);
  };
  // Adições e Exclusões Temporárias em tela nova
  root.abrirAdExTemporarias=function(){
    var c=ctx(); if(!c.eid||!document.getElementById('apuracaoFormAnoConteudo')){ toast('Abra a apuração do Lucro Real primeiro','err'); return; }
    var sec=secAdExTemp(), th='padding:6px 8px;background:#2D3447;color:#fff;border:1px solid #2D3447;text-align:center;white-space:nowrap', corpo='';
    corpo+='<div style="font-size:12.5px;color:#555;margin:0 0 10px;padding:10px 12px;background:#f5f5f5;border-radius:4px">Relação anual das adições e exclusões TEMPORÁRIAS lançadas na apuração, mês a mês, com o saldo do mês e o saldo acumulado. Para lançar: botão <b>+</b> ou <b>⚙</b> nas linhas "Adições/Exclusões Temporárias".</div>';
    var aberta=false;
    sec.linhas.forEach(function(l){
      var c0=l.cells[0], barra=(c0.span===13&&c0.bg==='#000000');
      if(barra){ if(aberta) corpo+='</tbody></table></div>'; corpo+='<div style="font-weight:700;color:#fff;background:#000;padding:8px 12px;margin-top:14px">'+ESC(c0.v)+'</div><div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:13px;width:100%;background:#fff;color:#111"><tbody>'; aberta=true; return; }
      if(!aberta) return;
      corpo+='<tr>';
      l.cells.forEach(function(cl){ var st=[]; if(cl.bg) st.push('background:'+cl.bg); st.push('color:'+(cl.fg&&cl.bg?cl.fg:(cl.bg?'#111':(cl.fg||'#111')))); if(cl.b) st.push('font-weight:700'); st.push('text-align:'+(cl.al==='c'?'center':(cl.n?'right':'left')));
        corpo+='<td'+(cl.span?' colspan="'+(cl.span+1)+'"':'')+' style="padding:5px 10px;border:1px solid #ccc;white-space:nowrap;'+st.join(';')+'">'+ESC(cl.n?FMT(cl.v):(cl.v==null?'':cl.v))+'</td>'; });
      corpo+='</tr>';
    });
    if(aberta) corpo+='</tbody></table></div>';
    telaCheia('apuracaoFormAdEx','➕➖','Adições e Exclusões Temporárias — Lucro Real Anual — '+c.ano,corpo,'<button class="btn bo bsm" onclick="abrirAdicoesExclusoes()" title="Cadastro das contas usadas no botão +">Cadastro de contas</button>');
    window.scrollTo(0,0);
  };
})(typeof window!=='undefined'?window:this);
