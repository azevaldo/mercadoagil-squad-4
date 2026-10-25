import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Pedido } from '../src/models/Pedido.js';
import { Estoque } from '../src/models/Estoque.js';
import { CupomDesconto } from '../src/models/CupomDesconto.js';

const techBahia = { nomeLoja: 'TechBahia', cnpj: '11222333000181' };
const livrariaSol = { nomeLoja: 'Livraria Sol', cnpj: '45723174000110' };

const mouse = {
  id: 1,
  nome: 'Mouse',
  preco: 120,
  categoria: 'eletronicos',
  vendedor: techBahia,
};
const livro = {
  id: 2,
  nome: 'Livro de JavaScript',
  preco: 80,
  categoria: 'livros',
  vendedor: livrariaSol,
};
const caneca = {
  id: 3,
  nome: 'Caneca',
  preco: 100,
  categoria: 'casa',
  vendedor: techBahia,
};
const notebook = {
  id: 4,
  nome: 'Notebook',
  preco: 300,
  categoria: 'eletronicos',
  vendedor: techBahia,
};

const cliente = { nome: 'Maria Santos', regiaoEntrega: 'Nordeste' };

// Cupons de teste: validade longe no futuro, salvo quando o teste pede outra data
const cupom = (dados) =>
  new CupomDesconto({
    validade: '2030-12-31',
    valorMinimo: 0,
    cumulativo: true,
    ...dados,
  });

const bemVindo = () =>
  cupom({ codigo: 'BEMVINDO10', tipo: 'percentual', valor: 10 });
const pda15 = () => cupom({ codigo: 'PDA15', tipo: 'fixo', valor: 15 });
const freteZero = () =>
  cupom({ codigo: 'FRETEZERO', tipo: 'frete', valor: 0, cumulativo: false });

// Estoque com 10 unidades de cada produto, salvo quando o teste informa outro valor
const criarEstoque = (...produtos) => {
  const estoque = new Estoque();
  produtos.forEach((produto) => estoque.cadastrar(produto, 10));
  return estoque;
};

const novoPedido = () => new Pedido(1, cliente);

describe('Pedido: itens', () => {
  test('novo pedido começa aberto e sem itens', () => {
    const pedido = novoPedido();

    assert.equal(pedido.status, 'aberto');
    assert.deepEqual(pedido.itens, []);
  });

  test('adicionar o mesmo produto soma a quantidade', () => {
    const pedido = novoPedido();

    pedido.adicionarItem(mouse, 2);
    pedido.adicionarItem(mouse, 3);

    assert.equal(pedido.itens.length, 1);
    assert.equal(pedido.itens[0].quantidade, 5);
  });

  [0, -1, 1.5].forEach((quantidade) => {
    test(`recusa quantidade ${quantidade}`, () => {
      const pedido = novoPedido();

      const resultado = pedido.adicionarItem(mouse, quantidade);

      assert.equal(resultado.ok, false);
      assert.deepEqual(pedido.itens, []);
    });
  });

  test('remover produto que não está no pedido retorna falha', () => {
    const pedido = novoPedido();

    assert.deepEqual(pedido.removerItem(mouse.id), {
      ok: false,
      erros: ['O produto 1 não está no pedido 1.'],
    });
  });

  test('itens devolvidos são cópias: alterar a lista não muda o pedido', () => {
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 2);

    pedido.itens[0].quantidade = 99;

    assert.equal(pedido.itens[0].quantidade, 2);
  });
});

