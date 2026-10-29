import test from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';

const clienteInicial = {
  nome: 'Pedro Silva',
  email: 'pedro@example.com',
  cpf: '529.982.247-25',
  regiaoEntrega: 'Nordeste',
};

const criarMarketplace = () =>
  new Marketplace({ clientes: [{ ...clienteInicial }] });

test('atualiza dados permitidos do cliente e preserva o CPF', () => {
  const marketplace = criarMarketplace();

  const resposta = marketplace.atualizarCliente(clienteInicial.cpf, {
    nome: 'Pedro Santos',
    email: 'pedro.santos@example.com',
    regiaoEntrega: 'Sul',
  });

  assert.deepEqual(resposta, {
    ok: true,
    dados: {
      nome: 'Pedro Santos',
      email: 'pedro.santos@example.com',
      regiaoEntrega: 'Sul',
    },
  });
  assert.equal(marketplace.excluirCliente('52998224725').ok, true);
});

test('rejeita tentativa de alterar o CPF e mantém os dados do cliente', () => {
  const marketplace = criarMarketplace();
  const antes = marketplace.listarClientes().dados;

  const resposta = marketplace.atualizarCliente(clienteInicial.cpf, {
    nome: 'Pedro Silva',
    email: 'pedro@example.com',
    regiaoEntrega: 'Nordeste',
    cpf: '111.444.777-35',
  });

  assert.equal(resposta.ok, false);
  assert.deepEqual(marketplace.listarClientes().dados, antes);
});

test('não altera o cliente quando os dados de atualização são inválidos', () => {
  const marketplace = criarMarketplace();
  const antes = marketplace.listarClientes().dados;

  const resposta = marketplace.atualizarCliente(clienteInicial.cpf, {
    nome: 'Pe',
    email: 'email-invalido',
    regiaoEntrega: 'Oeste',
  });

  assert.equal(resposta.ok, false);
  assert.deepEqual(marketplace.listarClientes().dados, antes);
});

test('retorna erro ao tentar atualizar cliente inexistente', () => {
  const marketplace = criarMarketplace();

  assert.deepEqual(
    marketplace.atualizarCliente('111.444.777-35', {
      nome: 'Outro Cliente',
      email: 'outro@example.com',
      regiaoEntrega: 'Sudeste',
    }),
    {
      ok: false,
      erros: ['Cliente não encontrado.'],
    },
  );
});

test('busca cliente por CPF sem expor o CPF no resultado', () => {
  const marketplace = criarMarketplace();

  assert.deepEqual(marketplace.buscarCliente('529.982.247-25'), {
    ok: true,
    dados: [
      {
        nome: 'Pedro Silva',
        email: 'pedro@example.com',
        regiaoEntrega: 'Nordeste',
      },
    ],
  });
});

test('busca clientes por parte do nome sem diferenciar maiúsculas e acentos', () => {
  const marketplace = new Marketplace({
    clientes: [
      { ...clienteInicial },
      {
        nome: 'João Souza',
        email: 'maria@example.com',
        cpf: '111.444.777-35',
        regiaoEntrega: 'Sul',
      },
    ],
  });

  assert.deepEqual(marketplace.buscarCliente('joao'), {
    ok: true,
    dados: [
      {
        nome: 'João Souza',
        email: 'maria@example.com',
        regiaoEntrega: 'Sul',
      },
    ],
  });
});

test('retorna erro quando a busca não encontra cliente ou está vazia', () => {
  const marketplace = criarMarketplace();

  assert.deepEqual(marketplace.buscarCliente('Pessoa inexistente'), {
    ok: false,
    erros: ['Cliente não encontrado.'],
  });
  assert.deepEqual(marketplace.buscarCliente('  '), {
    ok: false,
    erros: ['Informe um CPF ou nome para buscar.'],
  });
});

test('exclui cliente existente usando CPF formatado', () => {
  const marketplace = criarMarketplace();

  assert.deepEqual(marketplace.excluirCliente(clienteInicial.cpf), {
    ok: true,
    dados: { mensagem: 'Cliente excluído com sucesso.' },
  });
  assert.deepEqual(marketplace.listarClientes(), { ok: true, dados: [] });
});

test('retorna erro ao tentar excluir cliente inexistente', () => {
  const marketplace = criarMarketplace();

  assert.deepEqual(marketplace.excluirCliente('111.444.777-35'), {
    ok: false,
    erros: ['Cliente não encontrado.'],
  });
  assert.equal(marketplace.listarClientes().dados.length, 1);
});
