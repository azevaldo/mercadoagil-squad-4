import { stripVTControlCharacters } from 'node:util';
import { formatarReais } from '../utils/dinheiro.js';

// Cadastros são texto: sequências de controle nunca devem chegar ao terminal.
export const textoSeguro = (valor) =>
  stripVTControlCharacters(String(valor ?? '')).replace(/\p{Cc}/gu, ' ');

const rotulos = {
  id: 'Número',
  nome: 'Nome',
  nomeLoja: 'Loja',
  email: 'E-mail',
  regiaoEntrega: 'Região de entrega',
  cnpj: 'CNPJ',
  codigo: 'Código',
  preco: 'Preço',
  categoria: 'Categoria',
  vendedor: 'Vendedor',
  disponivel: 'Em estoque',
  quantidade: 'Quantidade',
  cliente: 'Cliente',
  status: 'Status',
  subtotal: 'Subtotal',
  descontos: 'Descontos',
  frete: 'Frete',
  tributos: 'Tributos aproximados',
  total: 'Total',
  comissao: 'Comissão',
  bruto: 'Valor bruto',
  repasse: 'Repasse',
  valor: 'Valor',
  valorMinimo: 'Subtotal mínimo',
  validade: 'Validade',
  cumulativo: 'Cumulativo',
  tipo: 'Tipo',
  produto: 'Produto',
  faturamentoTotal: 'Faturamento total',
  quantidadePedidos: 'Pedidos confirmados',
  ticketMedio: 'Ticket médio',
  descontosConcedidos: 'Descontos concedidos',
  tributosTotais: 'Tributos',
  comissaoTotal: 'Comissão total',
  faturamentoBruto: 'Faturamento bruto',
  valorBruto: 'Valor bruto',
  valorRepasse: 'A repassar',
  totalItens: 'Produtos no pedido',
  mensagem: 'Mensagem',
  removido: 'Removido',
};
const moedas = new Set([
  'preco',
  'subtotal',
  'descontos',
  'frete',
  'tributos',
  'total',
  'comissao',
  'bruto',
  'repasse',
  'valorMinimo',
  'faturamentoTotal',
  'ticketMedio',
  'descontosConcedidos',
  'tributosTotais',
  'comissaoTotal',
  'faturamentoBruto',
  'valorBruto',
  'valorRepasse',
]);

export const formatarCampo = (chave, valor, registro = {}) => {
  if (valor instanceof Date) return valor.toLocaleDateString('pt-BR');
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (typeof valor === 'number' && moedas.has(chave))
    return formatarReais(valor);
  if (chave === 'valor' && typeof valor === 'number') {
    if (registro.tipo === 'percentual') return `${valor}%`;
    if (registro.tipo === 'frete') return 'Frete grátis';
    return formatarReais(valor);
  }
  return textoSeguro(valor);
};

export const linhasRegistro = (registro) => {
  if (!registro || typeof registro !== 'object') return [textoSeguro(registro)];
  return Object.entries(registro).flatMap(([chave, valor]) => {
    if (chave === 'cpf') return [];
    const rotulo = rotulos[chave] ?? chave;
    if (Array.isArray(valor)) {
      if (valor.length === 0) return [`${rotulo}: nenhum`];
      if (valor.every((item) => typeof item !== 'object'))
        return [`${rotulo}: ${valor.map(textoSeguro).join(', ')}`];
      return [
        rotulo,
        ...valor.flatMap((item) =>
          linhasRegistro(item).map((linha) => `  ${linha}`),
        ),
      ];
    }
    return [`${rotulo}: ${formatarCampo(chave, valor, registro)}`];
  });
};
export const linhasResposta = ({ ok, dados, erros }) => {
  if (!ok)
    return [
      '✖ Não foi possível concluir',
      '',
      ...erros.map((erro) => `• ${textoSeguro(erro)}`),
    ];
  if (Array.isArray(dados))
    return dados.length === 0
      ? ['Nenhum registro encontrado.']
      : dados.flatMap((registro, indice) => [
          `Registro ${indice + 1}`,
          ...linhasRegistro(registro),
          '',
        ]);
  return ['✓ Operação concluída', '', ...linhasRegistro(dados)];
};
export const linhasResumo = (resposta) => {
  if (!resposta.ok) return linhasResposta(resposta);
  const { itens, repasses, ...resumo } = resposta.dados;
  return [
    ...linhasRegistro(resumo),
    '',
    'Itens do pedido',
    ...itens.map(
      (item) =>
        `${textoSeguro(item.produto)} × ${item.quantidade}    ${formatarReais(item.valor)}`,
    ),
    ...(repasses.length
      ? [
          '',
          'Repasses por vendedor',
          ...repasses.flatMap((repasse) => [...linhasRegistro(repasse), '']),
        ]
      : []),
  ];
};
export const linhasRelatorio = (resposta) => {
  if (!resposta.ok) return linhasResposta(resposta);
  const {
    faturamentoPorCategoria,
    repassePorVendedor,
    produtosMaisVendidos,
    ...totais
  } = resposta.dados;
  return [
    ...linhasRegistro(totais),
    '',
    'Faturamento bruto por categoria',
    ...faturamentoPorCategoria.map(
      (item) =>
        `${item.categoria.padEnd(14)} ${formatarReais(item.faturamentoBruto)}`,
    ),
    '',
    'Repasses por vendedor',
    ...repassePorVendedor.flatMap((item) => [...linhasRegistro(item), '']),
    ...(repassePorVendedor.length ? [] : ['Nenhum repasse no período.']),
    '',
    'Top 3 produtos mais vendidos',
    ...produtosMaisVendidos.map(
      (item, indice) =>
        `${indice + 1}. ${textoSeguro(item.produto)} · ${item.quantidade} unidade(s)`,
    ),
    ...(produtosMaisVendidos.length ? [] : ['Nenhuma venda no período.']),
  ];
};
