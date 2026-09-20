// Backup COMPLETO de TODAS as tabelas do schema public do Supabase (pedido do
// usuário 20/09/2026: "o backup deveria salvar tudo do site, sem exceções").
// Complementa o backup-diario.js (dados_app a cada 6h, direto no repositório de
// backups) — este cobre as tabelas relacionais do módulo Lançamentos Contábeis
// (NFs, parcelas, extratos, lançamentos, plano de contas, regras, comprovantes,
// Fluxo de Caixa, aplicações...) e QUALQUER tabela nova, pois descobre a lista
// de tabelas sozinho pelo OpenAPI do PostgREST.
//
// Estratégia (respeita o limite de tráfego grátis do Supabase, 5 GB/mês):
//   - FULL (todas as linhas de todas as tabelas): 1x por semana (ou se não
//     existir nenhum full nos últimos 7 dias).
//   - INCREMENTAL (linhas com updated_at recente): nas demais execuções.
//     Toda tabela do módulo tem updated_at (trigger set_updated_at).
//   - Cada execução vira uma RELEASE do repositório privado de backups, com
//     1 arquivo <tabela>.ndjson.gz por tabela + manifest.json. Release não
//     conta no limite de tamanho do repositório e permite apagar as antigas.
//   - Retenção: 8 fulls e 30 dias de incrementais (git/Release apagam só o que
//     já tem um full mais novo cobrindo — nunca apaga o único full existente).
//
// Restauração: baixar o full mais recente + os incrementais posteriores e
// reaplicar em ordem (upsert por chave primária). Ver BACKUP.md.
//
// Variáveis: SUPABASE_SERVICE_ROLE_KEY, BACKUP_REPO_TOKEN (obrigatórias);
// SUPABASE_URL, BACKUP_REPO (opcionais); MODO=full|incremental|auto (padrão auto).

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hzotkhxmvausugzfkgbf.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GH_TOKEN = process.env.BACKUP_REPO_TOKEN;
const REPO = process.env.BACKUP_REPO || 'kleydsoncontador-svg/jjr-controle-backups';
const MODO_PEDIDO = process.env.MODO || 'auto';
const PAGE = 1000;
const REST = SUPABASE_URL + '/rest/v1';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const GH = { Authorization: 'Bearer ' + GH_TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function comRetry(fn, rotulo, tentativas = 6) {
  let ultimo;
  for (let t = 1; t <= tentativas; t++) {
    try { return await fn(); } catch (e) { ultimo = e; console.warn(`  ⚠ ${rotulo}: tentativa ${t}/${tentativas} falhou: ${e.message}`); await sleep(2000 * t); }
  }
  throw ultimo;
}

async function listarTabelas() {
  const r = await fetch(REST + '/', { headers: { ...H, Accept: 'application/openapi+json' } });
  if (!r.ok) throw new Error('OpenAPI HTTP ' + r.status);
  const d = await r.json();
  const defs = d.definitions || (d.components && d.components.schemas) || {};
  return Object.entries(defs).map(([nome, def]) => {
    const props = def.properties || {};
    const cols = Object.keys(props);
    const pk = cols.filter((c) => /Primary Key/i.test(props[c].description || ''));
    return { nome, cols, pk };
  });
}

async function contarLinhas(tabela, filtro = '') {
  const r = await fetch(`${REST}/${tabela}?select=*${filtro}`, { method: 'HEAD', headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
  const cr = r.headers.get('content-range') || '';
  const total = parseInt(cr.split('/')[1], 10);
  return Number.isFinite(total) ? total : null;
}

async function baixarTabela(t, arquivo, desde) {
  const gz = zlib.createGzip({ level: 9 });
  const saida = fs.createWriteStream(arquivo);
  const fim = pipeline(gz, saida);
  let linhas = 0;
  const filtro = desde && t.cols.includes('updated_at') ? `&updated_at=gte.${encodeURIComponent(desde)}` : '';
  const incrementalSemUpdatedAt = desde && !t.cols.includes('updated_at');
  const chaveUnica = t.pk.length === 1 ? t.pk[0] : null;
  const ordem = (t.pk.length ? t.pk : [t.cols[0]]).map((c) => `${c}.asc`).join(',');
  let ultimo = null;
  for (let offset = 0; ; offset += PAGE) {
    let url = `${REST}/${t.nome}?select=*&limit=${PAGE}${filtro}`;
    if (chaveUnica) {
      // keyset: robusto e rápido em tabelas grandes (sem OFFSET crescente)
      if (ultimo !== null) url += `&${chaveUnica}=gt.${encodeURIComponent(ultimo)}`;
      url += `&order=${chaveUnica}.asc`;
    } else {
      url += `&order=${ordem}&offset=${offset}`;
    }
    const pagina = await comRetry(async () => {
      const r = await fetch(url, { headers: H });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
      return r.json();
    }, `${t.nome} @${chaveUnica ? ultimo : offset}`);
    for (const linha of pagina) gz.write(JSON.stringify(linha) + '\n');
    linhas += pagina.length;
    if (chaveUnica && pagina.length) ultimo = pagina[pagina.length - 1][chaveUnica];
    if (pagina.length < PAGE) break;
  }
  gz.end();
  await fim;
  return { linhas, incrementalSemUpdatedAt };
}

async function gh(url, opts = {}) {
  const r = await fetch(url.startsWith('http') ? url : 'https://api.github.com' + url, { ...opts, headers: { ...GH, ...(opts.headers || {}) } });
  return r;
}

async function listarReleases() {
  const todas = [];
  for (let p = 1; p <= 10; p++) {
    const r = await gh(`/repos/${REPO}/releases?per_page=100&page=${p}`);
    if (!r.ok) throw new Error('listar releases HTTP ' + r.status);
    const lote = await r.json();
    todas.push(...lote);
    if (lote.length < 100) break;
  }
  return todas;
}

async function main() {
  if (!KEY || !GH_TOKEN) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY e BACKUP_REPO_TOKEN são obrigatórias.'); process.exit(1); }
  const inicio = new Date();
  const releases = await listarReleases();
  const manifestos = releases.filter((r) => /^(full|inc)-/.test(r.tag_name)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const ultimoFull = manifestos.find((r) => r.tag_name.startsWith('full-'));
  const idadeFullDias = ultimoFull ? (inicio - new Date(ultimoFull.created_at)) / 86400000 : Infinity;
  let modo = MODO_PEDIDO === 'auto' ? (idadeFullDias >= 6.9 ? 'full' : 'incremental') : MODO_PEDIDO;
  let desde = null;
  if (modo === 'incremental') {
    // parte do INÍCIO da última execução bem-sucedida, menos 30 min de folga
    let ref = null;
    for (const r of manifestos) { try { ref = JSON.parse(r.body || '{}').iniciado_em; if (ref) break; } catch (_) {} }
    if (!ref) { modo = 'full'; } else { desde = new Date(new Date(ref).getTime() - 30 * 60000).toISOString(); }
  }
  console.log(`🔄 Modo: ${modo}${desde ? ' (desde ' + desde + ')' : ''}`);

  const tabelas = await comRetry(listarTabelas, 'listar tabelas');
  console.log(`📋 ${tabelas.length} tabelas: ${tabelas.map((t) => t.nome).join(', ')}`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bkp-'));
  const manifesto = { iniciado_em: inicio.toISOString(), modo, desde, tabelas: {} };
  let divergencias = 0;
  for (const t of tabelas) {
    const arq = path.join(tmp, `${t.nome}.ndjson.gz`);
    const { linhas, incrementalSemUpdatedAt } = await baixarTabela(t, arq, desde);
    const esperado = modo === 'full' ? await contarLinhas(t.nome) : null;
    const tamMB = (fs.statSync(arq).size / 1048576).toFixed(2);
    // tabela sem updated_at: o incremental leria TUDO — vale pelo menos como full daquela tabela
    manifesto.tabelas[t.nome] = { linhas, esperado, arquivo_mb: Number(tamMB), pk: t.pk, completa: modo === 'full' || !!incrementalSemUpdatedAt };
    const tol = esperado == null ? 0 : Math.max(2, Math.ceil(esperado * 0.001));
    if (esperado != null && Math.abs(linhas - esperado) > tol) { divergencias++; console.error(`  ❌ ${t.nome}: leu ${linhas}, banco tem ${esperado}`); }
    console.log(`  ✓ ${t.nome}: ${linhas} linhas, ${tamMB} MB${esperado != null ? ' (banco: ' + esperado + ')' : ''}`);
  }
  fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify(manifesto, null, 2));
  if (divergencias) { console.error(`❌ ${divergencias} tabela(s) com contagem divergente — NÃO publica este backup.`); process.exit(2); }

  // Publica como release
  const tag = `${modo === 'full' ? 'full' : 'inc'}-${inicio.toISOString().slice(0, 13).replace('T', '-')}h`;
  const rel = await gh(`/repos/${REPO}/releases`, { method: 'POST', body: JSON.stringify({ tag_name: tag, name: `Backup ${modo} ${inicio.toISOString()}`, body: JSON.stringify({ iniciado_em: manifesto.iniciado_em, modo, desde }), draft: false, prerelease: false }) });
  if (!rel.ok) { console.error('❌ Falha ao criar release:', rel.status, (await rel.text()).slice(0, 300)); process.exit(1); }
  const relJson = await rel.json();
  const uploadBase = relJson.upload_url.replace(/\{.*$/, '');
  for (const f of fs.readdirSync(tmp)) {
    const buf = fs.readFileSync(path.join(tmp, f));
    await comRetry(async () => {
      const r = await fetch(`${uploadBase}?name=${encodeURIComponent(f)}`, { method: 'POST', headers: { ...GH, 'Content-Type': f.endsWith('.json') ? 'application/json' : 'application/gzip' }, body: buf });
      if (!r.ok) throw new Error(`upload ${f} HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    }, `upload ${f}`);
  }
  console.log(`✅ Backup ${modo} publicado: ${tag} (${fs.readdirSync(tmp).length} arquivos)`);

  // Retenção — só depois de publicar com sucesso
  const todos = (await listarReleases()).filter((r) => /^(full|inc)-/.test(r.tag_name)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const fulls = todos.filter((r) => r.tag_name.startsWith('full-'));
  const apagar = [];
  fulls.slice(8).forEach((r) => apagar.push(r));
  const fullMaisAntigoMantido = fulls.slice(0, 8).slice(-1)[0];
  todos.filter((r) => r.tag_name.startsWith('inc-') && fullMaisAntigoMantido && new Date(r.created_at) < new Date(fullMaisAntigoMantido.created_at) && (inicio - new Date(r.created_at)) > 30 * 86400000).forEach((r) => apagar.push(r));
  for (const r of apagar) {
    await gh(`/repos/${REPO}/releases/${r.id}`, { method: 'DELETE' });
    await gh(`/repos/${REPO}/git/refs/tags/${r.tag_name}`, { method: 'DELETE' });
    console.log(`🗑 release antiga removida: ${r.tag_name}`);
  }
}

main().catch((e) => { console.error('❌ Erro:', e); process.exit(1); });
