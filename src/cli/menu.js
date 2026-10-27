import { criarAcoes } from '../commands/acoes.js';
import {
  linhasResposta,
  linhasResumo,
  linhasRelatorio,
} from '../commands/apresentacao.js';
import { Cancelamento, Encerramento } from './terminal.js';

const categorias = [
  { rotulo: 'Pedidos', ids: [21, 28, 22, 23, 24, 25, 26, 27, 33] },
  {
    rotulo: 'Cadastros',
    subcategorias: [
      { rotulo: 'Clientes', ids: [2, 1, 3, 4, 5] },
      { rotulo: 'Vendedores', ids: [7, 6, 8, 9, 10] },
      { rotulo: 'Produtos', ids: [12, 11, 14, 13, 15] },
      { rotulo: 'Cupons', ids: [17, 16, 18, 19, 20] },
    ],
  },
  { rotulo: 'Relatórios', ids: [29, 30, 31, 32] },
  { rotulo: 'Sair', sair: true },
];

export const executarMenu = async (mp, { terminal, perguntar, exibir }) => {
  let tituloAcao = '';
  const acoes = criarAcoes(mp, {
    perguntar: (rotulo, configuracao) =>
      perguntar(tituloAcao, rotulo, configuracao),
    mostrar: (resposta) => exibir(tituloAcao, linhasResposta(resposta)),
    mostrarResumoPedido: (resposta) =>
      exibir('Resumo do pedido', linhasResumo(resposta)),
    mostrarRelatorioFinanceiro: (resposta) =>
      exibir('Relatório financeiro', linhasRelatorio(resposta)),
  });

  const executarAcoes = async (categoria) => {
    let acao;
    do {
      acao = await terminal.selecionar(
        categoria.rotulo,
        categoria.ids.map((id) => ({ id, rotulo: acoes[id][0] })),
      );
      if (!acao) return;

      tituloAcao = acao.rotulo;
      try {
        await acoes[acao.id][1]();
      } catch (erro) {
        if (erro instanceof Encerramento) throw erro;
        if (!(erro instanceof Cancelamento)) {
          await exibir('Não foi possível concluir', [
            'Ocorreu um erro inesperado nesta operação.',
          ]);
        }
      }
    } while (acao);
  };

  try {
    let categoria;
    do {
      categoria = await terminal.selecionar('Menu principal', categorias, {
        voltar: 'sair',
      });
      if (!categoria || categoria.sair) break;

      if (categoria.subcategorias) {
        let subcategoria;
        do {
          subcategoria = await terminal.selecionar(
            'Cadastros',
            categoria.subcategorias,
          );
          if (subcategoria) await executarAcoes(subcategoria);
        } while (subcategoria);
      } else {
        await executarAcoes(categoria);
      }
    } while (categoria);
  } catch (erro) {
    if (!(erro instanceof Encerramento || erro instanceof Cancelamento))
      throw erro;
  }
};
