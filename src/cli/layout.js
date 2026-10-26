import { textoSeguro } from './apresentacao.js';

const segmentador = new Intl.Segmenter('pt-BR', { granularity: 'grapheme' });
const caracteres = (texto) =>
  [...segmentador.segment(textoSeguro(texto))].map(({ segment }) => segment);

// O terminal mede células: acentos combinados ocupam uma; ideogramas e emojis, duas.
const larguraCaractere = (texto) => {
  if (/^\p{Mark}+$/u.test(texto)) return 0;
  if (/\p{Emoji_Presentation}|\uFE0F|\u20E3/u.test(texto)) return 2;
  const ponto = texto.codePointAt(0);
  return ponto >= 0x1100 &&
    (ponto <= 0x115f ||
      ponto === 0x2329 ||
      ponto === 0x232a ||
      (ponto >= 0x2e80 && ponto <= 0xa4cf && ponto !== 0x303f) ||
      (ponto >= 0xac00 && ponto <= 0xd7a3) ||
      (ponto >= 0xf900 && ponto <= 0xfaff) ||
      (ponto >= 0xfe10 && ponto <= 0xfe19) ||
      (ponto >= 0xfe30 && ponto <= 0xfe6f) ||
      (ponto >= 0xff00 && ponto <= 0xff60) ||
      (ponto >= 0xffe0 && ponto <= 0xffe6) ||
      (ponto >= 0x20000 && ponto <= 0x3fffd))
    ? 2
    : 1;
};
export const larguraTexto = (texto) =>
  caracteres(texto).reduce(
    (total, caractere) => total + larguraCaractere(caractere),
    0,
  );

export const recortar = (texto, tamanho, indicador = '…') => {
  tamanho = Math.max(0, tamanho);
  if (larguraTexto(texto) <= tamanho) return textoSeguro(texto);
  const limite = Math.max(0, tamanho - larguraTexto(indicador));
  let largura = 0;
  const resultado = caracteres(texto)
    .filter((caractere) => {
      largura += larguraCaractere(caractere);
      return largura <= limite;
    })
    .join('');
  return resultado + (tamanho >= larguraTexto(indicador) ? indicador : '');
};
export const preencher = (texto, tamanho) => {
  const cortado = recortar(texto, tamanho);
  return cortado + ' '.repeat(Math.max(0, tamanho - larguraTexto(cortado)));
};
export const finalTexto = (texto, tamanho) => {
  let largura = 0;
  return caracteres(texto)
    .reverse()
    .filter((caractere) => {
      largura += larguraCaractere(caractere);
      return largura <= Math.max(0, tamanho);
    })
    .reverse()
    .join('');
};
export const quebrarLinha = (texto, tamanho) => {
  const largura = Math.max(1, tamanho);
  return caracteres(texto).reduce(
    (linhas, caractere) => {
      const ultimo = linhas.length - 1;
      if (larguraCaractere(caractere) > largura) linhas.push('…');
      else if (
        larguraTexto(linhas[ultimo]) + larguraCaractere(caractere) >
        largura
      )
        linhas.push(caractere);
      else linhas[ultimo] += caractere;
      return linhas;
    },
    [''],
  );
};
export const medidas = (colunas = 80, linhas = 24) => ({
  largura: Math.max(1, colunas - 2),
  corpo: Math.max(1, linhas - 6),
  compacto: colunas < 80,
  minimo: colunas < 24 || linhas < 8,
});
