import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';

const CPF = '529.982.247-25';

// Ids na ordem do cadastro: Mouse = 1, Livro = 2
const MOUSE = 1;
const LIVRO = 2;

const criarMarketplace = () =>
  new Marketplace({
    vendedores: [
      {
        nomeLoja: 'TechBahia',
        cnpj: '11.222.333/0001-81',
        email: 'contato@techbahia.com',
      },
      {
        nomeLoja: 'Livraria Sol',
        cnpj: '45.723.174/0001-10',
        email: 'contato@livrariasol.com',
      },
    ],
    clientes: [
      {
        nome: 'Maria Santos',
        email: 'maria@exemplo.com',
        cpf: CPF,
        regiaoEntrega: 'Nordeste',
      },
    ],
    produtos: [
      {
        nome: 'Mouse',
        preco: 120,
        categoria: 'eletronicos',
        quantidade: 5,
        vendedorCnpj: '11.222.333/0001-81',
      },
      {
        nome: 'Livro de JavaScript',
        preco: 80,
        categoria: 'livros',
        quantidade: 5,
        vendedorCnpj: '45.723.174/0001-10',
      },
    ],
    cupons: [
      {
        codigo: 'BEMVINDO10',
        tipo: 'percentual',
        valor: 10,
        validade: '2030-12-31',
        valorMinimo: 0,
        cumulativo: true,
      },
      {
        codigo: 'PDA15',
        tipo: 'fixo',
        valor: 15,
        validade: '2030-12-31',
        valorMinimo: 0,
        cumulativo: true,
      },
    ],
  });

// Cenário de vendas:
// - pedido 1: confirmado, Mouse + Livro, BEMVINDO10 + PDA15 (total 193)
// - pedido 2: confirmado, Mouse x2, sem cupom (total 268)
// - pedido 3: aberto, Livro x3 (não entra nos relatórios)
// - pedido 4: confirmado e depois cancelado, Mouse x1 (não entra nos relatórios)
const criarVendas = () => {
  const mp = criarMarketplace();

  const pedido1 = mp.criarPedido(CPF).dados.id;
  mp.adicionarItem(pedido1, MOUSE, '1');
  mp.adicionarItem(pedido1, LIVRO, '1');
  mp.aplicarCupom(pedido1, 'BEMVINDO10');
  mp.aplicarCupom(pedido1, 'PDA15');
  mp.confirmarPedido(pedido1);

  const pedido2 = mp.criarPedido(CPF).dados.id;
  mp.adicionarItem(pedido2, MOUSE, '2');
  mp.confirmarPedido(pedido2);

  const pedido3 = mp.criarPedido(CPF).dados.id;
  mp.adicionarItem(pedido3, LIVRO, '3');

  const pedido4 = mp.criarPedido(CPF).dados.id;
  mp.adicionarItem(pedido4, MOUSE, '1');
  mp.confirmarPedido(pedido4);
  mp.cancelarPedido(pedido4);

  return mp;
};

