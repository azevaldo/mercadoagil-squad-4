import test from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';

const vendedores = [
  {
    nomeLoja: 'TechBahia',
    cnpj: '11222333000181',
    email: 'contato@techbahia.com.br',
  },
];

const produtoInicial = {
  nome: 'Mouse',
  preco: 120,
  categoria: 'eletronicos',
  quantidade: 10,
  vendedorCnpj: '11222333000181',
};

const criarMarketplace = () =>
  new Marketplace({ vendedores, produtos: [{ ...produtoInicial }] });

// O id é gerado pelo sistema, então pegamos o do primeiro produto da listagem
const idDoPrimeiro = (mp) => mp.listarProdutos().dados[0].id;

test('atualiza nome, preço e categoria e devolve o produto no formato da listagem', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);

  const resposta = mp.atualizarProduto(id, {
    nome: 'Mouse Sem Fio',
    preco: '150,50',
    categoria: 'casa',
  });

  assert.deepEqual(resposta, {
    ok: true,
    dados: {
      id,
      nome: 'Mouse Sem Fio',
      preco: 150.5,
      categoria: 'casa',
      vendedor: 'TechBahia',
      disponivel: 10,
    },
  });
});

test('não altera o id nem o vendedor do produto', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);

  const resposta = mp.atualizarProduto(id, {
    id: 99,
    vendedorCnpj: '45723174000110',
  });

  assert.equal(resposta.ok, true);
  assert.equal(resposta.dados.id, id);
  assert.equal(resposta.dados.vendedor, 'TechBahia');
});

test('a alteração aparece na listagem', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);

  mp.atualizarProduto(id, { nome: 'Mouse Sem Fio', preco: 150 });

  const produto = mp.listarProdutos().dados[0];
  assert.equal(produto.nome, 'Mouse Sem Fio');
  assert.equal(produto.preco, 150);
});

test('mantém os campos que não foram informados', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);

  mp.atualizarProduto(id, { nome: 'Mouse Sem Fio' });

  const produto = mp.listarProdutos().dados[0];
  assert.equal(produto.nome, 'Mouse Sem Fio');
  assert.equal(produto.preco, 120);
  assert.equal(produto.categoria, 'eletronicos');
  assert.equal(produto.disponivel, 10);
});

test('altera a quantidade em estoque', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);

  const resposta = mp.atualizarProduto(id, { quantidade: 3 });

  assert.equal(resposta.ok, true);
  assert.equal(mp.listarProdutos().dados[0].disponivel, 3);
});

test('não altera o id nem o vendedor do produto', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);

  mp.atualizarProduto(id, { id: 99, vendedorCnpj: '45723174000110' });

  const produto = mp.listarProdutos().dados[0];
  assert.equal(produto.id, id);
  assert.equal(produto.vendedor, 'TechBahia');
});

test('recusa preço inválido e mantém o produto como estava', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);
  const antes = mp.listarProdutos();

  const resposta = mp.atualizarProduto(id, { preco: 'abc' });

  assert.equal(resposta.ok, false);
  assert.deepEqual(mp.listarProdutos(), antes);
});

test('recusa categoria inválida e mantém o produto como estava', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);
  const antes = mp.listarProdutos();

  const resposta = mp.atualizarProduto(id, { categoria: 'brinquedos' });

  assert.equal(resposta.ok, false);
  assert.deepEqual(mp.listarProdutos(), antes);
});

test('recusa quantidade negativa', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);

  const resposta = mp.atualizarProduto(id, { quantidade: -1 });

  assert.equal(resposta.ok, false);
  assert.equal(mp.listarProdutos().dados[0].disponivel, 10);
});

test('recusa nome com menos de 2 caracteres', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);

  const resposta = mp.atualizarProduto(id, { nome: 'M' });

  assert.equal(resposta.ok, false);
  assert.equal(mp.listarProdutos().dados[0].nome, 'Mouse');
});

test('retorna erro ao atualizar produto inexistente', () => {
  const mp = criarMarketplace();

  assert.deepEqual(mp.atualizarProduto(999, { nome: 'Qualquer' }), {
    ok: false,
    erros: ['Produto não encontrado.'],
  });
});

// ---------- buscarProduto ----------

const produtoTeclado = {
  nome: 'Teclado Mecânico',
  preco: 250,
  categoria: 'eletronicos',
  quantidade: 3,
  vendedorCnpj: '11222333000181',
};

const criarMarketplaceComDois = () =>
  new Marketplace({
    vendedores,
    produtos: [{ ...produtoInicial }, { ...produtoTeclado }],
  });

test('busca produto pelo id e devolve o formato da listagem', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);

  assert.deepEqual(mp.buscarProduto(String(id)), {
    ok: true,
    dados: {
      id,
      nome: 'Mouse',
      preco: 120,
      categoria: 'eletronicos',
      vendedor: 'TechBahia',
      disponivel: 10,
    },
  });
});

test('busca produto pelo nome, sem diferenciar maiúsculas', () => {
  const mp = criarMarketplaceComDois();

  const resposta = mp.buscarProduto('TECLADO');

  assert.equal(resposta.ok, true);
  assert.equal(resposta.dados.nome, 'Teclado Mecânico');
});

test('busca produto por parte do nome', () => {
  const mp = criarMarketplaceComDois();

  assert.equal(mp.buscarProduto('mec').dados.nome, 'Teclado Mecânico');
});

test('busca reflete a quantidade atualizada', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);

  mp.atualizarProduto(id, { quantidade: 4 });

  assert.equal(mp.buscarProduto('mouse').dados.disponivel, 4);
});

test('retorna erro quando o produto não existe', () => {
  const mp = criarMarketplace();

  assert.deepEqual(mp.buscarProduto('Notebook'), {
    ok: false,
    erros: ['Produto não encontrado: Notebook'],
  });
});

// ---------- excluirProduto ----------

test('exclui o produto escolhido e mantém os outros', () => {
  const mp = criarMarketplaceComDois();
  const id = idDoPrimeiro(mp);

  assert.deepEqual(mp.excluirProduto(id), {
    ok: true,
    dados: { removido: 'Mouse' },
  });

  const restantes = mp.listarProdutos().dados;
  assert.equal(restantes.length, 1);
  assert.equal(restantes[0].nome, 'Teclado Mecânico');
  assert.equal(mp.buscarProduto(String(id)).ok, false);
});

test('retorna erro ao excluir produto inexistente', () => {
  const mp = criarMarketplace();

  assert.deepEqual(mp.excluirProduto(999), {
    ok: false,
    erros: ['Produto não encontrado.'],
  });
  assert.equal(mp.listarProdutos().dados.length, 1);
});
test('campo com só espaços mantém o valor atual', () => {
  const mp = criarMarketplace();
  const id = idDoPrimeiro(mp);

  const resposta = mp.atualizarProduto(id, { nome: '   ', preco: '  ' });

  assert.equal(resposta.ok, true);
  assert.equal(resposta.dados.nome, 'Mouse');
  assert.equal(resposta.dados.preco, 120);
});
