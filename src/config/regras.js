export const CATEGORIAS_PRODUTO = Object.freeze([
  'eletronicos',
  'livros',
  'alimentos',
  'vestuario',
  'casa',
]);

export const FRETE_POR_REGIAO = Object.freeze({
  Norte: 35,
  Nordeste: 25,
  'Centro-Oeste': 30,
  Sudeste: 20,
  Sul: 22,
});

export const FRETE_POR_UNIDADE = 1.5;
export const FRETE_GRATIS_A_PARTIR_DE = 300;

export const TRIBUTOS_POR_CATEGORIA = Object.freeze({
  eletronicos: 0.12,
  livros: 0,
  alimentos: 0.05,
  vestuario: 0.08,
  casa: 0.1,
});

export const COMISSOES_POR_CATEGORIA = Object.freeze({
  eletronicos: 0.08,
  livros: 0.15,
  alimentos: 0.1,
  vestuario: 0.12,
  casa: 0.1,
});

export const TETO_DESCONTO_PERCENTUAL = 0.3;
export const LIMITE_CUPONS_POR_PEDIDO = 2;
