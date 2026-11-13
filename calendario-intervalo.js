/* Mini calendário com INTERVALO de datas + setas de dia (‹ ›) para o filtro "Data" do cabeçalho das telas de Lançamentos Contábeis.
   Pedido do usuário 13/11/2026: centralizar o filtro, botões para voltar/avançar o dia sem abrir o calendário, e no calendário poder escolher UM dia ou DOIS (intervalo).
   Hoje ligado no Registro Contábil (filtro Data da coluna). A função _lancctbCalendarioIntervalo é genérica — serve para outras telas. */
(function (root) {
  const pad = n => String(n).padStart(2, '0');
  const iso = (a, m, d) => a + '-' + pad(m + 1) + '-' + pad(d);
  const br = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '';
  const brCurto = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '';
  const somaDias = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Abre o calendário. Devolve { de, ate } ('ate' vazio = um dia só), { de:'', ate:'' } (limpou) ou null (cancelou).
  // min/max (opcionais): dias fora ficam apagados (não dá para escolher).
  root._lancctbCalendarioIntervalo = function ({ de, ate, titulo, min, max, mesInicial }) {
    return new Promise(resolve => {
      let el = document.getElementById('mCalInt');
      if (!el) { el = document.createElement('div'); el.className = 'mb'; el.id = 'mCalInt'; el.innerHTML = '<div class="modal" style="max-width:420px;width:96%"></div>'; document.body.appendChild(el); }
      let sd = de || '', sa = (ate && ate !== de) ? ate : '', feito = false;
      const base = sd || mesInicial || min || new Date().toISOString().slice(0, 10);
      let ano = +base.slice(0, 4), mes = +base.slice(5, 7) - 1;
      const fechar = r => { if (feito) return; feito = true; try { closeModal('mCalInt'); } catch (e) {} resolve(r); };
      const resumo = () => !sd ? 'Clique num dia. Para um intervalo, clique em outro dia depois.' : (!sa ? 'Dia <b>' + br(sd) + '</b> — clique em outro dia para fazer um intervalo.' : 'De <b>' + br(sd) + '</b> até <b>' + br(sa) + '</b>');
      const desenhar = () => {
        const ult = new Date(ano, mes + 1, 0).getDate(), ini = new Date(ano, mes, 1).getDay();
        let g = ''; ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(x => { g += '<div style="text-align:center;font-size:11px;color:var(--slate);padding:2px 0">' + x + '</div>'; });
        for (let i = 0; i < ini; i++) g += '<div></div>';
        for (let d = 1; d <= ult; d++) {
          const k = iso(ano, mes, d), fora = (min && k < min) || (max && k > max);
          const ponta = k === sd || k === sa, dentro = sd && sa && k > sd && k < sa;
          const est = 'padding:9px 0;border-radius:6px;border:1px solid var(--border);font-size:13px;cursor:' + (fora ? 'not-allowed' : 'pointer')
            + ';background:' + (ponta ? 'var(--teal)' : dentro ? 'rgba(20,184,166,.28)' : 'var(--white)') + ';color:' + (ponta ? '#fff' : fora ? 'var(--slate)' : 'var(--ink)') + ';opacity:' + (fora ? '.4' : '1') + (ponta ? ';font-weight:700' : '');
          g += '<button type="button" data-d="' + k + '" ' + (fora ? 'disabled' : '') + ' style="' + est + '">' + d + '</button>';
        }
        el.firstChild.innerHTML = '<div class="mt" style="display:flex;justify-content:space-between;align-items:center"><span>📅 ' + esc(titulo || 'Escolha a data ou o intervalo') + '</span><button id="ciX" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--slate)">✕</button></div>'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0"><button class="btn bo bsm" id="ciPrev">‹</button><b style="text-transform:capitalize">' + MESES[mes] + ' de ' + ano + '</b><button class="btn bo bsm" id="ciNext">›</button></div>'
          + '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">' + g + '</div>'
          + '<div style="margin-top:10px;font-size:12.5px;color:var(--slate)">' + resumo() + '</div>'
          + '<div class="ma"><button class="btn bo" id="ciLimpa" title="Tira o filtro de data">Limpar data</button><button class="btn bp" id="ciOk" ' + (sd ? '' : 'disabled') + '>Aplicar</button><button class="btn bo" id="ciCancel">Cancelar</button></div>';
        el.querySelector('#ciX').onclick = el.querySelector('#ciCancel').onclick = () => fechar(null);
        el.querySelector('#ciPrev').onclick = () => { mes--; if (mes < 0) { mes = 11; ano--; } desenhar(); };
        el.querySelector('#ciNext').onclick = () => { mes++; if (mes > 11) { mes = 0; ano++; } desenhar(); };
        el.querySelector('#ciLimpa').onclick = () => fechar({ de: '', ate: '' });
        el.querySelector('#ciOk').onclick = () => { if (sd) fechar({ de: sd, ate: sa && sa !== sd ? sa : '' }); };
        el.querySelectorAll('button[data-d]').forEach(b => { b.onclick = () => {
          const k = b.dataset.d;
          if (!sd || sa) { sd = k; sa = ''; }                    // 1º clique (ou recomeçar): um dia só
          else if (k === sd) { sa = ''; }                         // mesmo dia de novo: continua um dia só
          else { if (k < sd) { sa = sd; sd = k; } else sa = k; }  // 2º clique: fecha o intervalo (na ordem certa)
          desenhar();
        }; });
      };
      desenhar(); openModal('mCalInt');
    });
  };

  // ───────── Registro Contábil: filtro "Data" da coluna ─────────
  const lim = () => ({ min: _lancctbRegistroDataDe || '', max: _lancctbRegistroDataAte || '' });
  const recarrega = () => { _lancctbRegistroPagina = 0; renderLancctbRegistroContabil(); };
  root._lancctbRegDataHtml = function () {
    const d = _lancctbRegistroDataExata || '', a = _lancctbRegistroDataExataAte || '';
    const rot = !d ? '📅' : (a && a !== d ? (d.slice(0, 4) === a.slice(0, 4) ? brCurto(d) + '→' + brCurto(a) : br(d) + '→' + br(a)) : br(d));
    const tip = !d ? 'Escolher o dia ou um intervalo no calendário' : (a && a !== d ? 'Intervalo de ' + br(d) + ' até ' + br(a) + ' — clique para mudar' : 'Dia ' + br(d) + ' — clique para mudar (dá para escolher um intervalo)');
    const b = 'padding:1px 5px;line-height:1.2;font-size:13px;font-weight:700;border:1px solid var(--border);border-radius:5px;background:var(--white);color:var(--ink);cursor:pointer';
    return '<div data-dtf="registro" style="display:flex;align-items:center;justify-content:center;gap:2px;white-space:nowrap">'
      + '<button type="button" style="' + b + '" title="Dia anterior" onclick="_lancctbRegDataPasso(-1)">‹</button>'
      + '<button type="button" style="' + b + ';font-size:10px;font-weight:600;min-width:62px" title="' + esc(tip) + '" onclick="_lancctbRegDataAbrirCal()">' + rot + '</button>'
      + '<button type="button" style="' + b + '" title="Dia seguinte" onclick="_lancctbRegDataPasso(1)">›</button>'
      + (d ? '<button type="button" style="' + b + ';font-size:10px;padding:1px 4px" title="Tirar o filtro de data" onclick="_lancctbRegDataLimpar()">✕</button>' : '')
      + '</div>';
  };
  root._lancctbRegDataLimpar = function () { _lancctbRegistroDataExata = ''; _lancctbRegistroDataExataAte = ''; recarrega(); };
  root._lancctbRegDataPasso = function (n) {
    const { min, max } = lim();
    let d = _lancctbRegistroDataExata || '', a = _lancctbRegistroDataExataAte || '';
    if (!d) { d = min || ((_lancctbRegistroMes && /^\d{4}-\d{2}$/.test(_lancctbRegistroMes)) ? _lancctbRegistroMes + '-01' : ''); a = ''; if (!d) { toast('Escolha uma data no calendário primeiro.', 'info'); return; } }
    else { const nd = somaDias(d, n), na = a ? somaDias(a, n) : ''; const fim = na || nd; if ((min && nd < min) || (max && fim > max)) { toast('Fora do período filtrado (' + br(min) + ' a ' + br(max) + ').', 'info'); return; } d = nd; a = na; }
    _lancctbRegistroDataExata = d; _lancctbRegistroDataExataAte = a; recarrega();
  };
  root._lancctbRegDataAbrirCal = async function () {
    const { min, max } = lim();
    const r = await _lancctbCalendarioIntervalo({ de: _lancctbRegistroDataExata, ate: _lancctbRegistroDataExataAte, titulo: 'Data — um dia ou um intervalo', min, max, mesInicial: (_lancctbRegistroMes && /^\d{4}-\d{2}$/.test(_lancctbRegistroMes)) ? _lancctbRegistroMes + '-01' : '' });
    if (!r) return;
    _lancctbRegistroDataExata = r.de; _lancctbRegistroDataExataAte = r.ate; recarrega();
  };
})(window);
