import { criarFormularios } from './formularios.js';

// As ações coletam campos validados e chamam a API pública do Marketplace.
export const criarAcoes = (mp, interfaceUsuario) => {
  const {
    perguntar,
    mostrar,
    mostrarRelatorioFinanceiro,
    mostrarResumoPedido,
  } = interfaceUsuario;
  const f = criarFormularios(mp, perguntar);
  return {
    1: [
      'Cadastrar cliente',
      async () => mostrar(mp.cadastrarCliente(await f.cliente())),
    ],
    2: ['Listar clientes', () => mostrar(mp.listarClientes())],
    3: [
      'Buscar cliente',
      async () =>
        mostrar(mp.buscarCliente(await f.buscar('CPF ou nome', 'Maria'))),
    ],
    4: [
      'Atualizar cliente',
      async () => {
        const cpf = await f.cpf();
        return mostrar(mp.atualizarCliente(cpf, await f.atualizarCliente()));
      },
    ],
    5: [
      'Excluir cliente',
      async () => mostrar(mp.excluirCliente(await f.cpf())),
    ],
    6: [
      'Cadastrar vendedor',
      async () => mostrar(mp.cadastrarVendedor(await f.vendedor())),
    ],
    7: ['Listar vendedores', () => mostrar(mp.listarVendedores())],
    8: [
      'Buscar vendedor',
      async () =>
        mostrar(mp.buscarVendedor(await f.buscar('CNPJ ou nome', 'TechBahia'))),
    ],
    9: [
      'Atualizar vendedor',
      async () => {
        const cnpj = await f.cnpj();
        return mostrar(mp.atualizarVendedor(cnpj, await f.atualizarVendedor()));
      },
    ],
    10: [
      'Excluir vendedor',
      async () => mostrar(mp.excluirVendedor(await f.cnpj())),
    ],
    11: [
      'Cadastrar produto',
      async () => mostrar(mp.cadastrarProduto(await f.dadosProduto())),
    ],
    12: ['Listar produtos', () => mostrar(mp.listarProdutos())],
    13: [
      'Atualizar produto',
      async () => {
        const id = await f.produto();
        return mostrar(mp.atualizarProduto(id, await f.dadosProduto(true)));
      },
    ],
    14: [
      'Buscar produto',
      async () =>
        mostrar(mp.buscarProduto(await f.buscar('Id ou nome', 'Mouse'))),
    ],
    15: [
      'Excluir produto',
      async () => mostrar(mp.excluirProduto(await f.produto())),
    ],
    16: [
      'Cadastrar cupom',
      async () => {
        const codigo = await f.codigo(true);
        return mostrar(
          mp.cadastrarCupom({ codigo, ...(await f.dadosCupom()) }),
        );
      },
    ],
    17: ['Listar cupons', () => mostrar(mp.listarCupons())],
    18: ['Buscar cupom', async () => mostrar(mp.buscarCupom(await f.codigo()))],
    19: [
      'Atualizar cupom',
      async () => {
        const codigo = await f.codigo();
        const atual = mp.buscarCupom(codigo).dados;
        return mostrar(mp.atualizarCupom(codigo, await f.dadosCupom(atual)));
      },
    ],
    20: [
      'Excluir cupom',
      async () => mostrar(mp.excluirCupom(await f.codigo())),
    ],
    21: ['Novo pedido', async () => mostrar(mp.criarPedido(await f.cpf()))],
    22: [
      'Adicionar item ao pedido',
      async () => {
        const pedido = await f.pedido(true);
        const produto = await f.produto();
        return mostrar(mp.adicionarItem(pedido, produto, await f.quantidade()));
      },
    ],
    23: [
      'Remover item do pedido',
      async () => {
        const pedido = await f.pedido(true);
        return mostrar(mp.removerItem(pedido, await f.produto()));
      },
    ],
    24: [
      'Aplicar cupom ao pedido',
      async () => {
        const pedido = await f.pedido(true);
        return mostrar(mp.aplicarCupom(pedido, await f.codigo()));
      },
    ],
    25: [
      'Ver resumo do pedido',
      async () => mostrarResumoPedido(mp.resumoPedido(await f.pedido())),
    ],
    26: [
      'Confirmar pedido',
      async () => mostrar(mp.confirmarPedido(await f.pedido(true))),
    ],
    27: [
      'Cancelar pedido',
      async () => mostrar(mp.cancelarPedido(await f.pedido())),
    ],
    28: ['Listar pedidos', () => mostrar(mp.listarPedidos())],
    29: [
      'Relatório financeiro',
      async () =>
        mostrarRelatorioFinanceiro(mp.relatorioFinanceiro(await f.filtros())),
    ],
    30: [
      'Faturamento por categoria',
      async () =>
        mostrar(mp.relatorioFaturamentoPorCategoria(await f.filtros())),
    ],
    31: [
      'Repasse por vendedor',
      async () => mostrar(mp.relatorioRepassePorVendedor(await f.filtros())),
    ],
    32: [
      'Top 3 produtos mais vendidos',
      async () => mostrar(mp.relatorioTopProdutos(await f.filtros())),
    ],
  };
};
