import test from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';
import {
  clientes,
  vendedores,
  produtos,
  cupons,
  dadosIniciais,
} from '../src/data/seed.js';

const dadosDe = (resposta) => {
  assert.equal(resposta.ok, true, JSON.stringify(resposta.erros));
  return resposta.dados;
};

test('cadastros feitos após a inicialização participam do pedido, estoque e relatório', () => {
  const mp = new Marketplace();
  assert.equal(dadosDe(mp.relatorioFinanceiro()).quantidadePedidos, 0);

  dadosDe(mp.cadastrarCliente(clientes[0]));
  dadosDe(mp.cadastrarVendedor(vendedores[0]));
  const produto = dadosDe(mp.cadastrarProduto(produtos[0]));
  dadosDe(mp.cadastrarCupom(cupons[0]));
  const pedido = dadosDe(mp.criarPedido(clientes[0].cpf));

  dadosDe(mp.adicionarItem(pedido.id, produto.id, 1));
  dadosDe(mp.aplicarCupom(pedido.id, cupons[0].codigo));
  assert.equal(dadosDe(mp.relatorioFinanceiro()).quantidadePedidos, 0);
  assert.equal(dadosDe(mp.confirmarPedido(pedido.id)).total, 134.5);
  assert.equal(dadosDe(mp.buscarProduto(produto.id)).disponivel, 9);

  const relatorio = dadosDe(
    mp.relatorioFinanceiro({ cliente: clientes[0].email }),
  );
  assert.equal(relatorio.quantidadePedidos, 1);
  assert.equal(relatorio.faturamentoTotal, 134.5);
  assert.deepEqual(relatorio.produtosMaisVendidos, [
    { produto: 'Mouse', quantidade: 1 },
  ]);
  assert.equal(relatorio.repassePorVendedor[0].valorRepasse, 110.4);

  dadosDe(mp.cancelarPedido(pedido.id));
  assert.equal(dadosDe(mp.buscarProduto(produto.id)).disponivel, 10);
  assert.equal(dadosDe(mp.relatorioFinanceiro()).quantidadePedidos, 0);
  assert.deepEqual(dadosDe(mp.relatorioRepassePorVendedor()), []);
});

test('exclusão de vendedor consulta os produtos atuais depois de cadastros e remoções', () => {
  const mp = new Marketplace();
  dadosDe(mp.cadastrarVendedor(vendedores[0]));
  const produto = dadosDe(mp.cadastrarProduto(produtos[0]));

  assert.deepEqual(mp.excluirVendedor(vendedores[0].cnpj), {
    ok: false,
    erros: [
      'Este vendedor possui produtos cadastrados e não pode ser excluído.',
    ],
  });
  dadosDe(mp.excluirProduto(produto.id));
  dadosDe(mp.excluirVendedor(vendedores[0].cnpj));

  assert.equal(mp.cadastrarProduto(produtos[0]).ok, false);
  dadosDe(mp.cadastrarVendedor(vendedores[0]));
  const outroProduto = dadosDe(mp.cadastrarProduto(produtos[0]));
  assert.equal(outroProduto.id, 2);
  assert.equal(mp.excluirVendedor(vendedores[0].cnpj).ok, false);
});

test('instâncias do Marketplace mantêm cadastros, estoque, pedidos e sequências independentes', () => {
  const primeiro = new Marketplace(dadosIniciais);
  const segundo = new Marketplace(dadosIniciais);
  const pedido = dadosDe(primeiro.criarPedido(clientes[0].cpf));

  dadosDe(primeiro.adicionarItem(pedido.id, 1, 2));
  dadosDe(primeiro.confirmarPedido(pedido.id));
  dadosDe(
    primeiro.atualizarVendedor(vendedores[0].cnpj, {
      nomeLoja: 'Loja alterada',
      email: vendedores[0].email,
    }),
  );
  dadosDe(primeiro.cadastrarCupom({ ...cupons[0], codigo: 'EXCLUSIVO' }));

  assert.equal(dadosDe(primeiro.buscarProduto(1)).disponivel, 8);
  assert.equal(dadosDe(segundo.buscarProduto(1)).disponivel, 10);
  assert.equal(
    dadosDe(segundo.buscarProduto(1)).vendedor,
    vendedores[0].nomeLoja,
  );
  assert.equal(segundo.buscarCupom('EXCLUSIVO').ok, false);
  assert.deepEqual(dadosDe(segundo.listarPedidos()), []);
  assert.equal(dadosDe(segundo.relatorioFinanceiro()).quantidadePedidos, 0);
  assert.equal(dadosDe(primeiro.relatorioFinanceiro()).quantidadePedidos, 1);
  assert.equal(dadosDe(primeiro.criarPedido(clientes[0].cpf)).id, 2);
  assert.equal(dadosDe(segundo.criarPedido(clientes[0].cpf)).id, 1);
});

test('carga inicial preserva a ordem das dependências e registra falhas sem interromper os cadastros válidos', () => {
  const mp = new Marketplace({
    clientes: [clientes[0]],
    vendedores: [vendedores[0]],
    produtos: [produtos[1], produtos[0]],
    cupons: [{ ...cupons[0], validade: 'data inválida' }, cupons[1]],
  });

  assert.equal(mp.avisos.length, 2);
  assert.ok(mp.avisos.includes('Vendedor não cadastrado.'));
  assert.deepEqual(
    dadosDe(mp.listarProdutos()).map(({ id, nome }) => ({ id, nome })),
    [{ id: 1, nome: 'Mouse' }],
  );
  assert.deepEqual(
    dadosDe(mp.listarCupons()).map(({ codigo }) => codigo),
    ['PDA15'],
  );
  assert.equal(dadosDe(mp.criarPedido(clientes[0].cpf)).id, 1);

  const avisos = mp.avisos;
  avisos.length = 0;
  assert.equal(mp.avisos.length, 2);
});
