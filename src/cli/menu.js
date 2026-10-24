import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const rl = createInterface({ input: stdin, output: stdout });
const perguntar = (texto) => rl.question(`${texto}: `);

// Mostra a resposta do serviço: erros com ✖, ou os dados em tabela
const mostrar = ({ ok, dados, erros }) => {
  if (!ok) return erros.forEach((erro) => console.log(`✖ ${erro}`));
  console.table([dados].flat());
};

export const iniciarMenu = async (mp) => {
  // Cada opção: [rótulo, ação]. A ação lê o que precisa e chama o Marketplace.
  const acoes = {
    1: ['Cadastrar cliente', async () => mostrar(mp.cadastrarCliente({
      nome: await perguntar('Nome'),
      email: await perguntar('E-mail'),
      cpf: await perguntar('CPF'),
      uf: await perguntar('UF (ex.: SP)'),
    }))],
    2: ['Listar clientes', () => mostrar(mp.listarClientes())],
    3: ['Buscar cliente', async () => mostrar(mp.buscarCliente(await perguntar('CPF ou nome')))],
    4: ['Excluir cliente', async () => mostrar(mp.excluirCliente(await perguntar('CPF')))],

    5: ['Cadastrar vendedor', async () => mostrar(mp.cadastrarVendedor({
      nome: await perguntar('Nome da loja'),
      cnpj: await perguntar('CNPJ'),
      email: await perguntar('E-mail'),
    }))],
    6: ['Listar vendedores', () => mostrar(mp.listarVendedores())],
    7: ['Buscar vendedor', async () => mostrar(mp.buscarVendedor(await perguntar('CNPJ ou nome')))],
    8: ['Excluir vendedor', async () => mostrar(mp.excluirVendedor(await perguntar('CNPJ')))],

    9: ['Cadastrar produto', async () => mostrar(mp.cadastrarProduto({
      id: await perguntar('Id'),
      nome: await perguntar('Nome'),
      preco: await perguntar('Preço (ex.: 120.50)'),
      categoria: await perguntar('Categoria (eletronicos, livros, alimentos, vestuario, casa)'),
      vendedorCnpj: await perguntar('CNPJ do vendedor'),
      quantidade: await perguntar('Quantidade em estoque'),
    }))],
    10: ['Listar produtos', () => mostrar(mp.listarProdutos())],
    11: ['Buscar produto', async () => mostrar(mp.buscarProduto(await perguntar('Id ou nome')))],
    12: ['Excluir produto', async () => mostrar(mp.excluirProduto(await perguntar('Id')))],

    13: ['Cadastrar cupom', async () => mostrar(mp.cadastrarCupom({
      codigo: await perguntar('Código'),
      tipo: await perguntar('Tipo (percentual, fixo, frete)'),
      valor: await perguntar('Valor'),
      validade: await perguntar('Validade (AAAA-MM-DD)'),
      valorMinimo: await perguntar('Valor mínimo do subtotal (Enter para 0)'),
      cumulativo: (await perguntar('Cumulativo? (s/n)')).trim().toLowerCase() === 's',
    }))],
    14: ['Listar cupons', () => mostrar(mp.listarCupons())],
    15: ['Buscar cupom', async () => mostrar(mp.buscarCupom(await perguntar('Código')))],
    16: ['Excluir cupom', async () => mostrar(mp.excluirCupom(await perguntar('Código')))],

    17: ['Novo pedido', async () => mostrar(mp.criarPedido(await perguntar('CPF do cliente')))],
    18: ['Adicionar item ao pedido', async () => mostrar(mp.adicionarItem(
      await perguntar('Número do pedido'),
      await perguntar('Id do produto'),
      await perguntar('Quantidade'),
    ))],
    19: ['Remover item do pedido', async () => mostrar(mp.removerItem(
      await perguntar('Número do pedido'),
      await perguntar('Id do produto'),
    ))],
    20: ['Aplicar cupom ao pedido', async () => mostrar(mp.aplicarCupom(
      await perguntar('Número do pedido'),
      await perguntar('Código do cupom'),
    ))],
    21: ['Ver resumo do pedido', async () => mostrar(mp.resumoPedido(await perguntar('Número do pedido')))],
    22: ['Confirmar pedido', async () => mostrar(mp.confirmarPedido(await perguntar('Número do pedido')))],
    23: ['Cancelar pedido', async () => mostrar(mp.cancelarPedido(await perguntar('Número do pedido')))],
    24: ['Listar pedidos', () => mostrar(mp.listarPedidos())],

    25: ['Relatório financeiro', () => mostrar(mp.relatorioFinanceiro())],
  };

  const mostrarMenu = () => {
    console.log('\n=== MercadoÁgil ===');
    Object.entries(acoes).forEach(([numero, [rotulo]]) => console.log(`${numero} - ${rotulo}`));
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