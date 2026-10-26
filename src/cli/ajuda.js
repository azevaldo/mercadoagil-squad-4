export const ajudaAreas = {
  Pedidos:
    'Monte a compra de um cliente, adicione produtos e acompanhe a confirmação ou o cancelamento.',
  Clientes:
    'Cadastre e consulte as pessoas que compram. O CPF identifica o cliente, mas não aparece nas listagens.',
  Vendedores:
    'Gerencie as lojas que vendem no marketplace. Cada produto pertence a um vendedor.',
  Produtos:
    'Consulte o catálogo e gerencie preços, categorias e quantidades disponíveis em estoque.',
  Cupons:
    'Crie e consulte descontos percentuais, descontos em reais e cupons de frete grátis.',
  Relatórios:
    'Veja os resultados das compras confirmadas: faturamento, descontos, comissões e repasses.',
};

// Cada operação explica o resultado e as condições relevantes para quem usa o sistema.
export const ajudaAcoes = {
  1: [
    'Cadastre uma pessoa para que ela possa fazer pedidos.',
    'Informe nome, e-mail, CPF e região de entrega.',
  ],
  2: [
    'Consulte os clientes cadastrados e seus dados de contato.',
    'Digite um nome para filtrar. Enter abre os detalhes; o CPF permanece oculto.',
  ],
  3: [
    'Encontre um cliente pelo CPF ou por parte do nome.',
    'A busca por nome aceita diferenças de acentos e maiúsculas.',
  ],
  4: [
    'Altere nome, e-mail e região de entrega de um cliente.',
    'Informe o CPF do cadastro e preencha todos os novos dados. O CPF não muda.',
  ],
  5: [
    'Remova o cadastro de um cliente.',
    'Informe o CPF da pessoa que deseja excluir. Esc cancela antes de concluir.',
  ],
  6: [
    'Cadastre uma loja para associá-la aos produtos que ela vende.',
    'Informe nome da loja, CNPJ e e-mail de contato.',
  ],
  7: [
    'Consulte as lojas cadastradas e seus contatos.',
    'Digite para filtrar e use Enter para abrir os detalhes.',
  ],
  8: [
    'Encontre uma loja pelo CNPJ ou por parte do nome.',
    'O CNPJ pode ser digitado com ou sem pontuação.',
  ],
  9: [
    'Altere o nome da loja e seu e-mail de contato.',
    'Informe o CNPJ e preencha os novos dados. O CNPJ não muda.',
  ],
  10: [
    'Remova o cadastro de uma loja.',
    'Lojas com produtos cadastrados não podem ser excluídas.',
  ],
  11: [
    'Adicione um produto ao catálogo com preço e estoque inicial.',
    'O vendedor precisa estar cadastrado. O sistema gera o número do produto.',
  ],
  12: [
    'Veja preços, categorias, vendedores e estoque disponível.',
    'Digite para filtrar. Enter abre os detalhes do produto selecionado.',
  ],
  13: [
    'Altere nome, preço, categoria ou quantidade de um produto.',
    'Enter mantém cada campo atual. A quantidade informada substitui o estoque disponível.',
  ],
  14: [
    'Encontre um produto pelo número ou por parte do nome.',
    'Consulte a listagem para descobrir o número do produto.',
  ],
  15: [
    'Retire um produto do catálogo e remova seu estoque.',
    'Informe o número do produto. Esc cancela antes de concluir.',
  ],
  16: [
    'Crie um desconto percentual, um desconto em reais ou frete grátis.',
    'Defina validade futura, subtotal mínimo e se aceita outro cupom.',
  ],
  17: [
    'Consulte os códigos, tipos e condições dos cupons cadastrados.',
    'Enter mostra validade, valor mínimo e cumulatividade do cupom selecionado.',
  ],
  18: [
    'Veja as condições de uso de um cupom pelo código.',
    'Não é necessário diferenciar letras maiúsculas e minúsculas.',
  ],
  19: [
    'Altere tipo, valor, validade e condições de um cupom.',
    'Informe o código. Enter mantém cada valor atual; o código não muda.',
  ],
  20: [
    'Remova um cupom da lista de códigos disponíveis.',
    'Informe o código que deseja excluir. Esc cancela antes de concluir.',
  ],
  21: [
    'Crie uma compra em aberto para um cliente cadastrado.',
    'Informe o CPF. Em seguida, use Adicionar item para montar a compra.',
  ],
  22: [
    'Inclua um produto e sua quantidade em um pedido aberto.',
    'Repetir o produto soma as quantidades. O estoque só baixa na confirmação.',
  ],
  23: [
    'Retire um produto inteiro de um pedido aberto.',
    'Informe os números do pedido e do produto. A remoção respeita o mínimo dos cupons aplicados.',
  ],
  24: [
    'Aplique um cupom cadastrado a um pedido aberto.',
    'O sistema verifica validade, mínimo de compra e combinação. O limite é de dois cupons.',
  ],
  25: [
    'Confira itens, descontos, frete, tributos e total da compra.',
    'Depois de confirmar, o resumo também apresenta os repasses aos vendedores.',
  ],
  26: [
    'Finalize um pedido aberto e dê baixa nos produtos em estoque.',
    'Todos os itens precisam estar disponíveis. Após confirmar, itens e cupons não podem ser alterados.',
  ],
  27: [
    'Cancele uma compra aberta ou confirmada.',
    'Se já estava confirmada, os produtos voltam ao estoque. O pedido cancelado sai dos relatórios de vendas.',
  ],
  28: [
    'Acompanhe os pedidos por cliente, situação e total.',
    'Digite para filtrar. Enter abre o resumo completo do pedido selecionado.',
  ],
  29: [
    'Veja uma visão geral das vendas confirmadas.',
    'Reúne faturamento, ticket médio, descontos, tributos, comissões, categorias e repasses.',
    'Os filtros são opcionais e podem ser combinados.',
  ],
  30: [
    'Veja quanto foi vendido em cada categoria de produto.',
    'Considera o valor bruto dos itens, antes dos descontos, em pedidos confirmados.',
  ],
  31: [
    'Confira o valor bruto, a comissão e o valor a repassar a cada loja.',
    'Somente pedidos confirmados geram repasse. O filtro de vendedor seleciona pedidos que incluem essa loja.',
  ],
  32: [
    'Descubra os três produtos mais vendidos por quantidade.',
    'Considera apenas pedidos confirmados e os filtros informados.',
  ],
};

