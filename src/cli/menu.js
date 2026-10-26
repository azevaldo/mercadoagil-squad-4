import { criarAcoes } from './acoes.js';
import { Cancelamento, Encerramento, Terminal } from './terminal.js';
import {
  linhasRegistro,
  linhasResposta,
  linhasResumo,
  linhasRelatorio,
} from './apresentacao.js';

const areas = [
  {
    rotulo: 'Pedidos',
    ids: [21, 28, 22, 23, 24, 25, 26, 27],
    descricao: 'Da primeira compra ao repasse.',
    listar: 'listarPedidos',
    listaId: 28,
  },
  {
    rotulo: 'Clientes',
    ids: [2, 1, 3, 4, 5],
    descricao: 'Pessoas que compram no MercadoÁgil.',
    listar: 'listarClientes',
    listaId: 2,
  },
  {
    rotulo: 'Vendedores',
    ids: [7, 6, 8, 9, 10],
    descricao: 'Lojas e parceiros do marketplace.',
    listar: 'listarVendedores',
    listaId: 7,
  },
  {
    rotulo: 'Produtos',
    ids: [12, 11, 14, 13, 15],
    descricao: 'Catálogo, preços e estoque disponível.',
    listar: 'listarProdutos',
    listaId: 12,
  },
  {
    rotulo: 'Cupons',
    ids: [17, 16, 18, 19, 20],
    descricao: 'Descontos e condições de uso.',
    listar: 'listarCupons',
    listaId: 17,
  },
  {
    rotulo: 'Relatórios',
    ids: [29, 30, 31, 32],
    descricao: 'Vendas confirmadas e resultados.',
    listar: null,
  },
];
const ajudaAcao = (titulo) => {
  if (/Excluir|Cancelar pedido/.test(titulo))
    return [
      'Confira o registro antes de continuar.',
      'Esc cancela o preenchimento.',
    ];
  if (/Atualizar/.test(titulo))
    return [
      'Informe o registro e os novos dados.',
      'Campos opcionais indicam como manter o valor.',
    ];
  if (/Relatório|Faturamento|Repasse|Top 3/.test(titulo))
    return [
      'Somente pedidos confirmados.',
      'Filtre por período, vendedor ou cliente.',
      'Enter deixa o filtro em branco.',
    ];
  if (/Listar/.test(titulo))
    return [
      'Digite para filtrar os registros.',
      'Selecione para consultar os detalhes.',
    ];
  return [
    'Preencha os campos solicitados.',
    'Esc cancela sem concluir a operação.',
  ];
};
const navegarRegistros = async (ui, mp, area) => {
  const resposta = mp[area.listar]();
  if (!resposta.ok || resposta.dados.length === 0) {
    return ui.exibir(
      area.rotulo,
      resposta.ok
        ? [
            'Nenhum registro cadastrado.',
            'Volte e escolha a opção de cadastro para começar.',
          ]
        : linhasResposta(resposta),
    );
  }
  const opcoes = resposta.dados.map((registro) => ({
    rotulo:
      registro.nome ??
      registro.nomeLoja ??
      registro.codigo ??
      `Pedido #${registro.id} · ${registro.cliente} · ${registro.status}`,
    detalhes: linhasRegistro(registro),
    busca: linhasRegistro(registro).join(' '),
    registro,
  }));
  let selecionado;
  do {
    selecionado = await ui.selecionar(
      `Consultar ${area.rotulo.toLowerCase()}`,
      opcoes,
    );
    if (selecionado) {
      const linhas =
        area.rotulo === 'Pedidos'
          ? linhasResumo(mp.resumoPedido(selecionado.registro.id))
          : linhasRegistro(selecionado.registro);
      await ui.exibir(selecionado.rotulo, linhas);
    }
  } while (selecionado);
};

export const iniciarMenu = async (mp) => {
  const ui = new Terminal();
  let tituloAcao = '';
  const acoes = criarAcoes(mp, {
    perguntar: (texto) => ui.perguntar(texto),
    mostrar: (resposta) => ui.exibir(tituloAcao, linhasResposta(resposta)),
    mostrarResumoPedido: (resposta) =>
      ui.exibir('Resumo do pedido', linhasResumo(resposta)),
    mostrarRelatorioFinanceiro: (resposta) =>
      ui.exibir('Relatório financeiro', linhasRelatorio(resposta)),
  });
  try {
    let area;
    do {
      ui.caminho = [];
      area = await ui.selecionar(
        'Seu marketplace, por área',
        areas.map((item) => ({
          ...item,
          detalhes: [
            item.rotulo,
            '',
            item.descricao,
            '',
            ...(item.listar
              ? [
                  `${mp[item.listar]().dados.length} registro(s)`,
                  'Listar, buscar e gerenciar.',
                ]
              : [
                  'Faturamento e ticket médio',
                  'Categorias e repasses',
                  'Produtos mais vendidos',
                ]),
          ],
        })),
        { voltar: 'Sair' },
      );
      if (!area) break;
      let acao;
      do {
        ui.caminho = [area.rotulo];
        acao = await ui.selecionar(
          area.descricao,
          area.ids.map((id) => ({
            id,
            rotulo: acoes[id][0],
            detalhes: [acoes[id][0], '', ...ajudaAcao(acoes[id][0])],
          })),
        );
        if (!acao) break;
        tituloAcao = acao.rotulo;
        ui.caminho = [area.rotulo, tituloAcao];
        try {
          if (acao.id === area.listaId) await navegarRegistros(ui, mp, area);
          else await acoes[acao.id][1]();
        } catch (erro) {
          if (erro instanceof Encerramento) throw erro;
          if (!(erro instanceof Cancelamento))
            await ui.exibir('Não foi possível concluir', [
              'Ocorreu um erro inesperado nesta operação.',
              'Volte ao menu e confira os dados antes de tentar novamente.',
            ]);
        }
      } while (acao);
    } while (area);
  } catch (erro) {
    if (!(erro instanceof Encerramento || erro instanceof Cancelamento))
      throw erro;
  } finally {
    ui.fechar();
  }
  console.log('Até já! MercadoÁgil encerrado.');
};
