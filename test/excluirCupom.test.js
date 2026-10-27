import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';
import { dadosIniciais } from '../src/data/seed.js';

const CPF_MARIA = '529.982.247-25';

// Pedido aberto de Maria com Mouse e Livro, com BEMVINDO10 aplicado
const comCupomAplicado = () => {
  const mp = new Marketplace(dadosIniciais);
  const { id } = mp.criarPedido(CPF_MARIA).dados;
  mp.adicionarItem(id, 1, 1);
  mp.adicionarItem(id, 2, 1);
  mp.aplicarCupom(id, 'BEMVINDO10');
  return { mp, pedido: id };
};

describe('excluirCupom', () => {
  test('recusa excluir cupom aplicado a pedido aberto', () => {
    const { mp } = comCupomAplicado();

    const resposta = mp.excluirCupom('BEMVINDO10');

    assert.equal(resposta.ok, false);
    assert.deepEqual(resposta.erros, [
      'Este cupom está aplicado a um pedido aberto. Retire-o do pedido antes de excluir.',
    ]);
    assert.equal(mp.buscarCupom('BEMVINDO10').ok, true);
  });

  test('verifica o pedido aberto mesmo com código em minúsculas e espaços', () => {
    const { mp } = comCupomAplicado();

    assert.equal(mp.excluirCupom('  bemvindo10 ').ok, false);
    assert.equal(mp.buscarCupom('BEMVINDO10').ok, true);
  });

  test('exclui depois que o cupom sai do pedido aberto', () => {
    const { mp, pedido } = comCupomAplicado();
    assert.equal(mp.removerCupom(pedido, 'BEMVINDO10').ok, true);

    assert.equal(mp.excluirCupom('BEMVINDO10').ok, true);
    assert.equal(mp.buscarCupom('BEMVINDO10').ok, false);
  });

  test('exclui depois que o pedido aberto é cancelado', () => {
    const { mp, pedido } = comCupomAplicado();
    mp.cancelarPedido(pedido);

    assert.deepEqual(mp.excluirCupom('BEMVINDO10'), {
      ok: true,
      dados: {
        codigo: 'BEMVINDO10',
        mensagem: 'Cupom excluído com sucesso.',
      },
    });
  });

  test('cupom aplicado a pedido confirmado não bloqueia a exclusão', () => {
    const { mp, pedido } = comCupomAplicado();
    mp.confirmarPedido(pedido);

    assert.equal(mp.excluirCupom('BEMVINDO10').ok, true);
  });

  test('cupom que não está em nenhum pedido pode ser excluído', () => {
    const mp = new Marketplace(dadosIniciais);

    assert.equal(mp.excluirCupom('FRETEZERO').ok, true);
  });

  test('cupom inexistente retorna erro', () => {
    const mp = new Marketplace(dadosIniciais);

    assert.deepEqual(mp.excluirCupom('NAOEXISTE'), {
      ok: false,
      erros: ['Cupom não encontrado.'],
    });
  });
});
