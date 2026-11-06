/* Módulo LEMBRETES (pedido do usuário 06/11/2026) — calendário do ano com 12 meses (3 linhas × 4), lembretes por data com título, texto livre e 0, 1 ou várias empresas;
   marcar como concluído; repetir toda semana / todo mês / todo ano e ENCERRAR a repetição daquele dia em diante; alerta no canto superior direito quando vence amanhã (ou hoje).
   Guardado por usuário em dados_app (chave "lembretes_<usuário>").
   Cada lembrete: { id, titulo, data:'AAAA-MM-DD' (1ª ocorrência), texto, eids:[...], avisar, repete:'nenhum'|'semanal'|'mensal'|'anual', fim:'AAAA-MM-DD'|null (última ocorrência permitida),
   feitos:{ 'AAAA-MM-DD':true } (ocorrências concluídas), concluido (só p/ não repetidos, compatível), criadoEm }. */
(function (root) {
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const REP_TXT = { nenhum: '', semanal: '↻ toda semana', mensal: '↻ todo mês', anual: '↻ todo ano' };
  const LEM = { ano: new Date().getFullYear(), filtroEmp: '', editandoId: null, eidsSel: new Set(), dataDia: null };
  const p2 = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  const dt = di => { const a = String(di).split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); };
  const hojeIso = () => iso(new Date());
  const amanhaIso = () => { const d = new Date(); d.setDate(d.getDate() + 1); return iso(d); };
  const br = dIso => String(dIso || '').split('-').reverse().join('/');
  const uid = () => { try { return (typeof _homeUid === 'function') ? _homeUid() : 'padrao'; } catch (e) { return 'padrao'; } };
  const chave = () => 'lembretes_' + uid();
  const getL = () => { try { const v = S.g(chave()); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const setL = arr => { try { S.s(chave(), arr); } catch (e) { console.warn('lembretes: não salvou', e); } };
  const empsAtivas = () => { try { return (S.emps() || []).filter(e => { const t = (e.fechamentoStatus && e.fechamentoStatus.tipo) || 'ativo'; return e.status !== 'ex' && t !== 'saida' && t !== 'extincao'; }).sort((a, b) => Number(a.eid || 0) - Number(b.eid || 0)); } catch (e) { return []; } };
  const nomeEmp = eid => { try { const e = (S.emps() || []).find(x => String(x.eid) === String(eid)); return e ? ('#' + e.eid + ' ' + (e.nome || '')) : ('#' + eid); } catch (x) { return '#' + eid; } };
  const empsTxt = l => (l.eids && l.eids.length) ? l.eids.map(nomeEmp).join(' · ') : 'Sem relação com empresa';

  // ───────────── repetição: quais datas um lembrete ocupa entre deIso e ateIso ─────────────
  function ocorrencias(l, deIso, ateIso) {
    const out = [], ini = l.data, rep = l.repete || 'nenhum';
    if (!ini) return out;
    const lim = (l.fim && l.fim < ateIso) ? l.fim : ateIso;
    if (rep === 'nenhum') { if (ini >= deIso && ini <= ateIso) out.push(ini); return out; }
    if (rep === 'semanal') {
      const d = dt(ini), dias = Math.max(0, Math.ceil((dt(deIso) - d) / 86400000)); d.setDate(d.getDate() + Math.ceil(dias / 7) * 7);
      for (let i = 0; i < 400; i++) { const s = iso(d); if (s > lim) break; if (s >= deIso && s >= ini) out.push(s); d.setDate(d.getDate() + 7); }
      return out;
    }
    const base = dt(ini);
    if (rep === 'mensal') {
      let y = base.getFullYear(), m = base.getMonth();
      for (let i = 0; i < 1500; i++) { const ult = new Date(y, m + 1, 0).getDate(); const s = y + '-' + p2(m + 1) + '-' + p2(Math.min(base.getDate(), ult)); if (s > lim) break; if (s >= deIso && s >= ini) out.push(s); m++; if (m > 11) { m = 0; y++; } }
      return out;
    }
    if (rep === 'anual') {
      for (let y = base.getFullYear(); y <= 2200; y++) { const ult = new Date(y, base.getMonth() + 1, 0).getDate(); const s = y + '-' + p2(base.getMonth() + 1) + '-' + p2(Math.min(base.getDate(), ult)); if (s > lim) break; if (s >= deIso && s >= ini) out.push(s); }
      return out;
    }
    return out;
  }
  const feito = (l, di) => !!((l.feitos && l.feitos[di]) || ((l.repete || 'nenhum') === 'nenhum' && l.concluido));
  const doFiltro = l => !LEM.filtroEmp || (l.eids || []).map(String).includes(String(LEM.filtroEmp));
  function porDiaDoAno(ano) {
    const m = {}, de = ano + '-01-01', ate = ano + '-12-31';
    getL().filter(doFiltro).forEach(l => ocorrencias(l, de, ate).forEach(di => { (m[di] = m[di] || []).push({ l, di, feito: feito(l, di) }); }));
    return m;
  }

  // ───────────── tela principal ─────────────
  root.renderLembretes = function () {
    const pg = document.getElementById('page-lembretes'); if (!pg) return;
    const porDia = porDiaDoAno(LEM.ano), hoje = hojeIso();
    const anos = []; for (let a = new Date().getFullYear() - 1; a <= new Date().getFullYear() + 3; a++) anos.push(a);
    let h = `<style>.lem-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}@media (max-width:1100px){.lem-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:640px){.lem-grid{grid-template-columns:1fr}}
      .lem-mes{background:var(--white);border:1px solid var(--border);border-radius:10px;padding:10px 12px}.lem-mes h4{margin:0 0 6px;font-size:13px;color:var(--ink);text-align:center}
      .lem-dias{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;font-size:11.5px}.lem-sem{color:var(--slate);font-size:10.5px;padding:2px 0}
      .lem-d{border:none;background:none;color:var(--ink);padding:5px 0;border-radius:6px;cursor:pointer;font-size:12px;position:relative}.lem-d:hover{background:var(--bg)}
      .lem-d.hoje{outline:2px solid var(--teal)}.lem-d.tem{background:#1E3A8A;color:#fff;font-weight:700}.lem-d.tem.atras{background:#B91C1C}.lem-d.tem.feito{background:#16A34A}
      .lem-d small{position:absolute;top:0;right:2px;font-size:8px;line-height:1;color:#fff}
      .lem-modal .fi,.lem-modal textarea{width:100%;box-sizing:border-box}.lem-chip{display:inline-flex;align-items:center;gap:4px;background:var(--teal-bg);border:1px solid var(--border);border-radius:12px;padding:2px 8px;font-size:11px;margin:2px 3px 2px 0}</style>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <div><div class="ptitle" style="margin-bottom:2px">Lembretes</div><div class="psub">Calendário de ${LEM.ano} — clique numa data para ver, concluir ou criar lembretes</div></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select class="si" onchange="lemMudarAno(this.value)">${anos.map(a => `<option value="${a}"${a === LEM.ano ? ' selected' : ''}>${a}</option>`).join('')}</select>
          <select class="si" onchange="lemFiltrarEmp(this.value)" style="max-width:260px"><option value="">Todas as empresas</option>${empsAtivas().map(e => `<option value="${E(e.eid)}"${String(LEM.filtroEmp) === String(e.eid) ? ' selected' : ''}>#${E(e.eid)} ${E(e.nome)}</option>`).join('')}</select>
          <button class="btn bp" onclick="lemAbrirNovo()">＋ Adicionar lembrete</button>
        </div>
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:var(--slate);margin-bottom:10px"><span><b style="display:inline-block;width:11px;height:11px;border-radius:3px;background:#1E3A8A;vertical-align:middle"></b> com lembrete pendente</span><span><b style="display:inline-block;width:11px;height:11px;border-radius:3px;background:#B91C1C;vertical-align:middle"></b> pendente e atrasado</span><span><b style="display:inline-block;width:11px;height:11px;border-radius:3px;background:#16A34A;vertical-align:middle"></b> tudo concluído</span><span><b style="display:inline-block;width:11px;height:11px;border-radius:3px;outline:2px solid var(--teal);vertical-align:middle"></b> hoje</span></div>
      <div class="lem-grid">`;
    for (let m = 0; m < 12; m++) {
      const primeiro = new Date(LEM.ano, m, 1).getDay(), dias = new Date(LEM.ano, m + 1, 0).getDate();
      h += `<div class="lem-mes"><h4>${MESES[m]} ${LEM.ano}</h4><div class="lem-dias">` + ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(x => `<div class="lem-sem">${x}</div>`).join('');
      for (let i = 0; i < primeiro; i++) h += '<div></div>';
      for (let d = 1; d <= dias; d++) {
        const di = LEM.ano + '-' + p2(m + 1) + '-' + p2(d), ls = porDia[di] || [];
        const pend = ls.filter(x => !x.feito).length;
        const cls = 'lem-d' + (di === hoje ? ' hoje' : '') + (ls.length ? ' tem' + (pend ? (di < hoje ? ' atras' : '') : ' feito') : '');
        h += `<button class="${cls}" data-d="${di}" onclick="lemAbrirDia(this.dataset.d)" title="${ls.length ? ls.length + ' lembrete(s)' : ''}">${d}${ls.length > 1 ? `<small>${ls.length}</small>` : ''}</button>`;
      }
      h += '</div></div>';
    }
    h += '</div>';
    pg.innerHTML = h;
    lemAlertar();
  };
  root.lemMudarAno = v => { LEM.ano = parseInt(v, 10) || LEM.ano; renderLembretes(); };
  root.lemFiltrarEmp = v => { LEM.filtroEmp = v; renderLembretes(); };

  // ───────────── lista de uma data ─────────────
  function garantirModal(id, largura) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.className = 'mb'; el.id = id; el.innerHTML = `<div class="modal lem-modal" style="max-width:${largura}px;width:96%"></div>`; document.body.appendChild(el); }
    return el;
  }
  root.lemAbrirDia = function (di) {
    LEM.dataDia = di;
    const el = garantirModal('mLembDia', 900);
    const ls = getL().filter(doFiltro).filter(l => ocorrencias(l, di, di).length);
    const linhas = ls.length ? ls.map(l => {
      const ok = feito(l, di), rep = l.repete || 'nenhum';
      const tag = rep !== 'nenhum' ? `<div style="font-size:10.5px;color:var(--slate)">${REP_TXT[rep]}${l.fim ? ' · encerra em ' + br(l.fim) : ''}</div>` : '';
      return `<tr style="border-top:1px solid var(--border);${ok ? 'opacity:.6' : ''}">
        <td style="padding:7px 8px;font-size:12px;max-width:220px">${E(empsTxt(l))}</td>
        <td style="padding:7px 8px;font-size:12.5px;font-weight:600">${ok ? '<s>' + E(l.titulo) + '</s>' : E(l.titulo)}${tag}</td>
        <td style="padding:7px 8px;font-size:12px;white-space:pre-wrap;max-width:300px">${E(l.texto || '')}</td>
        <td style="padding:7px 8px;white-space:nowrap;text-align:right"><button class="btn ${ok ? 'bo' : 'bp'} bsm" data-id="${E(l.id)}" onclick="lemConcluir(this.dataset.id)">${ok ? '↩ Reabrir' : '✓ Concluir'}</button>
          ${rep !== 'nenhum' && !(l.fim && l.fim <= di) ? `<button class="btn bo bsm" data-id="${E(l.id)}" onclick="lemEncerrar(this.dataset.id)" title="Conclui este e encerra a repetição: as datas seguintes deixam de lembrar">⏹ Encerrar daqui p/ frente</button>` : ''}
          <button class="btn bo bsm" data-id="${E(l.id)}" onclick="lemAbrirNovo(null,this.dataset.id)">✎</button> <button class="btn bd bsm" data-id="${E(l.id)}" onclick="lemExcluir(this.dataset.id)">🗑</button></td></tr>`;
    }).join('') : `<tr><td colspan="4" style="padding:18px;text-align:center;color:var(--slate)">Nenhum lembrete nesta data.</td></tr>`;
    el.firstChild.innerHTML = `<div class="mt" style="display:flex;justify-content:space-between;align-items:center"><span>🔔 Lembretes de ${br(di)}</span><button onclick="closeModal('mLembDia')" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--slate)">✕</button></div>
      <div style="overflow-x:auto;max-height:60vh;overflow-y:auto"><table style="width:100%;border-collapse:collapse"><thead><tr style="text-align:left;font-size:11px;color:var(--slate)"><th style="padding:5px 8px">Empresa</th><th style="padding:5px 8px">Lembrete</th><th style="padding:5px 8px">Texto</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>
      <div class="ma"><button class="btn bp" onclick="lemAbrirNovo('${di}')">＋ Adicionar lembrete neste dia</button><button class="btn bo" onclick="closeModal('mLembDia')">Fechar</button></div>`;
    openModal('mLembDia');
  };
  root.lemConcluir = function (id) {
    const arr = getL(), l = arr.find(x => x.id === id); if (!l) return; const di = LEM.dataDia || l.data;
    l.feitos = l.feitos || {};
    if (feito(l, di)) { delete l.feitos[di]; if ((l.repete || 'nenhum') === 'nenhum') l.concluido = false; }
    else { l.feitos[di] = true; if ((l.repete || 'nenhum') === 'nenhum') l.concluido = true; }
    setL(arr); renderLembretes(); lemAbrirDia(di);
  };
  // conclui a data aberta e encerra a série: nenhuma data depois desta volta a lembrar
  root.lemEncerrar = function (id) {
    const arr = getL(), l = arr.find(x => x.id === id); if (!l) return; const di = LEM.dataDia || l.data;
    if (!confirm('Encerrar "' + l.titulo + '" a partir de ' + br(di) + '?\n\nEsta data fica concluída e as próximas repetições deixam de aparecer e de avisar.')) return;
    l.feitos = l.feitos || {}; l.feitos[di] = true; l.fim = di; setL(arr); renderLembretes(); lemAbrirDia(di); toast('Lembrete encerrado: sem novas repetições.', 'ok');
  };
  root.lemExcluir = function (id) {
    const arr = getL(), l = arr.find(x => x.id === id); if (!l) return;
    if (!confirm('Excluir o lembrete "' + l.titulo + '"' + ((l.repete || 'nenhum') !== 'nenhum' ? ' e TODAS as suas repetições' : '') + '?')) return;
    setL(arr.filter(x => x.id !== id)); renderLembretes(); lemAbrirDia(LEM.dataDia || l.data); toast('Lembrete excluído.', 'ok');
  };

  // ───────────── criar / editar ─────────────
  function chipsHtml() {
    return [...LEM.eidsSel].map(eid => `<span class="lem-chip">${E(nomeEmp(eid))}<button data-e="${E(eid)}" onclick="lemTirarEmp(this.dataset.e)" style="border:none;background:none;cursor:pointer;color:var(--slate)">✕</button></span>`).join('') || '<span style="font-size:11.5px;color:var(--slate)">Nenhuma — o lembrete ficará "sem relação com empresa".</span>';
  }
  function listaEmpHtml(busca) {
    const b = String(busca || '').toLowerCase().trim();
    const ls = empsAtivas().filter(e => !b || (e.nome || '').toLowerCase().includes(b) || String(e.eid).includes(b)).slice(0, 60);
    return ls.map(e => `<label style="display:flex;gap:8px;align-items:center;padding:3px 8px;font-size:12px;cursor:pointer"><input type="checkbox" data-e="${E(e.eid)}" ${LEM.eidsSel.has(String(e.eid)) ? 'checked' : ''} onchange="lemMarcarEmp(this.dataset.e,this.checked)"> #${E(e.eid)} ${E(e.nome)}</label>`).join('') || '<div style="padding:8px;font-size:12px;color:var(--slate)">Nenhuma empresa encontrada.</div>';
  }
  root.lemMarcarEmp = function (eid, on) { if (on) LEM.eidsSel.add(String(eid)); else LEM.eidsSel.delete(String(eid)); const c = document.getElementById('lemChips'); if (c) c.innerHTML = chipsHtml(); };
  root.lemTirarEmp = function (eid) { LEM.eidsSel.delete(String(eid)); const c = document.getElementById('lemChips'); if (c) c.innerHTML = chipsHtml(); const q = document.getElementById('lemEmpBusca'); lemFiltrarListaEmp(q ? q.value : ''); };
  root.lemFiltrarListaEmp = function (v) { const l = document.getElementById('lemEmpLista'); if (l) l.innerHTML = listaEmpHtml(v); };
  root.lemAbrirNovo = function (dataPre, idEdit) {
    const ex = idEdit ? getL().find(x => x.id === idEdit) : null;
    LEM.editandoId = ex ? ex.id : null; LEM.eidsSel = new Set(((ex && ex.eids) || []).map(String));
    const el = garantirModal('mLembNovo', 640);
    closeModal('mLembDia');
    const d0 = ex ? ex.data : (dataPre || hojeIso()), rep = ex ? (ex.repete || 'nenhum') : 'nenhum';
    const opt = (v, t) => `<option value="${v}"${rep === v ? ' selected' : ''}>${t}</option>`;
    el.firstChild.innerHTML = `<div class="mt" style="display:flex;justify-content:space-between;align-items:center"><span>${ex ? '✎ Editar lembrete' : '＋ Novo lembrete'}</span><button onclick="closeModal('mLembNovo')" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--slate)">✕</button></div>
      <div style="display:grid;gap:10px;max-height:68vh;overflow-y:auto;padding-right:4px">
        <div><label class="fl">Título *</label><input class="fi" id="lemTitulo" maxlength="120" placeholder="Ex.: Elaborar perguntas para a Kajuna" value="${E(ex ? ex.titulo : '')}"></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div><label class="fl">Data *</label><input class="fi" type="date" id="lemData" value="${E(d0)}" style="width:180px"></div>
          <div><label class="fl">Repetir</label><select class="fi" id="lemRepete" style="width:230px" onchange="document.getElementById('lemFimWrap').style.display=this.value==='nenhum'?'none':''">${opt('nenhum', 'Não repetir')}${opt('semanal', 'Toda semana (a cada 7 dias)')}${opt('mensal', 'Todo mês (no mesmo dia)')}${opt('anual', 'Todo ano (na mesma data)')}</select></div>
          <div id="lemFimWrap" style="${rep === 'nenhum' ? 'display:none' : ''}"><label class="fl">Repetir até (opcional)</label><input class="fi" type="date" id="lemFim" value="${E(ex && ex.fim ? ex.fim : '')}" style="width:180px"></div>
        </div>
        <div><label class="fl">Empresas (opcional — pode escolher mais de uma)</label><div id="lemChips" style="margin-bottom:4px">${chipsHtml()}</div>
          <input class="fi" id="lemEmpBusca" placeholder="🔍 Buscar empresa por nome ou número…" oninput="lemFiltrarListaEmp(this.value)">
          <div id="lemEmpLista" style="max-height:150px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;margin-top:4px">${listaEmpHtml('')}</div></div>
        <div><label class="fl">Texto do lembrete</label><textarea class="fi" id="lemTexto" rows="6" placeholder="Escreva aqui o que precisa lembrar. Pode pular linha." style="resize:vertical">${E(ex ? ex.texto : '')}</textarea></div>
        <label style="font-size:12.5px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="lemAvisar" ${(!ex || ex.avisar !== false) ? 'checked' : ''}> Avisar no canto da tela quando vencer amanhã (e no dia)</label>
      </div>
      <div class="ma"><button class="btn bo" onclick="closeModal('mLembNovo')">Cancelar</button><button class="btn bp" onclick="lemSalvar()">✓ Salvar lembrete</button></div>`;
    openModal('mLembNovo');
    setTimeout(() => { const t = document.getElementById('lemTitulo'); if (t) t.focus(); }, 60);
  };
  root.lemSalvar = function () {
    const titulo = (document.getElementById('lemTitulo').value || '').trim(), data = document.getElementById('lemData').value, texto = document.getElementById('lemTexto').value || '', avisar = !!document.getElementById('lemAvisar').checked;
    const repete = document.getElementById('lemRepete').value || 'nenhum', fimV = (document.getElementById('lemFim') || {}).value || '', fim = (repete !== 'nenhum' && /^\d{4}-\d{2}-\d{2}$/.test(fimV)) ? fimV : null;
    if (!titulo) { toast('Dê um título ao lembrete.', 'err'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { toast('Escolha a data do lembrete.', 'err'); return; }
    if (fim && fim < data) { toast('"Repetir até" não pode ser antes da data do lembrete.', 'err'); return; }
    const arr = getL(), eids = [...LEM.eidsSel];
    if (LEM.editandoId) { const l = arr.find(x => x.id === LEM.editandoId); if (l) Object.assign(l, { titulo, data, texto, eids, avisar, repete, fim }); }
    else arr.push({ id: 'lb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), titulo, data, texto, eids, avisar, repete, fim, feitos: {}, concluido: false, criadoEm: new Date().toISOString() });
    setL(arr); closeModal('mLembNovo');
    LEM.ano = parseInt(data.slice(0, 4), 10) || LEM.ano; renderLembretes(); toast('Lembrete salvo ✓', 'ok');
  };

  // ───────────── alerta no canto superior direito ─────────────
  const fechadosKey = 'lem_alerta_fechados';
  const fechados = () => { try { return JSON.parse(sessionStorage.getItem(fechadosKey) || '[]'); } catch (e) { return []; } };
  root.lemFecharAlerta = function () { try { const b = document.getElementById('lemAlertaBox'); const f = fechados().concat(b && b.dataset.chaves ? b.dataset.chaves.split('|') : []); sessionStorage.setItem(fechadosKey, JSON.stringify(f)); } catch (e) {} const b2 = document.getElementById('lemAlertaBox'); if (b2) b2.remove(); };
  root.lemAlertar = function () {
    try {
      const am = amanhaIso(), ho = hojeIso(), ja = fechados(), itens = [];
      getL().filter(l => l.avisar !== false).forEach(l => [ho, am].forEach(di => { if (ocorrencias(l, di, di).length && !feito(l, di) && !ja.includes(l.id + '@' + di)) itens.push({ l, di }); }));
      let box = document.getElementById('lemAlertaBox');
      if (!itens.length) { if (box) box.remove(); return; }
      if (!box) { box = document.createElement('div'); box.id = 'lemAlertaBox'; box.style.cssText = 'position:fixed;top:66px;right:16px;z-index:9500;max-width:340px;background:#1E3A8A;color:#fff;border-radius:8px;padding:10px 12px;box-shadow:0 8px 24px rgba(0,0,0,.4);font-size:12.5px;line-height:1.4'; document.body.appendChild(box); }
      box.dataset.chaves = itens.map(x => x.l.id + '@' + x.di).join('|');
      box.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><b>🔔 ${itens.some(x => x.di === ho) ? 'Lembretes de hoje e de amanhã' : 'Lembrete vence amanhã'}</b><button onclick="lemFecharAlerta()" style="border:none;background:none;color:#fff;cursor:pointer;font-size:14px;line-height:1" title="Fechar">✕</button></div>`
        + itens.slice(0, 4).map(x => `<div style="margin-top:6px"><span style="opacity:.8">${x.di === ho ? 'Hoje' : 'Amanhã'}:</span> <b>${E(x.l.titulo)}</b>${(x.l.eids && x.l.eids.length) ? '<div style="opacity:.8;font-size:11px">' + E(x.l.eids.slice(0, 2).map(nomeEmp).join(' · ')) + (x.l.eids.length > 2 ? ' …' : '') + '</div>' : ''}</div>`).join('')
        + (itens.length > 4 ? `<div style="margin-top:6px;opacity:.8">… e mais ${itens.length - 4}</div>` : '')
        + `<div style="margin-top:8px"><button class="btn bsm" style="background:#fff;color:#1E3A8A;border:none" onclick="lemFecharAlerta();goPage('lembretes')">Abrir lembretes</button></div>`;
    } catch (e) { console.warn('lembretes: alerta', e); }
  };
  root.__lembretesTeste = { ocorrencias };   // só para testes
  setTimeout(lemAlertar, 5000);
  setInterval(lemAlertar, 60000);
})(window);
