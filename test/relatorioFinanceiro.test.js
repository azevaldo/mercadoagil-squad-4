import test from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';

const cliente = {
  nome: 'Maria Santos',
  email: 'maria@example.com',
  cpf: '529.982.247-25',
  regiaoEntrega: 'Nordeste',
};

const outroCliente = {
  nome: 'João Lima',
  email: 'joao@example.com',
  cpf: '111.444.777-35',
  regiaoEntrega: 'Sul',
};

const vendedores = [
  {
    nomeLoja: 'TechBahia',
    cnpj: '11.222.333/0001-81',
    email: 'tech@example.com',
  },
  {
    nomeLoja: 'Livraria Sol',
    cnpj: '45.723.174/0001-10',
    email: 'livraria@example.com',
  },
];

const criarMarketplace = () =>
  new Marketplace({
    clientes: [cliente],
    vendedores,
    produtos: [
      {
        nome: 'Mouse',
        preco: 120,
        categoria: 'eletronicos',
        quantidade: 20,
        vendedorCnpj: vendedores[0].cnpj,
      },
      {
        nome: 'Teclado',
        preco: 250,
        categoria: 'eletronicos',
        quantidade: 20,
        vendedorCnpj: vendedores[0].cnpj,
      },
      {
        nome: 'Livro',
        preco: 80,
        categoria: 'livros',
        quantidade: 20,
        vendedorCnpj: vendedores[1].cnpj,
      },
    ],
  });

const criarPedido = (marketplace) =>
  marketplace.criarPedido(cliente.cpf).dados.id;

const adicionarItem = (marketplace, pedidoId, nomeProduto, quantidade) => {
  const produto = marketplace
    .listarProdutos()
    .dados.find((atual) => atual.nome === nomeProduto);

  return marketplace.adicionarItem(pedidoId, produto.id, quantidade);
};

const confirmarComItens = (marketplace, itens) => {
  const pedidoId = criarPedido(marketplace);
  itens.forEach(([produto, quantidade]) =>
    adicionarItem(marketplace, pedidoId, produto, quantidade),
  );
  marketplace.confirmarPedido(pedidoId);
  return pedidoId;
};

const dataNoFusoDoProjeto = (data = new Date()) => {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(data);
  const campos = Object.fromEntries(
    partes.map(({ type, value }) => [type, value]),
  );

  return `${campos.year}-${campos.month}-${campos.day}`;
};

test('retorna totais zerados quando não há pedidos confirmados', () => {
  const marketplace = criarMarketplace();

  const relatorio = marketplace.relatorioFinanceiro();

  assert.equal(relatorio.ok, true);
  assert.equal(relatorio.dados.faturamentoTotal, 0);
  assert.equal(relatorio.dados.quantidadePedidos, 0);
  assert.equal(relatorio.dados.ticketMedio, 0);
  assert.deepEqual(relatorio.dados.produtosMaisVendidos, []);
  assert.deepEqual(relatorio.dados.repassePorVendedor, []);
  assert.ok(
    relatorio.dados.faturamentoPorCategoria.every(
      ({ faturamentoBruto }) => faturamentoBruto === 0,
    ),
  );
});

test('agrega somente vendas confirmadas e preserva os dados da venda', () => {
  const marketplace = criarMarketplace();
  const mouseId = marketplace
    .listarProdutos()
    .dados.find((produto) => produto.nome === 'Mouse').id;

  confirmarComItens(marketplace, [
    ['Mouse', 2],
    ['Livro', 1],
  ]);
  confirmarComItens(marketplace, [
    ['Mouse', 1],
    ['Teclado', 1],
  ]);
  confirmarComItens(marketplace, [['Teclado', 1]]);

  const atualizacao = marketplace.atualizarProduto(mouseId, {
    nome: 'Mouse atualizado',
    categoria: 'casa',
    preco: 999,
  });
  assert.equal(atualizacao.ok, true);

  const relatorio = marketplace.relatorioFinanceiro();
  const dados = relatorio.dados;

  assert.equal(dados.faturamentoTotal, 966.5);
  assert.equal(dados.quantidadePedidos, 3);
  assert.equal(dados.ticketMedio, 322.17);
  assert.equal(dados.descontosConcedidos, 0);
  assert.equal(dados.tributosTotais, 103.2);
  assert.equal(dados.comissaoTotal, 80.8);

  assert.deepEqual(
    dados.faturamentoPorCategoria.filter(
      ({ faturamentoBruto }) => faturamentoBruto > 0,
    ),
    [
      { categoria: 'eletronicos', faturamentoBruto: 860 },
      { categoria: 'livros', faturamentoBruto: 80 },
    ],
  );

  assert.deepEqual(dados.repassePorVendedor, [
    {
      vendedor: 'Livraria Sol',
      valorBruto: 80,
      comissao: 12,
      valorRepasse: 68,
    },
    {
      vendedor: 'TechBahia',
      valorBruto: 860,
      comissao: 68.8,
      valorRepasse: 791.2,
    },
  ]);

  assert.deepEqual(dados.produtosMaisVendidos, [
    { produto: 'Mouse', quantidade: 3 },
    { produto: 'Teclado', quantidade: 2 },
    { produto: 'Livro', quantidade: 1 },
  ]);
});

