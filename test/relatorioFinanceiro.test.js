import test from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';

const cliente = {
  nome: 'Maria Santos',
  email: 'maria@example.com',
  cpf: '529.982.247-25',
  regiaoEntrega: 'Nordeste',
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
