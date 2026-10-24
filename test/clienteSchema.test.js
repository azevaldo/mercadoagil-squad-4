import test from 'node:test';
import assert from 'node:assert/strict';
import { validar } from '../src/schemas/validar.js';
import {
  atualizacaoClienteSchema,
  clienteSchema,
} from '../src/schemas/clienteSchema.js';

const clienteValido = {
  nome: '  Pedro Silva  ',
  email: ' pedro@example.com ',
  cpf: '529.982.247-25',
  regiaoEntrega: 'Nordeste',
};

test('valida e normaliza os dados do cliente', () => {
  const resposta = validar(clienteSchema, clienteValido);

  assert.deepEqual(resposta, {
    ok: true,
    dados: {
      nome: 'Pedro Silva',
      email: 'pedro@example.com',
      cpf: '52998224725',
      regiaoEntrega: 'Nordeste',
    },
  });
});

test('retorna erros para nome, e-mail, CPF e região inválidos', () => {
  const resposta = validar(clienteSchema, {
    ...clienteValido,
    nome: 'Al',
    email: 'email-invalido',
    cpf: '111.111.111-11',
    regiaoEntrega: 'Oeste',
  });

  assert.equal(resposta.ok, false);
  assert.equal(resposta.erros.length, 4);
});

test('rejeita CPF com dígitos verificadores inválidos', () => {
  const resposta = validar(clienteSchema, {
    ...clienteValido,
    cpf: '529.982.247-24',
  });

  assert.equal(resposta.ok, false);
  assert.deepEqual(resposta.erros, [
    'Informe um CPF válido, com dígitos verificadores.',
  ]);
});

test('rejeita CPF no payload de atualização', () => {
  const resposta = atualizacaoClienteSchema.safeParse({
    nome: 'Pedro Silva',
    email: 'pedro@example.com',
    regiaoEntrega: 'Nordeste',
    cpf: '111.444.777-35',
  });

  assert.equal(resposta.success, false);
});
