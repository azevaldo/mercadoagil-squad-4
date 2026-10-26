import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { formatarReais } from '../utils/dinheiro.js';

const rl = createInterface({ input: stdin, output: stdout });
const perguntar = (texto) => rl.question(`${texto}: `);

// Mostra a resposta do serviço: erros com ✖, ou os dados em tabela
const mostrar = ({ ok, dados, erros }) => {
  if (!ok) return erros.forEach((erro) => console.log(`✖ ${erro}`));
  console.table([dados].flat());
};

const mostrarRelatorioFinanceiro = ({ ok, dados, erros }) => {
  if (!ok) return erros.forEach((erro) => console.log(`✖ ${erro}`));

  console.log('\n=== Relatório financeiro ===');
  console.table([
    {
      'Pedidos confirmados': dados.quantidadePedidos,
      'Faturamento total': formatarReais(dados.faturamentoTotal),
      'Ticket médio': formatarReais(dados.ticketMedio),
      Descontos: formatarReais(dados.descontosConcedidos),
      Tributos: formatarReais(dados.tributosTotais),
      Comissões: formatarReais(dados.comissaoTotal),
    },
  ]);

  console.log('Faturamento bruto por categoria');
  console.table(
    dados.faturamentoPorCategoria.map(({ categoria, faturamentoBruto }) => ({
      categoria,
      faturamento: formatarReais(faturamentoBruto),
    })),
  );

  console.log('Repasse por vendedor');
  console.table(
    dados.repassePorVendedor.map((repasse) => ({
      vendedor: repasse.vendedor,
      bruto: formatarReais(repasse.valorBruto),
      comissão: formatarReais(repasse.comissao),
      'a repassar': formatarReais(repasse.valorRepasse),
    })),
  );

  console.log('Top 3 produtos mais vendidos');
  console.table(dados.produtosMaisVendidos);
};

export const iniciarMenu = async (mp) => {
  // Cada opção: [rótulo, ação]. A ação lê o que precisa e chama o Marketplace.
  const acoes = {
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
        mostrar(
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
      async () =>
        mostrar(
          mp.atualizarCupom(await perguntar('Código do cupom para atualizar'), {
            tipo:
              (await perguntar('Novo tipo (percentual, fixo, frete)')).trim() ||
              undefined,
            valor: (await perguntar('Novo valor')).trim() || undefined,
            validade:
              (await perguntar('Nova validade AAAA-MM-DD')).trim() || undefined,
            valorMinimo:
              (await perguntar('Novo valor mínimo')).trim() || undefined,
            cumulativo: (await perguntar('Cumulativo? (s/n)')).trim()
              ? (await perguntar('Cumulativo? (s/n)')).trim().toLowerCase() ===
                's'
              : undefined,
          }),
        ),
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
      async () => mostrar(mp.resumoPedido(await perguntar('Número do pedido'))),
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
          mp.relatorioFinanceiro({
            dataInicio: await perguntar(
              'Data inicial (AAAA-MM-DD; Enter para sem filtro)',
            ),
            dataFim: await perguntar(
              'Data final (AAAA-MM-DD; Enter para sem filtro)',
            ),
            vendedor: await perguntar(
              'Vendedor envolvido (nome ou CNPJ; Enter para sem filtro)',
            ),
            cliente: await perguntar(
              'Cliente (nome, e-mail ou CPF; Enter para sem filtro)',
            ),
          }),
        ),
    ],
  };

  const mostrarMenu = () => {
    console.log('\n=== MercadoÁgil ===');
    Object.entries(acoes).forEach(([numero, [rotulo]]) =>
      console.log(`${numero} - ${rotulo}`),
    );
    console.log('0 - Sair');
  };

  const executar = async (opcao) => {
    const acao = acoes[opcao];
    if (!acao) return console.log('✖ Opção inexistente.');

    try {
      await acao[1]();
    } catch {
      console.log('✖ Erro inesperado. O sistema continua funcionando.');
    }
  };

  let opcao;
  do {
    mostrarMenu();
    opcao = (await perguntar('Opção')).trim();
    if (opcao !== '0') await executar(opcao);
  } while (opcao !== '0');

  rl.close();
};
