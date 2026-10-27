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
