import test from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';

const cliente = {
  nome: 'Maria Santos',
  email: 'maria@example.com',
  cpf: '529.982.247-25',
  regiaoEntrega: 'Nordeste',
};

const vendedor = {
  nomeLoja: 'TechBahia',
  cnpj: '11.222.333/0001-81',
  email: 'contato@techbahia.com',
};

// delimita o marketplace com mouse e livro com 5 unidades cada
const criarMarketplaceCenario = () => {
  const mp = new Marketplace({
    clientes: [cliente],
    vendedores: [vendedor],
    produtos: [
      {
        nome: 'Mouse',
        preco: 120,
        categoria: 'eletronicos',
        quantidade: 5,
        vendedorCnpj: vendedor.cnpj,
      },
      {
        nome: 'Livro',
        preco: 80,
        categoria: 'livros',
        quantidade: 5,
        vendedorCnpj: vendedor.cnpj,
      },
    ],
  });

  const produtos = mp.listarProdutos().dados;
  const mouse = produtos.find((p) => p.nome === 'Mouse');
  const livro = produtos.find((p) => p.nome === 'Livro');

  return { mp, mouseId: mouse.id, livroId: livro.id };
};

test('resumoPedido: retorna ok: true, com status aberto e os itens do pedido', () => {
  const { mp, mouseId } = criarMarketplaceCenario();
  const pedido = mp.criarPedido(cliente.cpf).dados;

  mp.adicionarItem(pedido.id, mouseId, 2);
  const resumo = mp.resumoPedido(String(pedido.id));

  assert.equal(resumo.ok, true);
  assert.equal(resumo.dados.status, 'aberto');
  assert.equal(resumo.dados.itens.length, 1);
  assert.equal(resumo.dados.itens[0].produto, 'Mouse');
  assert.equal(resumo.dados.itens[0].quantidade, 2);
});

test('confirmarPedido com estoque suficiente: pedido com Mouse x2 confirma e passa de 5 para 3', () => {
  const { mp, mouseId } = criarMarketplaceCenario();
  const pedido = mp.criarPedido(cliente.cpf).dados;

  mp.adicionarItem(pedido.id, mouseId, 2);
  const confirmacao = mp.confirmarPedido(String(pedido.id));

  assert.equal(confirmacao.ok, true);
  assert.equal(confirmacao.dados.status, 'confirmado');

  const mouseAtualizado = mp.buscarProduto(mouseId).dados;
  assert.equal(mouseAtualizado.disponivel, 3);
});

test('confirmarPedido com item em falta: Mouse x6 e Livro x1 retorna falha, Livro continua 5 e pedido aberto', () => {
  const { mp, mouseId, livroId } = criarMarketplaceCenario();
  const pedido = mp.criarPedido(cliente.cpf).dados;

  mp.adicionarItem(pedido.id, mouseId, 6);
  mp.adicionarItem(pedido.id, livroId, 1);

  const confirmacao = mp.confirmarPedido(pedido.id);

  assert.equal(confirmacao.ok, false);
  assert.ok(
    confirmacao.erros.includes(
      'Estoque insuficiente: Mouse (pedido 6, disponível 5)',
    ),
  );

  // não permite alteração do estoque de livro e o pedido continua aberto
  assert.equal(mp.buscarProduto(livroId).dados.disponivel, 5);
  assert.equal(mp.buscarProduto(mouseId).dados.disponivel, 5);
  assert.equal(mp.resumoPedido(pedido.id).dados.status, 'aberto');
});

test('cancelarPedido de pedido confirmado: Mouse x3 devolve e volta para 5', () => {
  const { mp, mouseId } = criarMarketplaceCenario();
  const pedido = mp.criarPedido(cliente.cpf).dados;

  mp.adicionarItem(pedido.id, mouseId, 3);
  mp.confirmarPedido(pedido.id);
  assert.equal(mp.buscarProduto(mouseId).dados.disponivel, 2);

  const cancelamento = mp.cancelarPedido(String(pedido.id));
  assert.equal(cancelamento.ok, true);
  assert.equal(cancelamento.dados.status, 'cancelado');
  assert.equal(mp.buscarProduto(mouseId).dados.disponivel, 5);
});

test('cancelarPedido de pedido aberto: cancelado sem confirmar mantém Mouse com 5', () => {
  const { mp, mouseId } = criarMarketplaceCenario();
  const pedido = mp.criarPedido(cliente.cpf).dados;

  mp.adicionarItem(pedido.id, mouseId, 3);
  const cancelamento = mp.cancelarPedido(pedido.id);

  assert.equal(cancelamento.ok, true);
  assert.equal(cancelamento.dados.status, 'cancelado');
  assert.equal(mp.buscarProduto(mouseId).dados.disponivel, 5);
});

test('listarPedidos: chaves exatas id, cliente, status, total e CPF ocultado', () => {
  const { mp, mouseId } = criarMarketplaceCenario();
  const pedido = mp.criarPedido(cliente.cpf).dados;
  mp.adicionarItem(pedido.id, mouseId, 1);

  const resposta = mp.listarPedidos();
  assert.equal(resposta.ok, true);
  assert.equal(resposta.dados.length, 1);

  const linha = resposta.dados[0];
  const chaves = Object.keys(linha).sort();
  assert.deepEqual(chaves, ['cliente', 'id', 'status', 'total'].sort());
  assert.equal(linha.cliente, 'Maria Santos');
  assert.equal(linha.cpf, undefined);
});
