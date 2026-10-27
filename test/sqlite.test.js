import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { dadosIniciais } from '../src/data/seed.js';
import { BancoSQLite } from '../src/data/sqlite.js';
import { Marketplace } from '../src/services/MarketPlace.js';

const criarBancoTemporario = (t) => {
  const diretorio = mkdtempSync(join(tmpdir(), 'mercadoagil-sqlite-'));
  const caminho = join(diretorio, 'teste.sqlite');
  let banco = new BancoSQLite(caminho);

  t.after(() => {
    banco.fechar();
    rmSync(diretorio, { recursive: true, force: true });
  });

  return {
    get banco() {
      return banco;
    },
    reabrir() {
      banco.fechar();
      banco = new BancoSQLite(caminho);
      return banco;
    },
  };
};

test('cria um banco vazio e restaura os dados iniciais depois de reabrir', (t) => {
  const armazenamento = criarBancoTemporario(t);
  assert.equal(armazenamento.banco.carregarEstado(), null);

  const marketplace = new Marketplace(dadosIniciais);
  armazenamento.banco.salvarEstado(marketplace.exportarEstado());
  const estadoRestaurado = armazenamento.reabrir().carregarEstado();
  const marketplaceRestaurado = new Marketplace(estadoRestaurado);

  assert.equal(marketplaceRestaurado.listarClientes().dados.length, 3);
  assert.equal(marketplaceRestaurado.listarVendedores().dados.length, 3);
  assert.equal(marketplaceRestaurado.listarProdutos().dados.length, 8);
  assert.equal(marketplaceRestaurado.listarCupons().dados.length, 3);
  assert.equal(marketplaceRestaurado.listarPedidos().dados.length, 0);
});

test('persiste operações, estoque, pedidos confirmados e sequências após reiniciar', (t) => {
  const armazenamento = criarBancoTemporario(t);
  const salvar = (estado) => armazenamento.banco.salvarEstado(estado);
  const marketplace = new Marketplace(dadosIniciais, { aoAlterar: salvar });
  salvar(marketplace.exportarEstado());

  const pedido = marketplace.criarPedido('52998224725');
  assert.equal(pedido.ok, true);
  assert.equal(marketplace.adicionarItem(pedido.dados.id, 1, 2).ok, true);
  assert.equal(
    marketplace.aplicarCupom(pedido.dados.id, 'BEMVINDO10').ok,
    true,
  );
  assert.equal(marketplace.confirmarPedido(pedido.dados.id).ok, true);
  assert.equal(
    marketplace.cadastrarProduto({
      nome: 'Produto de teste',
      preco: 12,
      categoria: 'casa',
      quantidade: 4,
      vendedorCnpj: '04252011000110',
    }).dados.id,
    9,
  );

  const resumoAntesDeFechar = marketplace.resumoPedido(pedido.dados.id);
  const marketplaceRestaurado = new Marketplace(
    armazenamento.reabrir().carregarEstado(),
    { aoAlterar: salvar },
  );

  assert.deepEqual(
    marketplaceRestaurado.resumoPedido(pedido.dados.id),
    resumoAntesDeFechar,
  );
  assert.equal(
    marketplaceRestaurado.listarPedidos().dados[0].status,
    'confirmado',
  );
  assert.equal(marketplaceRestaurado.buscarProduto('1').dados.disponivel, 8);
  assert.equal(
    marketplaceRestaurado.cadastrarProduto({
      nome: 'Outro produto',
      preco: 15,
      categoria: 'casa',
      quantidade: 2,
      vendedorCnpj: '04252011000110',
    }).dados.id,
    10,
  );
  assert.equal(marketplaceRestaurado.criarPedido('11144477735').dados.id, 2);
});

test('reverte a gravação inteira quando um registro viola uma chave estrangeira', (t) => {
  const armazenamento = criarBancoTemporario(t);
  const marketplace = new Marketplace(dadosIniciais);
  const estado = marketplace.exportarEstado();
  armazenamento.banco.salvarEstado(estado);

  const estadoInvalido = {
    ...estado,
    produtos: estado.produtos.map((produto, indice) =>
      indice === 0 ? { ...produto, vendedorCnpj: 'cnpj-inexistente' } : produto,
    ),
  };

  assert.throws(() => armazenamento.banco.salvarEstado(estadoInvalido));
  assert.deepEqual(
    JSON.parse(JSON.stringify(armazenamento.banco.carregarEstado())),
    JSON.parse(JSON.stringify(estado)),
  );
});
