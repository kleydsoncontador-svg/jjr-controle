/* Base legal do módulo 🚫 Impedimentos (Lucros/Dividendos) — textos LITERAIS copiados do site do Planalto em 26/11/2026 (redação vigente; trechos
   revogados/tachados omitidos), cada dispositivo seguido de uma explicação em linguagem simples. Texto de lei é de domínio público (Lei 9.610/98, art. 8º, IV). */
window.LUC_IMP_BASE = [
  {
    id: 'resumo', titulo: 'Resumo — quando a multa existe (STF, ADI 5.161)',
    intro: 'Em 30/09/2026 o STF fixou a tese da ADI 5.161: o art. 32 da Lei 4.357/1964 e o art. 52 da Lei 8.212/1991 são constitucionais, mas devem ser lidos “conforme a Constituição”. Pela tese, a multa por distribuir lucros (ou bonificações) só pode ser cobrada quando existirem, AO MESMO TEMPO, as três situações abaixo. Faltando qualquer uma, não há multa. O STF também afastou a leitura da IN RFB 2.110/2022 que tratava a simples provisão contábil como “débito” suficiente para a multa.',
    itens: [
      { t: 'Requisito 1 — o crédito tributário está definitivamente constituído e INSCRITO em dívida ativa da União.', e: 'Não basta dever: o débito tem que ter sido mandado para a Procuradoria da Fazenda Nacional e inscrito em dívida ativa. Débito só declarado (DCTF), em cobrança na Receita ou só provisionado na contabilidade NÃO conta.' },
      { t: 'Requisito 2 — a exigibilidade NÃO está suspensa por nenhuma das causas do art. 151 do CTN.', e: 'Se o débito estiver parcelado, com liminar, em discussão administrativa, depositado em juízo etc., a cobrança está “suspensa” e não há multa.' },
      { t: 'Requisito 3 — o débito NÃO está garantido por nenhuma das formas do art. 9º da Lei 6.830/1980.', e: 'Se a empresa deu garantia na execução fiscal (depósito em dinheiro, fiança bancária, seguro-garantia ou bens penhorados), não há multa.' },
      { t: 'Multa (quando os 3 requisitos existem): 50% do valor distribuído para a empresa e 50% do valor recebido para os diretores/administradores, limitada a 50% do débito não garantido (Lei 4.357/1964, art. 32, §§ 1º e 2º).', e: 'Exemplo: a empresa deve R$ 100 mil em dívida ativa, sem parcelamento e sem garantia, e distribui R$ 300 mil. A multa seria 50% de 300 mil = R$ 150 mil, mas fica limitada a 50% do débito = R$ 50 mil.' }
    ]
  },
  {
    id: 'proibicao', titulo: 'A proibição e a multa',
    leis: [
      { nome: 'Lei nº 4.357, de 16 de julho de 1964 — art. 32', url: 'https://www.planalto.gov.br/ccivil_03/leis/l4357.htm', itens: [
        { t: 'Art 32. As pessoas jurídicas, enquanto estiverem em débito, não garantido, para com a União e suas autarquias de Previdência e Assistência Social, por falta de recolhimento de impôsto, taxa ou contribuição, no prazo legal, não poderão: (Vide ADI 5.161)', e: 'Enquanto a empresa dever imposto, taxa ou contribuição federal (inclusive INSS) sem ter dado garantia, ela não pode fazer as distribuições listadas abaixo. Depois da ADI 5.161, “débito” aqui é só o inscrito em dívida ativa, cobrável e sem garantia.' },
        { t: 'a) distribuir ... (VETADO) ... quaisquer bonificações a seus acionistas;', e: 'Não pode distribuir bonificações (vantagens em dinheiro ou ações) aos acionistas.' },
        { t: 'b) dar ou atribuir participação de lucros a seus sócios ou quotistas, bem como a seus diretores e demais membros de órgãos dirigentes, fiscais ou consultivos;', e: 'Não pode distribuir lucros aos sócios/quotistas, nem dar participação nos lucros a diretores e membros de conselhos. É este item que trava a distribuição de lucros no site.' },
        { t: 'c) (VETADO).', e: '(Vetado — não tem efeito.)' },
        { t: '§ 1o A inobservância do disposto neste artigo importa em multa que será imposta: (Redação dada pela Lei nº 11.051, de 2004)', e: 'Quem desrespeitar a proibição paga multa, nos dois casos abaixo.' },
        { t: 'I - às pessoas jurídicas que distribuírem ou pagarem bonificações ou remunerações, em montante igual a 50% (cinqüenta por cento) das quantias distribuídas ou pagas indevidamente; e (Redação dada pela Lei nº 11.051, de 2004)', e: 'A empresa paga multa de metade do que distribuiu indevidamente.' },
        { t: 'II - aos diretores e demais membros da administração superior que receberem as importâncias indevidas, em montante igual a 50% (cinqüenta por cento) dessas importâncias. (Redação dada pela Lei nº 11.051, de 2004)', e: 'Os diretores/administradores que receberam também pagam multa de metade do que receberam.' },
        { t: '§ 2o A multa referida nos incisos I e II do § 1o deste artigo fica limitada, respectivamente, a 50% (cinqüenta por cento) do valor total do débito não garantido da pessoa jurídica. (Incluído pela Lei nº 11.051, de 2004)', e: 'Teto: cada multa não pode passar de metade da dívida não garantida da empresa.' }
      ] },
      { nome: 'Lei nº 8.212, de 24 de julho de 1991 — art. 52', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm', itens: [
        { t: 'Art. 52. Às empresas, enquanto estiverem em débito não garantido com a União, aplica-se o disposto no art. 32 da Lei no 4.357, de 16 de julho de 1964. (Redação dada pela Lei nº 11.941, de 2009). (Vide ADI 5.161)', e: 'A mesma proibição e a mesma multa do art. 32 acima valem para dívidas previdenciárias (contribuições ao INSS). A lei da Previdência só “aponta” para a regra de 1964.' },
        { t: 'I – (revogado); (Redação dada pela Lei nº 11.941, de 2009).', e: '(Revogado — não tem efeito.)' },
        { t: 'II – (revogado). (Redação dada pela Lei nº 11.941, de 2009).', e: '(Revogado — não tem efeito.)' },
        { t: 'Parágrafo único. (Revogado). (Redação dada pela Lei nº 11.941, de 2009).', e: '(Revogado — não tem efeito.)' }
      ] }
    ]
  },
  {
    id: 'inscrito', titulo: 'Requisito 1 — Dívida ativa (débito inscrito)',
    intro: 'Para haver multa, o débito precisa estar definitivamente constituído e INSCRITO em dívida ativa da União. Estes são os artigos que dizem o que é dívida ativa e como ela nasce.',
    leis: [
      { nome: 'Código Tributário Nacional (Lei nº 5.172/1966) — arts. 201, 202 e 204', url: 'https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm', itens: [
        { t: 'Art. 201. Constitui dívida ativa tributária a proveniente de crédito dessa natureza, regularmente inscrita na repartição administrativa competente, depois de esgotado o prazo fixado, para pagamento, pela lei ou por decisão final proferida em processo regular.', e: 'O tributo vira “dívida ativa” quando venceu (ou perdeu-se a discussão no processo administrativo) e o órgão competente o INSCREVEU oficialmente. Sem inscrição, ainda não é dívida ativa.' },
        { t: '§ 1º A fluência de juros de mora não exclui, para os efeitos deste artigo, a liquidez do crédito. (Redação dada pela Lei Complementar nº 236, de 2026)', e: 'O fato de os juros continuarem correndo não impede que a dívida seja considerada certa no valor.' },
        { t: '§ 2º O controle de legalidade da inscrição em dívida ativa consiste na análise, pela Fazenda Pública, dos requisitos de certeza, liquidez e exigibilidade, essenciais à formação do título executivo, e constitui direito do contribuinte e dever da Fazenda Pública credora, que poderá realizá-lo a qualquer tempo, de ofício ou a requerimento do interessado. (Incluído pela Lei Complementar nº 236, de 2026)', e: 'Antes (e depois) de inscrever, a Fazenda tem que conferir se a dívida existe, se o valor está certo e se pode ser cobrada. O contribuinte pode pedir essa revisão a qualquer momento.' },
        { t: '§ 3º O órgão responsável pela constituição do crédito deve encaminhar todas as informações necessárias para a inscrição em dívida ativa e a cobrança, administrativa ou judicial, dos créditos de natureza tributária ou não tributária, definitivamente constituídos ou reconhecidos pelo sujeito passivo, no prazo máximo de 90 (noventa) dias úteis a partir de sua exigibilidade, podendo ser ampliado a até 120 (cento e vinte) dias úteis para contribuintes de maior índice de conformidade, e devendo ser reduzido para 60 (sessenta) dias úteis para aqueles com histórico de baixo recolhimento espontâneo, salvo disposição de lei em sentido contrário. (Incluído pela Lei Complementar nº 236, de 2026)', e: 'A Receita tem prazo para mandar o débito para inscrição: até 90 dias úteis depois que ele pode ser cobrado (120 para bons pagadores, 60 para quem costuma não pagar). Por isso um débito em aberto pode virar dívida ativa em poucos meses.' }
      ] },
      { nome: '', url: '', itens: [
        { t: 'Art. 202. O termo de inscrição da dívida ativa, autenticado pela autoridade competente, indicará obrigatoriamente:', e: 'O documento da inscrição precisa trazer as informações abaixo.' },
        { t: 'I – o nome do devedor e dos corresponsáveis, bem como, sempre que possível, o domicílio ou a residência daquele e destes; (Redação dada pela Lei Complementar nº 236, de 2026)', e: 'Quem deve (a empresa) e quem responde junto (ex.: sócios/administradores, quando for o caso), com endereço.' },
        { t: 'II - a quantia devida e a maneira de calcular os juros de mora acrescidos;', e: 'Quanto se deve e como os juros são calculados.' },
        { t: 'III - a origem e natureza do crédito, mencionada especificamente a disposição da lei em que seja fundado;', e: 'De onde vem a dívida (qual tributo) e qual lei a fundamenta.' },
        { t: 'IV - a data em que foi inscrita;', e: 'A data da inscrição — é ela que marca o início do “Requisito 1”.' },
        { t: 'V - sendo caso, o número do processo administrativo de que se originar o crédito.', e: 'Se houve processo na Receita, o número dele.' },
        { t: '§ 1º A certidão conterá, além dos requisitos deste artigo, a indicação do livro e da folha da inscrição. (Redação dada pela Lei Complementar nº 236, de 2026)', e: 'A certidão de dívida ativa (CDA) também traz onde a inscrição foi registrada.' },
        { t: '§ 2º (VETADO). (Incluído pela Lei Complementar nº 236, de 2026)', e: '(Vetado — não tem efeito.)' },
        { t: 'Art. 204. A dívida regularmente inscrita goza da presunção de certeza e liquidez e tem o efeito de prova pré-constituída.', e: 'Depois de inscrita, presume-se que a dívida existe e que o valor está certo — o Fisco não precisa provar de novo.' },
        { t: 'Parágrafo único. A presunção a que se refere este artigo é relativa e pode ser ilidida por prova inequívoca, a cargo do sujeito passivo ou do terceiro a que aproveite.', e: 'Mas a empresa pode derrubar essa presunção, se provar claramente que a dívida não existe ou está errada.' }
      ] },
      { nome: 'Lei nº 6.830, de 22 de setembro de 1980 (Lei de Execução Fiscal) — art. 2º', url: 'https://www.planalto.gov.br/ccivil_03/leis/l6830.htm', itens: [
        { t: 'Art. 2º - Constitui Dívida Ativa da Fazenda Pública aquela definida como tributária ou não tributária na Lei nº 4.320, de 17 de março de 1964, com as alterações posteriores, que estatui normas gerais de direito financeiro para elaboração e controle dos orçamentos e balanços da União, dos Estados, dos Municípios e do Distrito Federal.', e: 'Dívida ativa pode ser de tributo ou de outras cobranças do governo (multas, por exemplo). Para a multa do art. 32, o que importa é a dívida com a União.' },
        { t: '§ 1º - Qualquer valor, cuja cobrança seja atribuída por lei às entidades de que trata o artigo 1º, será considerado Dívida Ativa da Fazenda Pública.', e: 'Qualquer valor que a lei mande o governo cobrar pode virar dívida ativa.' },
        { t: '§ 2º - A Dívida Ativa da Fazenda Pública, compreendendo a tributária e a não tributária, abrange atualização monetária, juros e multa de mora e demais encargos previstos em lei ou contrato.', e: 'O valor da dívida ativa inclui correção, juros, multa de atraso e encargos (ex.: o encargo legal de 20% da PGFN).' },
        { t: '§ 3º - A inscrição, que se constitui no ato de controle administrativo da legalidade, será feita pelo órgão competente para apurar a liquidez e certeza do crédito e suspenderá a prescrição, para todos os efeitos de direito, por 180 dias, ou até a distribuição da execução fiscal, se esta ocorrer antes de findo aquele prazo.', e: 'A inscrição é o ato oficial que confere a dívida; ela “congela” o prazo de prescrição por 180 dias ou até a execução fiscal ser ajuizada.' },
        { t: '§ 4º - A Dívida Ativa da União será apurada e inscrita na Procuradoria da Fazenda Nacional.', e: 'Quem inscreve a dívida com a União é a PGFN. Para conferir o Requisito 1, consulte a situação da empresa na PGFN (Regularize) ou a certidão de débitos.' }
      ] }
    ]
  },
  {
    id: 'naoSuspensa', titulo: 'Requisito 2 — Exigibilidade NÃO suspensa',
    intro: 'Para haver multa, a cobrança da dívida NÃO pode estar suspensa. O art. 151 do CTN lista quando a cobrança fica suspensa — se a empresa estiver em QUALQUER um desses casos, não há multa.',
    leis: [
      { nome: 'Código Tributário Nacional (Lei nº 5.172/1966) — art. 151', url: 'https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm', itens: [
        { t: 'Art. 151. Suspendem a exigibilidade do crédito tributário:', e: 'Nos casos abaixo, o Fisco não pode cobrar a dívida enquanto a situação durar.' },
        { t: 'I - moratória;', e: 'Prorrogação do prazo de pagamento concedida por lei (ex.: adiamento de vencimentos em calamidade).' },
        { t: 'II - o depósito do seu montante integral;', e: 'A empresa depositou o valor total da dívida (em juízo ou administrativamente) enquanto discute.' },
        { t: 'III – as impugnações, os recursos e a manifestação de inconformidade, nos termos das leis reguladoras do processo tributário administrativo; (Redação dada pela Lei Complementar nº 236, de 2026)', e: 'A empresa está contestando a cobrança na própria Receita/CARF (defesa, recurso, manifestação de inconformidade em compensação).' },
        { t: 'IV - a concessão de medida liminar em mandado de segurança.', e: 'Um juiz deu liminar em mandado de segurança mandando suspender a cobrança.' },
        { t: 'V – a concessão de medida liminar ou de tutela provisória, em outras espécies de ação judicial; (Redação dada pela Lei Complementar nº 236, de 2026)', e: 'Um juiz deu liminar ou tutela provisória em outro tipo de ação suspendendo a cobrança.' },
        { t: 'VI – o parcelamento. (Incluído pela Lcp nº 104, de 2001)', e: 'A dívida está parcelada (e o parcelamento está em dia). É o caso mais comum: dívida parcelada NÃO gera multa.' },
        { t: 'VII – a instituição da arbitragem especial tributária e aduaneira, nos termos da legislação específica; (Incluído pela Lei Complementar nº 236, de 2026)', e: 'A discussão da dívida foi levada à arbitragem tributária (regra nova de 2026).' },
        { t: 'VIII – a proposta de transação aceita pela administração, nos termos da legislação específica; (Incluído pela Lei Complementar nº 236, de 2026)', e: 'A empresa fez transação (acordo com desconto) com a PGFN/Receita e ela foi aceita.' },
        { t: 'IX – o acordo decorrente de mediação, até a sua eventual dissolução, nos termos da legislação específica; (Incluído pela Lei Complementar nº 236, de 2026)', e: 'Há acordo de mediação em vigor.' },
        { t: 'X – a aceitação, pelo credor, nos termos da regulamentação estabelecida pelos órgãos de cobrança judicial dos créditos tributários, de apólice de seguro garantia ou de carta de fiança bancária oferecidas em execução fiscal, inclusive quando convencionadas por meio de negócio jurídico processual, enquanto estiverem em conformidade com as normas que regem sua aceitação e enquanto não caracterizada hipótese de sinistro. (Incluído pela Lei Complementar nº 236, de 2026)', e: 'Se a PGFN aceitou seguro-garantia ou fiança bancária na execução fiscal, a cobrança fica suspensa (enquanto a garantia estiver válida). Esse caso também conta como garantia (Requisito 3).' },
        { t: '§ 1º O disposto neste artigo não dispensa o cumprimento das obrigações assessórios dependentes da obrigação principal cujo crédito seja suspenso, ou dela conseqüentes. (Redação dada pela Lei Complementar nº 236, de 2026)', e: 'Mesmo com a cobrança suspensa, a empresa continua obrigada a entregar declarações e cumprir as demais obrigações.' },
        { t: '§ 2º É vedada a exigência de caução ou garantia de depósito para apresentação de impugnações, recursos ou pedidos, nos termos do inciso III do caput deste artigo. (Incluído pela Lei Complementar nº 236, de 2026)', e: 'A Receita não pode exigir depósito ou garantia para a empresa poder se defender no processo administrativo.' },
        { t: '§ 3º Estando em curso a execução fiscal do crédito tributário, a suspensão de sua exigibilidade, nos termos do inciso VII do caput deste artigo, estará condicionada: (Incluído pela Lei Complementar nº 236, de 2026)', e: 'Se já existe execução fiscal, a arbitragem (inciso VII) só suspende a cobrança se:' },
        { t: 'I – à prévia suspensão da exigibilidade do crédito tributário na execução fiscal por outra das hipóteses previstas no caput deste artigo; ou (Incluído pela Lei Complementar nº 236, de 2026)', e: 'a cobrança já estiver suspensa por outro motivo da lista acima; ou' },
        { t: 'II – ao oferecimento, pelo sujeito passivo, na arbitragem especial tributária e aduaneira, de garantia integral. (Incluído pela Lei Complementar nº 236, de 2026)', e: 'a empresa der garantia do valor total na arbitragem.' }
      ] },
      { nome: 'Código Tributário Nacional — art. 206 (certidão positiva com efeitos de negativa)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm', itens: [
        { t: 'Art. 206. Tem os mesmos efeitos previstos no artigo anterior a certidão de que conste a existência de créditos não vencidos, em curso de cobrança executiva em que tenha sido efetivada a penhora, ou cuja exigibilidade esteja suspensa.', e: 'Na prática: se a empresa consegue a “certidão positiva com efeitos de negativa” (CPEN), é porque a dívida está suspensa ou garantida — então, em regra, falta o Requisito 2 ou o 3 e NÃO há multa. Se só sai certidão positiva comum, vale conferir os 3 requisitos.' }
      ] }
    ]
  },
  {
    id: 'naoGarantida', titulo: 'Requisito 3 — Débito SEM garantia',
    intro: 'Para haver multa, o débito NÃO pode estar garantido. As formas de garantia são as do art. 9º da Lei de Execução Fiscal — se a empresa usou QUALQUER uma delas, não há multa.',
    leis: [
      { nome: 'Lei nº 6.830, de 22 de setembro de 1980 (Lei de Execução Fiscal) — art. 9º', url: 'https://www.planalto.gov.br/ccivil_03/leis/l6830.htm', itens: [
        { t: 'Art. 9º - Em garantia da execução, pelo valor da dívida, juros e multa de mora e encargos indicados na Certidão de Dívida Ativa, o executado poderá:', e: 'Quando a dívida é cobrada na Justiça (execução fiscal), a empresa pode garantir o valor total (dívida + juros + multa + encargos) de uma destas formas:' },
        { t: 'I - efetuar depósito em dinheiro, à ordem do Juízo em estabelecimento oficial de crédito, que assegure atualização monetária;', e: 'Depositar o dinheiro numa conta judicial (Caixa ou Banco do Brasil).' },
        { t: 'II - oferecer fiança bancária ou seguro garantia; (Redação dada pela Lei nº 13.043, de 2014)', e: 'Apresentar carta de fiança de um banco ou apólice de seguro-garantia (o mais usado pelas empresas).' },
        { t: 'III - nomear bens à penhora, observada a ordem do artigo 11; ou', e: 'Oferecer bens da empresa para penhora (seguindo a ordem de preferência da lei: dinheiro, títulos, pedras e metais preciosos, imóveis, etc.).' },
        { t: 'IV - indicar à penhora bens oferecidos por terceiros e aceitos pela Fazenda Pública.', e: 'Oferecer bens de outra pessoa (ex.: de um sócio), se a Fazenda aceitar.' },
        { t: '§ 1º - O executado só poderá indicar e o terceiro oferecer bem imóvel à penhora com o consentimento expresso do respectivo cônjuge.', e: 'Imóvel só pode ser oferecido com autorização por escrito do cônjuge.' },
        { t: '§ 2o Juntar-se-á aos autos a prova do depósito, da fiança bancária, do seguro garantia ou da penhora dos bens do executado ou de terceiros. (Redação dada pela Lei nº 13.043, de 2014)', e: 'A prova da garantia tem que ser juntada ao processo — guarde o comprovante: é ele que mostra que falta o Requisito 3.' },
        { t: '§ 3o A garantia da execução, por meio de depósito em dinheiro, fiança bancária ou seguro garantia, produz os mesmos efeitos da penhora. (Redação dada pela Lei nº 13.043, de 2014)', e: 'Depósito, fiança e seguro-garantia valem o mesmo que uma penhora.' },
        { t: '§ 4º - Somente o depósito em dinheiro, na forma do artigo 32, faz cessar a responsabilidade pela atualização monetária e juros de mora.', e: 'Só o depósito em dinheiro para os juros e a correção; com fiança/seguro/penhora a dívida continua crescendo.' },
        { t: '§ 5º - A fiança bancária prevista no inciso II obedecerá às condições pré-estabelecidas pelo Conselho Monetário Nacional.', e: 'A fiança bancária tem que seguir as regras do Conselho Monetário Nacional.' },
        { t: '§ 6º - O executado poderá pagar parcela da dívida, que julgar incontroversa, e garantir a execução do saldo devedor.', e: 'A empresa pode pagar a parte que reconhece e garantir só o restante.' },
        { t: '§ 7º As garantias apresentadas na forma do inciso II do caput deste artigo somente serão liquidadas, no todo ou parcialmente, após o trânsito em julgado de decisão de mérito em desfavor do contribuinte, vedada a sua liquidação antecipada. (Incluído pela Lei nº 14.689, de 2023)', e: 'A fiança e o seguro-garantia só podem ser executados depois que a empresa perder definitivamente na Justiça — nunca antes.' }
      ] }
    ]
  }
];
