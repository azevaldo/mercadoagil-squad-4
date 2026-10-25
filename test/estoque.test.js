import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Estoque } from '../src/models/Estoque.js';

const mouse = { id: 1, nome: 'Mouse Sem Fio' };
const teclado = { id: 2, nome: 'Teclado Mecânico' };

// Estoque com Mouse (5 unidades) e Teclado (3 unidades)
const criarEstoque = () => {
  const estoque = new Estoque();
  estoque.cadastrar(mouse, 5);
  estoque.cadastrar(teclado, 3);
  return estoque;
};

describe('Estoque: cadastrar, disponivel e remover', () => {
  test('cadastrar devolve sucesso com id e quantidade', () => {
    const estoque = new Estoque();

    assert.deepEqual(estoque.cadastrar(mouse, 5), {
      ok: true,
      dados: { produtoId: 1, quantidade: 5 },
    });
  });

  test('disponivel devolve a quantidade cadastrada', () => {
    assert.equal(criarEstoque().disponivel(1), 5);
  });

  test('disponivel de produto sem cadastro é 0', () => {
    assert.equal(new Estoque().disponivel(99), 0);
  });

  test('cadastrar de novo produto define a quantidade (não soma)', () => {
    const estoque = criarEstoque();

    estoque.cadastrar(mouse, 2);

    assert.equal(estoque.disponivel(1), 2);
  });

  test('remover zera a disponibilidade do produto e não mexe nos outros', () => {
    const estoque = criarEstoque();

    assert.deepEqual(estoque.remover(1), { ok: true, dados: { produtoId: 1 } });
    assert.equal(estoque.disponivel(1), 0);
    assert.equal(estoque.disponivel(2), 3);
  });
});

describe('Estoque: faltas', () => {
  test('lista vazia quando a quantidade pedida é igual à disponível', () => {
    const estoque = criarEstoque();

    assert.deepEqual(estoque.faltas([{ produto: mouse, quantidade: 5 }]), []);
  });

  test('lista o item cuja quantidade pedida passa do disponível', () => {
    const estoque = criarEstoque();

    assert.deepEqual(estoque.faltas([{ produto: mouse, quantidade: 6 }]), [
      'Estoque insuficiente: Mouse Sem Fio (pedido 6, disponível 5)',
    ]);
  });

  test('lista todos os itens em falta, não só o primeiro', () => {
    const estoque = criarEstoque();

    const faltas = estoque.faltas([
      { produto: mouse, quantidade: 6 },
      { produto: teclado, quantidade: 4 },
    ]);

    assert.equal(faltas.length, 2);
  });

  test('produto sem cadastro conta como falta', () => {
    const estoque = new Estoque();

    assert.deepEqual(estoque.faltas([{ produto: mouse, quantidade: 1 }]), [
      'Estoque insuficiente: Mouse Sem Fio (pedido 1, disponível 0)',
    ]);
  });

  test('não altera o estoque', () => {
    const estoque = criarEstoque();

    estoque.faltas([{ produto: mouse, quantidade: 99 }]);

    assert.equal(estoque.disponivel(1), 5);
  });
});

describe('Estoque: baixar', () => {
  test('dá baixa nas quantidades e devolve sucesso', () => {
    const estoque = criarEstoque();

    const resultado = estoque.baixar([
      { produto: mouse, quantidade: 2 },
      { produto: teclado, quantidade: 1 },
    ]);

    assert.deepEqual(resultado, { ok: true, dados: { baixados: 2 } });
    assert.equal(estoque.disponivel(1), 3);
    assert.equal(estoque.disponivel(2), 2);
  });

  test('tudo ou nada: se um item falta, nenhum é baixado', () => {
    const estoque = criarEstoque();

    const resultado = estoque.baixar([
      { produto: mouse, quantidade: 2 },
      { produto: teclado, quantidade: 10 },
    ]);

    assert.equal(resultado.ok, false);
    assert.equal(estoque.disponivel(1), 5);
    assert.equal(estoque.disponivel(2), 3);
  });

  test('a falha lista todos os itens em falta', () => {
    const estoque = criarEstoque();

    const resultado = estoque.baixar([
      { produto: mouse, quantidade: 6 },
      { produto: teclado, quantidade: 4 },
    ]);

    assert.deepEqual(resultado, {
      ok: false,
      erros: [
        'Estoque insuficiente: Mouse Sem Fio (pedido 6, disponível 5)',
        'Estoque insuficiente: Teclado Mecânico (pedido 4, disponível 3)',
      ],
    });
  });

  test('baixar a quantidade exata deixa o estoque em zero', () => {
    const estoque = criarEstoque();

    estoque.baixar([{ produto: mouse, quantidade: 5 }]);

    assert.equal(estoque.disponivel(1), 0);
  });

  test('lista vazia não baixa nada e devolve sucesso com 0 itens', () => {
    const estoque = criarEstoque();

    assert.deepEqual(estoque.baixar([]), { ok: true, dados: { baixados: 0 } });
  });
});

describe('Estoque: devolver', () => {
  test('soma as quantidades de volta ao estoque', () => {
    const estoque = criarEstoque();

    estoque.devolver([{ produto: mouse, quantidade: 2 }]);

    assert.equal(estoque.disponivel(1), 7);
  });

  test('baixar e depois devolver deixa o estoque como estava', () => {
    const estoque = criarEstoque();
    const itens = [
      { produto: mouse, quantidade: 4 },
      { produto: teclado, quantidade: 3 },
    ];

    estoque.baixar(itens);
    estoque.devolver(itens);

    assert.equal(estoque.disponivel(1), 5);
    assert.equal(estoque.disponivel(2), 3);
  });
});
