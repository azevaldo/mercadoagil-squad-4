import test from 'node:test';
import assert from 'node:assert/strict';
import { validarVendedor } from '../src/schemas/vendedorSchema.js';

const vendedorValido = {
  nomeLoja: '  Loja Central  ',
  cnpj: '11.222.333/0001-81',
  email: ' contato@lojacentral.com ',
};

test('valida e normaliza os dados do vendedor', () => {
  const resposta = validarVendedor(vendedorValido);

  assert.deepEqual(resposta, {
    ok: true,
    dados: {
      nomeLoja: 'Loja Central',
      cnpj: '11222333000181',
      email: 'contato@lojacentral.com',
    },
  });
});

test('retorna erros para nome da loja, CNPJ e e-mail inválidos', () => {
  const resposta = validarVendedor({
    ...vendedorValido,
    nomeLoja: ' ',
    cnpj: '11.222.333/0001-80',
    email: 'email-invalido',
  });

  assert.equal(resposta.ok, false);
  assert.equal(resposta.erros.length, 3);
});

test('rejeita CNPJ com dígitos verificadores inválidos', () => {
  const resposta = validarVendedor({
    ...vendedorValido,
    cnpj: '11222333000180',
  });

  assert.equal(resposta.ok, false);
  assert.deepEqual(resposta.erros, [
    'Informe um CNPJ válido, com dígitos verificadores.',
  ]);
});
