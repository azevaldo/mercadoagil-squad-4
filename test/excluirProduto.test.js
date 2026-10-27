import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';
import { dadosIniciais } from '../src/data/seed.js';

const CPF_MARIA = '529.982.247-25';

// Pedido aberto de Maria com o Mouse (id 1)
const comPedidoComMouse = () => {
  const mp = new Marketplace(dadosIniciais);
  const { id } = mp.criarPedido(CPF_MARIA).dados;
  mp.adicionarItem(id, 1, 1);
  return { mp, pedido: id };
};

describe('excluirProduto', () => {
  test('recusa excluir produto que está em pedido aberto', () => {
    const { mp } = comPedidoComMouse();

    const resposta = mp.excluirProduto(1);

    assert.equal(resposta.ok, false);
    assert.deepEqual(resposta.erros, [
      'Este produto está em um pedido aberto. Remova-o do pedido antes de excluir.',
    ]);
    assert.equal(mp.buscarProduto('1').ok, true);
  });

  test('aceita o id do produto em texto ao verificar pedido aberto', () => {
    const { mp } = comPedidoComMouse();

    assert.equal(mp.excluirProduto('1').ok, false);
  });

  test('exclui depois que o produto sai do pedido aberto', () => {
    const { mp, pedido } = comPedidoComMouse();
    assert.equal(mp.removerItem(pedido, 1).ok, true);

    assert.equal(mp.excluirProduto(1).ok, true);
    assert.equal(mp.buscarProduto('1').ok, false);
  });

  test('exclui depois que o pedido aberto é cancelado', () => {
    const { mp, pedido } = comPedidoComMouse();
    mp.cancelarPedido(pedido);

    assert.equal(mp.excluirProduto(1).ok, true);
    assert.equal(
      mp.listarProdutos().dados.some((p) => p.id === 1),
      false,
    );
  });

  test('pedido aberto de outro produto não bloqueia a exclusão', () => {
    const { mp } = comPedidoComMouse();

    assert.equal(mp.excluirProduto(2).ok, true); // Livro de JavaScript
  });

  test('pedido já confirmado não bloqueia a exclusão', () => {
    const { mp, pedido } = comPedidoComMouse();
    mp.confirmarPedido(pedido);

    assert.equal(mp.excluirProduto(1).ok, true);
  });

  test('produto inexistente retorna erro', () => {
    const mp = new Marketplace(dadosIniciais);

    assert.deepEqual(mp.excluirProduto(999), {
      ok: false,
      erros: ['Produto não encontrado.'],
    });
  });
});
