const secoes = new Set([
  'Itens do pedido',
  'Repasses por vendedor',
  'Faturamento bruto por categoria',
  'Top 3 produtos mais vendidos',
]);

const formatarLinha = (linha, colorir) => {
  if (!linha) return '';
  if (linha.startsWith('✓')) return colorir(linha, '1;32');
  if (linha.startsWith('✖') || linha.startsWith('•'))
    return colorir(linha, '31');
  if (secoes.has(linha) || /^Registro \d+$/.test(linha))
    return colorir(linha, '1;36');

  const separador = linha.indexOf(':');
  if (separador > 0)
    return `${colorir(linha.slice(0, separador), '36')}${linha.slice(separador)}`;
  return linha;
};

export const criarResultados = (terminal) => async (titulo, linhas) => {
  terminal.cabecalho(titulo);
  console.log();
  for (const linha of linhas)
    console.log(formatarLinha(linha, terminal.colorir));

  if (terminal.interativo)
    await terminal.ler(
      terminal.colorir('\nEnter para voltar às opções.', '90'),
    );
};