describe('Pedido: cupons', () => {
  test('aceita no máximo dois cupons por pedido', () => {
    const pedido = novoPedido();
    pedido.adicionarItem(notebook, 1);
    pedido.aplicarCupom(bemVindo());
    pedido.aplicarCupom(pda15());

    const resultado = pedido.aplicarCupom(
      cupom({ codigo: 'OUTRO', tipo: 'fixo', valor: 5 }),
    );

    assert.deepEqual(resultado, {
      ok: false,
      erros: ['O pedido aceita no máximo 2 cupons.'],
    });
  });

  test('não aceita o mesmo cupom duas vezes', () => {
    const pedido = novoPedido();
    pedido.adicionarItem(notebook, 1);
    pedido.aplicarCupom(pda15());

    const resultado = pedido.aplicarCupom(pda15());

    assert.equal(resultado.ok, false);
    assert.deepEqual(resultado.erros, ['O cupom PDA15 já está no pedido.']);
  });

  test('cupom não cumulativo só pode ser usado sozinho', () => {
    const pedido = novoPedido();
    pedido.adicionarItem(notebook, 1);
    pedido.aplicarCupom(pda15());

    const resultado = pedido.aplicarCupom(freteZero());

    assert.equal(resultado.ok, false);
    assert.deepEqual(resultado.erros, [
      'O cupom FRETEZERO não é cumulativo e só pode ser usado sozinho.',
    ]);
  });

  test('recusa cupom vencido', () => {
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 1);

    const resultado = pedido.aplicarCupom(
      cupom({
        codigo: 'VENCIDO',
        tipo: 'fixo',
        valor: 5,
        validade: '2020-01-01',
      }),
    );

    assert.deepEqual(resultado, {
      ok: false,
      erros: ['O cupom VENCIDO está vencido.'],
    });
  });

  test('recusa cupom quando o subtotal não atinge o mínimo', () => {
    const pedido = novoPedido();
    pedido.adicionarItem(livro, 1);

    const resultado = pedido.aplicarCupom(
      cupom({ codigo: 'PDA15', tipo: 'fixo', valor: 15, valorMinimo: 150 }),
    );

    assert.deepEqual(resultado, {
      ok: false,
      erros: ['O cupom PDA15 exige subtotal mínimo de R$ 150,00.'],
    });
  });

  test('remover item que deixa o cupom abaixo do mínimo é recusado', () => {
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 1);
    pedido.adicionarItem(livro, 1);
    pedido.aplicarCupom(
      cupom({ codigo: 'PDA15', tipo: 'fixo', valor: 15, valorMinimo: 150 }),
    );

    const resultado = pedido.removerItem(mouse.id);

    assert.equal(resultado.ok, false);
    assert.equal(pedido.itens.length, 2);
  });

  test('cupom vencido depois de aplicado impede a confirmação', () => {
    const pedido = novoPedido();
    const estoque = criarEstoque(mouse);
    const aplicado = pda15();
    pedido.adicionarItem(mouse, 1);
    pedido.aplicarCupom(aplicado);

    aplicado.atualizar({ validade: '2020-01-01' });
    const resultado = pedido.confirmar(estoque);

    assert.equal(resultado.ok, false);
    assert.deepEqual(resultado.erros, ['O cupom PDA15 está vencido.']);
    assert.equal(pedido.status, 'aberto');
  });
});

describe('Pedido: cálculo', () => {
  test('pedido de referência: subtotal 200, descontos 35, frete 28 e total 193', () => {
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 1);
    pedido.adicionarItem(livro, 1);
    pedido.aplicarCupom(bemVindo());
    pedido.aplicarCupom(pda15());

    const resumo = pedido.resumo().dados;

    assert.equal(resumo.subtotal, 200);
    assert.equal(resumo.descontos, 35);
    assert.equal(resumo.frete, 28);
    assert.equal(resumo.total, 193);
  });

  test('pedido de referência: tributos e comissão são informativos e repasse por vendedor', () => {
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 1);
    pedido.adicionarItem(livro, 1);
    pedido.aplicarCupom(bemVindo());
    pedido.aplicarCupom(pda15());

    pedido.confirmar(criarEstoque(mouse, livro));
    const resumo = pedido.resumo().dados;

    assert.equal(resumo.tributos, 14.4);
    assert.equal(resumo.comissao, 21.6);
    assert.deepEqual(resumo.repasses, [
      { vendedor: 'TechBahia', bruto: 120, comissao: 9.6, repasse: 110.4 },
      { vendedor: 'Livraria Sol', bruto: 80, comissao: 12, repasse: 68 },
    ]);
  });

  test('só pedido confirmado gera repasse: aberto e cancelado mostram lista vazia', () => {
    const estoque = criarEstoque(mouse, livro);
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 1);
    pedido.adicionarItem(livro, 1);

    assert.deepEqual(pedido.resumo().dados.repasses, []);

    pedido.confirmar(estoque);
    assert.equal(pedido.resumo().dados.repasses.length, 2);

    pedido.cancelar(estoque);
    assert.deepEqual(pedido.resumo().dados.repasses, []);
  });

  test('desconto fixo não passa do teto de 30% do subtotal', () => {
    const pedido = novoPedido();
    pedido.adicionarItem(caneca, 1);
    pedido.aplicarCupom(cupom({ codigo: 'GRANDE', tipo: 'fixo', valor: 90 }));

    const resumo = pedido.resumo().dados;

    // Subtotal 100 - 30 de desconto = 70, + frete do Nordeste (R$ 25 + R$ 1,50)
    assert.equal(resumo.descontos, 30);
    assert.equal(resumo.total, 96.5);
  });

  test('frete é grátis a partir de R$ 300,00 já com descontos', () => {
    const pedido = novoPedido();
    pedido.adicionarItem(notebook, 1);

    assert.equal(pedido.resumo().dados.frete, 0);
    assert.equal(pedido.resumo().dados.total, 300);
  });

  test('cupom de frete zera o frete', () => {
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 1);
    pedido.aplicarCupom(freteZero());

    assert.equal(pedido.resumo().dados.frete, 0);
    assert.equal(pedido.resumo().dados.total, 120);
  });

  test('frete soma a taxa da região e R$ 1,50 por unidade', () => {
    const pedido = new Pedido(1, { nome: 'Carla', regiaoEntrega: 'Sul' });
    pedido.adicionarItem(livro, 3);

    // Sul: R$ 22,00 + 3 x R$ 1,50
    assert.equal(pedido.resumo().dados.frete, 26.5);
    assert.equal(pedido.resumo().dados.total, 266.5);
  });

  test('preço já lançado no pedido não muda quando o produto é alterado depois', () => {
    const pedido = novoPedido();
    const produtoAlterado = { ...mouse, preco: 999 };
    pedido.adicionarItem(mouse, 1);

    pedido.adicionarItem(produtoAlterado, 1);

    assert.equal(pedido.resumo().dados.subtotal, 240);
  });
});