describe('Relatórios: resumo financeiro', () => {
  test('soma só os pedidos confirmados: faturamento, quantidade, ticket médio e totais', () => {
    const resposta = criarVendas().relatorioFinanceiro();

    assert.equal(resposta.ok, true);
    assert.deepEqual(resposta.dados, {
      faturamentoTotal: 461,
      quantidadePedidos: 2,
      ticketMedio: 230.5,
      faturamentoPorCategoria: [
        { categoria: 'eletronicos', faturamentoBruto: 360 },
        { categoria: 'livros', faturamentoBruto: 80 },
        { categoria: 'alimentos', faturamentoBruto: 0 },
        { categoria: 'vestuario', faturamentoBruto: 0 },
        { categoria: 'casa', faturamentoBruto: 0 },
      ],
      repassePorVendedor: [
        {
          vendedor: 'Livraria Sol',
          valorBruto: 80,
          comissao: 12,
          valorRepasse: 68,
        },
        {
          vendedor: 'TechBahia',
          valorBruto: 360,
          comissao: 28.8,
          valorRepasse: 331.2,
        },
      ],
      produtosMaisVendidos: [
        { produto: 'Mouse', quantidade: 3 },
        { produto: 'Livro de JavaScript', quantidade: 1 },
      ],
      descontosConcedidos: 35,
      tributosTotais: 43.2,
      comissaoTotal: 40.8,
    });
  });

  test('sem pedidos confirmados, o resumo fica zerado', () => {
    const resposta = criarMarketplace().relatorioFinanceiro();

    assert.deepEqual(resposta.dados, {
      faturamentoTotal: 0,
      quantidadePedidos: 0,
      ticketMedio: 0,
      faturamentoPorCategoria: [
        { categoria: 'eletronicos', faturamentoBruto: 0 },
        { categoria: 'livros', faturamentoBruto: 0 },
        { categoria: 'alimentos', faturamentoBruto: 0 },
        { categoria: 'vestuario', faturamentoBruto: 0 },
        { categoria: 'casa', faturamentoBruto: 0 },
      ],
      repassePorVendedor: [],
      produtosMaisVendidos: [],
      descontosConcedidos: 0,
      tributosTotais: 0,
      comissaoTotal: 0,
    });
  });
});

describe('Relatórios: faturamento por categoria', () => {
  test('soma o valor dos itens antes dos descontos, por categoria', () => {
    const resposta = criarVendas().relatorioFaturamentoPorCategoria();

    assert.deepEqual(resposta.dados, [
      { categoria: 'eletronicos', faturamentoBruto: 360 },
      { categoria: 'livros', faturamentoBruto: 80 },
      { categoria: 'alimentos', faturamentoBruto: 0 },
      { categoria: 'vestuario', faturamentoBruto: 0 },
      { categoria: 'casa', faturamentoBruto: 0 },
    ]);
  });
});

describe('Relatórios: repasse por vendedor', () => {
  test('mostra bruto, comissão e valor a repassar de cada vendedor', () => {
    const resposta = criarVendas().relatorioRepassePorVendedor();

    assert.deepEqual(resposta.dados, [
      {
        vendedor: 'Livraria Sol',
        valorBruto: 80,
        comissao: 12,
        valorRepasse: 68,
      },
      {
        vendedor: 'TechBahia',
        valorBruto: 360,
        comissao: 28.8,
        valorRepasse: 331.2,
      },
    ]);
  });
});

describe('Relatórios: top produtos mais vendidos', () => {
  test('ordena por quantidade vendida nos pedidos confirmados', () => {
    const resposta = criarVendas().relatorioTopProdutos();

    assert.deepEqual(resposta.dados, [
      { produto: 'Mouse', quantidade: 3 },
      { produto: 'Livro de JavaScript', quantidade: 1 },
    ]);
  });

  test('sem pedidos confirmados, a lista fica vazia', () => {
    assert.deepEqual(criarMarketplace().relatorioTopProdutos().dados, []);
  });
});

describe('Aplicação de cupom pelo Marketplace', () => {
  test('aplica o cupom encontrado ao pedido', () => {
    const marketplace = criarMarketplace();
    const pedidoId = marketplace.criarPedido(CPF).dados.id;

    assert.deepEqual(marketplace.aplicarCupom(pedidoId, 'BEMVINDO10'), {
      ok: true,
      dados: { id: pedidoId, cupons: ['BEMVINDO10'] },
    });
  });

  test('retorna erro quando o cupom não existe', () => {
    const marketplace = criarMarketplace();
    const pedidoId = marketplace.criarPedido(CPF).dados.id;

    assert.deepEqual(marketplace.aplicarCupom(pedidoId, 'NAOEXISTE'), {
      ok: false,
      erros: ['Cupom NAOEXISTE não encontrado.'],
    });
  });

  test('retorna erro quando o pedido não existe', () => {
    const marketplace = criarMarketplace();

    assert.deepEqual(marketplace.aplicarCupom(99, 'BEMVINDO10'), {
      ok: false,
      erros: ['Pedido 99 não encontrado.'],
    });
  });
});
