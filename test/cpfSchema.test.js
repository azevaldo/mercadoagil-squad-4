import test from 'node:test';
import assert from 'node:assert/strict';
import { validar } from '../src/schemas/validar.js';
import {
  cpfSchema,
  clienteSchema,
} from '../src/schemas/clienteSchema.js';

const clienteValido = {
  nome: '  Pedro Silva  ',
  email: ' pedro@example.com ',
  cpf: '529.982.247-25',
  regiaoEntrega: 'Nordeste',
};

test('valida e normaliza os dados do cliente', () => {
  const resposta = validar(cpfSchema,{cpf:'529.982.247-25'});

  assert.deepEqual(resposta.dados.cpf, 
    
     '52998224725'
    
  );
});