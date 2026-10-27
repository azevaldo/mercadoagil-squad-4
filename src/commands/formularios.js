import { z } from 'zod';
import { clienteSchema } from '../schemas/clienteSchema.js';
import { vendedorSchema } from '../schemas/vendedorSchema.js';
import { produtoSchema, produtoIdSchema } from '../schemas/produtoSchema.js';
import { cupomSchema } from '../schemas/cupomSchema.js';
import {
  pedidoIdSchema,
  itemPedidoSchema,
} from '../schemas/itemPedidoSchema.js';
import { ajudaCampo } from './ajuda.js';

const obrigatorio = z
  .string()
  .trim()
  .min(1, 'Preencha este campo antes de continuar.');
const simNao = z.enum(['s', 'n'], {
  error: 'Responda s para sim ou n para não.',
});
const primeiroErro = (resultado) =>
  resultado.success ? '' : resultado.error.issues[0].message;

// Reutiliza os schemas do serviço. Verificações de existência são consultas,
// nunca cadastros ou alterações antecipadas durante o preenchimento.
export const criarFormularios = (mp, perguntar) => {
  const campo = (
    rotulo,
    schema,
    exemplo,
    {
      opcional = false,
      verificar,
      valorAtual,
      ajuda = ajudaCampo(rotulo),
    } = {},
  ) =>
    perguntar(rotulo, {
      ajuda,
      exemplo,
      validar: (valor) => {
        if (!opcional && valor === '')
          return 'Preencha este campo antes de continuar.';
        const entrada = opcional && valor === '' ? valorAtual : valor;
        if (entrada === undefined) return '';
        const resultado = schema.safeParse(entrada);
        return (
          primeiroErro(resultado) ||
          (resultado.success && verificar
            ? verificar(resultado.data, entrada)
            : '')
        );
      },
    });
  const cpf = (novo = false, rotulo = 'CPF do cliente') =>
    campo(
      rotulo,
      clienteSchema.shape.cpf,
      novo ? '390.533.447-05' : '529.982.247-25',
      {
        verificar: (valor) => {
          const existe = mp.buscarCliente(valor).ok;
          return novo
            ? existe
              ? 'Já existe um cliente com este CPF.'
              : ''
            : existe
              ? ''
              : 'Cliente não encontrado. Consulte a lista ou cadastre o cliente primeiro.';
        },
      },
    );
  const cnpj = (novo = false, rotulo = 'CNPJ do vendedor') =>
    campo(
      rotulo,
      vendedorSchema.shape.cnpj,
      novo ? '12.345.678/0001-95' : '11.222.333/0001-81',
      {
        verificar: (valor) => {
          const existe = mp.buscarVendedor(valor).ok;
          return novo
            ? existe
              ? 'Já existe uma loja com este CNPJ.'
              : ''
            : existe
              ? ''
              : 'Vendedor não encontrado. Consulte a lista ou cadastre a loja primeiro.';
        },
      },
    );
  const produto = () =>
    campo('Id do produto', produtoIdSchema.shape.produtoId, '1', {
      verificar: (valor) =>
        mp.buscarProduto(valor).ok
          ? ''
          : 'Produto não encontrado. Consulte Produtos > Listar produtos.',
    });
  const pedido = (aberto = false) =>
    campo('Número do pedido', pedidoIdSchema.shape.pedidoId, '1', {
      verificar: (valor) => {
        const resposta = mp.resumoPedido(valor);
        if (!resposta.ok) return resposta.erros[0];
        return aberto && resposta.dados.status !== 'aberto'
          ? 'Este pedido não está aberto e não aceita esta alteração.'
          : '';
      },
    });
  const codigo = (novo = false) =>
    campo(
      'Código do cupom',
      cupomSchema.shape.codigo,
      novo ? 'PROMO10' : 'BEMVINDO10',
      {
        verificar: (valor) => {
          const existe = mp.buscarCupom(valor).ok;
          return novo
            ? existe
              ? 'Já existe um cupom com este código.'
              : ''
            : existe
              ? ''
              : 'Cupom não encontrado. Consulte Cupons > Listar cupons.';
        },
      },
    );
  const cumulativo = async (opcional = false) => {
    const valor = await campo(
      `Cumulativo? (s/n${opcional ? '; Enter para manter' : ''})`,
      z.string().trim().toLowerCase().pipe(simNao),
      's',
      { opcional },
    );
    return valor === '' ? undefined : valor.toLowerCase() === 's';
  };
  const cliente = async () => ({
    nome: await campo('Nome', clienteSchema.shape.nome, 'Maria Santos'),
    email: await campo(
      'E-mail',
      clienteSchema.shape.email,
      'maria@example.com',
    ),
    cpf: await cpf(true, 'CPF'),
    regiaoEntrega: await campo(
      'Região de entrega',
      clienteSchema.shape.regiaoEntrega,
      'Nordeste',
      {
        ajuda:
          'Escolha: Norte, Nordeste, Centro-Oeste, Sudeste ou Sul. A região determina o frete.',
      },
    ),
  });
  const vendedor = async () => ({
    nomeLoja: await campo(
      'Nome da loja',
      vendedorSchema.shape.nomeLoja,
      'TechBahia',
    ),
    cnpj: await cnpj(true, 'CNPJ'),
    email: await campo(
      'E-mail',
      vendedorSchema.shape.email,
      'contato@techbahia.com.br',
    ),
  });
  const dadosProduto = async (editar = false) => {
    const opcoes = { opcional: editar };
    const sufixo = editar ? ' (Enter para manter)' : '';
    const dados = {
      nome: await campo(
        `Nome${sufixo}`,
        produtoSchema.shape.nome,
        'Mouse sem fio',
        opcoes,
      ),
      preco: await campo(
        `Preço${sufixo}`,
        produtoSchema.shape.preco,
        '120,50',
        opcoes,
      ),
      categoria: await campo(
        `Categoria${sufixo}`,
        produtoSchema.shape.categoria,
        'eletronicos',
        {
          ...opcoes,
          ajuda: 'Escolha: eletronicos, livros, alimentos, vestuario ou casa.',
        },
      ),
    };
    if (!editar) dados.vendedorCnpj = await cnpj();
    dados.quantidade = await campo(
      `Quantidade em estoque${sufixo}`,
      produtoSchema.shape.quantidade,
      '10',
      opcoes,
    );
    return dados;
  };
  const dadosCupom = async (atual = null) => {
    const editar = Boolean(atual);
    const sufixo = editar ? ' (Enter para manter)' : '';
    const tipo = await campo(
      `Tipo${sufixo}`,
      cupomSchema.shape.tipo,
      'percentual',
      { opcional: editar },
    );
    const tipoEfetivo = tipo || atual?.tipo;
    const validarValor = (numero) =>
      primeiroErro(
        cupomSchema.safeParse({
          codigo: 'EXEMPLO',
          tipo: tipoEfetivo,
          valor: numero,
          validade: '2099-12-31',
          valorMinimo: 0,
          cumulativo: false,
        }),
      );
    const valor = await campo(
      `Valor${sufixo}`,
      cupomSchema.shape.valor,
      tipoEfetivo === 'frete' ? '0' : '10',
      {
        opcional: editar,
        valorAtual: atual?.valor,
        verificar: validarValor,
      },
    );
    const validade = await campo(
      `Validade (AAAA-MM-DD)${sufixo}`,
      cupomSchema.shape.validade,
      '2030-12-31',
      {
        opcional: editar,
        valorAtual: atual?.validade,
        verificar: (_data, texto) => {
          if (texto instanceof Date) return '';
          const resposta = mp.relatorioFinanceiro({ dataInicio: texto });
          return resposta.ok
            ? ''
            : 'Informe uma data existente no formato AAAA-MM-DD.';
        },
      },
    );
    const valorMinimo = await campo(
      `Valor mínimo do subtotal${editar ? ' (Enter para manter)' : ' (Enter para 0)'}`,
      cupomSchema.shape.valorMinimo,
      '100',
      { opcional: true },
    );
    return {
      tipo: tipo || undefined,
      valor: valor === '' ? undefined : valor,
      validade: validade || undefined,
      valorMinimo: valorMinimo === '' ? (editar ? undefined : 0) : valorMinimo,
      cumulativo: await cumulativo(editar),
    };
  };
  const filtros = async () => {
    const datas = {};
    const data = (chave, rotulo) =>
      campo(rotulo, obrigatorio, '2026-10-01', {
        opcional: true,
        verificar: (valor) => {
          const resposta = mp.relatorioFinanceiro({ ...datas, [chave]: valor });
          return resposta.ok ? '' : resposta.erros[0];
        },
        ajuda:
          'Use ano-mês-dia. O período inclui as datas informadas. Enter deixa sem este limite.',
      });
    datas.dataInicio = await data(
      'dataInicio',
      'Data inicial (Enter para sem filtro)',
    );
    datas.dataFim = await data('dataFim', 'Data final (Enter para sem filtro)');
    return {
      ...datas,
      vendedor: await campo(
        'Vendedor envolvido (Enter para sem filtro)',
        obrigatorio,
        'TechBahia',
        {
          opcional: true,
          ajuda:
            'Filtre os pedidos que incluem uma loja, usando o nome ou CNPJ.',
        },
      ),
      cliente: await campo(
        'Cliente (Enter para sem filtro)',
        obrigatorio,
        'Maria',
        {
          opcional: true,
          ajuda:
            'Busque por nome, e-mail ou CPF. Enter considera todos os clientes.',
        },
      ),
    };
  };
  return {
    campo,
    cpf,
    cnpj,
    produto,
    pedido,
    codigo,
    cliente,
    vendedor,
    dadosProduto,
    dadosCupom,
    filtros,
    quantidade: () =>
      campo('Quantidade', itemPedidoSchema.shape.quantidade, '2'),
    buscar: (rotulo, exemplo) => campo(rotulo, obrigatorio, exemplo),
    atualizarCliente: async () => ({
      nome: await campo('Novo nome', clienteSchema.shape.nome, 'Maria Santos'),
      email: await campo(
        'Novo e-mail',
        clienteSchema.shape.email,
        'maria@example.com',
      ),
      regiaoEntrega: await campo(
        'Nova região',
        clienteSchema.shape.regiaoEntrega,
        'Nordeste',
        { ajuda: 'Escolha: Norte, Nordeste, Centro-Oeste, Sudeste ou Sul.' },
      ),
    }),
    atualizarVendedor: async () => ({
      nomeLoja: await campo(
        'Novo nome da loja',
        vendedorSchema.shape.nomeLoja,
        'TechBahia',
      ),
      email: await campo(
        'Novo e-mail',
        vendedorSchema.shape.email,
        'contato@techbahia.com.br',
      ),
    }),
  };
};
