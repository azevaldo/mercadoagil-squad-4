// As ações só coletam entradas e chamam a API pública do Marketplace.
export const criarAcoes = (mp, interfaceUsuario) => {
  const {
    perguntar,
    mostrar,
    mostrarRelatorioFinanceiro,
    mostrarResumoPedido,
  } = interfaceUsuario;

  const perguntarCumulatividade = async () => {
    const resposta = (await perguntar('Cumulativo? (s/n; Enter para manter)'))
      .trim()
      .toLowerCase();
    return resposta === '' ? undefined : resposta === 's';
  };

  const perguntarFiltrosRelatorio = async () => ({
    dataInicio: await perguntar(
      'Data inicial (AAAA-MM-DD; Enter para sem filtro)',
    ),
    dataFim: await perguntar('Data final (AAAA-MM-DD; Enter para sem filtro)'),
    vendedor: await perguntar(
      'Vendedor envolvido (nome ou CNPJ; Enter para sem filtro)',
    ),
    cliente: await perguntar(
      'Cliente (nome, e-mail ou CPF; Enter para sem filtro)',
    ),
  });

  return {
    1: [
      'Cadastrar cliente',
      async () =>
        mostrar(
          mp.cadastrarCliente({
            nome: await perguntar('Nome'),
            email: await perguntar('E-mail'),
            cpf: await perguntar('CPF'),
            regiaoEntrega: await perguntar(
              'Região de entrega (Norte, Nordeste, Centro-Oeste, Sudeste, Sul)',
            ),
          }),
        ),
    ],
    2: ['Listar clientes', () => mostrar(mp.listarClientes())],
    3: [
      'Buscar cliente',
      async () => mostrar(mp.buscarCliente(await perguntar('CPF ou nome'))),
    ],
    4: [
      'Atualizar cliente',
      async () => {
        const cpf = await perguntar('CPF do cliente');
        return mostrar(
          mp.atualizarCliente(cpf, {
            nome: await perguntar('Novo nome'),
            email: await perguntar('Novo e-mail'),
            regiaoEntrega: await perguntar(
              'Nova região (Norte, Nordeste, Centro-Oeste, Sudeste, Sul)',
            ),
          }),
        );
      },
    ],
    5: [
      'Excluir cliente',
      async () => mostrar(mp.excluirCliente(await perguntar('CPF'))),
    ],

    6: [
      'Cadastrar vendedor',
      async () =>
        mostrar(
          mp.cadastrarVendedor({
            nomeLoja: await perguntar('Nome da loja'),
            cnpj: await perguntar('CNPJ'),
            email: await perguntar('E-mail'),
          }),
        ),
    ],
    7: ['Listar vendedores', () => mostrar(mp.listarVendedores())],
    8: [
      'Buscar vendedor',
      async () => mostrar(mp.buscarVendedor(await perguntar('CNPJ ou nome'))),
    ],
    9: [
      'Atualizar vendedor',
      async () =>
        mostrar(
          mp.atualizarVendedor(await perguntar('CNPJ do vendedor'), {
            nomeLoja: await perguntar('Novo nome da loja'),
            email: await perguntar('Novo e-mail'),
          }),
        ),
    ],
    10: [
      'Excluir vendedor',
      async () => mostrar(mp.excluirVendedor(await perguntar('CNPJ'))),
    ],

    11: [
      'Cadastrar produto',
      async () =>
        mostrar(
          mp.cadastrarProduto({
            nome: await perguntar('Nome'),
            preco: await perguntar('Preço (ex.: 120,50)'),
            categoria: await perguntar(
              'Categoria (eletronicos, livros, alimentos, vestuario, casa)',
            ),
            vendedorCnpj: await perguntar('CNPJ do vendedor'),
            quantidade: await perguntar('Quantidade em estoque'),
          }),
        ),
    ],
    12: ['Listar produtos', () => mostrar(mp.listarProdutos())],
    13: [
      'Atualizar produto',
      async () =>
        mostrar(
          mp.atualizarProduto(await perguntar('Id do produto'), {
            nome: await perguntar('Novo nome (Enter para manter)'),
            preco: await perguntar('Novo preço (Enter para manter)'),
            categoria: await perguntar('Nova categoria (Enter para manter)'),
            quantidade: await perguntar('Nova quantidade (Enter para manter)'),
          }),
        ),
    ],
    14: [
      'Buscar produto',
      async () => mostrar(mp.buscarProduto(await perguntar('Id ou nome'))),
    ],
    15: [
      'Excluir produto',
      async () => mostrar(mp.excluirProduto(await perguntar('Id'))),
    ],

    16: [
      'Cadastrar cupom',
      async () =>
        mostrar(
          mp.cadastrarCupom({
            codigo: await perguntar('Código'),
            tipo: await perguntar('Tipo (percentual, fixo, frete)'),
            valor: await perguntar('Valor'),
            validade: await perguntar('Validade (AAAA-MM-DD)'),
            valorMinimo: await perguntar(
              'Valor mínimo do subtotal (Enter para 0)',
            ),
            cumulativo:
              (await perguntar('Cumulativo? (s/n)')).trim().toLowerCase() ===
              's',
          }),
        ),
    ],
    17: ['Listar cupons', () => mostrar(mp.listarCupons())],

    18: [
      'Buscar cupom',
      async () =>
        mostrar(mp.buscarCupom(await perguntar('Código do cupom para buscar'))),
    ],
    19: [
      'Atualizar cupom',
      async () => {
        const codigo = await perguntar('Código do cupom para atualizar');
        const novosDados = {
          tipo:
            (await perguntar('Novo tipo (percentual, fixo, frete)')).trim() ||
            undefined,
          valor: (await perguntar('Novo valor')).trim() || undefined,
          validade:
            (await perguntar('Nova validade AAAA-MM-DD')).trim() || undefined,
          valorMinimo:
            (await perguntar('Novo valor mínimo')).trim() || undefined,
          cumulativo: await perguntarCumulatividade(),
        };
        return mostrar(mp.atualizarCupom(codigo, novosDados));
      },
    ],
    20: [
      'Excluir cupom',
      async () => mostrar(mp.excluirCupom(await perguntar('Código'))),
    ],

    21: [
      'Novo pedido',
      async () => mostrar(mp.criarPedido(await perguntar('CPF do cliente'))),
    ],
    22: [
      'Adicionar item ao pedido',
      async () =>
        mostrar(
          mp.adicionarItem(
            await perguntar('Número do pedido'),
            await perguntar('Id do produto'),
            await perguntar('Quantidade'),
          ),
        ),
    ],

    23: [
      'Remover item do pedido',
      async () =>
        mostrar(
          mp.removerItem(
            await perguntar('Número do pedido'),
            await perguntar('Id do produto'),
          ),
        ),
    ],
    24: [
      'Aplicar cupom ao pedido',
      async () =>
        mostrar(
          mp.aplicarCupom(
            await perguntar('Número do pedido'),
            await perguntar('Código do cupom'),
          ),
        ),
    ],
    25: [
      'Ver resumo do pedido',
      async () =>
        mostrarResumoPedido(
          mp.resumoPedido(await perguntar('Número do pedido')),
        ),
    ],
    26: [
      'Confirmar pedido',
      async () =>
        mostrar(mp.confirmarPedido(await perguntar('Número do pedido'))),
    ],
    27: [
      'Cancelar pedido',
      async () =>
        mostrar(mp.cancelarPedido(await perguntar('Número do pedido'))),
    ],
    28: ['Listar pedidos', () => mostrar(mp.listarPedidos())],

    29: [
      'Relatório financeiro',
      async () =>
        mostrarRelatorioFinanceiro(
          mp.relatorioFinanceiro(await perguntarFiltrosRelatorio()),
        ),
    ],
    30: [
      'Faturamento por categoria',
      async () =>
        mostrar(
          mp.relatorioFaturamentoPorCategoria(
            await perguntarFiltrosRelatorio(),
          ),
        ),
    ],
    31: [
      'Repasse por vendedor',
      async () =>
        mostrar(
          mp.relatorioRepassePorVendedor(await perguntarFiltrosRelatorio()),
        ),
    ],
    32: [
      'Top 3 produtos mais vendidos',
      async () =>
        mostrar(mp.relatorioTopProdutos(await perguntarFiltrosRelatorio())),
    ],
  };
};
