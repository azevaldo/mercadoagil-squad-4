import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BancoSQLite } from '../src/data/sqlite.js';
import { dadosIniciais } from '../src/data/seed.js';
import { Marketplace } from '../src/services/MarketPlace.js';

const confirmarPedido = (marketplace) => {
  assert.equal(marketplace.criarPedido('52998224725').ok, true);
  assert.equal(marketplace.adicionarItem(1, 1, 1).ok, true);
  assert.equal(marketplace.confirmarPedido(1).ok, true);
};

test('pedido confirmado preserva cliente e produto após alterações no cadastro', () => {
  const marketplace = new Marketplace(dadosIniciais);
  confirmarPedido(marketplace);

  assert.equal(
    marketplace.atualizarCliente('52998224725', {
      nome: 'Maria Atualizada',
      email: 'maria.atualizada@example.com',
      regiaoEntrega: 'Sul',
    }).ok,
    true,
  );
  assert.equal(
    marketplace.atualizarProduto(1, { nome: 'Mouse Atualizado' }).ok,
    true,
  );

  const resumo = marketplace.resumoPedido(1).dados;
  assert.equal(resumo.cliente, 'Maria Santos');
  assert.equal(resumo.itens[0].produto, 'Mouse');
  assert.equal(marketplace.relatorioTopProdutos().dados[0].produto, 'Mouse');
});

test('pedido cancelado preserva os dados que tinha no encerramento', () => {
  const marketplace = new Marketplace(dadosIniciais);
  assert.equal(marketplace.criarPedido('52998224725').ok, true);
  assert.equal(marketplace.adicionarItem(1, 1, 1).ok, true);
  assert.equal(marketplace.cancelarPedido(1).ok, true);
  assert.equal(
    marketplace.atualizarCliente('52998224725', {
      nome: 'Maria Atualizada',
      email: 'maria.atualizada@example.com',
      regiaoEntrega: 'Sul',
    }).ok,
    true,
  );
  assert.equal(
    marketplace.atualizarProduto(1, { nome: 'Mouse Atualizado' }).ok,
    true,
  );

  const resumo = marketplace.resumoPedido(1).dados;
  assert.equal(resumo.status, 'cancelado');
  assert.equal(resumo.cliente, 'Maria Santos');
  assert.equal(resumo.itens[0].produto, 'Mouse');
});

test('pedido confirmado conserva o cliente original ao reabrir após recadastro', (t) => {
  const banco = new BancoSQLite(':memory:');
  t.after(() => banco.fechar());
  const marketplace = new Marketplace(dadosIniciais, {
    aoAlterar: (estado) => banco.salvarEstado(estado),
  });
  banco.salvarEstado(marketplace.exportarEstado());
  confirmarPedido(marketplace);

  assert.equal(marketplace.excluirCliente('52998224725').ok, true);
  assert.equal(
    marketplace.atualizarProduto(1, { nome: 'Mouse Atualizado' }).ok,
    true,
  );
  assert.equal(
    marketplace.cadastrarCliente({
      nome: 'Maria Recadastrada',
      email: 'maria.recadastrada@example.com',
      cpf: '52998224725',
      regiaoEntrega: 'Nordeste',
    }).ok,
    true,
  );

  const restaurado = new Marketplace(banco.carregarEstado());
  assert.equal(restaurado.resumoPedido(1).dados.cliente, 'Maria Santos');
  assert.equal(restaurado.resumoPedido(1).dados.itens[0].produto, 'Mouse');
});
