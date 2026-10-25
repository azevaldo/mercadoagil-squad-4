import test from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';

const criarMarketplace = () =>
  new Marketplace({
    clientes: [
      {
        nome: 'Maria Santos',
        email: 'maria@example.com',
        cpf: '529.982.247-25',
        regiaoEntrega: 'Nordeste',
      },
    ],
    vendedores: [
      {
        nomeLoja: 'TechBahia',
        cnpj: '11.222.333/0001-81',
        email: 'contato@techbahia.com.br',
      },
    ],
    produtos: [
      {
        nome: 'Mouse',
        preco: 120,
        categoria: 'eletronicos',
        quantidade: 10,
        vendedorCnpj: '11.222.333/0001-81',
      },
    ],
  });

const criarPedido = (marketplace) =>
  marketplace.criarPedido('529.982.247-25').dados.id;

const idDoProduto = (marketplace) => marketplace.listarProdutos().dados[0].id;

test('rejeita quantidade zero, texto, negativa e fracionária', () => {
  ['0', 'abc', '-1', '1.5'].forEach((quantidade) => {
    const marketplace = criarMarketplace();
    const pedidoId = criarPedido(marketplace);

    const resposta = marketplace.adicionarItem(
      pedidoId,
      idDoProduto(marketplace),
      quantidade,
    );

    assert.equal(resposta.ok, false);
    assert.ok(resposta.erros.length > 0);
  });
});

test('informa quando o produto não existe', () => {
  const marketplace = criarMarketplace();
  const pedidoId = criarPedido(marketplace);

  assert.deepEqual(marketplace.adicionarItem(pedidoId, 99, '1'), {
    ok: false,
    erros: ['Produto 99 não encontrado.'],
  });
});

test('adiciona produto ao pedido com quantidade válida', () => {
  const marketplace = criarMarketplace();
  const pedidoId = criarPedido(marketplace);

  assert.deepEqual(
    marketplace.adicionarItem(pedidoId, idDoProduto(marketplace), '2'),
    {
      ok: true,
      dados: { id: pedidoId, totalItens: 1 },
    },
  );
});
