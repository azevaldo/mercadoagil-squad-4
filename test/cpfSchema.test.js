import test from 'node:test';
import assert from 'node:assert/strict';
import { validar } from '../src/schemas/validar.js';
import { cpfSchema } from '../src/schemas/clienteSchema.js';

test('valida e normaliza CPF com pontuação', () => {
  assert.deepEqual(validar(cpfSchema, { cpf: '529.982.247-25' }), {
    ok: true,
    dados: { cpf: '52998224725' },
  });
});

test('rejeita CPF com dígitos verificadores inválidos', () => {
  assert.deepEqual(validar(cpfSchema, { cpf: '111.111.111-11' }), {
    ok: false,
    erros: ['Informe um CPF válido, com dígitos verificadores.'],
  });
});
