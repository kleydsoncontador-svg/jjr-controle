/* Conteúdo das normas (explicação simples + exemplos) — lote 8: normas para PMEs (ITG 1000, NBC TG 1000, 1001, 1002, CTG 1000) e ITG 2000, 2001, 2002.
   Elaborado por Claude em 27/10/2026 a partir das normas do CFC/CPC (texto de apoio, não substitui a norma). Quando o item exato da norma original não é seguro, a referência é "ver norma". */
window.NBC_CONTEUDO = window.NBC_CONTEUDO || {};
(function () {
  var AUTOR = 'Claude (estudo das normas do CFC/CPC)', DATA = '27/10/2026';
  var AVISO = 'Conteúdo montado a partir do objetivo e da estrutura geral da norma; os exemplos são ilustrativos e simplificados. Confirme os itens e as regras de detalhe na norma original antes de usar em trabalho técnico.';
  function C(cod, rev, o) { window.NBC_CONTEUDO[cod] = Object.assign({ revisao_base: rev, gerado_em: DATA, autor: AUTOR, aviso: AVISO }, o); }

  C('ITG 1000', '', {
    resumo: 'Define como as microentidades e as empresas de pequeno porte podem manter uma contabilidade simplificada: quais livros, que demonstrações e que plano de contas usar. É um “modelo pronto” que reduz o trabalho sem perder o essencial.',
    objetivo: 'Estabelecer as normas aplicáveis e modelos de plano de contas e de demonstrações contábeis para microentidades e pequenas empresas.',
    pontos: [
      { titulo: 'Para quem é', texto: 'Para a microentidade e a pequena empresa, conforme os critérios de porte definidos nas normas do CFC e na legislação (receita bruta anual e natureza da atividade).', ref: 'ver norma' },
      { titulo: 'Escrituração simplificada', texto: 'Mantém escrituração contábil com os livros Diário e Razão (ou equivalentes), com lançamentos baseados em documentos que comprovem as operações.', ref: 'ver norma' },
      { titulo: 'Regime de competência', texto: 'Receitas e despesas são registradas no período a que pertencem, e não só quando há pagamento ou recebimento.', ref: 'ver norma' },
      { titulo: 'Plano de contas modelo', texto: 'A norma traz modelos de plano de contas e de demonstrações, que a entidade pode adaptar.', ref: 'ver norma' },
      { titulo: 'Demonstrações obrigatórias', texto: 'Balanço patrimonial, demonstração do resultado e notas explicativas resumidas; outras são opcionais ou dependem da legislação.', ref: 'ver norma' },
      { titulo: 'Critérios de reconhecimento simples', texto: 'Ativos e passivos são reconhecidos e medidos por critérios mais simples (custo, sem cálculos complexos de valor justo).', ref: 'ver norma' },
      { titulo: 'Depreciação', texto: 'Aplicam-se taxas de depreciação coerentes com a vida útil estimada, sem exigências detalhadas por componente.', ref: 'ver norma' },
      { titulo: 'Notas explicativas resumidas', texto: 'As notas informam a base de elaboração, as principais políticas e os fatos relevantes.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'Microentidade', significado: 'Entidade de porte muito pequeno, conforme critérios do CFC e da lei.' },
      { termo: 'Pequena empresa', significado: 'Empresa de pequeno porte, conforme critérios da lei.' },
      { termo: 'Plano de contas', significado: 'Lista organizada das contas usadas na escrituração.' },
      { termo: 'Regime de competência', significado: 'Registro de receitas e despesas no período em que ocorrem, e não quando pagas.' },
      { termo: 'Livro Diário', significado: 'Livro em que os lançamentos são registrados em ordem cronológica.' },
    ],
    exemplos: [
      { titulo: 'Venda a prazo', situacao: 'A empresa vende R$ 8.000 em março para receber em abril.', tratamento: 'Reconhece a receita em março (competência), com contas a receber.', lancamento: 'D - Clientes 8.000,00 / C - Receita de vendas 8.000,00', ref: 'ver norma' },
      { titulo: 'Despesa de energia em aberto', situacao: 'A conta de energia de março (R$ 900) vence em abril.', tratamento: 'Despesa de março, com contas a pagar.', lancamento: 'D - Despesa de energia 900,00 / C - Contas a pagar 900,00', ref: 'ver norma' },
      { titulo: 'Compra de equipamento', situacao: 'Compra de um computador de R$ 4.000, vida útil de 5 anos.', tratamento: 'Imobilizado, depreciado em 5 anos (R$ 800 por ano).', lancamento: 'D - Imobilizado – Equipamentos de informática 4.000,00 / C - Caixa 4.000,00', ref: 'ver norma' },
      { titulo: 'Depreciação mensal', situacao: 'Depreciação do computador por mês: R$ 66,67.', tratamento: 'Despesa mensal de depreciação.', lancamento: 'D - Despesa de depreciação 66,67 / C - Depreciação acumulada 66,67', ref: 'ver norma' },
      { titulo: 'Folha e encargos', situacao: 'Salários de R$ 6.000 e encargos de R$ 1.800 do mês.', tratamento: 'Despesa do mês.', lancamento: 'D - Despesa com pessoal 7.800,00 / C - Salários e encargos a pagar 7.800,00', ref: 'ver norma' },
      { titulo: 'Documento comprobatório', situacao: 'A empresa quer lançar uma despesa sem nota fiscal ou recibo.', tratamento: 'A escrituração deve se basear em documentos hábeis; sem comprovante, não deve lançar como despesa regular.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Notas explicativas', situacao: 'A empresa publica o balanço.', tratamento: 'Inclui nota resumida sobre base de elaboração, regime tributário e principais políticas.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Plano de contas', situacao: 'A empresa adota o plano de contas modelo da norma, com adaptações.', tratamento: 'Mantém contas de ativo, passivo, receitas, custos e despesas organizados.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Estoque simples', situacao: 'O estoque final é R$ 12.000 pelo custo.', tratamento: 'Mede pelo custo; se o valor de venda for menor, ajusta.', lancamento: 'D - Estoques 12.000,00 / C - CMV (ajuste) 12.000,00', ref: 'ver norma' },
      { titulo: 'Mudança de porte', situacao: 'A empresa cresce e deixa de ser microentidade.', tratamento: 'Passa a aplicar a norma correspondente à pequena empresa ou à PME.', lancamento: '—', ref: 'ver norma' },
    ],
  });

  C('NBC TG 1000', 'R1', {
    resumo: 'É a norma completa de contabilidade para pequenas e médias empresas (PMEs), a versão simplificada das normas internacionais. É bem mais curta que o conjunto completo, com menos opções e divulgações, e é organizada em seções (35). Serve para empresas sem obrigação pública de prestar contas.',
    objetivo: 'Dar às pequenas e médias empresas uma norma única e simplificada de reconhecimento, mensuração, apresentação e divulgação.',
    pontos: [
      { titulo: 'Quem pode usar', texto: 'Entidades que não têm obrigação pública de prestar contas (não são companhias abertas nem instituições financeiras) e que publicam demonstrações para usuários externos.', ref: 'Seção 1' },
      { titulo: 'Um documento só', texto: 'A norma reúne tudo em 35 seções: conceitos, apresentação, políticas, instrumentos financeiros, estoques, imobilizado, intangíveis, receita, tributos, entre outras.', ref: 'Seções 2 a 35' },
      { titulo: 'Demonstrações', texto: 'Balanço, demonstração do resultado (ou do resultado abrangente), mutações do patrimônio (ou lucros e prejuízos acumulados), fluxo de caixa e notas.', ref: 'Seções 3 a 8' },
      { titulo: 'Estoques e imobilizado', texto: 'Segue lógica parecida com a norma completa: estoque pelo menor entre custo e valor realizável líquido; imobilizado ao custo com depreciação, com opção de reavaliação.', ref: 'Seções 13 e 17' },
      { titulo: 'Intangíveis e ágio', texto: 'Intangíveis têm sempre vida útil definida (se não for possível determiná-la, presume-se 10 anos). O ágio também é amortizado, no máximo em 10 anos.', ref: 'Seções 18 e 19' },
      { titulo: 'Pesquisa e desenvolvimento', texto: 'Gastos com pesquisa são despesa; o desenvolvimento pode ser ativado se cumprir os requisitos.', ref: 'Seção 18' },
      { titulo: 'Instrumentos financeiros simples', texto: 'Instrumentos básicos (contas a receber, empréstimos) pelo custo amortizado; os mais complexos a valor justo.', ref: 'Seções 11 e 12' },
      { titulo: 'Tributos sobre o lucro', texto: 'Aplica-se o método do diferido, mas com orientação mais simples que a norma completa.', ref: 'Seção 29' },
    ],
    termos: [
      { termo: 'PME', significado: 'Pequena e média empresa, sem obrigação pública de prestar contas.' },
      { termo: 'Obrigação pública de prestar contas', significado: 'Situação das companhias abertas e instituições financeiras e seguradoras.' },
      { termo: 'Custo amortizado', significado: 'Valor inicial menos amortizações, com juros pela taxa efetiva.' },
      { termo: 'Ágio', significado: 'Valor pago acima do valor justo dos ativos líquidos em uma aquisição.' },
      { termo: 'Seção', significado: 'Cada um dos 35 capítulos da norma.' },
    ],
    exemplos: [
      { titulo: 'Quem pode adotar', situacao: 'Uma indústria de capital fechado, que tem bancos e fornecedores como usuários das contas.', tratamento: 'Pode adotar a NBC TG 1000 como PME.', lancamento: '—', ref: 'Seção 1' },
      { titulo: 'Estoque pelo custo', situacao: 'Estoque no custo de R$ 80.000 e valor realizável líquido de R$ 70.000.', tratamento: 'Reduz o estoque para R$ 70.000.', lancamento: 'D - Perda com estoques 10.000,00 / C - (-) Provisão para perdas em estoques 10.000,00', ref: 'Seção 13' },
      { titulo: 'Imobilizado e depreciação', situacao: 'Máquina de R$ 100.000, vida útil de 10 anos, sem valor residual.', tratamento: 'Depreciação de R$ 10.000 por ano.', lancamento: 'D - Despesa de depreciação 10.000,00 / C - Depreciação acumulada 10.000,00', ref: 'Seção 17' },
      { titulo: 'Software com vida incerta', situacao: 'A empresa compra uma licença sem prazo definido por R$ 50.000; não consegue estimar a vida útil.', tratamento: 'Presume 10 anos de vida útil e amortiza R$ 5.000 por ano.', lancamento: 'D - Despesa de amortização 5.000,00 / C - Amortização acumulada 5.000,00', ref: 'Seção 18' },
      { titulo: 'Ágio amortizado', situacao: 'Ágio de R$ 300.000 numa aquisição; vida útil não determinável.', tratamento: 'Amortiza em 10 anos: R$ 30.000 por ano.', lancamento: 'D - Despesa de amortização do ágio 30.000,00 / C - Amortização acumulada do ágio 30.000,00', ref: 'Seção 19' },
      { titulo: 'Pesquisa é despesa', situacao: 'A empresa gasta R$ 40.000 pesquisando um novo produto.', tratamento: 'Despesa do período.', lancamento: 'D - Despesa de pesquisa 40.000,00 / C - Caixa 40.000,00', ref: 'Seção 18' },
      { titulo: 'Empréstimo simples', situacao: 'Empréstimo de R$ 200.000 com juros de 1% ao mês.', tratamento: 'Instrumento financeiro básico: custo amortizado.', lancamento: 'D - Despesa financeira 2.000,00 / C - Juros a pagar 2.000,00', ref: 'Seção 11' },
      { titulo: 'Receita de venda de mercadoria', situacao: 'Venda de R$ 20.000, entregue ao cliente.', tratamento: 'Reconhece receita quando os riscos e benefícios são transferidos.', lancamento: 'D - Clientes 20.000,00 / C - Receita de vendas 20.000,00', ref: 'Seção 23' },
      { titulo: 'Provisão', situacao: 'A empresa tem processo trabalhista com perda provável de R$ 30.000.', tratamento: 'Reconhece provisão.', lancamento: 'D - Despesa com provisões 30.000,00 / C - Provisão para contingências 30.000,00', ref: 'Seção 21' },
      { titulo: 'Evento subsequente', situacao: 'Depois do balanço, um cliente que devia R$ 25.000 vai à falência por problemas existentes antes.', tratamento: 'Ajusta o balanço.', lancamento: 'D - Perdas com créditos 25.000,00 / C - (-) Perdas esperadas em crédito 25.000,00', ref: 'Seção 32' },
    ],
    aviso: AVISO + ' As referências são às seções da norma (organizada em 35 seções); a numeração de itens dentro das seções deve ser conferida no texto original.',
  });

  C('NBC TG 1001', '', {
    resumo: 'É a norma de contabilidade para pequenas empresas, uma versão ainda mais enxuta que a NBC TG 1000. Ela mantém os pontos essenciais, com critérios mais simples, para empresas pequenas que precisam de demonstrações confiáveis sem a complexidade total.',
    objetivo: 'Dispor sobre a contabilidade para pequenas empresas, de forma simplificada.',
    pontos: [
      { titulo: 'Para quem é', texto: 'Pequenas empresas, conforme os critérios de porte fixados pelo CFC e pela legislação, sem obrigação pública de prestar contas.', ref: 'ver norma' },
      { titulo: 'Mais simples que a NBC TG 1000', texto: 'Mantém a lógica das PMEs com menos opções, menos divulgações e critérios simplificados.', ref: 'ver norma' },
      { titulo: 'Demonstrações', texto: 'Balanço, demonstração do resultado e notas explicativas; fluxo de caixa e outras demonstrações conforme exigência.', ref: 'ver norma' },
      { titulo: 'Custo como base', texto: 'Em geral, ativos e passivos são medidos pelo custo e pelo custo amortizado, sem o uso de modelos complexos de valor justo.', ref: 'ver norma' },
      { titulo: 'Estoques e imobilizado', texto: 'Estoque pelo menor entre custo e valor realizável; imobilizado ao custo menos depreciação, com revisão de vida útil.', ref: 'ver norma' },
      { titulo: 'Receitas', texto: 'Reconhecidas quando a venda é feita ou o serviço prestado, com os valores a receber e com riscos já transferidos.', ref: 'ver norma' },
      { titulo: 'Tributos', texto: 'Tratamento simplificado dos tributos sobre o lucro.', ref: 'ver norma' },
      { titulo: 'Transição entre normas', texto: 'A empresa que cresce pode migrar para a NBC TG 1000 ou para as normas completas.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'Pequena empresa', significado: 'Empresa de porte pequeno, conforme as normas e a lei.' },
      { termo: 'Custo amortizado', significado: 'Valor inicial ajustado pelas amortizações e juros.' },
      { termo: 'Valor realizável líquido', significado: 'Preço de venda menos despesas para vender.' },
      { termo: 'Notas explicativas', significado: 'Textos que explicam os números das demonstrações.' },
      { termo: 'Migração', significado: 'Mudança para outra norma contábil.' },
    ],
    exemplos: [
      { titulo: 'Venda de serviço', situacao: 'Prestação de serviço de R$ 5.000 concluída no mês.', tratamento: 'Receita do mês.', lancamento: 'D - Clientes 5.000,00 / C - Receita de serviços 5.000,00', ref: 'ver norma' },
      { titulo: 'Estoque abaixo do custo', situacao: 'Produto custou R$ 10.000, mas só se espera vender por R$ 8.500 líquidos.', tratamento: 'Reduz para R$ 8.500.', lancamento: 'D - Perda com estoques 1.500,00 / C - (-) Provisão para perdas 1.500,00', ref: 'ver norma' },
      { titulo: 'Depreciação do imobilizado', situacao: 'Veículo de R$ 60.000, vida útil de 5 anos.', tratamento: 'Depreciação anual de R$ 12.000.', lancamento: 'D - Despesa de depreciação 12.000,00 / C - Depreciação acumulada 12.000,00', ref: 'ver norma' },
      { titulo: 'Financiamento de veículo', situacao: 'Financiamento de R$ 60.000 em 24 parcelas.', tratamento: 'Passivo ao custo amortizado, com juros apropriados no período.', lancamento: 'D - Imobilizado – Veículo 60.000,00 / C - Financiamentos 60.000,00', ref: 'ver norma' },
      { titulo: 'Despesa antecipada', situacao: 'Seguro anual pago de R$ 2.400 em janeiro.', tratamento: 'Apropria R$ 200 por mês.', lancamento: 'D - Despesa de seguros 200,00 / C - Seguros antecipados 200,00', ref: 'ver norma' },
      { titulo: 'Perda de crédito', situacao: 'Cliente de R$ 3.000 não paga e a perda é provável.', tratamento: 'Reconhece perda estimada.', lancamento: 'D - Perdas com créditos 3.000,00 / C - (-) Perdas esperadas em crédito 3.000,00', ref: 'ver norma' },
      { titulo: 'Provisão de férias', situacao: 'No mês, os empregados adquirem R$ 1.500 de férias, com encargos.', tratamento: 'Provisiona no mês.', lancamento: 'D - Despesa com férias 1.500,00 / C - Provisão de férias 1.500,00', ref: 'ver norma' },
      { titulo: 'Notas explicativas', situacao: 'A empresa publica o balanço anual.', tratamento: 'Inclui notas com base de elaboração, políticas e partes relacionadas relevantes.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Crescimento da empresa', situacao: 'A receita da empresa cresce e ela passa de porte.', tratamento: 'Avalia se deve migrar para a NBC TG 1000 e aplica as regras de transição.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Capital integralizado', situacao: 'Sócios integralizam R$ 50.000.', tratamento: 'Aumenta o capital social.', lancamento: 'D - Caixa 50.000,00 / C - Capital social 50.000,00', ref: 'ver norma' },
    ],
  });

  C('NBC TG 1002', '', {
    resumo: 'É a norma de contabilidade para microentidades: empresas muito pequenas que precisam de um modelo bem simples, com poucas demonstrações e critérios de medição diretos, para ter uma contabilidade confiável sem custo elevado.',
    objetivo: 'Dispor sobre a contabilidade das microentidades, de forma simplificada.',
    pontos: [
      { titulo: 'Para quem é', texto: 'Para microentidades, definidas pelos critérios de porte do CFC e da legislação.', ref: 'ver norma' },
      { titulo: 'Modelo bem enxuto', texto: 'Reúne os critérios básicos de reconhecimento e medição, evitando temas complexos que não existem em microentidades.', ref: 'ver norma' },
      { titulo: 'Demonstrações mínimas', texto: 'Balanço patrimonial e demonstração do resultado, com notas explicativas mínimas.', ref: 'ver norma' },
      { titulo: 'Custo como base', texto: 'Ativos e passivos medidos ao custo (e custo amortizado quando for o caso).', ref: 'ver norma' },
      { titulo: 'Competência', texto: 'Mantém o regime de competência para receitas e despesas.', ref: 'ver norma' },
      { titulo: 'Escrituração', texto: 'A escrituração contábil segue as formalidades da ITG 2000 (livros e registros).', ref: 'ver norma' },
      { titulo: 'Plano de contas simples', texto: 'Pode usar o modelo de plano de contas previsto na ITG 1000.', ref: 'ver norma' },
      { titulo: 'Saída do regime', texto: 'Se a entidade deixa de ser microentidade, passa a aplicar a norma da pequena empresa ou da PME.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'Microentidade', significado: 'Entidade de porte muito pequeno.' },
      { termo: 'Escrituração', significado: 'Registro contábil formal das operações.' },
      { termo: 'Regime de competência', significado: 'Reconhecer receitas e despesas no período em que ocorrem.' },
      { termo: 'Plano de contas', significado: 'Lista de contas contábeis.' },
      { termo: 'Notas mínimas', significado: 'Informações essenciais que acompanham o balanço.' },
    ],
    exemplos: [
      { titulo: 'Venda no balcão', situacao: 'Uma lojinha vende R$ 1.200 em um dia à vista.', tratamento: 'Receita do dia.', lancamento: 'D - Caixa 1.200,00 / C - Receita de vendas 1.200,00', ref: 'ver norma' },
      { titulo: 'Compra de mercadoria', situacao: 'Compra de mercadoria de R$ 3.000 a prazo.', tratamento: 'Estoque pelo custo.', lancamento: 'D - Estoques 3.000,00 / C - Fornecedores 3.000,00', ref: 'ver norma' },
      { titulo: 'Aluguel do mês', situacao: 'Aluguel do ponto: R$ 1.800, pago no mês seguinte.', tratamento: 'Despesa do mês.', lancamento: 'D - Despesa de aluguel 1.800,00 / C - Aluguéis a pagar 1.800,00', ref: 'ver norma' },
      { titulo: 'Equipamento', situacao: 'Compra de uma geladeira de R$ 2.500, vida útil de 5 anos.', tratamento: 'Imobilizado depreciado em 5 anos.', lancamento: 'D - Imobilizado 2.500,00 / C - Caixa 2.500,00', ref: 'ver norma' },
      { titulo: 'Retirada do sócio', situacao: 'O sócio retira R$ 2.000 de pró-labore.', tratamento: 'Despesa com pró-labore.', lancamento: 'D - Despesa com pró-labore 2.000,00 / C - Caixa 2.000,00', ref: 'ver norma' },
      { titulo: 'Imposto do Simples', situacao: 'Imposto mensal do Simples Nacional: R$ 150.', tratamento: 'Despesa/dedução do mês, com passivo.', lancamento: 'D - Impostos sobre vendas 150,00 / C - Impostos a recolher 150,00', ref: 'ver norma' },
      { titulo: 'Notas mínimas', situacao: 'Balanço de fim de ano.', tratamento: 'Notas com base de elaboração e regime tributário.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Escrituração', situacao: 'A empresa mantém os lançamentos num sistema de contabilidade.', tratamento: 'Segue as formalidades de escrituração (ITG 2000).', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Perda de cliente', situacao: 'Um cliente de R$ 500 não pagou e não há esperança de receber.', tratamento: 'Baixa como perda.', lancamento: 'D - Perdas com créditos 500,00 / C - Clientes 500,00', ref: 'ver norma' },
      { titulo: 'Crescimento', situacao: 'A empresa cresce além do limite de microentidade.', tratamento: 'Passa a aplicar a norma do porte seguinte.', lancamento: '—', ref: 'ver norma' },
    ],
  });

  C('CTG 1000', '', {
    resumo: 'Este comunicado esclarece que, quando uma entidade adota a NBC TG 1000 (PMEs), ela precisa adotá-la por inteiro (“adoção plena”): não pode escolher só os pedaços convenientes e deve declarar essa conformidade de forma explícita.',
    objetivo: 'Esclarecer a adoção plena da NBC TG 1000 (Contabilidade para Pequenas e Médias Empresas).',
    pontos: [
      { titulo: 'Adoção plena', texto: 'Ao adotar a NBC TG 1000, a empresa aplica todos os requisitos aplicáveis a ela, e não só alguns.', ref: 'ver norma' },
      { titulo: 'Declaração explícita', texto: 'A conformidade deve ser declarada de forma explícita e sem reservas nas notas explicativas.', ref: 'ver norma' },
      { titulo: 'Quem pode adotar', texto: 'Apenas entidades que atendem aos critérios da norma (sem obrigação pública de prestar contas).', ref: 'ver norma' },
      { titulo: 'Lacunas', texto: 'Se a NBC TG 1000 não tratar de um tema, a empresa deve usar as orientações da própria norma para casos omissos, e não misturar normas por conveniência.', ref: 'ver norma' },
      { titulo: 'Impacto para o contador', texto: 'O profissional deve verificar se a entidade cumpre os requisitos de elegibilidade e documentar a decisão.', ref: 'ver norma' },
      { titulo: 'Mudança de norma', texto: 'A migração para as normas completas é permitida, com aplicação conforme as normas de adoção inicial.', ref: 'ver norma' },
      { titulo: 'Relatório de auditoria', texto: 'Auditores e revisores usam a declaração para avaliar a conformidade.', ref: 'ver norma' },
      { titulo: 'Divulgação', texto: 'Informar na nota inicial qual norma foi adotada e o porte da entidade.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'Adoção plena', significado: 'Aplicar integralmente a norma.' },
      { termo: 'Declaração de conformidade', significado: 'Frase nas notas que afirma que as demonstrações seguem a norma.' },
      { termo: 'Elegibilidade', significado: 'Condição para poder usar a norma.' },
      { termo: 'Casos omissos', significado: 'Situações que a norma não trata expressamente.' },
      { termo: 'Migração de norma', significado: 'Troca de um conjunto de normas por outro.' },
    ],
    exemplos: [
      { titulo: 'Declaração na primeira nota', situacao: 'Uma indústria média de capital fechado adota a NBC TG 1000.', tratamento: 'Declara que as demonstrações foram elaboradas conforme a NBC TG 1000.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Adoção parcial é proibida', situacao: 'A empresa quer aplicar a NBC TG 1000 só nas partes simples e as normas completas nas demais.', tratamento: 'Não é permitido: a adoção é plena.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Companhia aberta', situacao: 'Uma companhia aberta quer usar a NBC TG 1000 para reduzir custos.', tratamento: 'Não pode: tem obrigação pública de prestar contas.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Caso omisso', situacao: 'A empresa tem uma operação que a NBC TG 1000 não menciona.', tratamento: 'Segue as orientações da própria norma para casos omissos, com julgamento documentado.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Documentação da elegibilidade', situacao: 'O contador avalia o porte e a obrigação de prestar contas.', tratamento: 'Registra a decisão em papéis de trabalho.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Migração para normas completas', situacao: 'A empresa vai abrir capital e passa a aplicar as normas completas.', tratamento: 'Aplica a norma de adoção inicial (NBC TG 37).', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Notas com a base de preparação', situacao: 'Notas explicativas de uma PME.', tratamento: 'Informa a norma adotada, a moeda e o regime tributário.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Auditoria', situacao: 'O auditor emite relatório sobre as demonstrações da PME.', tratamento: 'Verifica a declaração de conformidade com a NBC TG 1000.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Mudança de porte', situacao: 'A empresa passa a ser classificada como pequena empresa pelas novas regras.', tratamento: 'Avalia se pode ou deve migrar para a NBC TG 1001.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Divulgação de partes relacionadas', situacao: 'A PME tem transações com os sócios.', tratamento: 'Divulga conforme a seção sobre partes relacionadas, como parte da adoção plena.', lancamento: '—', ref: 'ver norma' },
    ],
  });

  C('ITG 2000', 'R1', {
    resumo: 'Esta interpretação diz como a escrituração contábil deve ser feita: os livros (Diário e Razão), a ordem cronológica dos lançamentos, o histórico claro, a assinatura do contador e do titular, a forma de corrigir erros (sem apagar) e a guarda dos documentos.',
    objetivo: 'Estabelecer critérios e procedimentos para a escrituração contábil das entidades, em qualquer forma (manual, mecanizada ou digital).',
    pontos: [
      { titulo: 'Escrituração obrigatória', texto: 'A entidade deve manter escrituração contábil uniforme, com base em documentos e registros fiéis, em todas as suas operações.', ref: 'ver norma' },
      { titulo: 'Idioma e moeda', texto: 'Os lançamentos são feitos em português e em moeda corrente nacional.', ref: 'ver norma' },
      { titulo: 'Forma contábil e ordem cronológica', texto: 'Cada lançamento indica data, contas debitadas e creditadas, histórico e valor, em ordem cronológica de dia, mês e ano.', ref: 'ver norma' },
      { titulo: 'Histórico claro', texto: 'O histórico deve ser objetivo e identificar a operação, evitando abreviações ambíguas.', ref: 'ver norma' },
      { titulo: 'Retificação de lançamentos', texto: 'Erros são corrigidos por estorno, transferência ou complementação, sem rasuras ou apagamentos.', ref: 'ver norma' },
      { titulo: 'Livros obrigatórios', texto: 'Livro Diário e Livro Razão, com termos de abertura e encerramento, assinados pelo titular e pelo contador, e registrados no órgão competente.', ref: 'ver norma' },
      { titulo: 'Documentação', texto: 'Documentos que comprovam os lançamentos (notas, contratos, extratos) devem ser guardados pelos prazos legais.', ref: 'ver norma' },
      { titulo: 'Responsabilidade', texto: 'O contador responde pela escrituração e pelo cumprimento das normas, e a entidade, pela veracidade dos documentos.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'Escrituração contábil', significado: 'Registro sistemático e cronológico dos fatos contábeis.' },
      { termo: 'Livro Diário', significado: 'Registro cronológico de todos os lançamentos.' },
      { termo: 'Livro Razão', significado: 'Registro por conta contábil dos lançamentos.' },
      { termo: 'Estorno', significado: 'Lançamento que desfaz outro lançamento errado.' },
      { termo: 'Termos de abertura e encerramento', significado: 'Páginas que identificam o livro e certificam seu início e fim.' },
    ],
    exemplos: [
      { titulo: 'Lançamento correto', situacao: 'Venda de R$ 4.000 em 10/03 à vista.', tratamento: 'Lançamento com data, contas, histórico e valor.', lancamento: 'D - Caixa 4.000,00 / C - Receita de vendas 4.000,00 — Histórico: “Venda de mercadorias conforme NF 123”', ref: 'ver norma' },
      { titulo: 'Erro de conta (estorno)', situacao: 'Despesa de R$ 800 lançada como ativo por engano.', tratamento: 'Estorna o lançamento e refaz corretamente.', lancamento: 'D - Caixa 800,00 / C - Imobilizado 800,00 (estorno); D - Despesa 800,00 / C - Caixa 800,00', ref: 'ver norma' },
      { titulo: 'Erro de valor (complemento)', situacao: 'Lançamento de R$ 1.000 que deveria ser R$ 1.200.', tratamento: 'Complementa com lançamento de R$ 200.', lancamento: 'D - Despesa 200,00 / C - Caixa 200,00 — Histórico: “Complemento do lançamento de 10/03”', ref: 'ver norma' },
      { titulo: 'Erro de classificação (transferência)', situacao: 'Despesa de energia lançada em aluguel.', tratamento: 'Transfere o valor entre as contas.', lancamento: 'D - Despesa de energia 900,00 / C - Despesa de aluguel 900,00', ref: 'ver norma' },
      { titulo: 'Histórico claro', situacao: 'Histórico “pgto diverso”.', tratamento: 'O histórico deve identificar a operação (por exemplo, “Pagamento do aluguel de março”).', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Livros com termos', situacao: 'O Livro Diário do ano é encerrado.', tratamento: 'Tem termos de abertura e encerramento assinados e registro no órgão competente.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Guarda de documentos', situacao: 'A empresa mantém notas e contratos do ano.', tratamento: 'Guarda pelos prazos legais.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Moeda estrangeira', situacao: 'Operação em dólar.', tratamento: 'Converte para reais na data da operação e registra em moeda nacional.', lancamento: 'D - Estoques 50.000,00 / C - Fornecedores estrangeiros 50.000,00', ref: 'ver norma' },
      { titulo: 'Lançamento em lote', situacao: 'Várias vendas pequenas por dia.', tratamento: 'Podem ser lançadas de forma global, desde que o histórico permita a identificação e haja controles auxiliares.', lancamento: 'D - Caixa 3.500,00 / C - Receita de vendas 3.500,00', ref: 'ver norma' },
      { titulo: 'Rasura', situacao: 'Alguém apagou um lançamento no livro.', tratamento: 'Não é permitido: correções só por estorno, transferência ou complemento.', lancamento: '—', ref: 'ver norma' },
    ],
  });

  C('ITG 2001', '', {
    resumo: 'Esta interpretação diz como as entidades fechadas de previdência complementar (os fundos de pensão) devem fazer sua contabilidade: demonstrações por plano de benefícios, demonstração do plano de gestão administrativa e regras para investimentos, provisões e benefícios.',
    objetivo: 'Estabelecer critérios de contabilização e de apresentação das demonstrações contábeis das entidades fechadas de previdência complementar (EFPC).',
    pontos: [
      { titulo: 'Quem é a EFPC', texto: 'Entidade fechada de previdência complementar, que administra planos de benefícios para empregados de patrocinadoras e associados.', ref: 'ver norma' },
      { titulo: 'Contabilidade por plano', texto: 'Cada plano de benefícios tem sua própria contabilidade, além da contabilidade do plano de gestão administrativa (PGA) da entidade.', ref: 'ver norma' },
      { titulo: 'Demonstrações', texto: 'Balanço patrimonial consolidado, demonstração da mutação do patrimônio social, do ativo líquido por plano, da evolução do ativo líquido, do plano de gestão administrativa e das provisões técnicas.', ref: 'ver norma' },
      { titulo: 'Investimentos', texto: 'Os investimentos são classificados e medidos conforme a regulação da previdência complementar (títulos para negociação e mantidos até o vencimento).', ref: 'ver norma' },
      { titulo: 'Provisões matemáticas', texto: 'Reconhecem os compromissos com os participantes, calculados por atuário (benefícios concedidos e a conceder).', ref: 'ver norma' },
      { titulo: 'Equilíbrio técnico', texto: 'Mostra se há superávit ou déficit técnico no plano, com regras de destinação e equacionamento.', ref: 'ver norma' },
      { titulo: 'Fundos', texto: 'Há fundos previdenciais, administrativos e de investimentos, cada um com origem e finalidade.', ref: 'ver norma' },
      { titulo: 'Divulgação', texto: 'Notas com premissas atuariais, políticas de investimentos, partes relacionadas e eventos relevantes.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'EFPC', significado: 'Entidade fechada de previdência complementar (fundo de pensão).' },
      { termo: 'Plano de benefícios', significado: 'Plano que garante aposentadoria e outros benefícios aos participantes.' },
      { termo: 'PGA', significado: 'Plano de gestão administrativa, que reúne as despesas e receitas administrativas da entidade.' },
      { termo: 'Provisão matemática', significado: 'Valor atuarial dos compromissos com participantes.' },
      { termo: 'Equilíbrio técnico', significado: 'Diferença entre ativos do plano e compromissos.' },
    ],
    exemplos: [
      { titulo: 'Contribuição recebida', situacao: 'A patrocinadora paga R$ 500.000 e os participantes R$ 300.000 ao plano.', tratamento: 'Aumenta o ativo do plano e as provisões ou o fundo previdencial, conforme o tipo de plano.', lancamento: 'D - Caixa do plano 800.000,00 / C - Contribuições previdenciais 800.000,00', ref: 'ver norma' },
      { titulo: 'Benefício pago', situacao: 'O plano paga R$ 400.000 de aposentadorias.', tratamento: 'Reduz as provisões e o caixa.', lancamento: 'D - Provisões matemáticas (benefícios concedidos) 400.000,00 / C - Caixa do plano 400.000,00', ref: 'ver norma' },
      { titulo: 'Rendimento dos investimentos', situacao: 'Os investimentos do plano rendem R$ 1.000.000.', tratamento: 'Reconhece o rendimento no plano.', lancamento: 'D - Investimentos 1.000.000,00 / C - Rendimentos de investimentos 1.000.000,00', ref: 'ver norma' },
      { titulo: 'Despesas administrativas', situacao: 'Gastos administrativos de R$ 120.000 pagos pelo PGA.', tratamento: 'Registrados no plano de gestão administrativa.', lancamento: 'D - Despesas administrativas (PGA) 120.000,00 / C - Caixa do PGA 120.000,00', ref: 'ver norma' },
      { titulo: 'Superávit técnico', situacao: 'Ativos do plano superam as provisões em R$ 2.000.000.', tratamento: 'Registra superávit técnico, com regras de reserva de contingência e destinação.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Déficit técnico', situacao: 'Os ativos ficam R$ 1.500.000 abaixo das provisões.', tratamento: 'Registra o déficit e divulga o plano de equacionamento.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Investimento para negociação', situacao: 'Títulos públicos comprados para negociar são marcados a mercado.', tratamento: 'A variação vai ao resultado do plano.', lancamento: 'D - Investimentos 50.000,00 / C - Resultado de investimentos 50.000,00', ref: 'ver norma' },
      { titulo: 'Fundo administrativo', situacao: 'Sobra de R$ 80.000 na gestão administrativa.', tratamento: 'Constitui fundo administrativo.', lancamento: 'D - Resultado do PGA 80.000,00 / C - Fundo administrativo 80.000,00', ref: 'ver norma' },
      { titulo: 'Cálculo atuarial', situacao: 'O atuário recalcula as provisões e há aumento de R$ 300.000.', tratamento: 'Ajusta as provisões.', lancamento: 'D - Constituição de provisões matemáticas 300.000,00 / C - Provisões matemáticas 300.000,00', ref: 'ver norma' },
      { titulo: 'Divulgação', situacao: 'A entidade publica as demonstrações.', tratamento: 'Divulga as premissas atuariais, a política de investimentos e as partes relacionadas.', lancamento: '—', ref: 'ver norma' },
    ],
  });

  C('ITG 2002', 'R1', {
    resumo: 'Associações, fundações, ONGs e outras entidades que não visam lucro também precisam de contabilidade. Esta interpretação diz como elas registram doações, trabalho voluntário, subvenções e gratuidades, e como apresentam o “superávit” ou “déficit” do período.',
    objetivo: 'Estabelecer critérios e procedimentos de avaliação, de reconhecimento das transações e variações patrimoniais e de estruturação das demonstrações contábeis das entidades sem finalidade de lucros.',
    pontos: [
      { titulo: 'Quem se aplica', texto: 'Entidades sem finalidade de lucros: associações, fundações, organizações religiosas, sindicatos, ONGs, entidades filantrópicas, entre outras.', ref: 'ver norma' },
      { titulo: 'Patrimônio social', texto: 'No lugar de capital, as entidades têm patrimônio social e resultados acumulados (superávit ou déficit).', ref: 'ver norma' },
      { titulo: 'Demonstrações', texto: 'Balanço patrimonial, demonstração do resultado (superávit ou déficit), do resultado abrangente (se houver), das mutações do patrimônio social, do fluxo de caixa e notas explicativas.', ref: 'ver norma' },
      { titulo: 'Doações e subvenções', texto: 'Recebimentos sem contrapartida são reconhecidos como receita quando a entidade cumpre as condições (subvenções pelo critério da NBC TG 07).', ref: 'ver norma' },
      { titulo: 'Trabalho voluntário', texto: 'O trabalho voluntário é reconhecido, por seu valor justo, como receita e despesa, sem efeito no resultado (quando permitido).', ref: 'ver norma' },
      { titulo: 'Gratuidades', texto: 'Serviços prestados gratuitamente (como em entidades de saúde e educação) são divulgados e podem ser reconhecidos como despesas e receitas equivalentes.', ref: 'ver norma' },
      { titulo: 'Projetos e recursos restritos', texto: 'Recursos vinculados a projetos são controlados separadamente, com informações sobre aplicações e saldos.', ref: 'ver norma' },
      { titulo: 'Divulgação', texto: 'Divulgar a natureza, as fontes de recursos, as doações recebidas, as gratuidades e os benefícios fiscais.', ref: 'ver norma' },
    ],
    termos: [
      { termo: 'Patrimônio social', significado: 'Patrimônio líquido das entidades sem fins lucrativos.' },
      { termo: 'Superávit/déficit', significado: 'Resultado positivo ou negativo do período, no lugar do lucro ou prejuízo.' },
      { termo: 'Subvenção', significado: 'Recurso do poder público para ajudar a entidade.' },
      { termo: 'Trabalho voluntário', significado: 'Trabalho prestado sem remuneração.' },
      { termo: 'Recurso restrito', significado: 'Recurso que só pode ser usado para um fim específico.' },
    ],
    exemplos: [
      { titulo: 'Doação sem restrição', situacao: 'Uma ONG recebe R$ 50.000 em doação para suas atividades gerais.', tratamento: 'Receita do período.', lancamento: 'D - Caixa 50.000,00 / C - Receita de doações 50.000,00', ref: 'ver norma' },
      { titulo: 'Doação com restrição de projeto', situacao: 'A entidade recebe R$ 200.000 para um projeto que dura 2 anos.', tratamento: 'Controla como recurso vinculado e reconhece a receita conforme o projeto avança.', lancamento: 'D - Caixa 200.000,00 / C - Recursos de projetos a apropriar 200.000,00', ref: 'ver norma' },
      { titulo: 'Apropriação do projeto', situacao: 'No ano, a entidade gasta R$ 90.000 do projeto.', tratamento: 'Reconhece receita equivalente à despesa realizada.', lancamento: 'D - Recursos de projetos a apropriar 90.000,00 / C - Receita de projetos 90.000,00', ref: 'ver norma' },
      { titulo: 'Trabalho voluntário', situacao: 'Voluntários prestam 500 horas de serviços avaliados em R$ 20 por hora.', tratamento: 'Reconhece R$ 10.000 de despesa e receita, sem efeito líquido no resultado.', lancamento: 'D - Despesa com trabalho voluntário 10.000,00 / C - Receita de trabalho voluntário 10.000,00', ref: 'ver norma' },
      { titulo: 'Subvenção do governo', situacao: 'Convênio de R$ 300.000 para custear atendimento.', tratamento: 'Aplica a NBC TG 07: receita ao longo do período em que se cumprem as condições.', lancamento: 'D - Caixa 300.000,00 / C - Subvenção a apropriar 300.000,00', ref: 'ver norma' },
      { titulo: 'Gratuidade', situacao: 'Hospital filantrópico presta atendimentos gratuitos de R$ 400.000 ao ano.', tratamento: 'Divulga o valor das gratuidades e, quando mensurável, reconhece como receita e despesa.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Superávit do ano', situacao: 'Receitas de R$ 1.000.000 e despesas de R$ 900.000.', tratamento: 'Superávit de R$ 100.000, que aumenta o patrimônio social.', lancamento: 'D - Resultado do exercício 100.000,00 / C - Patrimônio social (superávit acumulado) 100.000,00', ref: 'ver norma' },
      { titulo: 'Mensalidades de associados', situacao: 'Associados pagam R$ 30.000 de mensalidades.', tratamento: 'Receita de contribuições.', lancamento: 'D - Caixa 30.000,00 / C - Receita de contribuições associativas 30.000,00', ref: 'ver norma' },
      { titulo: 'Isenção tributária', situacao: 'A entidade é imune a impostos e deixa de pagar R$ 80.000 de tributos.', tratamento: 'Divulga o benefício fiscal usufruído.', lancamento: '—', ref: 'ver norma' },
      { titulo: 'Divulgação', situacao: 'A fundação publica as demonstrações.', tratamento: 'Mostra a natureza, as fontes de recursos, as gratuidades e as doações em nota.', lancamento: '—', ref: 'ver norma' },
    ],
  });
})();
