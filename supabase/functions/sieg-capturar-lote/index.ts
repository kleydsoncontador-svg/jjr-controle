// Edge Function: captura de NF-e/NFS-e via API da SIEG, alimentando
// notas_fiscais/notas_fiscais_parcelas do módulo Lançamentos Bancários
// (Fase 6 do plano). Processa UMA linha pendente de fila_sieg por chamada
// (não o lote inteiro), pra não estourar o timeout da Edge Function — quem
// chama repetidamente é o agendador (GitHub Actions, ver
// .github/workflows/sieg-captura.yml), mesmo padrão do backup-diario.yml.
//
// Documentação pública da SIEG não detalha os endpoints da "Nova API" (só
// diz que precisa de API Key + e-mail + senha pra GERAR a chave no painel
// deles) — mas o Swagger real está no ar, sem exigir login pra LER a doc:
//   https://api.sieg.com/swagger/docs/engine  (API atual, "SIEG API Engine")
//   https://api.sieg.com/swagger/docs/ver     (API legada)
// Confirmado em 04/09/2026 com requisições reais:
//   - POST https://api.sieg.com/BaixarXmls?api_key=<chave_invalida> respondeu
//     "Não Autenticado: Erro ao obter dados de usuário" (não 404) — confirma
//     que a autenticação é via ?api_key= na query string, lida por um filtro
//     customizado (não aparece no Swagger como securityDefinition).
//   - Endpoint usado aqui: POST /BaixarXmlsV2 (API legada "ver", não a
//     "engine") — testei a "engine" (/api/v1/baixar-xmls) primeiro, mas ela
//     devolveu "API Key ou token JWT não fornecidos" mesmo com uma chave
//     real (04/09/2026), sinal de que ela espera a chave em outro lugar
//     (header?, não documentado). A /BaixarXmlsV2 usa o MESMO mecanismo já
//     confirmado (?api_key= na query), só muda os nomes dos campos do
//     corpo (inglês, não português).
//   - Corpo (DownloadRequestDto, API "ver"): XmlType (1=NFe,2=CTe,3=NFSe,
//     4=NFCe,5=CFe), Take, Skip, DataEmissaoInicio/Fim (ISO), CnpjEmit,
//     CnpjDest.
//   - Resposta documentada (DownloadResponse) só declara Status/Codigo/
//     Mensagens[] — o Swagger NÃO deixa explícito onde fica o conteúdo do
//     XML (typo comum em Swashbuckle quando o retorno real não bate com o
//     tipo declarado). Por isso _extrairXmlsDaResposta() abaixo tenta várias
//     formas plausíveis (Mensagens como lista de XML base64/texto, ou um
//     campo alternativo tipo Xmls/Notas/Result) — PRECISA ser conferido/
//     ajustado no primeiro teste real com uma chave de API válida.
//
// Estratégia de checkpoint (janela deslizante, guardada em fila_sieg):
//   - data_emissao_inicio..data_emissao_fim_checkpoint = janela atual sendo
//     varrida (30 dias por vez); skip_checkpoint = paginação dentro dela.
//   - Uma chamada processa NO MÁXIMO 1 página (Take=50) de UM papel
//     (Emitente OU Destinatário) da janela atual, sempre pelo campo com o
//     Skip mais atrasado dos dois. Página vazia nos dois papéis → avança a
//     janela pro próximo mês (ou marca concluído se já alcançou hoje).
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function →
// nome "sieg-capturar-lote" → colar este código → Deploy.
// Secrets necessários: SIEG_API_KEY (gerar em SIEG: Minha Conta »
// Integrações API SIEG » Gerar nova chave API). SUPABASE_URL e
// SUPABASE_SERVICE_ROLE_KEY já são injetados automaticamente pelo Supabase
// em toda Edge Function, não precisa cadastrar.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SIEG_BASE_URL = 'https://api.sieg.com';
const TIPO_XML_POR_DOC: Record<string, number> = { nfe: 1, nfse: 3 };
const TAKE_POR_PAGINA = 50;
const JANELA_DIAS = 30;
const MAX_TENTATIVAS = 5;

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}
function somaDias(dataISO: string, dias: number): string {
  const d = new Date(dataISO + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function menorData(a: string, b: string): string {
  return a < b ? a : b;
}

async function chamarSieg(apiKey: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; json: any; raw: string }> {
  const resp = await fetch(`${SIEG_BASE_URL}/BaixarXmlsV2?api_key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const raw = await resp.text();
  let json: any = null;
  try { json = JSON.parse(raw); } catch { /* resposta não-JSON, fica em raw */ }
  return { ok: resp.ok, status: resp.status, json, raw };
}

// Modo diagnóstico (body: {"diagnostico": true}) — testa várias formas de
// autenticar contra as duas APIs (legada e engine) num corpo mínimo
// (Take:1, hoje), sem tocar em fila_sieg/notas_fiscais. Usado só pra
// descobrir empiricamente qual mecanismo a chave real aceita, já que a doc
// pública da SIEG não documenta isso. Remover depois de confirmado.
async function diagnosticoSieg(apiKey: string): Promise<Record<string, unknown>> {
  const bodyMinimo = { XmlType: 1, Take: 1, Skip: 0, DataEmissaoInicio: `${hoje()}T00:00:00`, DataEmissaoFim: `${hoje()}T23:59:59` };
  const bodyMinimoEngine = { TipoXml: 1, Take: 1, Skip: 0, DataEmissaoInicio: `${hoje()}T00:00:00`, DataEmissaoFim: `${hoje()}T23:59:59` };
  async function tentativa(nome: string, url: string, headers: Record<string, string>, body: Record<string, unknown>) {
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
      const raw = await resp.text();
      return { nome, status: resp.status, resposta: raw.slice(0, 300) };
    } catch (e) {
      return { nome, erro: e instanceof Error ? e.message : String(e) };
    }
  }
  const resultados = await Promise.all([
    tentativa('legada: query ?api_key=', `${SIEG_BASE_URL}/BaixarXmlsV2?api_key=${encodeURIComponent(apiKey)}`, {}, bodyMinimo),
    tentativa('legada: header Authorization Bearer', `${SIEG_BASE_URL}/BaixarXmlsV2`, { Authorization: `Bearer ${apiKey}` }, bodyMinimo),
    tentativa('engine: query ?api_key=', `${SIEG_BASE_URL}/api/v1/baixar-xmls?api_key=${encodeURIComponent(apiKey)}`, {}, bodyMinimoEngine),
    tentativa('engine: header Authorization Bearer', `${SIEG_BASE_URL}/api/v1/baixar-xmls`, { Authorization: `Bearer ${apiKey}` }, bodyMinimoEngine),
    tentativa('engine: header Authorization (sem Bearer)', `${SIEG_BASE_URL}/api/v1/baixar-xmls`, { Authorization: apiKey }, bodyMinimoEngine),
    tentativa('engine: header Api-Key', `${SIEG_BASE_URL}/api/v1/baixar-xmls`, { 'Api-Key': apiKey }, bodyMinimoEngine),
    tentativa('engine: header X-Api-Key', `${SIEG_BASE_URL}/api/v1/baixar-xmls`, { 'X-Api-Key': apiKey }, bodyMinimoEngine),
    tentativa('contar-xmls: query ?api_key=', `${SIEG_BASE_URL}/api/v1/contar-xmls?api_key=${encodeURIComponent(apiKey)}`, {}, { DataEmissaoInicio: `${hoje()}T00:00:00`, DataEmissaoFim: `${hoje()}T23:59:59` }),
  ]);
  return { resultados };
}

// Tenta achar a lista de XMLs (string, cada um o conteúdo do XML — cru ou
// base64) na resposta da SIEG, testando os formatos mais plausíveis. A doc
// pública não confirma qual é — ajustar aqui assim que um teste real
// mostrar o formato de verdade (ver comentário no topo do arquivo).
function extrairXmlsDaResposta(json: any): string[] {
  if (!json) return [];
  const candidatos = [json.Mensagens, json.mensagens, json.Xmls, json.xmls, json.Notas, json.notas, json.Result, json.result];
  for (const c of candidatos) {
    if (Array.isArray(c) && c.length && typeof c[0] === 'string') return c;
  }
  if (Array.isArray(json)) return json.filter((x) => typeof x === 'string');
  return [];
}

function decodificarXml(item: string): string {
  // Se vier em base64 (sem "<" no início), decodifica; senão assume texto puro.
  if (item.trim().startsWith('<')) return item;
  try {
    return atob(item);
  } catch {
    return item;
  }
}

function extrairTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : null;
}
function extrairBloco(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1] : null;
}

interface NfExtraida {
  chave_acesso: string | null;
  numero: string;
  serie: string | null;
  modelo: string | null;
  cnpj_emitente: string;
  nome_emitente: string | null;
  cnpj_destinatario: string | null;
  nome_destinatario: string | null;
  data_emissao: string;
  valor_total: number;
  iss_valor: number | null;
  parcelas: { numero_parcela: number; data_vencimento: string; valor_parcela: number }[];
}

// Extração via regex (sem parser DOM) — suficiente pro NFe padrão (XML sem
// namespace prefixado, tags simples). NFS-e varia MUITO por município; aqui
// só cobre os campos mínimos, o resto fica pra revisão manual quando surgir
// caso real.
function parsearNFe(xml: string): NfExtraida | null {
  const chaveMatch = xml.match(/Id="NFe(\d{44})"/i) || xml.match(/<chNFe>(\d{44})<\/chNFe>/i);
  const numero = extrairTag(xml, 'nNF');
  if (!numero) return null;
  const emitBloco = extrairBloco(xml, 'emit') || '';
  const destBloco = extrairBloco(xml, 'dest') || '';
  const icmsTotBloco = extrairBloco(xml, 'ICMSTot') || xml;
  const dataEmissaoBruta = extrairTag(xml, 'dhEmi') || extrairTag(xml, 'dEmi') || '';
  const parcelas: NfExtraida['parcelas'] = [];
  const dupRe = /<dup>([\s\S]*?)<\/dup>/gi;
  let m: RegExpExecArray | null;
  let n = 1;
  while ((m = dupRe.exec(xml)) !== null) {
    const bloco = m[1];
    const venc = extrairTag(bloco, 'dVenc');
    const val = extrairTag(bloco, 'vDup');
    if (venc && val) parcelas.push({ numero_parcela: n++, data_vencimento: venc.slice(0, 10), valor_parcela: parseFloat(val) });
  }
  const valorTotal = parseFloat(extrairTag(icmsTotBloco, 'vNF') || '0');
  if (!parcelas.length) {
    parcelas.push({ numero_parcela: 1, data_vencimento: dataEmissaoBruta.slice(0, 10), valor_parcela: valorTotal });
  }
  return {
    chave_acesso: chaveMatch ? chaveMatch[1] : null,
    numero,
    serie: extrairTag(xml, 'serie'),
    modelo: extrairTag(xml, 'mod'),
    cnpj_emitente: (extrairTag(emitBloco, 'CNPJ') || '').replace(/\D/g, ''),
    nome_emitente: extrairTag(emitBloco, 'xNome'),
    cnpj_destinatario: (extrairTag(destBloco, 'CNPJ') || extrairTag(destBloco, 'CPF') || '').replace(/\D/g, '') || null,
    nome_destinatario: extrairTag(destBloco, 'xNome'),
    data_emissao: dataEmissaoBruta.slice(0, 10),
    valor_total: valorTotal,
    iss_valor: null,
    parcelas,
  };
}

function parsearNFSe(xml: string): NfExtraida | null {
  const numero = extrairTag(xml, 'Numero') || extrairTag(xml, 'nNFS') || extrairTag(xml, 'numero');
  if (!numero) return null;
  const valorTotal = parseFloat(extrairTag(xml, 'ValorServicos') || extrairTag(xml, 'vServ') || '0');
  const issValor = extrairTag(xml, 'ValorIss') || extrairTag(xml, 'vISS');
  const dataEmissaoBruta = extrairTag(xml, 'DataEmissao') || extrairTag(xml, 'dEmi') || '';
  const prestCnpj = (extrairTag(xml, 'CpfCnpjPrestador') || extrairTag(xml, 'CnpjPrestador') || '').replace(/\D/g, '');
  const tomCnpj = (extrairTag(xml, 'CpfCnpjTomador') || extrairTag(xml, 'CnpjTomador') || '').replace(/\D/g, '');
  return {
    chave_acesso: null,
    numero,
    serie: null,
    modelo: 'NFSe',
    cnpj_emitente: prestCnpj,
    nome_emitente: extrairTag(xml, 'RazaoSocialPrestador'),
    cnpj_destinatario: tomCnpj || null,
    nome_destinatario: extrairTag(xml, 'RazaoSocialTomador'),
    data_emissao: dataEmissaoBruta.slice(0, 10),
    valor_total: valorTotal,
    iss_valor: issValor ? parseFloat(issValor) : null,
    parcelas: [{ numero_parcela: 1, data_vencimento: dataEmissaoBruta.slice(0, 10), valor_parcela: valorTotal }],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const apiKey = Deno.env.get('SIEG_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'SIEG_API_KEY não configurada nos secrets da function.' }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const bodyReq = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  if (bodyReq?.diagnostico) {
    const diag = await diagnosticoSieg(apiKey);
    const semEspaco = apiKey.trim();
    return new Response(JSON.stringify({
      chaveInfo: { tamanho: apiKey.length, tamanhoSemEspacos: semEspaco.length, temEspacoOuQuebra: apiKey !== semEspaco, inicio: apiKey.slice(0, 4), fim: apiKey.slice(-4) },
      ...diag,
    }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // Pega 1 linha pendente (ou já processando há muito tempo — reaproveita
    // se travou numa execução anterior) e trava marcando 'processando'.
    const { data: filaRows, error: filaErr } = await supabase
      .from('fila_sieg')
      .select('*')
      .in('status', ['pendente', 'erro'])
      .lte('proxima_execucao', new Date().toISOString())
      .lt('tentativas', MAX_TENTATIVAS)
      .order('prioridade', { ascending: true })
      .order('proxima_execucao', { ascending: true })
      .limit(1);
    if (filaErr) throw filaErr;
    if (!filaRows || !filaRows.length) {
      return new Response(JSON.stringify({ mensagem: 'Nada pendente em fila_sieg no momento.' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const item = filaRows[0];
    await supabase.from('fila_sieg').update({ status: 'processando' }).eq('id', item.id);

    const tipoXml = TIPO_XML_POR_DOC[item.tipo_doc];
    const inicioJanela = item.data_emissao_inicio || hoje();
    const fimJanela = item.data_emissao_fim_checkpoint || menorData(somaDias(inicioJanela, JANELA_DIAS), hoje());
    const skip = item.skip_checkpoint || 0;

    const bodyBase = {
      XmlType: tipoXml,
      Take: TAKE_POR_PAGINA,
      Skip: skip,
      DataEmissaoInicio: `${inicioJanela}T00:00:00`,
      DataEmissaoFim: `${fimJanela}T23:59:59`,
    };
    // 1a tentativa como Emitente (documentos que a empresa emitiu — vendas/
    // prestação); só tenta como Destinatário se não achou nada como emitente
    // nesta página (evita duplicar 2 chamadas em toda invocação).
    let resp = await chamarSieg(apiKey, { ...bodyBase, CnpjEmit: item.cnpj });
    let papel: 'emit' | 'dest' = 'emit';
    let xmls = extrairXmlsDaResposta(resp.json);
    if (!resp.ok) {
      await supabase.from('fila_sieg').update({
        status: 'erro', tentativas: (item.tentativas || 0) + 1,
        ultimo_erro: `HTTP ${resp.status}: ${resp.raw.slice(0, 500)}`,
        proxima_execucao: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }).eq('id', item.id);
      return new Response(JSON.stringify({ erro: 'Falha na chamada à SIEG', detalhe: resp.raw.slice(0, 500) }), {
        status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    if (!xmls.length) {
      resp = await chamarSieg(apiKey, { ...bodyBase, CnpjDest: item.cnpj });
      papel = 'dest';
      xmls = extrairXmlsDaResposta(resp.json);
    }

    let salvos = 0;
    for (const item_xml of xmls) {
      const xml = decodificarXml(item_xml);
      const nf = item.tipo_doc === 'nfe' ? parsearNFe(xml) : parsearNFSe(xml);
      if (!nf || !nf.cnpj_emitente) continue;

      const direcao = nf.cnpj_emitente === item.cnpj ? 'venda' : 'compra';
      const storagePath = `${item.empresa_eid}/${item.tipo_doc}/${nf.chave_acesso || `${nf.cnpj_emitente}-${nf.numero}-${Date.now()}`}.xml`;
      await supabase.storage.from('nf-xmls').upload(storagePath, new Blob([xml], { type: 'application/xml' }), { upsert: true });

      const { data: nfInserida, error: nfErro } = await supabase.from('notas_fiscais')
        .upsert({
          empresa_eid: item.empresa_eid,
          tipo: item.tipo_doc,
          chave_acesso: nf.chave_acesso,
          numero: nf.numero,
          serie: nf.serie,
          modelo: nf.modelo,
          cnpj_emitente: nf.cnpj_emitente,
          nome_emitente: nf.nome_emitente,
          cnpj_destinatario: nf.cnpj_destinatario,
          nome_destinatario: nf.nome_destinatario,
          direcao,
          data_emissao: nf.data_emissao || fimJanela,
          valor_total: nf.valor_total,
          iss_valor: nf.iss_valor,
          xml_storage_path: storagePath,
          status_captura: 'xml_completo',
        }, { onConflict: nf.chave_acesso ? 'empresa_eid,tipo,chave_acesso' : 'empresa_eid,tipo,cnpj_emitente,numero,serie' })
        .select('id').single();
      if (nfErro || !nfInserida) continue;

      for (const p of nf.parcelas) {
        await supabase.from('notas_fiscais_parcelas').upsert({
          nf_id: nfInserida.id,
          empresa_eid: item.empresa_eid,
          numero_parcela: p.numero_parcela,
          data_vencimento: p.data_vencimento || nf.data_emissao || fimJanela,
          valor_parcela: p.valor_parcela,
        }, { onConflict: 'nf_id,numero_parcela' });
      }
      salvos++;
    }

    // Avança o checkpoint: se a página (do papel que respondeu) veio cheia
    // (Take exato), tem mais nessa mesma janela — só avança o Skip. Se veio
    // vazia/incompleta nos dois papéis, fecha a janela atual e desliza pra
    // próxima; se já alcançou hoje, marca concluído (proxima_execucao =
    // amanhã, pra pegar documentos novos).
    const paginaCheia = xmls.length >= TAKE_POR_PAGINA;
    let update: Record<string, unknown>;
    if (paginaCheia) {
      // Ainda tem mais nessa mesma janela — só avança o Skip.
      update = { status: 'pendente', skip_checkpoint: skip + TAKE_POR_PAGINA, tentativas: 0, ultimo_erro: null, proxima_execucao: new Date().toISOString() };
    } else {
      // Página parcial ou vazia nos dois papéis (emit e, se emit veio
      // vazio, dest também) — fecha a janela atual e desliza pro próximo
      // mês; se já alcançou hoje, marca concluído (proxima_execucao =
      // amanhã, só pra pegar documento novo).
      const proximaInicio = somaDias(fimJanela, 1);
      const concluiu = proximaInicio > hoje();
      update = concluiu
        ? { status: 'concluido', data_emissao_inicio: proximaInicio, data_emissao_fim_checkpoint: null, skip_checkpoint: 0, tentativas: 0, ultimo_erro: null, proxima_execucao: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
        : { status: 'pendente', data_emissao_inicio: proximaInicio, data_emissao_fim_checkpoint: menorData(somaDias(proximaInicio, JANELA_DIAS), hoje()), skip_checkpoint: 0, tentativas: 0, ultimo_erro: null, proxima_execucao: new Date().toISOString() };
    }
    await supabase.from('fila_sieg').update(update).eq('id', item.id);

    return new Response(JSON.stringify({ empresa_eid: item.empresa_eid, cnpj: item.cnpj, tipo_doc: item.tipo_doc, papel, xmlsRecebidos: xmls.length, notasSalvas: salvos, checkpoint: update }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
