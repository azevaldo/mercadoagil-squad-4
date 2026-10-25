import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/Marketplace.js';
import { Pedido } from '../src/models/Pedido.js';
import { Estoque } from '../src/models/Estoque.js';
import { CupomDesconto } from '../src/models/CupomDesconto.js';

// Pedido ficticio completo: cliente do Nordeste, Mouse + Livro e cupom aplicado.
// Os produtos e o cliente são objetos simples, como nos outros testes de pedido.
const techBahia = { nomeLoja: 'TechBahia', cnpj: '11222333000181' };
const livrariaSol = { nomeLoja: 'Livraria Sol', cnpj: '45723174000110' };

const mouse = { id: 1, nome: 'Mouse', preco: 120, categoria: 'eletronicos', vendedor: techBahia };
const livro = { id: 2, nome: 'Livro de JavaScript', preco: 80, categoria: 'livros', vendedor: livrariaSol };

const cliente = { nome: 'Maria Santos', regiaoEntrega: 'Nordeste' };

const cupomBemVindo = () =>
  new CupomDesconto({
    codigo: 'BEMVINDO10',
    tipo: 'percentual',
    valor: 10,
    validade: '2030-12-31',
    valorMinimo: 0,
    cumulativo: true,
  });

const cupomMinimo150 = () =>
  new CupomDesconto({
    codigo: 'MIN150',
    tipo: 'fixo',
    valor: 15,
    validade: '2030-12-31',
    valorMinimo: 150,
    cumulativo: true,
  });

// Estoque com 5 unidades de cada produto
const criarEstoque = () => {
  const estoque = new Estoque();
  estoque.cadastrar(mouse, 5);
  estoque.cadastrar(livro, 5);
  return estoque;
};

// Pedido completo: 1 Mouse + 1 Livro, com o cupom informado já aplicado
const pedidoCompleto = (cupons = [cupomBemVindo()]) => {
  const pedido = new Pedido(1, cliente);
  pedido.adicionarItem(mouse, 1);
  pedido.adicionarItem(livro, 1);
  cupons.forEach((cupom) => pedido.aplicarCupom(cupom));
  return pedido;
};

const idsDosItens = (pedido) => pedido.itens.map((item) => item.produto.id);

describe('Pedido ficticio completo: removerItem', () => {
  test('remove o Mouse e o pedido fica só com o Livro', () => {
    const pedido = pedidoCompleto();

    const resultado = pedido.removerItem(mouse.id);

    assert.equal(resultado.ok, true);
    assert.deepEqual(idsDosItens(pedido), [livro.id]);
  });

  test('o subtotal e o total são recalculados depois da remoção', () => {
    const pedido = pedidoCompleto();

    pedido.removerItem(mouse.id);
    const resumo = pedido.resumo().dados;

    // Só o Livro: 80 - 10% = 72, mais frete de Nordeste (R$ 25 + R$ 1,50)
    assert.equal(resumo.subtotal, 80);
    assert.equal(resumo.total, 98.5);
  });

  test('remover um produto que não está no pedido retorna falha', () => {
    const pedido = new Pedido(1, cliente);
    pedido.adicionarItem(livro, 1);

    assert.deepEqual(pedido.removerItem(mouse.id), {
      ok: false,
      erros: ['O produto 1 não está no pedido 1.'],
    });
    assert.deepEqual(idsDosItens(pedido), [livro.id]);
  });

  test('remover o item que deixa o cupom abaixo do mínimo é recusado e o item continua', () => {
    const pedido = pedidoCompleto([cupomMinimo150()]);

    const resultado = pedido.removerItem(mouse.id);

    assert.equal(resultado.ok, false);
    assert.ok(resultado.erros[0].startsWith('O cupom MIN150 exige subtotal mínimo'));
    assert.deepEqual(idsDosItens(pedido), [mouse.id, livro.id]);
  });

  test('pedido confirmado não aceita remoção de item', () => {
    const estoque = criarEstoque();
    const pedido = pedidoCompleto();
    assert.equal(pedido.confirmar(estoque).ok, true);

    assert.deepEqual(pedido.removerItem(mouse.id), {
      ok: false,
      erros: ['O pedido 1 está confirmado e não aceita alterações.'],
    });
    assert.deepEqual(idsDosItens(pedido), [mouse.id, livro.id]);
  });

  test('remover do pedido aberto não mexe no estoque', () => {
    const estoque = criarEstoque();
    const pedido = pedidoCompleto();

    pedido.removerItem(mouse.id);

    assert.equal(estoque.disponivel(mouse.id), 5);
  });
});

describe('Marketplace: removerItem, pedido inexistente e id inválido', () => {
  test('pedido inexistente retorna falha', () => {
    const mp = new Marketplace();

    assert.deepEqual(mp.removerItem(99, 1), {
      ok: false,
      erros: ['Pedido 99 não encontrado.'],
    });
  });

  test('id de pedido que não é texto de dígitos é recusado pelo schema', () => {
    const mp = new Marketplace();

    assert.deepEqual(mp.removerItem('abc', 1), {
      ok: false,
      erros: ['O id do pedido deve ser um número inteiro maior que zero.'],
    });
    assert.deepEqual(mp.removerItem('1.5', 1), {
      ok: false,
      erros: ['O id do pedido deve ser um número inteiro maior que zero.'],
    });
  });

  test('id de pedido zero é recusado pelo schema', () => {
    const mp = new Marketplace();

    assert.deepEqual(mp.removerItem('0', 1), {
      ok: false,
      erros: ['O id do pedido deve ser maior que zero.'],
    });
  });
});