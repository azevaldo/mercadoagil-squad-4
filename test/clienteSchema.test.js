import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCliente } from '../src/schemas/clienteSchema.js';

const clienteValido = {
  nome: '  Pedro Silva  ',
  email: ' pedro@example.com ',
  cpf: '529.982.247-25',
  regiao: 'Nordeste',
};

test('valida e normaliza os dados do cliente', () => {
  const resposta = validarCliente(clienteValido);

  assert.deepEqual(resposta, {
    ok: true,
    dados: {
      nome: 'Pedro Silva',
      email: 'pedro@example.com',
      cpf: '52998224725',
      regiao: 'Nordeste',
    },
  });
});

test('retorna erros para nome, e-mail, CPF e região inválidos', () => {
  const resposta = validarCliente({
    ...clienteValido,
    nome: 'Al',
    email: 'email-invalido',
    cpf: '111.111.111-11',
    regiao: 'Oeste',
  });

  assert.equal(resposta.ok, false);
  assert.equal(resposta.erros.length, 4);
});

test('rejeita CPF com dígitos verificadores inválidos', () => {
  const resposta = validarCliente({ ...clienteValido, cpf: '529.982.247-24' });

  assert.equal(resposta.ok, false);
  assert.deepEqual(resposta.erros, [
    'Informe um CPF válido, com dígitos verificadores.',
  ]);
});
