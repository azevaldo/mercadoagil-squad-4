import { Estoque } from '../models/Estoque.js';
import { ClientesService } from './marketplace/ClientesService.js';
import { VendedoresService } from './marketplace/VendedoresService.js';
import { ProdutosService } from './marketplace/ProdutosService.js';
import { CuponsService } from './marketplace/CuponsService.js';
import { PedidosService } from './marketplace/PedidosService.js';
import { RelatoriosService } from './marketplace/RelatoriosService.js';

// Ponto de entrada do sistema: conecta os serviços e mantém a API usada pela CLI.
export class Marketplace {
  #clientes;
  #vendedores;
  #produtos;
  #cupons;
  #pedidos;
  #relatorios;
  #avisos = [];

  constructor({
    vendedores = [],
    clientes = [],
    produtos = [],
    cupons = [],
  } = {}) {
    // Produtos e pedidos compartilham o mesmo estoque nesta instância.
    const estoque = new Estoque();
    this.#clientes = new ClientesService();
    this.#cupons = new CuponsService();
    this.#vendedores = new VendedoresService({
      possuiProdutos: (cnpj) => this.#produtos.possuiVendedor(cnpj),
    });
    this.#produtos = new ProdutosService({
      estoque,
      buscarVendedor: (cnpj) => this.#vendedores.encontrarPorCnpj(cnpj),
    });
    this.#pedidos = new PedidosService({
      estoque,
      buscarCliente: (cpf) => this.#clientes.encontrarPorCpf(cpf),
      buscarProduto: (id) => this.#produtos.encontrarPorId(id),
      buscarCupom: (codigo) => this.#cupons.encontrarPorCodigo(codigo),
    });
    this.#relatorios = new RelatoriosService({
      listarPedidosConfirmados: () => this.#pedidos.listarConfirmados(),
    });

    // Produto precisa do vendedor já cadastrado. A carga usa as mesmas validações da CLI.
    const resultados = [
      ...vendedores.map((dados) => this.cadastrarVendedor(dados)),
      ...clientes.map((dados) => this.cadastrarCliente(dados)),
      ...produtos.map((dados) => this.cadastrarProduto(dados)),
      ...cupons.map((dados) => this.cadastrarCupom(dados)),
    ];

    this.#avisos = resultados
      .filter((resultado) => !resultado.ok)
      .flatMap((resultado) => resultado.erros);
  }

  get avisos() {
    return [...this.#avisos];
  }

  cadastrarCliente(dados) {
    return this.#clientes.cadastrarCliente(dados);
  }

  listarClientes() {
    return this.#clientes.listarClientes();
  }

  atualizarCliente(cpf, dados) {
    return this.#clientes.atualizarCliente(cpf, dados);
  }

  buscarCliente(termo) {
    return this.#clientes.buscarCliente(termo);
  }

  excluirCliente(cpf) {
    return this.#clientes.excluirCliente(cpf);
  }

  cadastrarVendedor(dados) {
    return this.#vendedores.cadastrarVendedor(dados);
  }

  listarVendedores() {
    return this.#vendedores.listarVendedores();
  }

  atualizarVendedor(cnpj, dados) {
    return this.#vendedores.atualizarVendedor(cnpj, dados);
  }

  buscarVendedor(termo) {
    return this.#vendedores.buscarVendedor(termo);
  }

  excluirVendedor(cnpj) {
    return this.#vendedores.excluirVendedor(cnpj);
  }

  cadastrarProduto(dados) {
    return this.#produtos.cadastrarProduto(dados);
  }

  listarProdutos() {
    return this.#produtos.listarProdutos();
  }

  atualizarProduto(id, dados) {
    return this.#produtos.atualizarProduto(id, dados);
  }

  buscarProduto(termo) {
    return this.#produtos.buscarProduto(termo);
  }

  excluirProduto(id) {
    return this.#produtos.excluirProduto(id);
  }

  cadastrarCupom(dados) {
    return this.#cupons.cadastrarCupom(dados);
  }

  listarCupons() {
    return this.#cupons.listarCupons();
  }

  buscarCupom(codigo) {
    return this.#cupons.buscarCupom(codigo);
  }

  atualizarCupom(codigo, novosDados) {
    return this.#cupons.atualizarCupom(codigo, novosDados);
  }

  excluirCupom(codigo) {
    return this.#cupons.excluirCupom(codigo);
  }

  criarPedido(cpf) {
    return this.#pedidos.criarPedido(cpf);
  }

  removerItem(pedidoId, produtoId) {
    return this.#pedidos.removerItem(pedidoId, produtoId);
  }

  adicionarItem(pedidoId, produtoId, quantidade) {
    return this.#pedidos.adicionarItem(pedidoId, produtoId, quantidade);
  }

  resumoPedido(pedidoId) {
    return this.#pedidos.resumoPedido(pedidoId);
  }

  confirmarPedido(pedidoId) {
    return this.#pedidos.confirmarPedido(pedidoId);
  }

  cancelarPedido(pedidoId) {
    return this.#pedidos.cancelarPedido(pedidoId);
  }

  listarPedidos() {
    return this.#pedidos.listarPedidos();
  }

  aplicarCupom(pedidoId, codigo) {
    return this.#pedidos.aplicarCupom(pedidoId, codigo);
  }

  relatorioFinanceiro(filtros = {}) {
    return this.#relatorios.relatorioFinanceiro(filtros);
  }

  relatorioFaturamentoPorCategoria(filtros = {}) {
    return this.#relatorios.relatorioFaturamentoPorCategoria(filtros);
  }

  relatorioRepassePorVendedor(filtros = {}) {
    return this.#relatorios.relatorioRepassePorVendedor(filtros);
  }

  relatorioTopProdutos(filtros = {}) {
    return this.#relatorios.relatorioTopProdutos(filtros);
  }
}