test('ignora pedidos abertos e pedidos cancelados, inclusive os já confirmados', () => {
  const marketplace = criarMarketplace();
  const cancelado = confirmarComItens(marketplace, [['Mouse', 2]]);
  marketplace.cancelarPedido(cancelado);

  const aberto = criarPedido(marketplace);
  adicionarItem(marketplace, aberto, 'Livro', 1);

  const relatorio = marketplace.relatorioFinanceiro();

  assert.equal(relatorio.dados.faturamentoTotal, 0);
  assert.equal(relatorio.dados.quantidadePedidos, 0);
  assert.equal(relatorio.dados.ticketMedio, 0);
  assert.deepEqual(relatorio.dados.repassePorVendedor, []);
  assert.deepEqual(relatorio.dados.produtosMaisVendidos, []);
});

test('filtra por período, vendedor e cliente, combinando os filtros', () => {
  const marketplace = criarMarketplace();
  marketplace.cadastrarCliente(outroCliente);

  confirmarComItens(marketplace, [['Mouse', 1]]);
  const pedidoDoJoao = marketplace.criarPedido(outroCliente.cpf).dados.id;
  adicionarItem(marketplace, pedidoDoJoao, 'Livro', 1);
  marketplace.confirmarPedido(pedidoDoJoao);

  const hoje = dataNoFusoDoProjeto();
  const porPeriodo = marketplace.relatorioFinanceiro({
    dataInicio: hoje,
    dataFim: hoje,
  });
  assert.equal(porPeriodo.dados.quantidadePedidos, 2);

  const periodoSemPedidos = marketplace.relatorioFinanceiro({
    dataInicio: '2000-01-01',
    dataFim: '2000-01-31',
  });
  assert.equal(periodoSemPedidos.dados.quantidadePedidos, 0);

  const porVendedor = marketplace.relatorioFinanceiro({
    vendedor: '11.222.333/0001-81',
  });
  assert.equal(porVendedor.dados.quantidadePedidos, 1);
  assert.deepEqual(porVendedor.dados.produtosMaisVendidos, [
    { produto: 'Mouse', quantidade: 1 },
  ]);

  const porCliente = marketplace.relatorioFinanceiro({
    cliente: outroCliente.cpf,
  });
  assert.equal(porCliente.dados.quantidadePedidos, 1);
  assert.deepEqual(porCliente.dados.produtosMaisVendidos, [
    { produto: 'Livro', quantidade: 1 },
  ]);

  const filtrosCombinados = marketplace.relatorioFinanceiro({
    dataInicio: hoje,
    dataFim: hoje,
    vendedor: 'TechBahia',
    cliente: 'Maria',
  });
  assert.equal(filtrosCombinados.dados.quantidadePedidos, 1);
  assert.deepEqual(filtrosCombinados.dados.produtosMaisVendidos, [
    { produto: 'Mouse', quantidade: 1 },
  ]);
});

test('recusa datas inválidas e períodos invertidos', () => {
  const marketplace = criarMarketplace();

  assert.deepEqual(
    marketplace.relatorioFinanceiro({ dataInicio: '2026-02-30' }),
    {
      ok: false,
      erros: ['A data inicial deve ser uma data válida no formato AAAA-MM-DD.'],
    },
  );

  assert.deepEqual(
    marketplace.relatorioFinanceiro({
      dataInicio: '2026-10-27',
      dataFim: '2026-10-26',
    }),
    {
      ok: false,
      erros: ['A data inicial não pode ser posterior à data final.'],
    },
  );
});

test('mantém vendedores distintos separados mesmo quando têm o mesmo nome', () => {
  const marketplace = criarMarketplace();
  marketplace.atualizarVendedor(vendedores[1].cnpj, {
    nomeLoja: vendedores[0].nomeLoja,
    email: vendedores[1].email,
  });

  confirmarComItens(marketplace, [['Mouse', 1]]);
  confirmarComItens(marketplace, [['Livro', 1]]);

  const repasses = marketplace.relatorioRepassePorVendedor().dados;
  assert.equal(repasses.length, 2);
  assert.deepEqual(
    repasses.map(({ vendedor, valorBruto }) => ({ vendedor, valorBruto })),
    [
      { vendedor: vendedores[0].nomeLoja, valorBruto: 120 },
      { vendedor: vendedores[0].nomeLoja, valorBruto: 80 },
    ],
  );
});

test('alterar os repasses do resumo público não modifica o relatório', () => {
  const marketplace = criarMarketplace();
  const pedido = criarPedido(marketplace);
  adicionarItem(marketplace, pedido, 'Mouse', 1);
  marketplace.confirmarPedido(pedido);

  marketplace.resumoPedido(pedido).dados.repasses[0].repasse = -1;

  assert.equal(
    marketplace.relatorioRepassePorVendedor().dados[0].valorRepasse,
    110.4,
  );
});
