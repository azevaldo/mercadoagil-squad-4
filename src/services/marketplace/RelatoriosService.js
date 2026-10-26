import { sucesso, falha } from '../../utils/extra.js';
import * as relatorios from '../relatorios.js';

const validarDataRelatorio = (valor, rotulo) => {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return { ok: true, dados: null };
  }

  const data = String(valor).trim();
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data);
  const dataInterpretada = dataValida
    ? new Date(`${data}T00:00:00.000Z`)
    : null;

  if (
    !dataValida ||
    Number.isNaN(dataInterpretada.getTime()) ||
    dataInterpretada.toISOString().slice(0, 10) !== data
  ) {
    return {
      ok: false,
      erros: [`A ${rotulo} deve ser uma data válida no formato AAAA-MM-DD.`],
    };
  }

  return { ok: true, dados: data };
};

const dataLocalDoPedido = (data) => {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(data);
  const campos = Object.fromEntries(
    partes.map(({ type, value }) => [type, value]),
  );

  return `${campos.year}-${campos.month}-${campos.day}`;
};

export class RelatoriosService {
  #listarPedidosConfirmados;

  constructor({ listarPedidosConfirmados }) {
    this.#listarPedidosConfirmados = listarPedidosConfirmados;
  }

  relatorioFinanceiro(filtros = {}) {
    const opcoes = filtros && typeof filtros === 'object' ? filtros : {};
    const dataInicioValidada = validarDataRelatorio(
      opcoes.dataInicio,
      'data inicial',
    );
    if (!dataInicioValidada.ok) return falha(dataInicioValidada.erros);

    const dataFimValidada = validarDataRelatorio(opcoes.dataFim, 'data final');
    if (!dataFimValidada.ok) return falha(dataFimValidada.erros);

    const dataInicio = dataInicioValidada.dados;
    const dataFim = dataFimValidada.dados;

    if (dataInicio && dataFim && dataInicio > dataFim) {
      return falha(['A data inicial não pode ser posterior à data final.']);
    }

    const vendedorBusca = String(opcoes.vendedor ?? '').trim();
    const vendedorNomeBusca = vendedorBusca.toLocaleLowerCase('pt-BR');
    const vendedorCnpjBusca = vendedorBusca.replace(/\D/g, '');
    const clienteBusca = String(opcoes.cliente ?? '').trim();
    const clienteTextoBusca = clienteBusca.toLocaleLowerCase('pt-BR');
    const clienteCpfBusca = clienteBusca.replace(/\D/g, '');

    const pedidosConfirmados = this.#listarPedidosConfirmados().map(
      (pedido) => ({ pedido, dados: pedido.dadosFinanceiros() }),
    );
    const pedidosFiltrados = pedidosConfirmados.filter(({ pedido, dados }) => {
      const dataConfirmacao = dataLocalDoPedido(dados.confirmadoEm);
      const dentroDoPeriodo =
        (!dataInicio || dataConfirmacao >= dataInicio) &&
        (!dataFim || dataConfirmacao <= dataFim);
      if (!dentroDoPeriodo) return false;

      if (vendedorBusca) {
        const temVendedor = dados.itens.some((item) => {
          const nomeCorresponde = item.vendedor
            .toLocaleLowerCase('pt-BR')
            .includes(vendedorNomeBusca);
          const cnpjCorresponde =
            vendedorCnpjBusca.length > 0 &&
            item.vendedorCnpj.replace(/\D/g, '').includes(vendedorCnpjBusca);

          return nomeCorresponde || cnpjCorresponde;
        });
        if (!temVendedor) return false;
      }

      if (clienteBusca) {
        const cliente = pedido.cliente;
        const cpfCorresponde =
          clienteCpfBusca.length === 11 && cliente.possuiCpf(clienteCpfBusca);
        const nomeCorresponde = cliente.nome
          .toLocaleLowerCase('pt-BR')
          .includes(clienteTextoBusca);
        const emailCorresponde = cliente.email
          .toLocaleLowerCase('pt-BR')
          .includes(clienteTextoBusca);

        if (!cpfCorresponde && !nomeCorresponde && !emailCorresponde) {
          return false;
        }
      }

      return true;
    });
    const dadosPedidos = pedidosFiltrados.map(({ dados }) => dados);

    return sucesso(relatorios.resumoFinanceiro(dadosPedidos));
  }

  relatorioFaturamentoPorCategoria(filtros = {}) {
    const relatorio = this.relatorioFinanceiro(filtros);
    return relatorio.ok
      ? sucesso(relatorio.dados.faturamentoPorCategoria)
      : relatorio;
  }

  relatorioRepassePorVendedor(filtros = {}) {
    const relatorio = this.relatorioFinanceiro(filtros);
    return relatorio.ok
      ? sucesso(relatorio.dados.repassePorVendedor)
      : relatorio;
  }

  relatorioTopProdutos(filtros = {}) {
    const relatorio = this.relatorioFinanceiro(filtros);
    return relatorio.ok
      ? sucesso(relatorio.dados.produtosMaisVendidos)
      : relatorio;
  }
}
