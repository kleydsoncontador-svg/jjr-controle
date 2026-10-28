/* Mapas mentais curados das normas (NBC). Chave = código da norma, igual ao de NBC_CONTEUDO.
   Cada nó: { t: texto curto, d: detalhe opcional, k: tipo opcional ('sim' | 'nao' | 'res' | 'nota' | 'alerta'), f: [filhos] }
   Normas SEM mapa curado aparecem com um mapa gerado automaticamente a partir da explicação (pontos, palavras e exemplos). */
(function () {
  window.NBC_MAPAS = window.NBC_MAPAS || {};
  window.NBC_MAPAS['NBC TG 48'] = {
    autor: 'Kleydson (planilha “Mapa Mental – Instrumentos Financeiros – CPC 48”), revisado e organizado em mapa',
    raiz: { t: 'Instrumentos financeiros — Classificação e mensuração (CPC 48)', d: 'A classificação reflete o MODELO DE NEGÓCIOS de quem detém o instrumento e as CARACTERÍSTICAS DOS FLUXOS DE CAIXA do instrumento. Ela define a mensuração SUBSEQUENTE.', f: [
      { t: 'As 3 classificações possíveis (ativos)', f: [
        { t: '1) Custo amortizado', k: 'res' },
        { t: '2) Valor justo por meio do resultado (VJR)', k: 'res' },
        { t: '3) Valor justo por meio de outros resultados abrangentes (VJORA)', k: 'res' }] },
      { t: 'Reconhecimento inicial', f: [
        { t: 'Mede-se pelo valor justo', d: 'Em geral coincide com o valor de aquisição.' },
        { t: 'Soma os custos de transação', d: 'Vale para o que NÃO vai a VJR. No VJR os custos de transação vão direto para o resultado.' }] },
      { t: 'Passo 1 — Fluxos de caixa contratuais (olha o INSTRUMENTO)', f: [
        { t: 'Os fluxos são SOMENTE pagamento de principal e juros (SPPI)?', f: [
          { t: 'NÃO', k: 'nao', f: [{ t: 'VJR (fim da análise)', k: 'res', d: 'Se falha no SPPI, vai direto a VJR — o modelo de negócios nem muda o resultado.' }] },
          { t: 'SIM → vai para o Passo 2', k: 'sim' }] }] },
      { t: 'Passo 2 — Modelo de negócios (olha a CARTEIRA)', f: [
        { t: 'Mantido para receber os fluxos de caixa contratuais?', f: [
          { t: 'SIM', k: 'sim', f: [{ t: 'Custo amortizado', k: 'res', d: 'Saldo = montante inicial − recebimentos (principal e juros) + receita financeira (juros pela taxa efetiva) − perdas esperadas (PCE).' }] },
          { t: 'NÃO → próxima pergunta', k: 'nao', f: [
            { t: 'Mantido para receber fluxos contratuais E para vender?', f: [
              { t: 'SIM', k: 'sim', f: [{ t: 'VJORA', k: 'res' }] },
              { t: 'NÃO (negociação / outros)', k: 'nao', f: [{ t: 'VJR', k: 'res' }] }] }] }] }] },
      { t: 'Como analisar o modelo de negócios', d: 'Nível: como grupos de ativos são gerenciados. A realidade comercial deve estar alinhada com a prática contábil (a contabilidade segue a economia).', f: [
        { t: 'O que considerar', f: [
          { t: 'a) Objetivos — receber fluxos e/ou vender faz parte do modelo?' },
          { t: 'b) Vendas — nível atual e esperado: frequência, momento e valor' },
          { t: 'c) Performance — como o desempenho da carteira é avaliado' },
          { t: 'd) Risco — como os riscos são gerados e gerenciados' },
          { t: 'e) Remuneração — como os gestores são remunerados' }] },
        { t: 'Matriz de 4 colunas', f: [
          { t: '1) Subdivisão — separar os ativos financeiros em carteiras (clusters) conforme a forma de gerenciar cada uma' },
          { t: '2) Identificação — achar os objetivos comerciais de cada carteira' },
          { t: '3) Classificação — (a) mantido para receber fluxos contratuais; (b) mantido para receber fluxos contratuais e para vender; (c) mantido para negociação' },
          { t: '4) Back-testing — para o que ficou em (a), olhar as vendas passadas para ver se são coerentes com “manter para receber”' }] }] },
      { t: 'Exceções e opções', f: [
        { t: 'Opção de valor justo (item 4.1.5)', d: 'No reconhecimento inicial, a entidade pode designar IRREVOGAVELMENTE um ativo financeiro ao VJR se isso eliminar ou reduzir significativamente um descasamento contábil (por exemplo, com passivos mensurados a valor justo ligados a esse ativo).' },
        { t: 'Ações não mantidas para negociação', d: 'Podem ser designadas, de forma irrevogável, ao VJORA (item 5.7.5), sem reclassificar o ganho/perda para o resultado depois.' }] },
      { t: 'Perdas esperadas (PCE) — onde entram', d: 'A PCE reduz o saldo de ativos a custo amortizado e a VJORA (de dívida). Abordagem simplificada para contas a receber sem componente de financiamento significativo: perda de toda a vida (matriz de provisão).', k: 'nota' }
    ] }
  };
})();