describe('Pedido: confirmar e cancelar', () => {
  test('confirmar pedido vazio é recusado', () => {
    const resultado = novoPedido().confirmar(criarEstoque());

    assert.deepEqual(resultado, {
      ok: false,
      erros: ['Não é possível confirmar um pedido vazio.'],
    });
  });

  test('confirmar com estoque suficiente dá baixa e muda o status', () => {
    const estoque = criarEstoque(mouse, livro);
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 2);

    const resultado = pedido.confirmar(estoque);

    assert.equal(resultado.ok, true);
    assert.equal(pedido.status, 'confirmado');
    assert.equal(estoque.disponivel(mouse.id), 8);
  });

  test('confirmar com itens em falta não dá baixa em nenhum item e lista todos', () => {
    const estoque = new Estoque();
    estoque.cadastrar(mouse, 1);
    estoque.cadastrar(livro, 1);
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 2);
    pedido.adicionarItem(livro, 2);

    const resultado = pedido.confirmar(estoque);

    assert.equal(resultado.ok, false);
    assert.equal(resultado.erros.length, 2);
    assert.equal(estoque.disponivel(mouse.id), 1);
    assert.equal(estoque.disponivel(livro.id), 1);
    assert.equal(pedido.status, 'aberto');
  });

  test('confirmar pedido já confirmado é recusado', () => {
    const estoque = criarEstoque(mouse);
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 1);
    pedido.confirmar(estoque);

    const resultado = pedido.confirmar(estoque);

    assert.deepEqual(resultado, {
      ok: false,
      erros: ['O pedido 1 já está confirmado.'],
    });
  });

  test('pedido confirmado não aceita mais alterações nos itens', () => {
    const estoque = criarEstoque(mouse);
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 1);
    pedido.confirmar(estoque);

    const resultado = pedido.adicionarItem(mouse, 1);

    assert.deepEqual(resultado, {
      ok: false,
      erros: ['O pedido 1 está confirmado e não aceita alterações.'],
    });
  });

  test('cancelar pedido confirmado devolve os itens ao estoque', () => {
    const estoque = criarEstoque(mouse);
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 3);
    pedido.confirmar(estoque);

    const resultado = pedido.cancelar(estoque);

    assert.deepEqual(resultado, {
      ok: true,
      dados: { id: 1, status: 'cancelado' },
    });
    assert.equal(estoque.disponivel(mouse.id), 10);
  });

  test('cancelar pedido aberto não mexe no estoque', () => {
    const estoque = criarEstoque(mouse);
    const pedido = novoPedido();
    pedido.adicionarItem(mouse, 3);

    pedido.cancelar(estoque);

    assert.equal(pedido.status, 'cancelado');
    assert.equal(estoque.disponivel(mouse.id), 10);
  });

  test('cancelar pedido já cancelado é recusado', () => {
    const pedido = novoPedido();
    pedido.cancelar(criarEstoque());

    const resultado = pedido.cancelar(criarEstoque());

    assert.deepEqual(resultado, {
      ok: false,
      erros: ['O pedido 1 já está cancelado.'],
    });
  });
});
