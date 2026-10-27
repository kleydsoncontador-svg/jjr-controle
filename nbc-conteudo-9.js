/* Conteúdo das normas (explicação simples + exemplos) — lote 9: ITG 2003, 2004, CTG 2000, 2001, 2002, NBC T 15 e NBC TI 01.
   Elaborado por Claude em 27/10/2026 a partir das normas do CFC/CPC (texto de apoio, não substitui a norma). Quando o item exato da norma original não é seguro, a referência é "ver norma". */
window.NBC_CONTEUDO = window.NBC_CONTEUDO || {};
(function () {
  var AUTOR = 'Claude (estudo das normas do CFC/CPC)', DATA = '27/10/2026';
  var AVISO = 'Conteúdo montado a partir do objetivo e da estrutura geral da norma; os exemplos são ilustrativos e simplificados. Confirme os itens e as regras de detalhe na norma original antes de usar em trabalho técnico.';
  function C(cod, rev, o) { window.NBC_CONTEUDO[cod] = Object.assign({ revisao_base: rev, gerado_em: DATA, autor: AUTOR, aviso: AVISO }, o); }

  C('ITG 2003', 'R2', {
    resumo: 'Clubes de futebol e outras entidades esportivas têm uma contabilidade com particularidades: atletas como ativo, receitas de transmissão e patrocínio, formação de jogadores e obrigações trabalhistas. Esta interpretação define critérios para essas entidades reconhecerem, medirem e apresentarem suas transações.',
    objetivo: 'Estabelecer critérios e procedimentos específicos de avaliação, de reconhecimento das transações e variações patrimoniais e de estruturação das demonstrações contábeis das entidades desportivas.',
    pontos: [
      { titulo: 'Quem se aplica', texto: 'Entidades desportivas profissionais e não profissionais: associações, clubes, sociedades anônimas do futebol e outras com atividade esportiva.', ref: 'ver norma' },
      { titulo: 'Direitos sobre atletas', texto: 'O valor pago por direitos econômicos e federativos de atletas é ativo intangível, amortizado ao longo do contrato.', ref: 'ver norma' },
      { titulo: 'Formação de atletas', texto: 'Gastos com a formação de atletas na base são reconhecidos como ativo apenas se atenderem aos requisitos da norma de intangíveis; senão, são despesa.', ref: 'ver norma' },
      { titulo: 'Receitas típicas', texto: 'Transmissão, patrocínio, bilheteria, sócio-torcedor, publicidade, venda ou empréstimo de atletas e licenciamento de marca, reconhecidas conforme o serviço é prestado.', ref: 'ver norma' },
      { titulo: 'Demonstrações', texto: 'Segue o modelo de demonstrações das entidades (resultado, balanço, mutações, fluxo de caixa e notas), com informações específicas do setor.', ref: 'ver norma' },
      { titulo: 'Passivos', texto: 'Provisões para contingências trabalhistas e cíveis, parcelamentos fiscais e obrigações com atletas.', ref: 'ver norma' },
      { titulo: 'Segregação de atividades', texto: 'Pode haver informações separadas por atividade (futebol profissional, formação, social).', ref: 'ver norma' },
      { titulo: 'Divulgação', texto: 'Notas com a política para atletas, contratos relevantes, direitos futuros e contingências.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'Direitos federativos', significado: 'Vínculo do atleta com a entidade na federação.' },
      { termo: 'Direitos econômicos', significado: 'Direito de receber valores em transferências do atleta.' },
      { termo: 'Sócio-torcedor', significado: 'Programa de mensalidade com benefícios ao torcedor.' },
      { termo: 'Categoria de base', significado: 'Equipe de formação de jovens atletas.' },
      { termo: 'Amortização', significado: 'Distribuição do custo do direito ao longo do contrato.' },
    ],
    exemplos: [
      { titulo: 'Contratação de atleta', situacao: 'O clube paga R$ 9.000.000 por um atleta com contrato de 3 anos.', tratamento: 'Ativo intangível amortizado em 3 anos.', lancamento: 'D - Intangível – Direitos sobre atletas 9.000.000,00 / C - Caixa 9.000.000,00', ref: 'ver norma' },
      { titulo: 'Amortização anual', situacao: 'Amortização de 1 ano do contrato acima.', tratamento: 'Despesa de R$ 3.000.000.', lancamento: 'D - Despesa de amortização de atletas 3.000.000,00 / C - Amortização acumulada 3.000.000,00', ref: 'ver norma' },
      { titulo: 'Venda com ganho', situacao: 'Atleta vendido por R$ 20.000.000 com valor contábil de R$ 3.000.000.', tratamento: 'Ganho de R$ 17.000.000.', lancamento: 'D - Contas a receber 20.000.000,00 / C - Intangível 3.000.000,00 / C - Receita na venda de atletas 17.000.000,00', ref: 'ver norma' },
      { titulo: 'Formação na base', situacao: 'O clube gasta R$ 2.000.000 por ano na categoria de base.', tratamento: 'Despesa, se não preencher os requisitos de ativo.', lancamento: 'D - Despesa com formação de atletas 2.000.000,00 / C - Caixa 2.000.000,00', ref: 'ver norma' },
      { titulo: 'Direitos de transmissão', situacao: 'Contrato de R$ 24.000.000 por temporada.', tratamento: 'Receita ao longo dos jogos da temporada.', lancamento: 'D - Contas a receber 2.000.000,00 / C - Receita de transmissão 2.000.000,00', ref: 'ver norma' },
      { titulo: 'Patrocínio', situacao: 'Patrocinador paga R$ 6.000.000 por ano pelo uso da marca na camisa.', tratamento: 'Receita linear ao longo do contrato.', lancamento: 'D - Contas a receber 500.000,00 / C - Receita de patrocínio 500.000,00', ref: 'ver norma' },
      { titulo: 'Bilheteria', situacao: 'Jogo com R$ 800.000 de ingressos vendidos.', tratamento: 'Receita no dia da partida.', lancamento: 'D - Caixa 800.000,00 / C - Receita de bilheteria 800.000,00', ref: 'ver norma' },
      { titulo: 'Atleta emprestado', situacao: 'Atleta emprestado por 1 ano mediante R$ 1.200.000.', tratamento: 'Receita ao longo do empréstimo, sem baixa do ativo.', lancamento: 'D - Caixa 100.000,00 / C - Receita de cessão temporária 100.000,00', ref: 'ver norma' },
      { titulo: 'Impairment', situacao: 'O atleta se lesiona de forma grave, e seu valor recuperável cai para R$ 1.000.000 (contábil: R$ 4.000.000).', tratamento: 'Reconhece a perda.', lancamento: 'D - Perda por impairment 3.000.000,00 / C - Perda por impairment – Intangível 3.000.000,00', ref: 'ver norma' },
      { titulo: 'Divulgação', situacao: 'O clube publica notas.', tratamento: 'Divulga a política para atletas, contratos relevantes e contingências.', lancamento: '—', ref: 'ver norma' },
    ],
    aviso: AVISO + ' Revisão R2 (DOU 19/12/2023): confirme os pontos alterados na norma original.',
  });

  C('ITG 2004', '', {
    resumo: 'Cooperativas não visam lucro para si: elas servem aos cooperados e dividem o resultado entre eles (as “sobras”). A contabilidade precisa separar os atos cooperativos (com os cooperados) dos não cooperativos (com terceiros), tratar o capital em quotas e destinar fundos obrigatórios.',
    objetivo: 'Estabelecer critérios e procedimentos específicos de avaliação, de reconhecimento das transações e variações patrimoniais e de estruturação das demonstrações contábeis das entidades cooperativas.',
    pontos: [
      { titulo: 'Atos cooperativos e não cooperativos', texto: 'Atos cooperativos são os praticados entre a cooperativa e seus cooperados, ou entre cooperativas. Os realizados com não cooperados são atos não cooperativos, e o resultado deles é tratado separadamente.', ref: 'ver norma' },
      { titulo: 'Sobras e perdas', texto: 'O resultado positivo dos atos cooperativos se chama sobra; o negativo, perda. Não é lucro, e sim valor a distribuir ou repor.', ref: 'ver norma' },
      { titulo: 'Capital em quotas', texto: 'O capital é formado por quotas dos cooperados; as quotas podem ser classificadas no patrimônio ou no passivo, conforme o direito de resgate (NBC TG 39).', ref: 'ver norma' },
      { titulo: 'Fundos obrigatórios', texto: 'Há fundos previstos em lei: fundo de reserva (para reparar perdas e atender o desenvolvimento) e fundo de assistência técnica, educacional e social (FATES).', ref: 'ver norma' },
      { titulo: 'Distribuição das sobras', texto: 'Depois dos fundos, as sobras podem ser distribuídas aos cooperados em proporção às operações realizadas por cada um, ou retidas.', ref: 'ver norma' },
      { titulo: 'Resultado dos atos não cooperativos', texto: 'O resultado com terceiros é levado ao FATES (destinação específica) e sofre tributação normal.', ref: 'ver norma' },
      { titulo: 'Demonstrações', texto: 'Balanço, demonstração das sobras ou perdas, mutações do patrimônio líquido, fluxo de caixa e notas explicativas, com informações sobre atos cooperativos.', ref: 'ver norma' },
      { titulo: 'Divulgação', texto: 'Divulgar a política de capital, os fundos, os critérios de distribuição de sobras e as operações com cooperados.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'Cooperativa', significado: 'Sociedade de pessoas que se unem para prestar serviços aos próprios membros.' },
      { termo: 'Ato cooperativo', significado: 'Ato entre a cooperativa e os cooperados para cumprir o objetivo social.' },
      { termo: 'Sobras', significado: 'Resultado positivo dos atos cooperativos.' },
      { termo: 'FATES', significado: 'Fundo de assistência técnica, educacional e social.' },
      { termo: 'Quota-parte', significado: 'Fração do capital pertencente a um cooperado.' },
    ],
    exemplos: [
      { titulo: 'Capital integralizado', situacao: 'Um cooperado integraliza R$ 5.000 em quotas.', tratamento: 'Registra o capital (ou passivo, se resgatável a qualquer tempo).', lancamento: 'D - Caixa 5.000,00 / C - Capital social 5.000,00', ref: 'ver norma' },
      { titulo: 'Operação com cooperado', situacao: 'A cooperativa agrícola recebe R$ 200.000 de produtos do cooperado e vende no mercado.', tratamento: 'Operação típica de ato cooperativo; o valor entregue ao cooperado é adiantamento de produção, não receita de venda própria.', lancamento: 'D - Estoques 200.000,00 / C - Cooperados – a pagar 200.000,00', ref: 'ver norma' },
      { titulo: 'Sobra do ano', situacao: 'Resultado dos atos cooperativos: R$ 300.000.', tratamento: 'Apura as sobras e destina aos fundos e aos cooperados.', lancamento: 'D - Resultado do exercício 300.000,00 / C - Sobras a destinar 300.000,00', ref: 'ver norma' },
      { titulo: 'Fundo de reserva', situacao: 'A lei e o estatuto destinam 10% das sobras ao fundo de reserva.', tratamento: 'R$ 30.000 vão ao fundo de reserva.', lancamento: 'D - Sobras a destinar 30.000,00 / C - Fundo de reserva 30.000,00', ref: 'ver norma' },
      { titulo: 'FATES', situacao: 'Destinação de 5% das sobras ao FATES: R$ 15.000.', tratamento: 'Registra no FATES.', lancamento: 'D - Sobras a destinar 15.000,00 / C - FATES 15.000,00', ref: 'ver norma' },
      { titulo: 'Distribuição aos cooperados', situacao: 'A assembleia distribui R$ 200.000 de sobras, em proporção às operações.', tratamento: 'Cria obrigação com os cooperados.', lancamento: 'D - Sobras a destinar 200.000,00 / C - Sobras a distribuir 200.000,00', ref: 'ver norma' },
      { titulo: 'Ato não cooperativo', situacao: 'A cooperativa vende produtos a terceiros e obtém R$ 40.000 de resultado.', tratamento: 'Esse resultado é destinado ao FATES e tributado normalmente.', lancamento: 'D - Resultado de atos não cooperativos 40.000,00 / C - FATES 40.000,00', ref: 'ver norma' },
      { titulo: 'Perda do exercício', situacao: 'A cooperativa tem perda de R$ 100.000 em atos cooperativos.', tratamento: 'Cobre com o fundo de reserva; se insuficiente, os cooperados concorrem.', lancamento: 'D - Fundo de reserva 100.000,00 / C - Resultado do exercício (perda) 100.000,00', ref: 'ver norma' },
      { titulo: 'Demissão de cooperado', situacao: 'Um cooperado se retira e tem direito a resgatar R$ 5.000 de quotas.', tratamento: 'Reconhece o passivo na data do direito de resgate.', lancamento: 'D - Capital social 5.000,00 / C - Quotas a restituir 5.000,00', ref: 'ver norma' },
      { titulo: 'Divulgação', situacao: 'A cooperativa publica as demonstrações.', tratamento: 'Detalha atos cooperativos e não cooperativos, fundos e critérios de distribuição.', lancamento: '—', ref: 'ver norma' },
    ],
  });

  C('CTG 2000', '', {
    resumo: 'Este comunicado tratou de como contabilizar os ajustes necessários na transição para as novas práticas contábeis adotadas no Brasil depois da Lei 11.638/2007 e da MP 449/2008. Ele é histórico: orienta onde lançar os ajustes de adoção inicial e como lidar com seus efeitos.',
    objetivo: 'Orientar o tratamento dos ajustes decorrentes da adoção das novas práticas contábeis introduzidas pela Lei 11.638/07 e pela MP 449/08.',
    pontos: [
      { titulo: 'Contexto', texto: 'A Lei 11.638/2007 aproximou a contabilidade brasileira das normas internacionais, e a MP 449/2008 (convertida na Lei 11.941/2009) regulou a transição.', ref: 'ver norma' },
      { titulo: 'Ajustes de adoção inicial', texto: 'Os efeitos das novas práticas sobre os saldos iniciais são tratados como ajustes de exercícios anteriores, no patrimônio líquido.', ref: 'ver norma' },
      { titulo: 'Contrapartida no patrimônio', texto: 'Os ajustes são lançados em lucros ou prejuízos acumulados (ou outra conta de patrimônio), e não no resultado do período.', ref: 'ver norma' },
      { titulo: 'Tributos diferidos', texto: 'Os ajustes de adoção geram tributos diferidos quando há diferenças temporárias.', ref: 'ver norma' },
      { titulo: 'Efeito tributário', texto: 'A legislação criou o Regime Tributário de Transição (RTT) para neutralizar os efeitos tributários dos ajustes.', ref: 'ver norma' },
      { titulo: 'Divulgação', texto: 'A empresa explica os ajustes em notas, mostrando o efeito no patrimônio.', ref: 'ver norma' },
      { titulo: 'Relação com outras normas', texto: 'Trabalha em conjunto com as normas de adoção inicial (NBC TG 37 e NBC TG 43).', ref: 'ver norma' },
      { titulo: 'Valor atual', texto: 'Serve hoje como referência histórica para quem precisa entender saldos de transição.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'Lei 11.638/2007', significado: 'Lei que alterou a lei das sociedades por ações para convergir às normas internacionais.' },
      { termo: 'MP 449/2008', significado: 'Medida provisória que tratou da transição e do regime tributário de transição.' },
      { termo: 'RTT', significado: 'Regime Tributário de Transição que neutralizava efeitos tributários da adoção.' },
      { termo: 'Ajuste de adoção inicial', significado: 'Correção dos saldos iniciais pelas novas regras.' },
      { termo: 'Lucros acumulados', significado: 'Conta do patrimônio que acumula resultados não distribuídos.' },
    ],
    exemplos: [
      { titulo: 'Baixa de diferido', situacao: 'A empresa baixa R$ 200.000 de ativo diferido sem característica de ativo.', tratamento: 'Lança em lucros acumulados.', lancamento: 'D - Lucros acumulados 200.000,00 / C - Ativo diferido 200.000,00', ref: 'ver norma' },
      { titulo: 'Provisão de férias não lançada antes', situacao: 'A empresa passa a provisionar R$ 90.000 de férias.', tratamento: 'Ajuste de adoção inicial.', lancamento: 'D - Lucros acumulados 90.000,00 / C - Provisão de férias 90.000,00', ref: 'ver norma' },
      { titulo: 'Imposto diferido sobre o ajuste', situacao: 'O ajuste de R$ 90.000 gera diferença temporária; alíquota de 34%.', tratamento: 'Reconhece ativo diferido de R$ 30.600.', lancamento: 'D - Ativo fiscal diferido 30.600,00 / C - Lucros acumulados 30.600,00', ref: 'ver norma' },
      { titulo: 'Ajuste a valor presente', situacao: 'Contas a receber de longo prazo: efeito de AVP de R$ 40.000.', tratamento: 'Ajuste no patrimônio.', lancamento: 'D - Lucros acumulados 40.000,00 / C - AVP – Clientes 40.000,00', ref: 'ver norma' },
      { titulo: 'Reavaliação anterior', situacao: 'A empresa mantinha reserva de reavaliação de R$ 500.000.', tratamento: 'Mantém ou estorna conforme as regras de transição.', lancamento: 'D - Reserva de reavaliação 500.000,00 / C - Lucros acumulados 500.000,00', ref: 'ver norma' },
      { titulo: 'Leasing financeiro', situacao: 'A empresa passa a reconhecer imobilizado e dívida de leasing.', tratamento: 'O efeito líquido vai a lucros acumulados.', lancamento: 'D - Imobilizado 800.000,00 / C - Financiamentos 760.000,00 / C - Lucros acumulados 40.000,00', ref: 'ver norma' },
      { titulo: 'Divulgação', situacao: 'A empresa publica as primeiras demonstrações na nova prática.', tratamento: 'Explica os ajustes e mostra o efeito no patrimônio líquido.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'RTT', situacao: 'A empresa apura o lucro real com neutralização dos efeitos.', tratamento: 'Mantém controle extra-contábil (e-LALUR) dos ajustes.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Conciliação', situacao: 'PL pela norma antiga R$ 4.000.000; ajustes líquidos de +R$ 300.000.', tratamento: 'Concilia para R$ 4.300.000.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Referência histórica', situacao: 'O contador analisa um saldo antigo de ajuste.', tratamento: 'Consulta esta orientação para entender o motivo do lançamento.', lancamento: '—', ref: 'ver norma' },
    ],
    aviso: AVISO + ' Norma de transição histórica (2009); consulte a norma original antes de citar.',
  });

  C('CTG 2001', 'R3', {
    resumo: 'Hoje a escrituração contábil é digital e entregue ao SPED. Este comunicado explica as formalidades dessa escrituração: livros em arquivo, assinados com certificado digital, registrados no órgão competente, e as regras de autenticação.',
    objetivo: 'Definir as formalidades da escrituração contábil em forma digital para fins de atendimento ao Sistema Público de Escrituração Digital (SPED).',
    pontos: [
      { titulo: 'Escrituração Contábil Digital (ECD)', texto: 'A escrituração contábil (livros Diário, Razão e auxiliares) é gerada em arquivo digital no leiaute exigido pelo SPED.', ref: 'ver norma' },
      { titulo: 'Assinatura digital', texto: 'O arquivo é assinado pelo contador e pelo titular ou representante legal com certificado digital (padrão ICP-Brasil).', ref: 'ver norma' },
      { titulo: 'Termos de abertura e encerramento', texto: 'O livro digital tem termos de abertura e de encerramento, gerados pelo sistema com as informações de identificação.', ref: 'ver norma' },
      { titulo: 'Livros', texto: 'Livro Diário (geral ou auxiliar), Razão e Balancetes diários e balanços, conforme a legislação.', ref: 'ver norma' },
      { titulo: 'Validação e autenticação', texto: 'O arquivo é validado pelo programa do SPED e transmitido; a autenticação se dá com o recibo de entrega e o registro na junta comercial ou órgão competente.', ref: 'ver norma' },
      { titulo: 'Retificação', texto: 'Erros são corrigidos por retificação da escrituração, conforme os prazos da legislação.', ref: 'ver norma' },
      { titulo: 'Guarda', texto: 'A empresa e o contador mantêm o arquivo e os documentos de suporte pelo prazo legal.', ref: 'ver norma' },
      { titulo: 'Responsabilidade', texto: 'O profissional da contabilidade responde pela integridade e pela fidelidade dos lançamentos.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'SPED', significado: 'Sistema Público de Escrituração Digital.' },
      { termo: 'ECD', significado: 'Escrituração Contábil Digital.' },
      { termo: 'Certificado digital', significado: 'Documento eletrônico que identifica quem assina.' },
      { termo: 'Recibo de entrega', significado: 'Comprovante de que o arquivo foi recebido pelo SPED.' },
      { termo: 'Leiaute', significado: 'Estrutura e campos do arquivo digital.' },
    ],
    exemplos: [
      { titulo: 'Geração do arquivo da ECD', situacao: 'Ao fim do ano, o sistema contábil gera o arquivo digital com Diário e Razão.', tratamento: 'O arquivo segue o leiaute do SPED.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Assinatura', situacao: 'O contador e o sócio-administrador assinam o arquivo com seus certificados.', tratamento: 'Sem assinatura digital válida, o arquivo não é aceito.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Validação', situacao: 'O programa do SPED aponta divergência entre saldos do Diário e do Razão.', tratamento: 'Corrige antes de transmitir.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Recibo de entrega', situacao: 'O arquivo é transmitido e a empresa recebe o recibo.', tratamento: 'O recibo é o comprovante e deve ser guardado.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Retificação', situacao: 'A empresa percebe erro de classificação depois da entrega.', tratamento: 'Gera ECD retificadora dentro das regras.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Substituição de livro em papel', situacao: 'A empresa usava livros em papel.', tratamento: 'Com a ECD, o livro digital substitui o livro em papel, conforme a legislação.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Livro auxiliar', situacao: 'A empresa mantém livro auxiliar de contas a receber.', tratamento: 'Pode ter livro auxiliar, com relação com o Diário geral.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Guarda dos documentos', situacao: 'A empresa guarda notas e contratos que suportam os lançamentos.', tratamento: 'Mantém pelo prazo legal.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Responsabilidade do contador', situacao: 'O contador assina a ECD.', tratamento: 'Responde pela fidelidade dos lançamentos.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Troca de contador', situacao: 'O contador muda no meio do ano.', tratamento: 'A ECD do ano é assinada pelo contador responsável no fim e a informação de transição é documentada.', lancamento: '—', ref: 'ver norma' },
    ],
    aviso: AVISO + ' Este comunicado é de formalidades; não gera lançamentos contábeis próprios. A numeração da R3 deve ser conferida na norma.',
  });

  C('CTG 2002', '', {
    resumo: 'Laudo de avaliação é um documento técnico que diz quanto vale um bem, uma empresa ou um patrimônio. Este comunicado define como o contador deve elaborar um laudo: o que ele deve conter, a metodologia, a data-base e a responsabilidade do profissional.',
    objetivo: 'Estabelecer critérios e procedimentos para a elaboração de laudo de avaliação emitido por contador.',
    pontos: [
      { titulo: 'O que é o laudo', texto: 'Documento em que o contador, como perito ou avaliador, expõe de forma fundamentada o valor de um patrimônio, de um bem ou de uma empresa.', ref: 'ver norma' },
      { titulo: 'Quando é usado', texto: 'Em fusões, incorporações, cisões, integralização de capital com bens, apuração de haveres, reorganizações e outras operações.', ref: 'ver norma' },
      { titulo: 'Conteúdo mínimo', texto: 'Identificação do solicitante e do avaliador, objetivo, data-base, descrição dos bens, metodologia, premissas, cálculos, conclusão e anexos.', ref: 'ver norma' },
      { titulo: 'Metodologia', texto: 'Escolhe a técnica adequada (custo, mercado, renda) e justifica a escolha.', ref: 'ver norma' },
      { titulo: 'Independência e competência', texto: 'O contador deve ser competente e independente, e declarar eventuais impedimentos.', ref: 'ver norma' },
      { titulo: 'Documentação de apoio', texto: 'Mantém papéis de trabalho que sustentam os valores do laudo.', ref: 'ver norma' },
      { titulo: 'Limitações', texto: 'Informa as limitações de escopo e as informações recebidas de terceiros, sem verificá-las.', ref: 'ver norma' },
      { titulo: 'Responsabilidade', texto: 'O laudo é assinado pelo contador com registro ativo no CRC, que responde pelo conteúdo.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'Laudo de avaliação', significado: 'Documento técnico que apresenta o valor de bens ou patrimônio com fundamentação.' },
      { termo: 'Data-base', significado: 'Data em relação à qual o valor é apurado.' },
      { termo: 'Premissas', significado: 'Suposições usadas na avaliação.' },
      { termo: 'Metodologia', significado: 'Técnica usada para chegar ao valor.' },
      { termo: 'Papéis de trabalho', significado: 'Documentos que registram e suportam o trabalho do avaliador.' },
    ],
    exemplos: [
      { titulo: 'Laudo para incorporação', situacao: 'A empresa A será incorporada pela B e o laudo mostra o patrimônio líquido contábil de A em 31/12.', tratamento: 'O laudo descreve os critérios, os ativos e passivos e a conclusão.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Integralização de capital com imóvel', situacao: 'O sócio integraliza capital com um imóvel avaliado em R$ 1.500.000 por laudo.', tratamento: 'O laudo sustenta o valor da integralização.', lancamento: 'D - Imobilizado – Imóvel 1.500.000,00 / C - Capital social 1.500.000,00', ref: 'ver norma' },
      { titulo: 'Apuração de haveres', situacao: 'Saída de sócio: laudo com o valor da participação.', tratamento: 'O laudo dá a base do valor a pagar.', lancamento: 'D - Capital social 400.000,00 / D - Reservas 100.000,00 / C - Haveres a pagar 500.000,00', ref: 'ver norma' },
      { titulo: 'Identificação do avaliador', situacao: 'O contador assina o laudo.', tratamento: 'Informa nome, CRC, objetivo e data.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Escolha da técnica', situacao: 'Um imóvel de rendimento com contratos de aluguel.', tratamento: 'Pode usar a renda (fluxo de caixa descontado) e comparar com mercado.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Premissas explicadas', situacao: 'Taxa de desconto de 12% e crescimento de 3%.', tratamento: 'O laudo justifica as premissas.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Limitação de escopo', situacao: 'O contador não visitou o imóvel e usou fotos e informações do proprietário.', tratamento: 'Informa a limitação no laudo.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Conflito de interesse', situacao: 'O contador é sócio da empresa avaliada.', tratamento: 'Deve declarar o impedimento; em muitos casos, não deve emitir o laudo.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Papéis de trabalho', situacao: 'O avaliador guarda planilhas, fotos e contratos.', tratamento: 'Mantém a documentação por prazo adequado.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Anexos', situacao: 'O laudo anexa balancete, matrícula do imóvel e memória de cálculo.', tratamento: 'Os anexos fazem parte do laudo.', lancamento: '—', ref: 'ver norma' },
    ],
    aviso: AVISO + ' Este comunicado é de procedimento profissional; não gera lançamentos próprios.',
  });

  C('NBC T 15', '', {
    resumo: 'É a norma do “balanço social”: informações sobre o que a empresa faz pela sociedade e pelo meio ambiente. Ela organiza quatro blocos: geração e distribuição de riqueza, recursos humanos, interação com o ambiente externo (comunidade) e interação com o meio ambiente.',
    objetivo: 'Estabelecer procedimentos para a evidenciação de informações de natureza social e ambiental, com o objetivo de demonstrar à sociedade a participação e a responsabilidade social da entidade.',
    pontos: [
      { titulo: 'Geração e distribuição de riqueza', texto: 'Mostra quanto de valor a empresa gerou e como distribuiu entre empregados, governo, financiadores e sócios (relacionada à demonstração do valor adicionado).', ref: 'item 15.2.1' },
      { titulo: 'Recursos humanos', texto: 'Informa remuneração, benefícios, composição do corpo funcional (idade, sexo, escolaridade), contingências trabalhistas e investimentos em capacitação.', ref: 'item 15.2.2' },
      { titulo: 'Interação com o ambiente externo', texto: 'Informa o relacionamento com a comunidade, investimentos em projetos sociais, educação, cultura, saúde e esportes.', ref: 'item 15.2.3' },
      { titulo: 'Interação com o meio ambiente', texto: 'Informa investimentos e gastos com meio ambiente, passivos e contingências ambientais, metas de redução de impacto.', ref: 'item 15.2.4' },
      { titulo: 'Quadros padronizados', texto: 'As informações são apresentadas em quadros com campos definidos, o que facilita a comparação entre períodos e empresas.', ref: 'ver norma' },
      { titulo: 'Caráter voluntário', texto: 'Em geral, a divulgação é voluntária, mas, quando feita, deve seguir a norma.', ref: 'ver norma' },
      { titulo: 'Verificação', texto: 'As informações devem ter suporte em registros e podem ser objeto de revisão por auditor independente.', ref: 'ver norma' },
      { titulo: 'Relação com outras iniciativas', texto: 'Dialoga com o relato integrado e com relatórios de sustentabilidade.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'Balanço social', significado: 'Relatório sobre o desempenho social e ambiental da empresa.' },
      { termo: 'Valor adicionado', significado: 'Riqueza criada pela empresa para a sociedade.' },
      { termo: 'Pessoal-chave', significado: 'Corpo diretivo da empresa.' },
      { termo: 'Passivo ambiental', significado: 'Obrigação decorrente de danos ao meio ambiente.' },
      { termo: 'Investimento social externo', significado: 'Gastos com projetos que beneficiam a comunidade.' },
    ],
    exemplos: [
      { titulo: 'Distribuição de riqueza', situacao: 'A empresa gerou R$ 10.000.000 de valor adicionado: R$ 4.000.000 aos empregados, R$ 3.000.000 ao governo, R$ 1.500.000 a financiadores e R$ 1.500.000 aos sócios.', tratamento: 'Mostra no quadro de geração e distribuição de riqueza.', lancamento: '—', ref: 'item 15.2.1' },
      { titulo: 'Composição do quadro funcional', situacao: '120 empregados: 48% mulheres, 12% com mais de 50 anos.', tratamento: 'Divulga a composição por faixa de idade, sexo e escolaridade.', lancamento: '—', ref: 'item 15.2.2' },
      { titulo: 'Investimento em capacitação', situacao: 'Gastos de R$ 150.000 com treinamento.', tratamento: 'Informa o valor e o número de empregados atendidos.', lancamento: 'D - Despesa com treinamento 150.000,00 / C - Caixa 150.000,00', ref: 'item 15.2.2' },
      { titulo: 'Projeto social', situacao: 'A empresa patrocina uma escola da comunidade com R$ 80.000.', tratamento: 'Informa no bloco de interação com o ambiente externo.', lancamento: 'D - Despesa com projetos sociais 80.000,00 / C - Caixa 80.000,00', ref: 'item 15.2.3' },
      { titulo: 'Investimento ambiental', situacao: 'A fábrica gasta R$ 300.000 em tratamento de efluentes.', tratamento: 'Divulga o valor e o objetivo no bloco ambiental.', lancamento: 'D - Despesa ambiental 300.000,00 / C - Caixa 300.000,00', ref: 'item 15.2.4' },
      { titulo: 'Passivo ambiental', situacao: 'Multa ambiental provável de R$ 200.000.', tratamento: 'Provisiona (NBC TG 25) e divulga no bloco ambiental.', lancamento: 'D - Despesa com multas ambientais 200.000,00 / C - Provisão ambiental 200.000,00', ref: 'item 15.2.4' },
      { titulo: 'Meta de redução', situacao: 'A empresa se compromete a reduzir em 15% o consumo de água em 2 anos.', tratamento: 'Divulga a meta e o desempenho no período.', lancamento: '—', ref: 'item 15.2.4' },
      { titulo: 'Contingências trabalhistas', situacao: 'Ações trabalhistas em andamento: 12 processos, R$ 600.000.', tratamento: 'Informa no bloco de recursos humanos.', lancamento: '—', ref: 'item 15.2.2' },
      { titulo: 'Verificação', situacao: 'A empresa convida um auditor para revisar o balanço social.', tratamento: 'Informa o relatório de asseguração, se houver.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Comparabilidade', situacao: 'A empresa usa os mesmos quadros por vários anos.', tratamento: 'Permite comparação entre períodos.', lancamento: '—', ref: 'ver norma' },
    ],
    aviso: AVISO + ' A NBC T 15 é de divulgação (balanço social); os lançamentos mostrados são só os gastos que originam a informação.',
  });

  C('NBC TI 01', '', {
    resumo: 'Auditoria interna é o trabalho de uma área dentro da própria empresa que examina se os controles, os processos e as informações estão corretos e seguros. Esta norma define o que é a auditoria interna, o que ela faz e como o auditor interno deve atuar.',
    objetivo: 'Estabelecer conceitos, procedimentos e responsabilidades da auditoria interna, exercida por profissional de contabilidade.',
    pontos: [
      { titulo: 'O que é', texto: 'Conjunto de procedimentos técnicos aplicados de forma independente dentro da entidade para avaliar a eficácia dos controles internos, a gestão de riscos e a governança.', ref: 'ver norma' },
      { titulo: 'Objetivos', texto: 'Apoiar a administração com análises, recomendações e informações sobre as atividades examinadas e proteger a entidade de fraudes e erros.', ref: 'ver norma' },
      { titulo: 'Independência e objetividade', texto: 'O auditor interno não deve ter conflito de interesses e responde ao nível mais alto da organização (conselho ou diretoria).', ref: 'ver norma' },
      { titulo: 'Planejamento', texto: 'Elabora plano de auditoria baseado em riscos, com escopo, prazos e recursos.', ref: 'ver norma' },
      { titulo: 'Execução', texto: 'Usa testes, inspeções, confirmações e análises, registrando em papéis de trabalho.', ref: 'ver norma' },
      { titulo: 'Relatório', texto: 'Emite relatório com achados, riscos, recomendações e prazos de resposta da administração.', ref: 'ver norma' },
      { titulo: 'Acompanhamento', texto: 'Verifica se as recomendações foram implementadas.', ref: 'ver norma' },
      { titulo: 'Atuação do contador', texto: 'O contador que exerce a auditoria interna observa ética, competência técnica e sigilo.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'Auditoria interna', significado: 'Função de avaliação independente dentro da organização.' },
      { termo: 'Controles internos', significado: 'Políticas e procedimentos para proteger ativos e garantir informações confiáveis.' },
      { termo: 'Papéis de trabalho', significado: 'Documentos que registram o trabalho e os resultados da auditoria.' },
      { termo: 'Achado de auditoria', significado: 'Fato identificado que merece comunicação.' },
      { termo: 'Plano baseado em riscos', significado: 'Plano que prioriza áreas de maior risco.' },
    ],
    exemplos: [
      { titulo: 'Plano anual', situacao: 'O auditor interno prioriza as áreas de compras, contas a pagar e estoques por risco.', tratamento: 'Elabora o plano anual com escopo e cronograma.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Teste de contas a pagar', situacao: 'O auditor seleciona 40 pagamentos e confere nota, aprovação e conta bancária.', tratamento: 'Aplica testes e registra os resultados.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Achado de segregação de funções', situacao: 'A mesma pessoa cadastra fornecedor e aprova pagamento.', tratamento: 'Registra o achado e recomenda segregar.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Contagem de estoque', situacao: 'O auditor acompanha a contagem física e encontra diferença de R$ 25.000.', tratamento: 'Reporta e acompanha os ajustes.', lancamento: 'D - Perda de estoque 25.000,00 / C - Estoques 25.000,00', ref: 'ver norma' },
      { titulo: 'Relatório de auditoria', situacao: 'O auditor entrega relatório à diretoria.', tratamento: 'Mostra achados, riscos e recomendações, com prazos.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Acompanhamento', situacao: 'Três meses depois, o auditor verifica a implantação das recomendações.', tratamento: 'Atualiza o status e reporta.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Independência', situacao: 'O auditor interno é pressionado a omitir um achado.', tratamento: 'Mantém objetividade e comunica ao nível superior.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Fraude suspeita', situacao: 'Há indícios de desvio de R$ 90.000.', tratamento: 'Comunica à administração e ao comitê, preserva evidências.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Conflito de interesse', situacao: 'O auditor foi responsável pelo setor a ser auditado há 6 meses.', tratamento: 'Declara o conflito e evita auditar a própria atividade.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Sigilo', situacao: 'O auditor tem acesso a dados estratégicos.', tratamento: 'Mantém sigilo conforme o código de ética.', lancamento: '—', ref: 'ver norma' },
    ],
    aviso: AVISO + ' Norma de procedimento profissional (Resolução CFC 986/03); confirme os itens na norma original e os normativos mais recentes sobre auditoria interna.',
  });
})();
