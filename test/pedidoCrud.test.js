import test from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';

const clienteInicial = {
  nome: 'Pedro Silva',
  email: 'pedro@example.com',
  cpf: '529.982.247-25',
  regiaoEntrega: 'Nordeste',
};

const criarMarketplace = () =>
  new Marketplace({ clientes: [{ ...clienteInicial }] });

test('cria pedido aberto para cliente existente sem expor o CPF', () => {
  const marketplace = criarMarketplace();

  const resposta = marketplace.criarPedido(clienteInicial.cpf);

  assert.deepEqual(resposta, {
    ok: true,
    dados: {
      id: 1,
      cliente: 'Pedro Silva',
      status: 'aberto',
    },
  });
  assert.equal(JSON.stringify(resposta).includes('52998224725'), false);
});

test('aceita CPF formatado ao criar pedido', () => {
  const marketplace = criarMarketplace();

  const resposta = marketplace.criarPedido('529.982.247-25');

  assert.equal(resposta.ok, true);
  assert.equal(resposta.dados.cliente, 'Pedro Silva');
});

test('recusa CPF sem cliente cadastrado e mantém a sequência de IDs', () => {
  const marketplace = criarMarketplace();

  assert.deepEqual(marketplace.criarPedido('111.111.111-11'), {
    ok: false,
    erros: [
      'Cliente não encontrado. Cadastre o cliente antes de criar o pedido.',
    ],
  });

  assert.equal(marketplace.criarPedido(clienteInicial.cpf).dados.id, 1);
  assert.equal(marketplace.criarPedido(clienteInicial.cpf).dados.id, 2);
});
