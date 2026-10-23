import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIAS_PRODUTO,
  FRETE_POR_REGIAO,
  FRETE_POR_UNIDADE,
  FRETE_GRATIS_A_PARTIR_DE,
  TRIBUTOS_POR_CATEGORIA,
  COMISSOES_POR_CATEGORIA,
  TETO_DESCONTO_PERCENTUAL,
  LIMITE_CUPONS_POR_PEDIDO,
} from '../src/config/regras.js';

test('configura as categorias e os tributos', () => {
  assert.deepEqual(CATEGORIAS_PRODUTO, [
    'eletronicos',
    'livros',
    'alimentos',
    'vestuario',
    'casa',
  ]);

  assert.deepEqual(TRIBUTOS_POR_CATEGORIA, {
    eletronicos: 0.12,
    livros: 0,
    alimentos: 0.05,
    vestuario: 0.08,
    casa: 0.1,
  });
});

test('configura as comissões por categoria', () => {
  assert.deepEqual(COMISSOES_POR_CATEGORIA, {
    eletronicos: 0.08,
    livros: 0.15,
    alimentos: 0.1,
    vestuario: 0.12,
    casa: 0.1,
  });
});

test('configura as regras de frete', () => {
  assert.deepEqual(FRETE_POR_REGIAO, {
    Norte: 35,
    Nordeste: 25,
    'Centro-Oeste': 30,
    Sudeste: 20,
    Sul: 22,
  });

  assert.equal(FRETE_POR_UNIDADE, 1.5);
  assert.equal(FRETE_GRATIS_A_PARTIR_DE, 300);
});

test('limita desconto e quantidade de cupons', () => {
  assert.equal(TETO_DESCONTO_PERCENTUAL, 0.3);
  assert.equal(LIMITE_CUPONS_POR_PEDIDO, 2);
});
