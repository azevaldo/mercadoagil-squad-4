import { Pedido } from '../../models/Pedido.js';
import { produtoIdSchema } from '../../schemas/produtoSchema.js';
import { cpfSchema } from '../../schemas/clienteSchema.js';
import {
  itemPedidoSchema,
  pedidoIdSchema,
} from '../../schemas/itemPedidoSchema.js';
import { sucesso, falha } from '../../utils/extra.js';
import { validar } from '../../schemas/validar.js';

const paraPedido = (pedido) => {
  const resumo = pedido.resumo();

  return {
    id: pedido.id,
    cliente: pedido.cliente.nome,
    status: pedido.status,
    total: resumo.dados.total,
  };
};

export class PedidosService {
  #pedidos = [];
  #proximoPedidoId = 1;
  #estoque;
  #buscarCliente;
  #buscarProduto;
  #buscarCupom;

  constructor({ estoque, buscarCliente, buscarProduto, buscarCupom }) {
    this.#estoque = estoque;
    this.#buscarCliente = buscarCliente;
    this.#buscarProduto = buscarProduto;
    this.#buscarCupom = buscarCupom;
  }

  #pedidoPorId(id) {
    return this.#pedidos.find((pedido) => pedido.id === id);
  }

  // Valida e encontra o pedido antes de executar uma operação.
  #comPedido(id, acao) {
    const validado = validar(pedidoIdSchema, { pedidoId: id });
    if (!validado.ok) return validado;

    const pedido = this.#pedidoPorId(validado.dados.pedidoId);
    return pedido
      ? acao(pedido)
      : falha([`Pedido ${validado.dados.pedidoId} não encontrado.`]);
  }

  // Consulta interna para os relatórios; a lista original permanece privada.
  listarConfirmados() {
    return this.#pedidos.filter((pedido) => pedido.status === 'confirmado');
  }

  criarPedido(cpf) {
    const validadoCpf = validar(cpfSchema, { cpf });
    if (!validadoCpf.ok) return validadoCpf;
    const cliente = this.#buscarCliente(validadoCpf.dados.cpf);
    if (!cliente) {
      return falha([
        'Cliente não encontrado. Cadastre o cliente antes de criar o pedido.',
      ]);
    }

    const pedido = new Pedido(this.#proximoPedidoId, cliente);
    this.#pedidos = [...this.#pedidos, pedido];
    this.#proximoPedidoId += 1;

    return sucesso({
      id: pedido.id,
      cliente: cliente.nome,
      status: pedido.status,
    });
  }
  // Consulta interna para exclusão: o cliente tem algum pedido aberto?
  possuiPedidoAbertoDo(cliente) {
    return this.#pedidos.some(
      (pedido) => pedido.status === 'aberto' && pedido.cliente === cliente,
    );
  }
  removerItem(pedidoId, produtoId) {
    const pedidoValidado = validar(pedidoIdSchema, { pedidoId });
    if (!pedidoValidado.ok) return pedidoValidado;

    const produtoValidado = validar(produtoIdSchema, { produtoId });
    if (!produtoValidado.ok) return produtoValidado;

    return this.#comPedido(pedidoValidado.dados.pedidoId, (pedido) => {
      const produto = this.#buscarProduto(produtoValidado.dados.produtoId);
      if (!produto) return falha([`Produto ${produtoId} não encontrado.`]);

      return pedido.removerItem(produto.id);
    });
  }

  adicionarItem(pedidoId, produtoId, quantidade) {
    const quantidadeValidada = validar(itemPedidoSchema, { quantidade });
    if (!quantidadeValidada.ok) return quantidadeValidada;

    return this.#comPedido(pedidoId, (pedido) => {
      const produto = this.#buscarProduto(produtoId);
      if (!produto) return falha([`Produto ${produtoId} não encontrado.`]);

      return pedido.adicionarItem(produto, quantidadeValidada.dados.quantidade);
    });
  }

  resumoPedido(pedidoId) {
    return this.#comPedido(pedidoId, (pedido) => pedido.resumo());
  }

  confirmarPedido(pedidoId) {
    return this.#comPedido(pedidoId, (pedido) =>
      pedido.confirmar(this.#estoque),
    );
  }

  cancelarPedido(pedidoId) {
    return this.#comPedido(pedidoId, (pedido) =>
      pedido.cancelar(this.#estoque),
    );
  }

  listarPedidos() {
    return sucesso(this.#pedidos.map(paraPedido));
  }

  aplicarCupom(pedidoId, codigo) {
    return this.#comPedido(pedidoId, (pedido) => {
      const cupom = this.#buscarCupom(codigo);
      if (!cupom) return falha([`Cupom ${codigo} não encontrado.`]);

      return pedido.aplicarCupom(cupom);
    });
  }
  removerCupom(pedidoId, codigo) {
    return this.#comPedido(pedidoId, (pedido) => pedido.removerCupom(codigo));
  }

  possuiPedidoAbertoComProduto(produtoId) {
    return this.#pedidos.some(
      (pedido) =>
        pedido.status === 'aberto' && pedido.contemProduto(Number(produtoId)),
    );
  }

  possuiPedidoAbertoComCupom(codigo) {
    return this.#pedidos.some(
      (pedido) =>
        pedido.status === 'aberto' &&
        pedido.contemCupom(normalizarCodigo(codigo)),
    );
  }
}
const normalizarCodigo = (codigo) =>
  String(codigo ?? '')
    .trim()
    .toUpperCase();