export const ajudaCampo = (rotulo) => {
  if (/Cumulativo/.test(rotulo))
    return 'Cumulativo significa que pode ser combinado com outro cupom. Use s para sim ou n para não.';
  if (/CPF/.test(rotulo))
    return 'O CPF identifica o cliente. Você pode usar pontos e traço ou digitar só os 11 números.';
  if (/CNPJ/.test(rotulo))
    return 'O CNPJ identifica a loja. Aceita os 14 dígitos com ou sem pontuação.';
  if (/Número do pedido/.test(rotulo))
    return 'Use o número gerado ao criar a compra. Você também encontra esse número em Listar pedidos.';
  if (/Id/.test(rotulo))
    return 'Use o número do produto exibido em Produtos > Listar produtos.';
  if (/subtotal|valor mínimo/i.test(rotulo))
    return 'É o valor dos produtos antes de descontos e frete. O cupom só vale se a compra atingir esse mínimo.';
  if (/quantidade/i.test(rotulo))
    return /estoque|Nova quantidade/.test(rotulo)
      ? 'Informe um inteiro a partir de zero. Na atualização, esse será o novo estoque total disponível.'
      : 'Informe um inteiro maior que zero: 1, 2, 3…';
  if (/Preço|preço/.test(rotulo))
    return 'Valor de uma unidade em reais. Exemplo: 120,50. Não digite R$.';
  if (/validade/i.test(rotulo))
    return 'Data futura em ano-mês-dia. Exemplo de formato: 2030-12-31.';
  if (/Data inicial|Data final/.test(rotulo))
    return 'Filtra pela data de confirmação do pedido. As duas datas entram no período; Enter deixa sem esse limite.';
  if (/Tipo|tipo/.test(rotulo))
    return 'percentual desconta uma porcentagem; fixo desconta reais; frete zera a entrega.';
  if (/Valor|valor/.test(rotulo))
    return 'No cupom percentual, 10 significa 10%. No fixo, 10 significa R$ 10,00. Use ponto para decimais: 10.50.';
  if (/Código|código/.test(rotulo))
    return 'É o nome usado para aplicar o cupom. Letras maiúsculas e minúsculas são equivalentes.';
  if (/Categoria|categoria/.test(rotulo))
    return 'Classifica o produto e determina suas taxas de tributos e comissão.';
  if (/Região|região/.test(rotulo))
    return 'Escolha a região de entrega do cliente. Ela determina a taxa-base do frete.';
  if (/e-mail|E-mail/.test(rotulo))
    return 'Informe um endereço de contato completo, como nome@exemplo.com.';
  if (/Nome da loja|Novo nome da loja/.test(rotulo))
    return 'Nome comercial que identifica a loja no catálogo e nos relatórios.';
  if (/Nome|nome/.test(rotulo))
    return 'Nome que identifica o cadastro. Use uma descrição que facilite encontrá-lo nas buscas.';
  return '';
};
