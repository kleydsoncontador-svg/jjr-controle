/* Mini calendário com INTERVALO de datas + setas de dia (‹ ›) para o filtro "Data" do cabeçalho das telas de Lançamentos Contábeis.
   Pedido do usuário 13/11/2026: filtro centralizado, setas para voltar/avançar o dia sem abrir o calendário e, no calendário PEQUENO colado no campo, poder escolher UM dia ou DOIS (intervalo).
   Hoje ligado no Registro Contábil (filtro Data da coluna). A função _lancctbCalendarioIntervalo é genérica — serve para outras telas. */
(function (root) {
  const pad = n => String(n).padStart(2, '0');
  const iso = (a, m, d) => a + '-' + pad(m + 1) + '-' + pad(d);
  const br = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '';
  const brCurto = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '';
  const somaDias = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Abre o mini calendário (janelinha pequena colada no campo). Devolve { de, ate } ('ate' vazio = um dia só),
  // { de:'', ate:'' } (limpou) ou null (fechou sem aplicar). min/max (opcionais): dias fora ficam apagados. ancora = elemento onde a janelinha gruda.
  root._lancctbCalendarioIntervalo = function ({ de, ate, min, max, mesInicial, ancora }) {
    return new Promise(resolve => {
      const velho = document.getElementById('mCalInt'); if (velho) velho.remove();
      const el = document.createElement('div'); el.id = 'mCalInt';
      el.style.cssText = 'position:fixed;z-index:100000;width:244px;padding:8px 8px 7px;border-radius:10px;border:1px solid var(--border);background:var(--white);color:var(--ink);box-shadow:0 8px 28px rgba(0,0,0,.45);font-size:12px';
      document.body.appendChild(el);
      let sd = de || '', sa = (ate && ate !== de) ? ate : '', feito = false;
      const base = sd || mesInicial || min || new Date().toISOString().slice(0, 10);
      let ano = +base.slice(0, 4), mes = +base.slice(5, 7) - 1;
      const posicionar = () => {
        const r = ancora && ancora.getBoundingClientRect ? ancora.getBoundingClientRect() : { left: 80, bottom: 120, top: 100, width: 0 };
        const w = el.offsetWidth || 244, h = el.offsetHeight || 260;
        let left = r.left + r.width / 2 - w / 2; left = Math.max(6, Math.min(left, window.innerWidth - w - 6));
        let top = r.bottom + 4; if (top + h > window.innerHeight - 6) top = Math.max(6, r.top - h - 4);
        el.style.left = left + 'px'; el.style.top = top + 'px';
      };
      const fecha = r => { if (feito) return; feito = true; document.removeEventListener('mousedown', fora, true); document.removeEventListener('keydown', tecla, true); el.remove(); resolve(r); };
      const fora = e => { if (!el.contains(e.target) && !(ancora && ancora.contains && ancora.contains(e.target))) fecha(null); };
      const tecla = e => { if (e.key === 'Escape') fecha(null); else if (e.key === 'Enter' && sd) fecha({ de: sd, ate: sa && sa !== sd ? sa : '' }); };
      const resumo = () => !sd ? 'Clique num dia (ou em dois, para um intervalo).' : (!sa ? 'Dia <b>' + br(sd) + '</b> — clique em outro para fazer intervalo.' : '<b>' + br(sd) + '</b> até <b>' + br(sa) + '</b>');
      const desenhar = () => {
        const ult = new Date(ano, mes + 1, 0).getDate(), ini = new Date(ano, mes, 1).getDay();
        let g = ''; ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(x => { g += '<div style="text-align:center;font-size:10px;color:var(--slate);padding:1px 0">' + x + '</div>'; });
        for (let i = 0; i < ini; i++) g += '<div></div>';
        for (let d = 1; d <= ult; d++) {
          const k = iso(ano, mes, d), foraP = (min && k < min) || (max && k > max);
          const ponta = k === sd || k === sa, dentro = sd && sa && k > sd && k < sa;
          const est = 'height:28px;padding:0;border-radius:6px;border:1px solid ' + (ponta ? 'var(--teal)' : 'transparent') + ';font-size:12px;cursor:' + (foraP ? 'not-allowed' : 'pointer')
            + ';background:' + (ponta ? 'var(--teal)' : dentro ? 'rgba(20,184,166,.28)' : 'transparent') + ';color:' + (ponta ? '#fff' : foraP ? 'var(--slate)' : 'var(--ink)') + ';opacity:' + (foraP ? '.35' : '1') + (ponta ? ';font-weight:700' : '');
          g += '<button type="button" data-d="' + k + '" ' + (foraP ? 'disabled' : '') + ' style="' + est + '">' + d + '</button>';
        }
        const bt = 'padding:3px 9px;font-size:11.5px';
        el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><button class="btn bo bsm" id="ciPrev" style="padding:1px 8px">‹</button><b>' + MESES[mes].charAt(0).toUpperCase() + MESES[mes].slice(1) + ' de ' + ano + '</b><button class="btn bo bsm" id="ciNext" style="padding:1px 8px">›</button></div>'
          + '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">' + g + '</div>'
          + '<div style="margin:6px 0 5px;font-size:11px;color:var(--slate);min-height:15px">' + resumo() + '</div>'
          + '<div style="display:flex;gap:5px;justify-content:flex-end"><button class="btn bo bsm" id="ciLimpa" style="' + bt + '" title="Tira o filtro de data">Limpar</button><button class="btn bp bsm" id="ciOk" style="' + bt + '" ' + (sd ? '' : 'disabled') + '>Aplicar</button></div>';
        el.querySelector('#ciPrev').onclick = () => { mes--; if (mes < 0) { mes = 11; ano--; } desenhar(); };
        el.querySelector('#ciNext').onclick = () => { mes++; if (mes > 11) { mes = 0; ano++; } desenhar(); };
        el.querySelector('#ciLimpa').onclick = () => fecha({ de: '', ate: '' });
        el.querySelector('#ciOk').onclick = () => { if (sd) fecha({ de: sd, ate: sa && sa !== sd ? sa : '' }); };
        el.querySelectorAll('button[data-d]').forEach(b => {
          b.onclick = () => {
            const k = b.dataset.d;
            if (!sd || sa) { sd = k; sa = ''; }                    // 1º clique (ou recomeçar): um dia só
            else if (k === sd) { sa = ''; }
            else { if (k < sd) { sa = sd; sd = k; } else sa = k; }  // 2º clique: fecha o intervalo (na ordem certa)
            desenhar();
          };
          b.ondblclick = () => fecha({ de: b.dataset.d, ate: '' }); // duplo clique: aplica só esse dia
        });
        posicionar();
      };
      desenhar();
      setTimeout(() => { document.addEventListener('mousedown', fora, true); document.addEventListener('keydown', tecla, true); }, 0);
    });
  };

  // ───────── Registro Contábil: filtro "Data" da coluna ─────────
  const lim = () => ({ min: _lancctbRegistroDataDe || '', max: _lancctbRegistroDataAte || '' });
  const recarrega = () => { _lancctbRegistroPagina = 0; renderLancctbRegistroContabil(); };
  root._lancctbRegDataHtml = function () {
    const d = _lancctbRegistroDataExata || '', a = _lancctbRegistroDataExataAte || '';
    // sem data escolhida o campo fica VAZIO (= sem filtro de data)
    const rot = !d ? '&nbsp;' : (a && a !== d ? (d.slice(0, 4) === a.slice(0, 4) ? brCurto(d) + '→' + brCurto(a) : br(d) + '→' + br(a)) : br(d));
    const tip = !d ? 'Clique para escolher o dia ou um intervalo (campo vazio = sem filtro de data)' : (a && a !== d ? 'Intervalo de ' + br(d) + ' até ' + br(a) + ' — clique para mudar' : 'Dia ' + br(d) + ' — clique para mudar (dá para escolher um intervalo)');
    const b = 'padding:1px 5px;line-height:1.2;font-size:13px;font-weight:700;border:1px solid var(--border);border-radius:5px;background:var(--white);color:var(--ink);cursor:pointer';
    return '<div data-dtf="registro" style="display:flex;align-items:center;justify-content:center;gap:2px;white-space:nowrap">'
      + '<button type="button" style="' + b + '" title="Dia anterior" onclick="_lancctbRegDataPasso(-1)">‹</button>'
      + '<button type="button" style="' + b + ';font-size:10px;font-weight:600;min-width:62px;min-height:20px" title="' + esc(tip) + '" onclick="_lancctbRegDataAbrirCal(this)">' + rot + '</button>'
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
  root._lancctbRegDataAbrirCal = async function (ancora) {
    const { min, max } = lim();
    const r = await _lancctbCalendarioIntervalo({ de: _lancctbRegistroDataExata, ate: _lancctbRegistroDataExataAte, ancora, min, max, mesInicial: (_lancctbRegistroMes && /^\d{4}-\d{2}$/.test(_lancctbRegistroMes)) ? _lancctbRegistroMes + '-01' : '' });
    if (!r) return;
    _lancctbRegistroDataExata = r.de; _lancctbRegistroDataExataAte = r.ate; recarrega();
  };
})(window);
