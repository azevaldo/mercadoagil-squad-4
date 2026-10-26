import { CATEGORIAS_PRODUTO } from '../config/regras.js';
import { arredondarDinheiro } from '../utils/dinheiro.js';

const somar = (valores) =>
  arredondarDinheiro(valores.reduce((total, valor) => total + valor, 0));

export const faturamento = (pedidos) => ({
  faturamentoTotal: somar(pedidos.map((pedido) => pedido.total)),
  quantidadePedidos: pedidos.length,
});

export const ticketMedio = (pedidos) => {
  const { faturamentoTotal, quantidadePedidos } = faturamento(pedidos);

  return quantidadePedidos === 0
    ? 0
    : arredondarDinheiro(faturamentoTotal / quantidadePedidos);
};

export const faturamentoPorCategoria = (pedidos) => {
  const porCategoria = new Map(
    CATEGORIAS_PRODUTO.map((categoria) => [categoria, 0]),
  );

  pedidos
    .flatMap((pedido) => pedido.itens)
    .forEach((item) => {
      porCategoria.set(
        item.categoria,
        (porCategoria.get(item.categoria) ?? 0) + item.valorBruto,
      );
    });

  return CATEGORIAS_PRODUTO.map((categoria) => ({
    categoria,
    faturamentoBruto: arredondarDinheiro(porCategoria.get(categoria)),
  }));
};

export const repassePorVendedor = (pedidos) => {
  const porVendedor = new Map();

  pedidos
    .flatMap((pedido) => pedido.repasses)
    .forEach((repasse) => {
      const atual = porVendedor.get(repasse.vendedor) ?? {
        vendedor: repasse.vendedor,
        valorBruto: 0,
        comissao: 0,
        valorRepasse: 0,
      };

      atual.valorBruto += repasse.bruto;
      atual.comissao += repasse.comissao;
      atual.valorRepasse += repasse.repasse;
      porVendedor.set(repasse.vendedor, atual);
    });

  return [...porVendedor.values()]
    .map((repasse) => ({
      ...repasse,
      valorBruto: arredondarDinheiro(repasse.valorBruto),
      comissao: arredondarDinheiro(repasse.comissao),
      valorRepasse: arredondarDinheiro(repasse.valorRepasse),
    }))
    .sort((a, b) => a.vendedor.localeCompare(b.vendedor, 'pt-BR'));
};

export const topProdutos = (pedidos, limite = 3) => {
  const porProduto = new Map();

  pedidos
    .flatMap((pedido) => pedido.itens)
    .forEach((item) => {
      const atual = porProduto.get(item.produtoId) ?? {
        produto: item.produto,
        quantidade: 0,
      };
      atual.quantidade += item.quantidade;
      porProduto.set(item.produtoId, atual);
    });

  return [...porProduto.values()]
    .sort(
      (a, b) =>
        b.quantidade - a.quantidade ||
        a.produto.localeCompare(b.produto, 'pt-BR'),
    )
    .slice(0, limite);
};

export const totais = (pedidos) => ({
  descontosConcedidos: somar(pedidos.map((pedido) => pedido.descontos)),
  tributosTotais: somar(pedidos.map((pedido) => pedido.tributos)),
  comissaoTotal: somar(pedidos.map((pedido) => pedido.comissao)),
});

export const resumoFinanceiro = (pedidos) => ({
  ...faturamento(pedidos),
  ticketMedio: ticketMedio(pedidos),
  faturamentoPorCategoria: faturamentoPorCategoria(pedidos),
  repassePorVendedor: repassePorVendedor(pedidos),
  produtosMaisVendidos: topProdutos(pedidos),
  ...totais(pedidos),
});
