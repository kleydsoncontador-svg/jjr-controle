/* ═══════════════════════════════════════════════════════════════════════════
   Importação contábil integrada: LIVRO RAZÃO + BALANCETE + DRE (PDF do Domínio) — SEM IA.
   Fluxo: PDF (temporário) → texto+coordenadas (pdf.js) → parser do tipo → validações → PRÉVIA →
   só dados estruturados no Supabase → bytes do PDF descartados. Nenhum PDF/base64/texto de página/
   imagem é gravado (nem no Storage nem no banco); só nome do arquivo, hash, período, versão do
   parser e avisos, para auditoria leve.
   Depende de: razao-parser.js (RazaoParser) e contabil-parsers.js (ContabilParsers), _supaClient, S,
   esc, toast, pdfjsLib e do módulo Demonstrativos (democ*).
   ═══════════════════════════════════════════════════════════════════════════ */
(function(root){
  'use strict';
  var RP=function(){ return root.RazaoParser; }, CP=function(){ return root.ContabilParsers; };
  var LIMITE_MB=180, LIMITE_PAGINAS=1500, LIMITE_LANCAMENTOS=300000, CHUNK=400;
  var TIPO_ROTULO={GENERAL_LEDGER:'Livro Razão',TRIAL_BALANCE:'Balancete',INCOME_STATEMENT:'DRE'};
  var st={eid:null, docs:[], salvando:false, tipoAlvo:null};

  // ── utilidades ──────────────────────────────────────────────────────────
  function num(c){ if(c===null||c===undefined) return null; var neg=c<0, s=String(Math.abs(c)); while(s.length<3) s='0'+s; return (neg?'-':'')+s.slice(0,-2)+'.'+s.slice(-2); } // centavos → "1234.56" sem float
  function brl(c){ return CP().fmtCent(c); }
  function iso(br){ return CP().isoDeBR(br); }
  function brDeIso(d){ return d?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):''; }
  function soDig(s){ return String(s||'').replace(/\D/g,''); }
  function esc2(s){ return (typeof esc==='function')?esc(s):String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  async function sha256Hex(buf){ var h=await crypto.subtle.digest('SHA-256',buf); return Array.prototype.map.call(new Uint8Array(h),function(b){return b.toString(16).padStart(2,'0');}).join(''); }
  async function sha256Txt(t){ return (await sha256Hex(new TextEncoder().encode(t))).slice(0,32); }
  function sleep(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  function infoEmpresa(eid){
    if(!eid) return null; eid=String(eid);
    var e=(S.emps()||[]).filter(function(x){ return String(x.eid)===eid; })[0];
    if(e) return {eid:eid, nome:e.nome, cnpj:e.cnpj||''};
    var ext=(typeof democGetExternas==='function'?democGetExternas():{})[eid];
    return ext?{eid:eid, nome:ext.nome, cnpj:ext.cnpj||''}:null;
  }
  function empresaPorCnpj(cnpjNum){
    var e=(S.emps()||[]).filter(function(x){ return soDig(x.cnpj)===cnpjNum; })[0];
    if(e) return {eid:String(e.eid), nome:e.nome, cnpj:e.cnpj};
    var ex=(typeof democGetExternas==='function'?democGetExternas():{}), k=Object.keys(ex).filter(function(k){ return soDig(ex[k].cnpj)===cnpjNum; })[0];
    return k?{eid:k, nome:ex[k].nome, cnpj:ex[k].cnpj}:null;
  }

  // ── leitura do PDF (temporária) ─────────────────────────────────────────
  async function lerPdf(file){
    if(!root.pdfjsLib) throw new Error('Leitor de PDF (pdf.js) não carregado.');
    if(file.size>LIMITE_MB*1024*1024) throw new Error('Arquivo com '+Math.round(file.size/1048576)+' MB (limite '+LIMITE_MB+' MB). Divida o relatório por período e importe em partes.');
    try{ if(!pdfjsLib.GlobalWorkerOptions.workerSrc) pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }catch(e){}
    var buf=await file.arrayBuffer();
    var hash=await sha256Hex(buf);                       // hash ANTES do pdf.js (ele pode consumir o buffer)
    var doc=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
    if(doc.numPages>LIMITE_PAGINAS){ await doc.destroy(); throw new Error(doc.numPages+' páginas (limite '+LIMITE_PAGINAS+'). Divida o relatório por período.'); }
    var paginas=[];
    for(var n=1;n<=doc.numPages;n++){
      var pg=await doc.getPage(n), tc=await pg.getTextContent();
      paginas.push({num:n, items:tc.items.filter(function(i){ return i.str&&i.str.trim(); }).map(function(i){ return {str:i.str,x:i.transform[4],y:i.transform[5],w:i.width}; })});
      pg.cleanup();
    }
    await doc.destroy(); buf=null;
    return {paginas:paginas, hash:hash, numPages:paginas.length};
  }

  // ── processa 1 arquivo: detecta o tipo, aplica o parser certo e valida o CNPJ ──
  async function processarArquivo(file, empresaAlvo, tipoAlvo){
    var d={nome:file.name, tamanho:file.size, erro:null, bloqueado:null, avisos:[], validacoes:[]};
    try{
      var pdf=await lerPdf(file); d.hash=pdf.hash; d.paginas=pdf.numPages;
      d.tipo=CP().tipoDoDocumento(pdf.paginas);
      if(!d.tipo){ d.erro='Modelo não reconhecido (esperado: Livro Razão, Balancete ou DRE do Domínio). Nada foi importado.'; return d; }
      if(tipoAlvo&&d.tipo!==tipoAlvo){ d.erro='Este campo é só de '+TIPO_ROTULO[tipoAlvo]+', mas o arquivo é '+TIPO_ROTULO[d.tipo]+'. Importe-o na aba de '+TIPO_ROTULO[d.tipo]+'. Nada foi importado.'; return d; }
      if(d.tipo==='GENERAL_LEDGER') d.parse=RP().parse(pdf.paginas,{plPrefixos:(cfgEmpresa(empresaAlvo&&empresaAlvo.eid)||{}).plPrefixos});
      else if(d.tipo==='TRIAL_BALANCE') d.parse=CP().parseBalancete(pdf.paginas);
      else d.parse=CP().parseDRE(pdf.paginas);
      pdf.paginas=null;                                   // descarta o texto extraído
      d.cab=d.parse.cabecalho; d.cnpjNum=soDig(d.cab.cnpj);
      d.periodoIni=d.cab.periodoIni; d.periodoFim=d.cab.periodoFim;
      d.competencia=d.tipo==='GENERAL_LEDGER'?null:CP().competencia(d.periodoIni,d.periodoFim);
      d.avisos=d.parse.avisos||[]; d.validacoes=(d.parse.validacoes||[]).concat(d.parse.mismatches||[]);
      // identificação SEMPRE pelo CNPJ do cabeçalho (nunca pelo nome do arquivo)
      if(!d.cnpjNum||d.cnpjNum.length!==14){ d.bloqueado={codigo:'CNPJ_NAO_ENCONTRADO',mensagem:'CNPJ não encontrado no cabeçalho do PDF.'}; return d; }
      if(!d.periodoIni||!d.periodoFim){ d.bloqueado={codigo:'PERIODO_NAO_ENCONTRADO',mensagem:'Período não encontrado no cabeçalho do PDF.'}; return d; }
      var alvo=empresaAlvo||empresaPorCnpj(d.cnpjNum);
      if(!alvo){ d.bloqueado={codigo:'EMPRESA_NAO_ENCONTRADA',mensagem:'Nenhuma empresa cadastrada com o CNPJ '+d.cab.cnpj+' ('+d.cab.empresa+').'}; return d; }
      if(soDig(alvo.cnpj)!==d.cnpjNum){ d.bloqueado={codigo:'COMPANY_MISMATCH',mensagem:'O CNPJ do PDF ('+d.cab.cnpj+' — '+d.cab.empresa+') não é o da empresa aberta ('+alvo.nome+', '+alvo.cnpj+'). Importação bloqueada.'}; return d; }
      d.empresa=alvo;
      d.linhas=d.tipo==='GENERAL_LEDGER'?d.parse.contas.reduce(function(a,c){ return a+c.lancs.length; },0):(d.tipo==='TRIAL_BALANCE'?d.parse.contas.length:d.parse.linhas.length);
      if(d.tipo==='GENERAL_LEDGER'&&d.linhas>LIMITE_LANCAMENTOS){ d.bloqueado={codigo:'VOLUME_ALTO',mensagem:d.linhas+' lançamentos (limite '+LIMITE_LANCAMENTOS+' por importação, para não sobrecarregar o banco). Divida por período.'}; }
    }catch(e){ d.erro=(e&&e.message)||String(e); }
    return d;
  }
  function cfgEmpresa(eid){ if(!eid) return null; try{ return S.g('razao_cfg_'+eid)||null; }catch(e){ return null; } }

  // ── lançamentos do razão → linhas com chave de deduplicação ──────────────
  async function montarLinhasRazao(d){
    var eid=d.empresa.eid, out=[], RPk=RP();
    for(var i=0;i<d.parse.contas.length;i++){
      var c=d.parse.contas[i], chaves=RPk.numerarOcorrencias(eid,c);
      var hs=await Promise.all(chaves.map(sha256Txt));
      c.lancs.forEach(function(l,k){
        out.push({empresa_eid:eid, account_code:c.codigo, entry_date:l.data, entry_number:l.numero, history:l.historico, counterpart:l.contrapartida,
                  debit:num(l.deb), credit:num(l.cred), balance:l.saldo?num(l.saldo.cents):null, balance_side:l.saldo?l.saldo.lado:null,
                  competence:l.data.slice(0,7), source_page:l.pagina, dedup_key:hs[k]});
      });
    }
    return out;
  }
  async function chavesExistentes(eid, ini, fim){
    var set={}, from=0;
    for(;;){
      var r=await _supaClient.from('ledger_entries').select('dedup_key').eq('empresa_eid',eid).gte('entry_date',ini).lte('entry_date',fim).order('dedup_key').range(from,from+999);
      if(r.error) throw r.error;
      (r.data||[]).forEach(function(x){ set[x.dedup_key]=true; });
      if(!r.data||r.data.length<1000) break; from+=1000;
    }
    return set;
  }
  // diferenças ao importar período sobreposto (nada é apagado)
  async function calcularDiferencas(d){
    var eid=d.empresa.eid;
    if(d.tipo==='GENERAL_LEDGER'){
      d.linhasBanco=await montarLinhasRazao(d);
      var ex=await chavesExistentes(eid, iso(d.periodoIni), iso(d.periodoFim)), novas=0, ja=0, noPdf={};
      d.linhasBanco.forEach(function(l){ noPdf[l.dedup_key]=true; if(ex[l.dedup_key]) ja++; else novas++; });
      var soBanco=Object.keys(ex).filter(function(k){ return !noPdf[k]; }).length;
      d.diff={novos:novas, jaExistem:ja, soNoBanco:soBanco};
    } else if(d.tipo==='TRIAL_BALANCE'){
      var r=await _supaClient.from('trial_balance_accounts').select('classification,code,debit,credit,balance,balance_side',{count:'exact'}).eq('empresa_eid',eid).eq('period_start',iso(d.periodoIni)).eq('period_end',iso(d.periodoFim)).limit(1000);
      if(r.error) throw r.error; var ant={}; (r.data||[]).forEach(function(x){ ant[x.classification+'|'+x.code]=x; });
      var alt=0, novas2=0; d.parse.contas.forEach(function(c){ var a=ant[c.classificacao+'|'+c.codigo]; if(!a) novas2++; else if(num(c.deb)!==Number(a.debit).toFixed(2)||num(c.cred)!==Number(a.credit).toFixed(2)||num(c.atu.cents)!==Number(a.balance).toFixed(2)) alt++; });
      d.diff={jaExistia:(r.data||[]).length>0, novos:novas2, alteradas:alt};
    } else {
      var r2=await _supaClient.from('income_statement_lines').select('line_no,description,amount',{count:'exact'}).eq('empresa_eid',eid).eq('period_start',iso(d.periodoIni)).eq('period_end',iso(d.periodoFim)).limit(500);
      if(r2.error) throw r2.error; var ant2={}; (r2.data||[]).forEach(function(x){ ant2[x.line_no]=x; });
      var alt2=0; d.parse.linhas.forEach(function(l){ var a=ant2[l.ordem]; if(a&&(a.description!==l.descricao||(l.valor===null?a.amount!==null:Number(a.amount).toFixed(2)!==num(l.valor)))) alt2++; });
      d.diff={jaExistia:(r2.data||[]).length>0, linhasAnteriores:(r2.data||[]).length, alteradas:alt2};
    }
  }

  // ── gravação (só dados estruturados) ────────────────────────────────────
  async function inserirImportacao(d, extra){
    var row={empresa_eid:d.empresa.eid, company_cnpj:d.cnpjNum, document_type:d.tipo, period_start:iso(d.periodoIni), period_end:iso(d.periodoFim),
             competence:d.competencia, file_name:d.nome, file_hash:d.hash, parser_version:d.parse.versao||CP().VERSAO_BAL, pages:d.paginas, row_count:d.linhas,
             warnings:(d.avisos||[]).slice(0,50), validation:(d.validacoes||[]).slice(0,100), summary:extra||null,
             imported_by:(typeof currentUser!=='undefined'&&currentUser&&currentUser.nome)||null};
    var q=await _supaClient.from('accounting_imports').select('id').eq('empresa_eid',row.empresa_eid).eq('document_type',row.document_type).eq('file_hash',row.file_hash).maybeSingle();
    if(q.error) throw q.error;
    if(q.data) return {id:q.data.id, jaImportado:true};
    var r=await _supaClient.from('accounting_imports').insert(row).select('id').single();
    if(r.error) throw r.error; return {id:r.data.id, jaImportado:false};
  }
  async function enviar(tabela, linhas, opc){
    for(var i=0;i<linhas.length;i+=CHUNK){
      var r=await _supaClient.from(tabela).upsert(linhas.slice(i,i+CHUNK),opc);
      if(r.error) throw r.error;
      if(linhas.length>CHUNK) await sleep(120);        // ritmo gentil com o banco
    }
  }
  async function salvarRazao(d){
    var eid=d.empresa.eid, ini=iso(d.periodoIni), P=d.parse;
    var imp=await inserirImportacao(d,{contas:P.contas.length, contasResultadoIgnoradas:P.excluidas.length, lancamentos:d.linhas, partidasMultiplas:(P.info||[]).length});
    // contas patrimoniais (a abertura só é atualizada se este PDF começa ANTES do que já existe)
    var ex=await _supaClient.from('ledger_accounts').select('code,opening_date').eq('empresa_eid',eid); if(ex.error) throw ex.error;
    var exMap={}; (ex.data||[]).forEach(function(x){ exMap[x.code]=x.opening_date; });
    var alg=RP().algebrico;
    var contas=P.contas.map(function(c){ var base={empresa_eid:eid, code:c.codigo, classification:c.classificacao, description:c.descricao, group_name:c.grupo, updated_at:new Date().toISOString()};
      if(!exMap[c.codigo]||ini<exMap[c.codigo]){ base.opening_date=ini; base.opening_cents=alg(c.saldoAnt); } return base; });
    var comAbertura=contas.filter(function(c){ return c.opening_date!==undefined; }), semAbertura=contas.filter(function(c){ return c.opening_date===undefined; });
    if(comAbertura.length) await enviar('ledger_accounts',comAbertura,{onConflict:'empresa_eid,code'});
    if(semAbertura.length) await enviar('ledger_accounts',semAbertura,{onConflict:'empresa_eid,code'});
    // lançamentos: só os NOVOS (ignora duplicados; nada é apagado)
    var linhas=d.linhasBanco||await montarLinhasRazao(d), exist=await chavesExistentes(eid,ini,iso(d.periodoFim));
    var novas=linhas.filter(function(l){ return !exist[l.dedup_key]; }).map(function(l){ l.import_id=imp.id; return l; });
    await enviar('ledger_entries',novas,{onConflict:'empresa_eid,dedup_key',ignoreDuplicates:true});
    // resumo mensal por conta (recalculado a partir do PDF)
    var res=P.resumo.map(function(m){ return {empresa_eid:eid, account_code:m.conta, competence:m.anoMes, opening_cents:m.aberturaAlg, debit_cents:m.deb, credit_cents:m.cred,
        closing_cents:m.fechamentoAlg, closing_side:m.saldoFinal.lado, printed_debit_cents:m.totalImpressoDeb, printed_credit_cents:m.totalImpressoCred, reconciled:!!m.conferido,
        closing_entries_debit_cents:m.apuDeb||0, closing_entries_credit_cents:m.apuCred||0, entries_count:m.qtd, import_id:imp.id}; });
    await enviar('ledger_monthly_summary',res,{onConflict:'empresa_eid,account_code,competence'});
    // marca como "recebido" no módulo Demonstrativos (estrutura leve já existente)
    try{ if(typeof _democAplicarRazaoManual==='function'){ var vistos={}; P.resumo.forEach(function(m){ vistos[m.anoMes]=true; }); Object.keys(vistos).forEach(function(am){ _democGarantirEmpresaNaLista&&_democGarantirEmpresaNaLista(eid); _democAplicarRazaoManual(eid,am.slice(0,4),am.slice(5,7),d.nome); }); } }catch(e){ console.warn('registro razão',e); }
    return {novos:novas.length, ignorados:linhas.length-novas.length, jaImportado:imp.jaImportado};
  }
  async function salvarBalancete(d){
    var eid=d.empresa.eid, P=d.parse, R=P.resultados, ps=iso(d.periodoIni), pe=iso(d.periodoFim);
    var imp=await inserirImportacao(d,{competencia:d.competencia, resultadoMes:R.mes?{tipo:R.mes.tipo,assinado:num(R.mes.assinado)}:null, resultadoExercicio:R.exercicio?{tipo:R.exercicio.tipo,assinado:num(R.exercicio.assinado)}:null});
    var contas=P.contas.map(function(c){ return {empresa_eid:eid, period_start:ps, period_end:pe, competence:d.competencia, code:c.codigo, classification:c.classificacao, description:c.descricao,
      is_analytic:c.analitica, level:c.nivel, prev_balance:num(c.ant.cents), prev_side:c.ant.lado, debit:num(c.deb), credit:num(c.cred), balance:num(c.atu.cents), balance_side:c.atu.lado, import_id:imp.id}; });
    await enviar('trial_balance_accounts',contas,{onConflict:'empresa_eid,period_start,period_end,classification,code'});
    var resumoJson=P.resumo.map(function(x){ return {chave:x.chave, rotulo:x.rotulo, ant:x.ant, deb:x.deb, cred:x.cred, atu:x.atu}; });
    var m=R.mes, e=R.exercicio;
    var sum={empresa_eid:eid, period_start:ps, period_end:pe, competence:d.competencia, sections:resumoJson, import_id:imp.id,
      monthly_result_period_start:m?iso(m.periodoIni):null, monthly_result_period_end:m?iso(m.periodoFim):null, monthly_result_amount:m?num(m.cents):null, monthly_result_side:m?m.lado:null, monthly_result_type:m?m.tipo:null, monthly_result_signed:m?num(m.assinado):null,
      exercise_result_period_start:e?iso(e.periodoIni):null, exercise_result_period_end:e?iso(e.periodoFim):null, exercise_result_amount:e?num(e.cents):null, exercise_result_side:e?e.lado:null, exercise_result_type:e?e.tipo:null, exercise_result_signed:e?num(e.assinado):null};
    await enviar('trial_balance_summary',[sum],{onConflict:'empresa_eid,period_start,period_end'});
    return {contas:contas.length, jaImportado:imp.jaImportado};
  }
  async function salvarDRE(d){
    var eid=d.empresa.eid, P=d.parse, ps=iso(d.periodoIni), pe=iso(d.periodoFim), res=P.resultado;
    var imp=await inserirImportacao(d,{competencia:d.competencia, resultado:res?{tipo:res.tipo,assinado:num(res.assinado),impresso:res.impresso,escopo:res.escopo,periodoIni:d.periodoIni,periodoFim:d.periodoFim}:null});
    var linhas=P.linhas.map(function(l){ return {empresa_eid:eid, period_start:ps, period_end:pe, competence:d.competencia, line_no:l.ordem, code:l.codigo, classification:l.classificacao,
      description:l.descricao, indent:l.recuo, amount:l.valor===null?null:num(l.valor), amount_text:l.valorTexto, is_result:!!(res&&l.descricao===res.rotulo), import_id:imp.id}; });
    await enviar('income_statement_lines',linhas,{onConflict:'empresa_eid,period_start,period_end,line_no'});
    // linhas antigas do MESMO período que sobraram (estrutura diferente): substituídas pela versão nova do período
    var r=await _supaClient.from('income_statement_lines').delete().eq('empresa_eid',eid).eq('period_start',ps).eq('period_end',pe).gt('line_no',linhas.length);
    if(r.error) throw r.error;
    return {linhas:linhas.length, jaImportado:imp.jaImportado};
  }

  // ── conferências entre os documentos do lote ────────────────────────────
  function conferenciasDoLote(){
    var v=st.docs.filter(function(d){ return d.parse&&!d.erro&&!d.bloqueado; }), out=[];
    var bal=v.filter(function(d){ return d.tipo==='TRIAL_BALANCE'; })[0], dre=v.filter(function(d){ return d.tipo==='INCOME_STATEMENT'; })[0], raz=v.filter(function(d){ return d.tipo==='GENERAL_LEDGER'; })[0];
    if(bal&&dre) out.push({titulo:'Balancete × DRE', r:CP().conciliarBalanceteDRE(bal.parse,dre.parse)});
    if(bal&&raz) out.push({titulo:'Balancete × Livro Razão (competência '+(bal.parse.competencia||'—')+')', r:CP().conciliarBalanceteRazao(bal.parse,raz.parse)});
    if(v.length>1){ var cn={}; v.forEach(function(d){ cn[d.cnpjNum]=1; }); if(Object.keys(cn).length>1) out.push({titulo:'Empresas dos documentos',r:{status:'COMPANY_MISMATCH'}}); }
    return out;
  }

  // ── interface ───────────────────────────────────────────────────────────
  function corStatus(s){ return /^(CONCILIADO)$/.test(s)?'var(--green)':(/RESSALVA|APURACAO|ZERADA/.test(s)?'var(--amber)':'var(--red)'); }
  function rotStatus(s){ return {CONCILIADO:'CONCILIADO',CONCILIADO_COM_RESSALVA:'CONCILIADO COM RESSALVA',DIVERGENTE:'DIVERGENTE',PERIOD_MISMATCH:'PERIOD_MISMATCH (períodos diferentes — não comparado)',PERIOD_NOT_COVERED:'PERIOD_NOT_COVERED',COMPANY_MISMATCH:'COMPANY_MISMATCH',INCOMPLETO:'INCOMPLETO'}[s]||s; }
  function tagRes(r){ if(!r) return '—'; var cor=r.tipo==='LUCRO'?'var(--green)':(r.tipo==='PREJUIZO'?'var(--red)':'var(--slate)'); return '<b style="color:'+cor+'">'+(r.tipo==='PREJUIZO'?'PREJUÍZO':r.tipo==='LUCRO'?'LUCRO':'RESULTADO ZERO')+' R$ '+brl(r.cents)+'</b> <span style="color:var(--slate)">('+r.lado+' · algébrico '+brl(r.assinado)+')</span>'; }

  function cartao(d,i){
    var h='<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--white)">';
    h+='<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>'+esc2(d.nome)+'</b><span class="badge" style="background:var(--blue-bg);color:var(--blue)">'+(TIPO_ROTULO[d.tipo]||'?')+'</span></div>';
    if(d.erro){ return h+'<div style="color:var(--red);margin-top:6px">✖ '+esc2(d.erro)+'</div></div>'; }
    h+='<div style="font-size:12px;color:var(--slate);margin-top:4px">'+esc2(d.cab.empresa)+' · CNPJ '+esc2(d.cab.cnpj)+' ('+d.cnpjNum+') · '+d.periodoIni+' a '+d.periodoFim+(d.competencia?' · competência '+d.competencia:'')+' · '+d.paginas+' página(s) · '+esc2(d.parse.versao||'')+'</div>';
    if(d.bloqueado) return h+'<div style="margin-top:8px;padding:8px 10px;border-radius:6px;background:var(--red-bg);color:var(--red);font-weight:600">⛔ '+esc2(d.bloqueado.codigo)+' — '+esc2(d.bloqueado.mensagem)+'</div></div>';
    h+='<div style="font-size:12px;color:var(--green);margin-top:4px">✓ CNPJ confere com '+esc2(d.empresa.nome)+'</div>';
    var P=d.parse;
    if(d.tipo==='GENERAL_LEDGER'){
      h+='<div style="margin-top:6px;font-size:12.5px">'+P.contas.length+' contas patrimoniais · '+d.linhas+' lançamentos · '+P.excluidas.length+' contas de resultado <b>não</b> importadas como bloco (contrapartidas preservadas) · '+(P.info||[]).length+' partida(s) múltipla(s)</div>';
      var conf=P.resumo.filter(function(x){ return x.conferido; }).length; h+='<div style="font-size:12.5px">Totais do mês conferidos: <b>'+conf+' de '+P.resumo.length+'</b> · saldos linha a linha: '+(P.mismatches.filter(function(m){return m.codigo==='BALANCE_MISMATCH';}).length?'<b style="color:var(--red)">divergências</b>':'<b style="color:var(--green)">todos conferem</b>')+'</div>';
      if(d.diff) h+='<div style="font-size:12.5px;margin-top:4px">No banco: <b>'+d.diff.novos+'</b> lançamento(s) novo(s) · '+d.diff.jaExistem+' já existem (não duplicam)'+(d.diff.soNoBanco?' · <b style="color:var(--amber)">'+d.diff.soNoBanco+' existem no banco neste período e não estão neste PDF (nada será apagado)</b>':'')+'</div>';
    } else if(d.tipo==='TRIAL_BALANCE'){
      var R=P.resultados; var raizes={}; P.contas.forEach(function(c){ raizes[c.grupoRaiz]=(raizes[c.grupoRaiz]||0)+1; });
      h+='<div style="margin-top:6px;font-size:12.5px">'+P.contas.length+' contas (sintéticas e analíticas; grupos '+Object.keys(raizes).sort().map(function(k){ return k+':'+raizes[k]; }).join(' · ')+') · resumo com '+P.resumo.length+' linhas</div>';
      h+='<div style="margin-top:6px;font-size:13px">Resultado do <b>mês</b>: '+tagRes(R.mes)+'</div><div style="font-size:13px">Resultado do <b>exercício</b> (acumulado): '+tagRes(R.exercicio)+'</div>';
      if(d.diff&&d.diff.jaExistia) h+='<div style="font-size:12px;color:var(--amber);margin-top:4px">Já existe balancete deste período: será atualizado ('+d.diff.alteradas+' conta(s) com valores diferentes, '+d.diff.novos+' nova(s)).</div>';
    } else {
      h+='<div style="margin-top:6px;font-size:12.5px">'+P.linhas.length+' linhas (contas, grupos, subtotais e resultado) — valores entre parênteses = negativos</div>';
      h+='<div style="margin-top:6px;font-size:13px">Resultado da DRE ('+(P.resultado?P.resultado.escopo.toLowerCase().replace('_',' '):'')+', '+d.periodoIni+' a '+d.periodoFim+'): '+(P.resultado?tagRes({tipo:P.resultado.tipo,cents:P.resultado.cents,lado:P.resultado.assinado<0?'D':'C',assinado:P.resultado.assinado}):'não encontrado')+'</div>';
      if(d.diff&&d.diff.jaExistia) h+='<div style="font-size:12px;color:var(--amber);margin-top:4px">Já existe DRE deste período ('+d.diff.linhasAnteriores+' linhas): será atualizada ('+d.diff.alteradas+' linha(s) diferentes).</div>';
    }
    var val=d.validacoes||[];
    if(val.length){ h+='<div style="margin-top:8px;padding:8px 10px;border-radius:6px;background:var(--red-bg);color:var(--red);font-size:12px"><b>Validações que falharam ('+val.length+') — o valor impresso NÃO foi alterado:</b><br>'+val.slice(0,8).map(function(v){ return esc2(v.codigo)+(v.conta?' conta '+esc2(v.conta):'')+(v.pagina?' pág. '+v.pagina:'')+(v.numero?' lanç. '+esc2(v.numero):'')+': '+esc2(JSON.stringify(v).slice(0,140)); }).join('<br>')+(val.length>8?'<br>…':'')+'</div>'; }
    else h+='<div style="margin-top:6px;font-size:12px;color:var(--green)">✓ Todas as validações aritméticas passaram</div>';
    if(d.avisos&&d.avisos.length) h+='<div style="margin-top:6px;font-size:12px;color:var(--amber)">⚠ '+d.avisos.length+' aviso(s): '+d.avisos.slice(0,4).map(function(a){ return esc2(a.codigo+' (pág. '+a.pagina+')'); }).join(', ')+'</div>';
    return h+'</div>';
  }
  function corpo(){
    var h='';
    if(!st.docs.length) return '<div style="color:var(--slate);font-size:13px">Escolha um ou mais PDFs do Domínio (Livro Razão, Balancete, DRE). Eles são lidos aqui, no seu navegador, e <b>nada é enviado como arquivo</b>: só os dados extraídos, depois que você confirmar.</div>';
    st.docs.forEach(function(d,i){ h+=cartao(d,i); });
    var conf=conferenciasDoLote();
    if(conf.length){ h+='<div style="font-weight:700;margin:12px 0 6px">Conferência entre os documentos</div>'; conf.forEach(function(c){ var r=c.r;
      h+='<div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px;background:var(--white)"><b>'+esc2(c.titulo)+'</b>: <b style="color:'+corStatus(r.status)+'">'+esc2(rotStatus(r.status))+'</b>';
      if(r.comparacao) h+='<div style="font-size:12.5px;margin-top:4px">'+esc2(r.comparacao.replace('_',' ').toLowerCase())+' — balancete '+brl(r.balancete)+' × DRE '+brl(r.dre)+' (comparação algébrica; lucro e prejuízo não se equivalem)</div>';
      if(r.mensagem) h+='<div style="font-size:12.5px;margin-top:4px">'+esc2(r.mensagem)+'</div>';
      if(r.itens){ h+='<div style="font-size:12.5px;margin-top:4px">'+r.contas+' conta(s): '+Object.keys(r.resumo).filter(function(k){return r.resumo[k];}).map(function(k){ return r.resumo[k]+' '+k.toLowerCase().replace(/_/g,' '); }).join(' · ')+'</div>';
        r.itens.filter(function(x){ return x.situacao==='DIVERGENTE'||x.situacao==='DIVERGENTE_APURACAO'; }).forEach(function(x){ h+='<div style="font-size:12px;margin-top:3px;color:'+(x.situacao==='DIVERGENTE'?'var(--red)':'var(--amber)')+'">• conta '+esc2(x.conta)+' '+esc2(x.descricao)+': razão D '+brl(x.razao.deb)+' C '+brl(x.razao.cred)+' saldo '+brl(x.razao.saldoFinal)+(x.balancete?' | balancete D '+brl(x.balancete.deb)+' C '+brl(x.balancete.cred)+' saldo '+brl(x.balancete.saldoAtual):' | (não consta no balancete)')+(x.explicacao?' — '+esc2(x.explicacao):'')+'</div>'; }); }
      h+='</div>'; }); }
    return h;
  }
  function render(){
    var el=document.getElementById('ctbCorpo'); if(el) el.innerHTML=corpo();
    var ok=st.docs.filter(function(d){ return d.parse&&!d.erro&&!d.bloqueado; });
    var b=document.getElementById('ctbBtnSalvar'); if(b){ b.disabled=!ok.length||st.salvando; b.textContent=st.salvando?'Salvando…':('💾 Salvar dados estruturados ('+ok.length+')'); }
  }
  function fechar(){ st.docs=[]; var m=document.getElementById('ctbModal'); if(m) m.remove(); }   // descarta tudo o que foi lido
  function abrir(eid,tipo){
    st={eid:eid?String(eid):((typeof _democEidAtual!=='undefined'&&_democEidAtual)||(typeof _empresaGlobal!=='undefined'&&_empresaGlobal)||null), docs:[], salvando:false, tipoAlvo:tipo||null};
    var rotTipo=tipo?TIPO_ROTULO[tipo]:'Livro Razão · Balancete · DRE';
    var alvo=infoEmpresa(st.eid), m=document.createElement('div'); m.id='ctbModal';
    m.style.cssText='position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto';
    m.innerHTML='<div style="background:var(--bg);color:var(--ink);border-radius:12px;max-width:980px;width:100%;padding:18px 20px;box-shadow:0 10px 40px rgba(0,0,0,.4)">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div style="font-size:16px;font-weight:700">📥 Importar '+rotTipo+' (PDF do Domínio)</div><button class="btn bo bsm" onclick="CtbImport.fechar()">✕ Fechar (descarta a leitura)</button></div>'
      +'<div style="font-size:12.5px;color:var(--slate);margin:6px 0 10px">'+(alvo?'Empresa aberta: <b>'+esc2(alvo.nome)+'</b> — CNPJ '+esc2(alvo.cnpj)+'. PDFs de outro CNPJ são bloqueados.':'Nenhuma empresa aberta: a empresa será identificada pelo <b>CNPJ do cabeçalho</b> do PDF.')+' Sem IA. Os PDFs não são armazenados: fica só o dado estruturado (mantenha o arquivo original no arquivo documental do escritório).</div>'
      +'<input type="file" id="ctbArq" accept=".pdf,application/pdf" multiple class="fi" onchange="CtbImport.escolheu(this)" style="margin-bottom:10px">'
      +'<div id="ctbStatus" style="font-size:12.5px;color:var(--slate);margin-bottom:8px"></div><div id="ctbCorpo"></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn bo" onclick="CtbImport.fechar()">Cancelar</button><button class="btn bp" id="ctbBtnSalvar" disabled onclick="CtbImport.salvar()">💾 Salvar dados estruturados</button></div></div>';
    document.body.appendChild(m); render();
  }
  async function escolheu(inp){
    var arqs=Array.prototype.slice.call(inp.files||[]); if(!arqs.length) return;
    await lerLote(arqs,0); inp.value='';                   // solta as referências dos arquivos
  }
  async function lerLote(arqs,pulados){
    var alvo=infoEmpresa(st.eid), stt=document.getElementById('ctbStatus'); st.docs=[];
    for(var i=0;i<arqs.length;i++){
      if(stt) stt.textContent='Lendo '+(i+1)+' de '+arqs.length+': '+arqs[i].name+' …';
      var d=await processarArquivo(arqs[i],alvo,st.tipoAlvo); st.docs.push(d);
      if(d.parse&&!d.erro&&!d.bloqueado){ try{ if(stt) stt.textContent='Comparando com o que já está no banco: '+arqs[i].name+' …'; await calcularDiferencas(d); }catch(e){ d.avisos.push({codigo:'FALHA_COMPARAR_BANCO',pagina:0,mensagem:String(e.message||e)}); } }
      render(); await sleep(0);
    }
    if(stt) stt.textContent='Leitura concluída. Confira a prévia abaixo antes de salvar.'+(pulados?' ('+pulados+' arquivo(s) da pasta já estavam importados e foram pulados; para reler um deles, use o campo de arquivo.)':'');
    render();
  }
  async function salvar(){
    if(st.salvando) return; var ok=st.docs.filter(function(d){ return d.parse&&!d.erro&&!d.bloqueado; }); if(!ok.length) return;
    var falhas=ok.filter(function(d){ return (d.validacoes||[]).length; });
    if(falhas.length&&!confirm('Há validações aritméticas que falharam em '+falhas.length+' documento(s). Os valores impressos no PDF serão gravados sem alteração e as divergências ficam registradas na auditoria. Continuar?')) return;
    st.salvando=true; render(); var stt=document.getElementById('ctbStatus'), resumo=[];
    try{
      for(var i=0;i<ok.length;i++){
        var d=ok[i]; if(stt) stt.textContent='Salvando '+(TIPO_ROTULO[d.tipo])+': '+d.nome+' …';
        var r=d.tipo==='GENERAL_LEDGER'?await salvarRazao(d):(d.tipo==='TRIAL_BALANCE'?await salvarBalancete(d):await salvarDRE(d));
        resumo.push(TIPO_ROTULO[d.tipo]+': '+(d.tipo==='GENERAL_LEDGER'?(r.novos+' novos, '+r.ignorados+' já existentes'):(d.tipo==='TRIAL_BALANCE'?(r.contas+' contas'):(r.linhas+' linhas')))+(r.jaImportado?' (arquivo já tinha sido importado)':''));
        d.parse=null;                                    // libera memória
      }
      toast('Importação concluída — '+resumo.join(' · ')+'. Nenhum PDF foi guardado.','ok');
      fechar();
      if(typeof renderDemoc==='function') renderDemoc();
    }catch(e){ console.error('importação contábil',e); toast('Falha ao salvar: '+(e.message||e)+' — nada foi marcado como concluído; pode tentar de novo (não duplica).','err'); st.salvando=false; render(); }
  }

  // ── painel salvo (aba Livros Razão da empresa): importações + conciliação ──
  async function painel(eid, contId, tipo){
    var el=document.getElementById(contId); if(!el) return;
    el.innerHTML='<div style="color:var(--slate);font-size:12.5px">Carregando dados estruturados…</div>';
    try{
      var r=await _supaClient.from('accounting_imports').select('id,document_type,period_start,period_end,competence,file_name,row_count,pages,parser_version,imported_at,imported_by,validation,warnings,summary').eq('empresa_eid',String(eid)).match(tipo?{document_type:tipo}:{}).order('period_end',{ascending:false}).order('imported_at',{ascending:false}).limit(200);
      if(r.error) throw r.error; var lista=r.data||[];
      var h='<div style="font-weight:700;margin:12px 0 6px">'+(tipo?TIPO_ROTULO[tipo]+' — importações':'Importações')+' salvas (só dados estruturados — os PDFs não ficam no sistema)</div>';
      if(!lista.length) h+='<div style="color:var(--slate);font-size:12.5px">Nenhuma importação ainda.</div>';
      else h+='<table class="luc-t" style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'+['Documento','Período','Arquivo original (referência)','Linhas','Validações','Importado em'].map(function(t){ return '<th style="padding:6px 8px;text-align:left;background:var(--ink2);color:#fff">'+t+'</th>'; }).join('')+'</tr></thead><tbody>'
        +lista.map(function(x,i){ var nv=(x.validation||[]).length; return '<tr style="background:'+(i%2?'var(--bg)':'var(--white)')+'"><td style="padding:5px 8px"><b>'+TIPO_ROTULO[x.document_type]+'</b></td><td style="padding:5px 8px">'+brDeIso(x.period_start)+' a '+brDeIso(x.period_end)+'</td><td style="padding:5px 8px">'+esc2(x.file_name||'')+'</td><td style="padding:5px 8px">'+(x.row_count==null?'':x.row_count)+'</td><td style="padding:5px 8px;color:'+(nv?'var(--red)':'var(--green)')+'">'+(nv?nv+' falha(s)':'✓ ok')+'</td><td style="padding:5px 8px">'+esc2(new Date(x.imported_at).toLocaleDateString('pt-BR'))+'</td></tr>'; }).join('')+'</tbody></table>';
      var comps={}; lista.filter(function(x){ return x.document_type==='TRIAL_BALANCE'&&x.competence; }).forEach(function(x){ comps[x.competence]=true; });
      var ks=Object.keys(comps).sort().reverse();
      if(ks.length&&(!tipo||tipo==='TRIAL_BALANCE')){ h+='<div style="font-weight:700;margin:16px 0 6px">Conciliação (dados salvos)</div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><select class="si" id="ctbCompSel_'+eid+'">'+ks.map(function(k){ return '<option>'+k+'</option>'; }).join('')+'</select><button class="btn bp bsm" onclick="CtbImport.conciliarSalvo(\''+eid+'\')">Conciliar Balancete × DRE × Razão</button></div><div id="ctbConc_'+eid+'" style="margin-top:8px"></div>'; }
      el.innerHTML=h;
    }catch(e){ el.innerHTML='<div style="color:var(--red);font-size:12.5px">Não foi possível ler os dados salvos: '+esc2(e.message||e)+'</div>'; }
  }
  async function pag(tabela, sel, filtros){ // leitura paginada
    var all=[], from=0;
    for(;;){ var q=_supaClient.from(tabela).select(sel); filtros.forEach(function(f){ q=q[f[0]](f[1],f[2]); }); var r=await q.range(from,from+999); if(r.error) throw r.error; all=all.concat(r.data||[]); if(!r.data||r.data.length<1000) break; from+=1000; }
    return all;
  }
  async function conciliarSalvo(eid){
    var comp=document.getElementById('ctbCompSel_'+eid).value, out=document.getElementById('ctbConc_'+eid); out.innerHTML='<span style="color:var(--slate)">Conciliando…</span>';
    try{
      eid=String(eid); var info=infoEmpresa(eid), cn=soDig(info&&info.cnpj);
      var contas=await pag('trial_balance_accounts','code,classification,description,is_analytic,prev_balance,prev_side,debit,credit,balance,balance_side,period_start,period_end',[['eq','empresa_eid',eid],['eq','competence',comp]]);
      if(!contas.length) throw new Error('Balancete de '+comp+' não encontrado.');
      var sm=(await pag('trial_balance_summary','monthly_result_amount,monthly_result_side,monthly_result_type,monthly_result_signed,exercise_result_amount,exercise_result_side,exercise_result_type,exercise_result_signed,exercise_result_period_start,exercise_result_period_end,period_start,period_end',[['eq','empresa_eid',eid],['eq','competence',comp]]))[0];
      var ps=contas[0].period_start, pe=contas[0].period_end, c100=function(v){ return Math.round(Number(v)*100); };
      var lado=function(v,s){ return {cents:c100(v),lado:s||null}; };
      var bal={cabecalho:{cnpjNum:cn,periodoIni:brDeIso(ps),periodoFim:brDeIso(pe)}, competencia:comp,
        contas:contas.map(function(c){ return {codigo:c.code,classificacao:c.classification,descricao:c.description,analitica:c.is_analytic,ant:lado(c.prev_balance,c.prev_side),deb:c100(c.debit),cred:c100(c.credit),atu:lado(c.balance,c.balance_side)}; }),
        resultados:{mes:sm&&sm.monthly_result_signed!=null?{assinado:c100(sm.monthly_result_signed),tipo:sm.monthly_result_type,cents:c100(sm.monthly_result_amount),lado:sm.monthly_result_side,periodoIni:brDeIso(ps),periodoFim:brDeIso(pe)}:null,
                    exercicio:sm&&sm.exercise_result_signed!=null?{assinado:c100(sm.exercise_result_signed),tipo:sm.exercise_result_type,cents:c100(sm.exercise_result_amount),lado:sm.exercise_result_side,periodoIni:brDeIso(sm.exercise_result_period_start),periodoFim:brDeIso(sm.exercise_result_period_end)}:null}};
      var h='<div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:var(--white);margin-bottom:8px"><b>Resultados do balancete '+comp+'</b><div style="font-size:13px;margin-top:4px">Mês: '+tagRes(bal.resultados.mes)+'</div><div style="font-size:13px">Exercício: '+tagRes(bal.resultados.exercicio)+'</div></div>';
      // DRE
      var dimp=(await pag('accounting_imports','summary,period_start,period_end',[['eq','empresa_eid',eid],['eq','document_type','INCOME_STATEMENT'],['eq','competence',comp]])).filter(function(x){ return x.summary&&x.summary.resultado; })[0];
      if(dimp){ var dre={cabecalho:{cnpjNum:cn,periodoIni:brDeIso(dimp.period_start),periodoFim:brDeIso(dimp.period_end)},resultado:{assinado:c100(dimp.summary.resultado.assinado),tipo:dimp.summary.resultado.tipo}};
        var c=CP().conciliarBalanceteDRE(bal,dre); h+='<div style="margin-bottom:8px"><b>Balancete × DRE:</b> <b style="color:'+corStatus(c.status)+'">'+esc2(rotStatus(c.status))+'</b>'+(c.comparacao?' — '+brl(c.balancete)+' × '+brl(c.dre):'')+(c.mensagem?' — '+esc2(c.mensagem):'')+'</div>'; }
      else h+='<div style="margin-bottom:8px;color:var(--slate)">Sem DRE salva para '+comp+'.</div>';
      // Razão (modelo montado só com resumos mensais — nenhum lançamento é baixado)
      var la=await pag('ledger_accounts','code,description,opening_cents',[['eq','empresa_eid',eid]]);
      if(la.length){
        var ms=await pag('ledger_monthly_summary','account_code,competence,debit_cents,credit_cents,closing_cents,closing_entries_debit_cents,closing_entries_credit_cents',[['eq','empresa_eid',eid],['lte','competence',comp]]);
        var imps=await pag('accounting_imports','period_start,period_end',[['eq','empresa_eid',eid],['eq','document_type','GENERAL_LEDGER']]);
        var mi=imps.map(function(x){return x.period_start;}).sort()[0], ma=imps.map(function(x){return x.period_end;}).sort().pop();
        var mesesPor={}; ms.forEach(function(m){ (mesesPor[m.account_code]=mesesPor[m.account_code]||{})[m.competence]={deb:m.debit_cents,cred:m.credit_cents,fechAlg:m.closing_cents,apuDeb:m.closing_entries_debit_cents,apuCred:m.closing_entries_credit_cents}; });
        var modelo={cabecalho:{cnpj:info.cnpj,periodoIni:brDeIso(mi),periodoFim:brDeIso(ma)}, contas:la.map(function(a){ return {codigo:a.code,descricao:a.description,aberturaAlg:Number(a.opening_cents)||0,meses:mesesPor[a.code]||{}}; })};
        var rz=CP().conciliarBalanceteRazao(bal,modelo);
        h+='<div><b>Balancete × Livro Razão ('+comp+'):</b> <b style="color:'+corStatus(rz.status)+'">'+esc2(rotStatus(rz.status))+'</b>'+(rz.mensagem?' — '+esc2(rz.mensagem):'')+'</div>';
        if(rz.itens){ h+='<div style="font-size:12.5px;margin-top:3px">'+rz.contas+' contas: '+Object.keys(rz.resumo).filter(function(k){return rz.resumo[k];}).map(function(k){ return rz.resumo[k]+' '+k.toLowerCase().replace(/_/g,' '); }).join(' · ')+'</div>';
          rz.itens.filter(function(x){ return x.situacao==='DIVERGENTE'||x.situacao==='DIVERGENTE_APURACAO'; }).forEach(function(x){ h+='<div style="font-size:12px;margin-top:3px;color:'+(x.situacao==='DIVERGENTE'?'var(--red)':'var(--amber)')+'">• conta '+esc2(x.conta)+' '+esc2(x.descricao)+' — razão D '+brl(x.razao.deb)+' C '+brl(x.razao.cred)+' saldo '+brl(x.razao.saldoFinal)+(x.balancete?' | balancete D '+brl(x.balancete.deb)+' C '+brl(x.balancete.cred)+' saldo '+brl(x.balancete.saldoAtual):' | (ausente no balancete)')+(x.explicacao?' — '+esc2(x.explicacao):'')+'</div>'; }); }
      } else h+='<div style="color:var(--slate)">Sem Livro Razão salvo.</div>';
      out.innerHTML=h;
    }catch(e){ out.innerHTML='<span style="color:var(--red)">'+esc2(e.message||e)+'</span>'; }
  }

  // ═══ Uma aba para cada tipo: importar (campo próprio), ler da pasta própria e ABRIR os dados salvos ═══
  // Pastas: ...\Demonstrativos Contábeis\{Balancete | DRE | Livro Razão}\{ano}\{Rótulo}_{eid}_{DDMMAAAA} a {DDMMAAAA}.pdf
  var PASTAS={GENERAL_LEDGER:['Livro Razão','Livros Razão','Livro Razao','Razão','Razao'],TRIAL_BALANCE:['Balancete','Balancetes'],INCOME_STATEMENT:['DRE','D.R.E.','DREs']};
  var vst={};    // estado dos visores (conta/mês/busca/página) por empresa e tipo
  var PG=100;
  function nf(v){ return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function nfLado(v,l){ return nf(v)+(l?' '+l:''); }
  function cents(c){ c=Number(c)||0; return brl(Math.abs(c))+(c<0?' C':(c>0?' D':'')); }
  function thH(t,al){ return '<th style="padding:6px 8px;text-align:'+(al||'left')+';background:var(--ink2);color:#fff;position:sticky;top:0;z-index:1;white-space:nowrap">'+t+'</th>'; }
  function tdH(t,al,extra){ return '<td style="padding:4px 8px;text-align:'+(al||'left')+';'+(extra||'')+'">'+t+'</td>'; }
  var MONO='font-family:var(--mono);white-space:nowrap';
  function vazio(msg){ return '<div style="color:var(--slate);font-size:12.5px;padding:8px 0">'+msg+'</div>'; }
  function optHtml(v,t,sel){ return '<option value="'+esc2(v)+'"'+(sel?' selected':'')+'>'+esc2(t)+'</option>'; }
  function vzCall(eid,tipo,patch){ return "CtbImport.vz('"+esc2(eid)+"','"+tipo+"',"+patch+")"; }

  async function daPasta(eid,tipo){
    eid=String(eid);
    try{
      if(!window.showDirectoryPicker){ toast('Este navegador não deixa ler pastas — use o campo de arquivo.','err'); return; }
      var raiz=(typeof _democCarregarHandlePasta==='function')?await _democCarregarHandlePasta():null;
      if(!raiz){ toast('Falta liberar a pasta "Demonstrativos Contábeis": use "Conceder acesso à pasta" no topo desta tela e tente de novo.','err'); return; }
      if((await raiz.queryPermission({mode:'read'}))!=='granted'){ if((await raiz.requestPermission({mode:'read'}))!=='granted'){ toast('Acesso à pasta não autorizado.','err'); return; } }
      var dirTipo=null, nomeTipo=null;
      for(var i=0;i<PASTAS[tipo].length&&!dirTipo;i++){ try{ dirTipo=await raiz.getDirectoryHandle(PASTAS[tipo][i]); nomeTipo=PASTAS[tipo][i]; }catch(e){} }
      if(!dirTipo){ toast('Não achei a pasta "'+PASTAS[tipo][0]+'" dentro da pasta liberada.','err'); return; }
      var achados=[];
      for await (var ent of dirTipo.entries()){                 // subpasta de cada ano
        if(ent[1].kind!=='directory') continue;
        for await (var ar of ent[1].entries()){
          if(ar[1].kind!=='file') continue;
          var m=/_(\d+)_(\d{2})(\d{2})(\d{4})\s*a\s*(\d{2})(\d{2})(\d{4})\.pdf$/i.exec(ar[0]);
          if(m&&m[1]===eid) achados.push({nome:ar[0],fh:ar[1],fim:m[7]+m[6]+m[5]});
        }
      }
      if(!achados.length){ toast('Nenhum PDF desta empresa (código '+eid+') na pasta "'+nomeTipo+'".','warn'); return; }
      achados.sort(function(a,b){ return a.fim<b.fim?-1:1; });
      var r=await _supaClient.from('accounting_imports').select('file_name').eq('empresa_eid',eid).eq('document_type',tipo).in('file_name',achados.map(function(a){ return a.nome; }));
      if(r.error) throw r.error;
      var ja={}; (r.data||[]).forEach(function(x){ ja[x.file_name]=true; });
      var novos=achados.filter(function(a){ return !ja[a.nome]; });
      if(!novos.length){ toast('Pasta "'+nomeTipo+'": '+achados.length+' arquivo(s) desta empresa e todos já foram importados. Para reler um deles, use o campo de arquivo.','ok'); return; }
      abrir(eid,tipo);
      var arqs=[]; for(var k=0;k<novos.length;k++) arqs.push(await novos[k].fh.getFile());
      await lerLote(arqs,achados.length-novos.length);
    }catch(e){ if(e&&e.name==='AbortError') return; console.error('daPasta',e); toast('Erro ao ler a pasta: '+(e.message||e),'err'); }
  }

  // ── abrir o que está salvo ──
  async function aba(eid,tipo){
    eid=String(eid);
    var cv=document.getElementById('ctbVisor_'+tipo+'_'+eid);
    if(cv) visor(eid,tipo,cv);
    painel(eid,'ctbPainel_'+tipo+'_'+eid,tipo);
  }
  async function visor(eid,tipo,el){
    el.innerHTML=vazio('Carregando…');
    try{
      if(tipo==='GENERAL_LEDGER') await visorRazao(eid,el);
      else if(tipo==='TRIAL_BALANCE') await visorBalancete(eid,el);
      else await visorDRE(eid,el);
    }catch(e){ el.innerHTML='<div style="color:var(--red);font-size:12.5px">Não foi possível abrir os dados salvos: '+esc2(e.message||e)+'</div>'; }
  }
  function vz(eid,tipo,patch){
    var k=tipo+'|'+eid, s=vst[k]=vst[k]||{};
    if('conta' in patch&&patch.conta!==s.conta){ s.comp=''; s.pag=0; }
    if('comp' in patch||'busca' in patch||'so' in patch||'periodo' in patch) s.pag=0;
    Object.keys(patch).forEach(function(x){ s[x]=patch[x]; });
    var el=document.getElementById('ctbVisor_'+tipo+'_'+eid); if(el) visor(eid,tipo,el);
  }

  // LIVRO RAZÃO — os lançamentos de cada conta, mês a mês
  async function visorRazao(eid,el){
    var s=vst['GENERAL_LEDGER|'+eid]=vst['GENERAL_LEDGER|'+eid]||{conta:'',comp:'',busca:'',pag:0}, T='GENERAL_LEDGER';
    var contas=await pag('ledger_accounts','code,classification,description,group_name,opening_cents,opening_date',[['eq','empresa_eid',eid]]);
    if(!contas.length){ el.innerHTML=vazio('Nenhum Livro Razão importado ainda. Use <b>Importar Livro Razão</b> ou <b>Ler da pasta</b>.'); return; }
    contas.sort(function(a,b){ return String(a.classification).localeCompare(String(b.classification),'pt-BR',{numeric:true}); });
    if(!s.conta||!contas.some(function(c){ return c.code===s.conta; })) s.conta=contas[0].code;
    var conta=contas.filter(function(c){ return c.code===s.conta; })[0];
    var meses=await pag('ledger_monthly_summary','competence,opening_cents,debit_cents,credit_cents,closing_cents,reconciled,entries_count,closing_entries_debit_cents,closing_entries_credit_cents',[['eq','empresa_eid',eid],['eq','account_code',s.conta]]);
    meses.sort(function(a,b){ return a.competence<b.competence?-1:1; });
    var q=_supaClient.from('ledger_entries').select('entry_date,entry_number,history,counterpart,debit,credit,balance,balance_side',{count:'exact'}).eq('empresa_eid',eid).eq('account_code',s.conta);
    if(s.comp) q=q.eq('competence',s.comp);
    if(s.busca) q=q.ilike('history','%'+String(s.busca).replace(/[%_]/g,' ')+'%');
    var r=await q.order('entry_date').order('id').range(s.pag*PG,s.pag*PG+PG-1); if(r.error) throw r.error;
    var total=r.count||0, npag=Math.max(1,Math.ceil(total/PG)); if(s.pag>=npag){ s.pag=npag-1; }
    var h='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:10px">'
      +'<div><div style="font-size:11px;color:var(--slate)">Conta</div><select class="si" style="min-width:340px;max-width:520px" onchange="'+vzCall(eid,T,'{conta:this.value}')+'">'+contas.map(function(c){ return optHtml(c.code,c.code+' — '+(c.description||'')+'  ['+c.classification+']',c.code===s.conta); }).join('')+'</select></div>'
      +'<div><div style="font-size:11px;color:var(--slate)">Mês</div><select class="si" onchange="'+vzCall(eid,T,'{comp:this.value}')+'">'+optHtml('','Todos os meses',!s.comp)+meses.map(function(m){ return optHtml(m.competence,m.competence.slice(5)+'/'+m.competence.slice(0,4),m.competence===s.comp); }).join('')+'</select></div>'
      +'<div><div style="font-size:11px;color:var(--slate)">Buscar no histórico</div><input class="fi" style="width:220px" value="'+esc2(s.busca||'')+'" placeholder="texto e Enter" onchange="'+vzCall(eid,T,'{busca:this.value}')+'"></div></div>';
    // resumo mensal da conta (clicar num mês abre os lançamentos dele)
    if(meses.length){
      h+='<div style="max-height:190px;overflow:auto;border:1px solid var(--border);border-radius:6px;margin-bottom:10px"><table class="luc-t" style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'+thH('Mês')+thH('Saldo anterior','right')+thH('Débitos','right')+thH('Créditos','right')+thH('Saldo final','right')+thH('Lanç.','right')+thH('Totais do PDF')+'</tr></thead><tbody>'
        +meses.map(function(m,i){ var sel=m.competence===s.comp; return '<tr style="cursor:pointer;background:'+(sel?'var(--blue-bg)':(i%2?'var(--bg)':'var(--white)'))+'" onclick="'+vzCall(eid,T,"{comp:'"+m.competence+"'}")+'">'+tdH('<b>'+m.competence.slice(5)+'/'+m.competence.slice(0,4)+'</b>')+tdH(cents(m.opening_cents),'right',MONO)+tdH(brl(m.debit_cents),'right',MONO)+tdH(brl(m.credit_cents),'right',MONO)+tdH(cents(m.closing_cents),'right',MONO)+tdH(m.entries_count,'right')+tdH(m.reconciled?'<span style="color:var(--green)">✓ conferem</span>':'<span style="color:var(--amber)">não conferido</span>')+'</tr>'; }).join('')+'</tbody></table></div>';
    }
    h+='<div style="font-size:12px;color:var(--slate);margin-bottom:6px"><b>'+esc2(conta.code)+' — '+esc2(conta.description||'')+'</b> · '+esc2(conta.group_name||'')+' · '+total+' lançamento(s)'+(s.comp?' em '+s.comp.slice(5)+'/'+s.comp.slice(0,4):'')+(s.busca?' contendo "'+esc2(s.busca)+'"':'')+'</div>';
    var linhas=r.data||[];
    if(!linhas.length) h+=vazio('Nenhum lançamento para este filtro.');
    else h+='<div style="max-height:520px;overflow:auto;border:1px solid var(--border);border-radius:6px"><table class="luc-t" style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'+thH('Data')+thH('Nº')+thH('Histórico')+thH('Contrapartida')+thH('Débito','right')+thH('Crédito','right')+thH('Saldo','right')+'</tr></thead><tbody>'
      +linhas.map(function(l,i){ return '<tr style="background:'+(i%2?'var(--bg)':'var(--white)')+'">'+tdH(brDeIso(l.entry_date),'left',MONO)+tdH(esc2(l.entry_number||''),'left',MONO)+tdH(esc2(l.history||''),'left','min-width:320px')+tdH(esc2(l.counterpart||'(várias)'),'left',MONO)+tdH(Number(l.debit)?nf(l.debit):'','right',MONO)+tdH(Number(l.credit)?nf(l.credit):'','right',MONO)+tdH(l.balance==null?'':nfLado(l.balance,l.balance_side),'right',MONO)+'</tr>'; }).join('')+'</tbody></table></div>';
    if(npag>1) h+='<div style="display:flex;gap:10px;align-items:center;margin-top:8px"><button class="btn bo bsm" '+(s.pag<=0?'disabled':'')+' onclick="'+vzCall(eid,T,'{pag:'+(s.pag-1)+'}')+'">◄</button><span style="font-size:12px">Página '+(s.pag+1)+' de '+npag+'</span><button class="btn bo bsm" '+(s.pag>=npag-1?'disabled':'')+' onclick="'+vzCall(eid,T,'{pag:'+(s.pag+1)+'}')+'">►</button></div>';
    el.innerHTML=h;
  }

  // BALANCETE — todas as contas do período escolhido
  async function visorBalancete(eid,el){
    var T='TRIAL_BALANCE', s=vst[T+'|'+eid]=vst[T+'|'+eid]||{periodo:'',so:'todas',busca:''};
    var sums=await pag('trial_balance_summary','competence,period_start,period_end,monthly_result_amount,monthly_result_side,monthly_result_type,monthly_result_signed,exercise_result_amount,exercise_result_side,exercise_result_type,exercise_result_signed',[['eq','empresa_eid',eid]]);
    if(!sums.length){ el.innerHTML=vazio('Nenhum Balancete importado ainda. Use <b>Importar Balancete</b> ou <b>Ler da pasta</b>.'); return; }
    sums.sort(function(a,b){ return a.period_end<b.period_end?1:-1; });
    var chave=function(x){ return x.period_start+'|'+x.period_end; };
    if(!s.periodo||!sums.some(function(x){ return chave(x)===s.periodo; })) s.periodo=chave(sums[0]);
    var sm=sums.filter(function(x){ return chave(x)===s.periodo; })[0], ps=sm.period_start, pe=sm.period_end;
    var contas=await pag('trial_balance_accounts','code,classification,description,is_analytic,level,prev_balance,prev_side,debit,credit,balance,balance_side',[['eq','empresa_eid',eid],['eq','period_start',ps],['eq','period_end',pe]]);
    contas.sort(function(a,b){ return String(a.classification).localeCompare(String(b.classification),'pt-BR',{numeric:true})||String(a.code).localeCompare(String(b.code),'pt-BR',{numeric:true}); });
    var res=function(t,c,l,a){ return c==null?null:{tipo:t,cents:Math.round(Number(c)*100),lado:l,assinado:Math.round(Number(a)*100)}; };
    var busca=String(s.busca||'').toLowerCase();
    var vis=contas.filter(function(c){ if(s.so==='analiticas'&&!c.is_analytic) return false; if(s.so==='sinteticas'&&c.is_analytic) return false; return !busca||(String(c.description||'').toLowerCase().indexOf(busca)>=0||String(c.code).indexOf(busca)>=0||String(c.classification).indexOf(busca)>=0); });
    var h='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:10px">'
      +'<div><div style="font-size:11px;color:var(--slate)">Balancete</div><select class="si" onchange="'+vzCall(eid,T,'{periodo:this.value}')+'">'+sums.map(function(x){ return optHtml(chave(x),(x.competence?x.competence.slice(5)+'/'+x.competence.slice(0,4)+' · ':'')+brDeIso(x.period_start)+' a '+brDeIso(x.period_end),chave(x)===s.periodo); }).join('')+'</select></div>'
      +'<div><div style="font-size:11px;color:var(--slate)">Contas</div><select class="si" onchange="'+vzCall(eid,T,'{so:this.value}')+'">'+optHtml('todas','Todas (sintéticas e analíticas)',s.so==='todas')+optHtml('analiticas','Só analíticas',s.so==='analiticas')+optHtml('sinteticas','Só sintéticas',s.so==='sinteticas')+'</select></div>'
      +'<div><div style="font-size:11px;color:var(--slate)">Buscar conta</div><input class="fi" style="width:220px" value="'+esc2(s.busca||'')+'" placeholder="nome, código ou classificação + Enter" onchange="'+vzCall(eid,T,'{busca:this.value}')+'"></div></div>'
      +'<div style="font-size:13px;margin-bottom:8px">Resultado do <b>mês</b>: '+tagRes(res(sm.monthly_result_type,sm.monthly_result_amount,sm.monthly_result_side,sm.monthly_result_signed))+'<br>Resultado do <b>exercício</b>: '+tagRes(res(sm.exercise_result_type,sm.exercise_result_amount,sm.exercise_result_side,sm.exercise_result_signed))+'</div>';
    h+='<div style="font-size:12px;color:var(--slate);margin-bottom:6px">'+vis.length+' de '+contas.length+' conta(s)</div>'
      +'<div style="max-height:560px;overflow:auto;border:1px solid var(--border);border-radius:6px"><table class="luc-t" style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'+thH('Classificação')+thH('Código')+thH('Descrição')+thH('Saldo anterior','right')+thH('Débito','right')+thH('Crédito','right')+thH('Saldo atual','right')+'</tr></thead><tbody>'
      +vis.map(function(c,i){ var neg=!c.is_analytic; return '<tr style="background:'+(i%2?'var(--bg)':'var(--white)')+(neg?';font-weight:700':'')+'">'+tdH(esc2(c.classification),'left',MONO)+tdH(esc2(c.code),'left',MONO)+tdH(esc2(c.description||''),'left','padding-left:'+(8+Math.max(0,(c.level||1)-1)*10)+'px')+tdH(nfLado(c.prev_balance,c.prev_side),'right',MONO)+tdH(nf(c.debit),'right',MONO)+tdH(nf(c.credit),'right',MONO)+tdH(nfLado(c.balance,c.balance_side),'right',MONO)+'</tr>'; }).join('')+'</tbody></table></div>';
    el.innerHTML=h;
  }

  // DRE — todas as linhas do período escolhido
  async function visorDRE(eid,el){
    var T='INCOME_STATEMENT', s=vst[T+'|'+eid]=vst[T+'|'+eid]||{periodo:''};
    var imps=await pag('accounting_imports','period_start,period_end,competence,summary',[['eq','empresa_eid',eid],['eq','document_type',T]]);
    if(!imps.length){ el.innerHTML=vazio('Nenhuma DRE importada ainda. Use <b>Importar DRE</b> ou <b>Ler da pasta</b>.'); return; }
    var vistos={}, per=[]; imps.forEach(function(x){ var k=x.period_start+'|'+x.period_end; if(!vistos[k]){ vistos[k]=1; per.push(x); } });
    per.sort(function(a,b){ return a.period_end<b.period_end?1:-1; });
    var chave=function(x){ return x.period_start+'|'+x.period_end; };
    if(!s.periodo||!per.some(function(x){ return chave(x)===s.periodo; })) s.periodo=chave(per[0]);
    var p=per.filter(function(x){ return chave(x)===s.periodo; })[0];
    var linhas=await pag('income_statement_lines','line_no,code,classification,description,indent,amount,amount_text,is_result',[['eq','empresa_eid',eid],['eq','period_start',p.period_start],['eq','period_end',p.period_end]]);
    linhas.sort(function(a,b){ return a.line_no-b.line_no; });
    var rs=p.summary&&p.summary.resultado;
    var h='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:10px"><div><div style="font-size:11px;color:var(--slate)">DRE</div><select class="si" onchange="'+vzCall(eid,T,'{periodo:this.value}')+'">'+per.map(function(x){ return optHtml(chave(x),(x.competence?x.competence.slice(5)+'/'+x.competence.slice(0,4)+' · ':'')+brDeIso(x.period_start)+' a '+brDeIso(x.period_end),chave(x)===s.periodo); }).join('')+'</select></div></div>';
    if(rs) h+='<div style="font-size:13px;margin-bottom:8px">Resultado: '+tagRes({tipo:rs.tipo,cents:Math.abs(Math.round(Number(rs.assinado)*100)),lado:Number(rs.assinado)<0?'D':'C',assinado:Math.round(Number(rs.assinado)*100)})+'</div>';
    h+='<div style="font-size:12px;color:var(--slate);margin-bottom:6px">'+linhas.length+' linha(s) — valores negativos em vermelho (no PDF vêm entre parênteses)</div>'
      +'<div style="max-height:560px;overflow:auto;border:1px solid var(--border);border-radius:6px"><table class="luc-t" style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'+thH('Código')+thH('Classificação')+thH('Descrição')+thH('Valor','right')+'</tr></thead><tbody>'
      +linhas.map(function(l,i){ var v=l.amount==null?null:Number(l.amount); var negrito=l.is_result||l.amount==null||!l.code; return '<tr style="background:'+(i%2?'var(--bg)':'var(--white)')+(negrito?';font-weight:700':'')+'">'+tdH(esc2(l.code||''),'left',MONO)+tdH(esc2(l.classification||''),'left',MONO)+tdH(esc2(l.description||''),'left','padding-left:'+(8+Math.max(0,l.indent||0)*6)+'px')+tdH(v==null?'':nf(v),'right',MONO+(v!=null&&v<0?';color:var(--red)':''))+'</tr>'; }).join('')+'</tbody></table></div>';
    el.innerHTML=h;
  }

  root.CtbImport={abrir:abrir, fechar:fechar, escolheu:escolheu, salvar:salvar, painel:painel, aba:aba, daPasta:daPasta, vz:vz, conciliarSalvo:conciliarSalvo, _st:function(){ return st; }, _processar:processarArquivo, _montarLinhasRazao:montarLinhasRazao};
})(typeof window!=='undefined'?window:this);
