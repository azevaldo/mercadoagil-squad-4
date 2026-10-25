import test from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';

const vendedorInicial = {
  nomeLoja: 'Loja Central',
  cnpj: '11.222.333/0001-81',
  email: 'contato@lojacentral.com',
};

const produtoInicial = {
  nome: 'Mouse',
  preco: 120,
  categoria: 'eletronicos',
  quantidade: 5,
  vendedorCnpj: vendedorInicial.cnpj,
};

const criarMarketplace = ({ comProduto = false } = {}) =>
  new Marketplace({
    vendedores: [{ ...vendedorInicial }],
    produtos: comProduto ? [{ ...produtoInicial }] : [],
  });

test('busca vendedor por CNPJ formatado e por parte do nome', () => {
  const marketplace = criarMarketplace();

  assert.equal(
    marketplace.buscarVendedor('11.222.333/0001-81').dados[0].nomeLoja,
    'Loja Central',
  );
  assert.equal(
    marketplace.buscarVendedor('LOJA CEN').dados[0].cnpj,
    '11222333000181',
  );
});

test('busca vendedor ignorando acentos e informa busca vazia ou sem resultado', () => {
  const marketplace = criarMarketplace();
  marketplace.atualizarVendedor(vendedorInicial.cnpj, {
    nomeLoja: 'Livrária Sol',
    email: vendedorInicial.email,
  });

  assert.equal(marketplace.buscarVendedor('livraria').ok, true);
  assert.deepEqual(marketplace.buscarVendedor('  '), {
    ok: false,
    erros: ['Informe um CNPJ ou nome para buscar.'],
  });
  assert.deepEqual(marketplace.buscarVendedor('inexistente'), {
    ok: false,
    erros: ['Vendedor não encontrado.'],
  });
});

test('atualiza nome e e-mail e preserva o CNPJ', () => {
  const marketplace = criarMarketplace();

  const resposta = marketplace.atualizarVendedor('11.222.333/0001-81', {
    nomeLoja: 'Loja Nova',
    email: 'novo@lojanova.com',
  });

  assert.deepEqual(resposta, {
    ok: true,
    dados: {
      nomeLoja: 'Loja Nova',
      cnpj: '11222333000181',
      email: 'novo@lojanova.com',
    },
  });
});

test('recusa atualização inválida ou tentativa de alterar CNPJ sem mudar o vendedor', () => {
  const marketplace = criarMarketplace();
  const antes = marketplace.listarVendedores();

  assert.equal(
    marketplace.atualizarVendedor(vendedorInicial.cnpj, {
      nomeLoja: 'Loja Nova',
      email: 'email-invalido',
    }).ok,
    false,
  );
  assert.equal(
    marketplace.atualizarVendedor(vendedorInicial.cnpj, {
      nomeLoja: 'Loja Nova',
      email: 'novo@loja.com',
      cnpj: '45.723.174/0001-10',
    }).ok,
    false,
  );
  assert.deepEqual(marketplace.listarVendedores(), antes);
});

test('retorna erro ao atualizar vendedor inexistente', () => {
  const marketplace = criarMarketplace();

  assert.deepEqual(
    marketplace.atualizarVendedor('00.000.000/0000-00', {
      nomeLoja: 'Loja Nova',
      email: 'novo@loja.com',
    }),
    { ok: false, erros: ['Vendedor não encontrado.'] },
  );
});

test('impede excluir vendedor que possui produtos cadastrados', () => {
  const marketplace = criarMarketplace({ comProduto: true });

  assert.deepEqual(marketplace.excluirVendedor(vendedorInicial.cnpj), {
    ok: false,
    erros: [
      'Este vendedor possui produtos cadastrados e não pode ser excluído.',
    ],
  });
  assert.equal(marketplace.listarVendedores().dados.length, 1);
  assert.equal(marketplace.listarProdutos().dados.length, 1);
});

test('exclui vendedor sem produtos', () => {
  const marketplace = criarMarketplace();

  assert.deepEqual(marketplace.excluirVendedor('11.222.333/0001-81'), {
    ok: true,
    dados: { mensagem: 'Vendedor excluído com sucesso.' },
  });
  assert.deepEqual(marketplace.listarVendedores(), { ok: true, dados: [] });
});

test('retorna erro ao excluir vendedor inexistente', () => {
  const marketplace = criarMarketplace();

  assert.deepEqual(marketplace.excluirVendedor('00.000.000/0000-00'), {
    ok: false,
    erros: ['Vendedor não encontrado.'],
  });
});
