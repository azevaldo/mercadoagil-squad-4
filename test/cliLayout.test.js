import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  larguraTexto,
  preencher,
  quebrarLinha,
  recortar,
  finalTexto,
} from '../src/cli/layout.js';

test('alinhamento usa células visíveis para acentos, emojis e ideogramas', () => {
  const texto = 'Café 👩‍💻 中文';
  assert.equal(larguraTexto(texto), 12);
  assert.equal(larguraTexto('Cafe\u0301'), 4);
  assert.equal(larguraTexto(preencher(texto, 20)), 20);
  assert.equal(larguraTexto(preencher(texto, 8)), 8);
  assert.equal(recortar('中文', 3), '中…');
  assert.equal(finalTexto('Caneca 👩‍💻 azul', 7), '👩‍💻 azul');
  const linhas = quebrarLinha(texto, 5);
  assert.equal(linhas.join(''), texto);
  linhas.forEach((linha) => assert.ok(larguraTexto(linha) <= 5));
});
