import test from 'node:test';
import assert from 'node:assert/strict';
import { Produto } from '../src/models/Produto.js';
import { validarProduto } from '../src/schemas/produtoSchema.js';

const produtoValido = {
  nome: 'Teclado',
  preco: '120,50',
  categoria: 'eletronicos',
  quantidade: '4',
  cnpjVendedor: '11.222.333/0001-81',
};

test('valida e normaliza os dados de cadastro do produto', () => {
  const resposta = validarProduto(produtoValido);

  assert.deepEqual(resposta, {
    ok: true,
    dados: {
      nome: 'Teclado',
      preco: 120.5,
      categoria: 'eletronicos',
      quantidade: 4,
      cnpjVendedor: '11222333000181',
    },
  });
});

test('retorna erros de serviço para preço, categoria, quantidade e CNPJ inválidos', () => {
  const resposta = validarProduto({
    ...produtoValido,
    preco: 'abc',
    categoria: 'brinquedos',
    quantidade: '1.5',
    cnpjVendedor: '11.222.333/0001-80',
  });

  assert.equal(resposta.ok, false);
  assert.equal(resposta.erros.length, 4);
});

test('rejeita vendedor não cadastrado quando a lista é informada', () => {
  const resposta = validarProduto(produtoValido, []);

  assert.deepEqual(resposta, {
    ok: false,
    erros: ['Não existe vendedor cadastrado com o CNPJ informado.'],
  });
});

test('Produto serializa os dados e o nome da loja do vendedor', () => {
  const vendedor = {
    nomeLoja: 'Loja Central',
    cnpj: '11.222.333/0001-81',
    email: 'contato@lojacentral.com',
  };
  const produto = new Produto({
    id: 1,
    nome: 'Teclado',
    preco: 120.5,
    categoria: 'eletronicos',
    vendedor,
  });

  assert.deepEqual(JSON.parse(JSON.stringify(produto)), {
    id: 1,
    nome: 'Teclado',
    preco: 120.5,
    categoria: 'eletronicos',
    vendedor: 'Loja Central',
  });
  assert.equal(produto.vendedor, vendedor);
});
