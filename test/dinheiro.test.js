import test from 'node:test';
import assert from 'node:assert/strict';
import { arredondarDinheiro, formatarReais } from '../src/utils/dinheiro.js';

test('arredonda valores para duas casas decimais', () => {
  assert.equal(arredondarDinheiro(14.399999), 14.4);
  assert.equal(arredondarDinheiro(1234.567), 1234.57);
  assert.equal(arredondarDinheiro(0.1 + 0.2), 0.3);
});

test('formata valores em reais no padrão brasileiro', () => {
  assert.equal(formatarReais(1234.5), 'R$ 1.234,50');
  assert.equal(formatarReais(14.399999), 'R$ 14,40');
  assert.equal(formatarReais(0), 'R$ 0,00');
});
