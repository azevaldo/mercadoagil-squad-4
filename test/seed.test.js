import test from 'node:test';
import assert from 'node:assert/strict';
import { produtoSchema } from '../src/schemas/produtoSchema.js';
import { validar } from '../src/schemas/validar.js';
import {
  clientes,
  cupons,
  dadosIniciais,
  produtos,
  vendedores,
} from '../src/data/seed.js';

test('fornece as quantidades mínimas de dados exigidas pela rubrica', () => {
  const categorias = new Set(produtos.map(({ categoria }) => categoria));

  assert.ok(clientes.length >= 3);
  assert.ok(vendedores.length >= 3);
  assert.ok(produtos.length >= 8);
  assert.ok(categorias.size >= 3);
  assert.ok(cupons.length >= 3);
  assert.deepEqual(dadosIniciais, { clientes, vendedores, produtos, cupons });
});

test('produtos do seed passam pelo schema e referenciam vendedores cadastrados', () => {
  const respostas = produtos.map((produto) => validar(produtoSchema, produto));
  const cnpjsCadastrados = new Set(
    vendedores.map(({ cnpj }) => cnpj.replace(/\D/g, '')),
  );

  assert.ok(respostas.every((resposta) => resposta.ok));
  assert.ok(
    produtos.every(({ vendedorCnpj }) =>
      cnpjsCadastrados.has(vendedorCnpj.replace(/\D/g, '')),
    ),
  );
});

test('inclui os itens e vendedores do pedido de exemplo da rubrica', () => {
  const mouse = produtos.find(({ nome }) => nome === 'Mouse');
  const livro = produtos.find(({ nome }) => nome === 'Livro de JavaScript');
  const clienteNordeste = clientes.find(
    ({ regiaoEntrega }) => regiaoEntrega === 'Nordeste',
  );
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
