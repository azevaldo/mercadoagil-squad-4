import test from 'node:test';
import assert from 'node:assert/strict';
import { validarProduto } from '../src/schemas/produtoSchema.js';
import {
  clientes,
  cupons,
  produtos,
  seed,
  vendedores,
} from '../src/data/seed.js';

test('fornece as quantidades mínimas de dados exigidas pela rubrica', () => {
  const categorias = new Set(produtos.map(({ categoria }) => categoria));

  assert.ok(clientes.length >= 3);
  assert.ok(vendedores.length >= 3);
  assert.ok(produtos.length >= 8);
  assert.ok(categorias.size >= 3);
  assert.ok(cupons.length >= 3);
  assert.deepEqual(seed, { clientes, vendedores, produtos, cupons });
});

test('produtos do seed passam pelo schema e referenciam vendedores cadastrados', () => {
  const respostas = produtos.map((produto) =>
    validarProduto(produto, vendedores),
  );

  assert.ok(respostas.every((resposta) => resposta.ok));
});

test('inclui os itens e vendedores do pedido de exemplo da rubrica', () => {
  const mouse = produtos.find(({ nome }) => nome === 'Mouse');
  const livro = produtos.find(({ nome }) => nome === 'Livro de JavaScript');
  const clienteNordeste = clientes.find(({ regiao }) => regiao === 'Nordeste');
  const nomesLojas = vendedores.map(({ nomeLoja }) => nomeLoja);

  assert.ok(clienteNordeste);
  assert.equal(mouse.preco, 120);
  assert.equal(livro.preco, 80);
  assert.ok(nomesLojas.includes('TechBahia'));
  assert.ok(nomesLojas.includes('Livraria Sol'));
  assert.deepEqual(
    cupons.slice(0, 2).map(({ codigo }) => codigo),
    ['BEMVINDO10', 'PDA15'],
  );
});

test('todos os cupons têm validade futura e os campos esperados', () => {
  const agora = Date.now();

  assert.ok(
    cupons.every(
      ({ codigo, tipo, validade, valor, valorMinimo, cumulativo }) =>
        typeof codigo === 'string' &&
        ['percentual', 'fixo', 'frete'].includes(tipo) &&
        validade instanceof Date &&
        validade.getTime() > agora &&
        typeof valor === 'number' &&
        typeof valorMinimo === 'number' &&
        typeof cumulativo === 'boolean',
    ),
  );
});
