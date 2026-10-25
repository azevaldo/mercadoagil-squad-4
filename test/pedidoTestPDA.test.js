import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Pedido } from '../src/models/Pedido.js';
import { Estoque } from '../src/models/Estoque.js';
import { CupomDesconto } from '../src/models/CupomDesconto.js';

// Exemplo completo do enunciado:
// cliente do Nordeste, 1 Mouse + 1 Livro de JavaScript, cupons BEMVINDO10 e PDA15
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

const cliente = { nome: 'Cliente do Nordeste', regiaoEntrega: 'Nordeste' };

const bemVindo10 = () =>
  new CupomDesconto({
    codigo: 'BEMVINDO10',
    tipo: 'percentual',
    valor: 10,
    validade: '2030-12-31',
    valorMinimo: 0,
    cumulativo: true,
  });

const pda15 = () =>
  new CupomDesconto({
    codigo: 'PDA15',
    tipo: 'fixo',
    valor: 15,
    validade: '2030-12-31',
    valorMinimo: 0,
    cumulativo: true,
  });

const criarEstoque = () => {
  const estoque = new Estoque();
  estoque.cadastrar(mouse, 10);
  estoque.cadastrar(livro, 10);
  return estoque;
};

const montarPedido = () => {
  const pedido = new Pedido(1, cliente);
  pedido.adicionarItem(mouse, 1);
  pedido.adicionarItem(livro, 1);
  pedido.aplicarCupom(bemVindo10());
  pedido.aplicarCupom(pda15());
  return pedido;
};

describe('Exemplo completo do enunciado', () => {
  test('subtotal R$ 200, descontos R$ 35, frete R$ 28 e total R$ 193', () => {
    const resumo = montarPedido().resumo().dados;

    assert.equal(resumo.subtotal, 200);
    assert.equal(resumo.descontos, 35);
    assert.equal(resumo.frete, 28);
    assert.equal(resumo.total, 193);
  });

  test('descontos ficam dentro do teto de 30% (R$ 60,00)', () => {
    const resumo = montarPedido().resumo().dados;

    assert.ok(resumo.descontos <= 60);
  });

  test('tributos R$ 14,40, comissão R$ 21,60 e repasses por vendedor', () => {
    const pedido = montarPedido();
    pedido.confirmar(criarEstoque());
    const resumo = pedido.resumo().dados;

    assert.equal(resumo.tributos, 14.4);
    assert.equal(resumo.comissao, 21.6);
    assert.deepEqual(resumo.repasses, [
      { vendedor: 'TechBahia', bruto: 120, comissao: 9.6, repasse: 110.4 },
      { vendedor: 'Livraria Sol', bruto: 80, comissao: 12, repasse: 68 },
    ]);
  });
});
