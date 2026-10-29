import { Estoque } from '../models/Estoque.js';
import { ClientesService } from './marketplace/ClientesService.js';
import { VendedoresService } from './marketplace/VendedoresService.js';
import { ProdutosService } from './marketplace/ProdutosService.js';
import { CuponsService } from './marketplace/CuponsService.js';
import { PedidosService } from './marketplace/PedidosService.js';
import { RelatoriosService } from './marketplace/RelatoriosService.js';
import { falha } from '../utils/extra.js';

// Ponto de entrada do sistema: conecta os serviços e mantém a API usada pela CLI.
export class Marketplace {
  #clientes;
  #vendedores;
  #produtos;
  #cupons;
  #pedidos;
  #relatorios;
  #avisos = [];
  #aoAlterar;
  #recuperarEstado;
  #revisao = 0;

  constructor(
    estado = {},
    { aoAlterar, recuperarEstado, persistirInicial = false } = {},
  ) {
    const {
      vendedores = [],
      clientes = [],
      produtos = [],
      cupons = [],
      versao,
    } = estado;

    this.#inicializarServicos();

    // Produto precisa do vendedor já cadastrado. A carga usa as mesmas validações da CLI.
    if (versao === 1) {
      this.#restaurarEntidades(estado);
    } else {
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

    this.#revisao = estado.revisao ?? 0;
    this.#aoAlterar = aoAlterar;
    this.#recuperarEstado = recuperarEstado;

    if (persistirInicial && this.#aoAlterar) {
      try {
        this.#salvarAtual();
      } catch (erro) {
        if (erro?.codigo !== 'CONFLITO_PERSISTENCIA' || !recuperarEstado)
          throw erro;
        const atual = recuperarEstado();
        if (!atual) throw erro;
        this.#reconstruir(atual);
      }
    }
  }

  #inicializarServicos() {
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
      buscarVendedor: (cnpj) => this.#vendedores.encontrarPorCnpj(cnpj),
    });
    this.#relatorios = new RelatoriosService({
      listarPedidosConfirmados: () => this.#pedidos.listarConfirmados(),
    });
  }

  #restaurarEntidades(estado) {
    const {
      vendedores = [],
      clientes = [],
      produtos = [],
      cupons = [],
      pedidos = [],
      sequencias = {},
    } = estado;
    this.#vendedores.restaurarEstado(vendedores);
    this.#clientes.restaurarEstado(clientes);
    this.#produtos.restaurarEstado(produtos, sequencias.proximoProdutoId);
    this.#cupons.restaurarEstado(cupons);
    this.#pedidos.restaurarEstado(pedidos, sequencias.proximoPedidoId);
  }

  #reconstruir(estado) {
    this.#inicializarServicos();
    this.#restaurarEntidades(estado);
    this.#revisao = estado.revisao ?? 0;
  }

  get avisos() {
    return [...this.#avisos];
  }

  #salvarAtual() {
    const revisao = this.#aoAlterar(this.#exportarEstado());
    if (Number.isSafeInteger(revisao) && revisao >= 0) this.#revisao = revisao;
  }

  #sincronizar() {
    if (!this.#recuperarEstado) return;
    const atual = this.#recuperarEstado();
    if (!atual) throw new Error('O banco não está inicializado.');
    if ((atual.revisao ?? 0) !== this.#revisao) {
      const anterior = this.#exportarEstado();
      try {
        this.#reconstruir(atual);
      } catch (erro) {
        this.#reconstruir(anterior);
        throw erro;
      }
    }
  }

  #consultar(operacao) {
    try {
      this.#sincronizar();
    } catch {
      return falha([
        'Não foi possível carregar os dados salvos. Tente novamente.',
      ]);
    }
    return operacao();
  }

  #guardarSeSucesso(operacao) {
    try {
      this.#sincronizar();
    } catch {
      return falha([
        'Não foi possível carregar os dados salvos. Tente novamente.',
      ]);
    }
    if (!this.#aoAlterar) return operacao();

    const anterior = this.#exportarEstado();
    const resposta = operacao();
    if (!resposta.ok) return resposta;

    try {
      this.#salvarAtual();
      return resposta;
    } catch (erro) {
      let recuperado = false;
      if (this.#recuperarEstado) {
        try {
          const atual = this.#recuperarEstado();
          if (atual) {
            this.#reconstruir(atual);
            recuperado = true;
          }
        } catch {
          // Se o banco também não puder ser lido, restaura a cópia anterior.
        }
      }
      if (!recuperado) this.#reconstruir(anterior);

      if (erro?.codigo === 'CONFLITO_PERSISTENCIA') {
        return falha([
          recuperado
            ? 'Os dados mudaram em outra sessão. Confira os dados atualizados e tente novamente.'
            : 'Os dados mudaram em outra sessão. Reinicie o programa antes de tentar novamente.',
        ]);
      }
      return falha([
        'Não foi possível confirmar a gravação. Confira os dados e tente novamente.',
      ]);
    }
  }

  #exportarEstado() {
    const estadoProdutos = this.#produtos.exportarEstado();
    const estadoPedidos = this.#pedidos.exportarEstado();
    return {
      versao: 1,
      revisao: this.#revisao,
      clientes: this.#clientes.exportarEstado(),
      vendedores: this.#vendedores.exportarEstado(),
      produtos: estadoProdutos.produtos,
      cupons: this.#cupons.exportarEstado(),
      pedidos: estadoPedidos.pedidos,
      sequencias: {
        proximoProdutoId: estadoProdutos.proximoId,
        proximoPedidoId: estadoPedidos.proximoId,
      },
    };
  }

  cadastrarCliente(dados) {
    return this.#guardarSeSucesso(() => this.#clientes.cadastrarCliente(dados));
  }

  listarClientes() {
    return this.#consultar(() => this.#clientes.listarClientes());
  }

  atualizarCliente(cpf, dados) {
    return this.#guardarSeSucesso(() =>
      this.#clientes.atualizarCliente(cpf, dados),
    );
  }

  buscarCliente(termo) {
    return this.#consultar(() => this.#clientes.buscarCliente(termo));
  }

  excluirCliente(cpf) {
    return this.#guardarSeSucesso(() =>
      this.#clientes.excluirCliente(cpf, (cliente) =>
        this.#pedidos.possuiPedidoAbertoDo(cliente),
      ),
    );
  }

  cadastrarVendedor(dados) {
    return this.#guardarSeSucesso(() =>
      this.#vendedores.cadastrarVendedor(dados),
    );
  }

  listarVendedores() {
    return this.#consultar(() => this.#vendedores.listarVendedores());
  }

  atualizarVendedor(cnpj, dados) {
    return this.#guardarSeSucesso(() =>
      this.#vendedores.atualizarVendedor(cnpj, dados),
    );
  }

  buscarVendedor(termo) {
    return this.#consultar(() => this.#vendedores.buscarVendedor(termo));
  }

  excluirVendedor(cnpj) {
    return this.#guardarSeSucesso(() => this.#vendedores.excluirVendedor(cnpj));
  }

  cadastrarProduto(dados) {
    return this.#guardarSeSucesso(() => this.#produtos.cadastrarProduto(dados));
  }

  listarProdutos() {
    return this.#consultar(() => this.#produtos.listarProdutos());
  }

  atualizarProduto(id, dados) {
    return this.#guardarSeSucesso(() =>
      this.#produtos.atualizarProduto(id, dados),
    );
  }

  buscarProduto(termo) {
    return this.#consultar(() => this.#produtos.buscarProduto(termo));
  }

  excluirProduto(id) {
    return this.#guardarSeSucesso(() =>
      this.#produtos.excluirProduto(id, (produtoId) =>
        this.#pedidos.possuiPedidoAbertoComProduto(produtoId),
      ),
    );
  }

  cadastrarCupom(dados) {
    return this.#guardarSeSucesso(() => this.#cupons.cadastrarCupom(dados));
  }

  listarCupons() {
    return this.#consultar(() => this.#cupons.listarCupons());
  }

  buscarCupom(codigo) {
    return this.#consultar(() => this.#cupons.buscarCupom(codigo));
  }

  atualizarCupom(codigo, novosDados) {
    return this.#guardarSeSucesso(() =>
      this.#cupons.atualizarCupom(codigo, novosDados),
    );
  }

  excluirCupom(codigo) {
    return this.#guardarSeSucesso(() =>
      this.#cupons.excluirCupom(codigo, (codigoCupom) =>
        this.#pedidos.possuiPedidoAbertoComCupom(codigoCupom),
      ),
    );
  }

  criarPedido(cpf) {
    return this.#guardarSeSucesso(() => this.#pedidos.criarPedido(cpf));
  }

  removerItem(pedidoId, produtoId) {
    return this.#guardarSeSucesso(() =>
      this.#pedidos.removerItem(pedidoId, produtoId),
    );
  }

  adicionarItem(pedidoId, produtoId, quantidade) {
    return this.#guardarSeSucesso(() =>
      this.#pedidos.adicionarItem(pedidoId, produtoId, quantidade),
    );
  }

  resumoPedido(pedidoId) {
    return this.#consultar(() => this.#pedidos.resumoPedido(pedidoId));
  }

  confirmarPedido(pedidoId) {
    return this.#guardarSeSucesso(() =>
      this.#pedidos.confirmarPedido(pedidoId),
    );
  }

  cancelarPedido(pedidoId) {
    return this.#guardarSeSucesso(() => this.#pedidos.cancelarPedido(pedidoId));
  }

  listarPedidos() {
    return this.#consultar(() => this.#pedidos.listarPedidos());
  }

  aplicarCupom(pedidoId, codigo) {
    return this.#guardarSeSucesso(() =>
      this.#pedidos.aplicarCupom(pedidoId, codigo),
    );
  }

  removerCupom(pedidoId, codigo) {
    return this.#guardarSeSucesso(() =>
      this.#pedidos.removerCupom(pedidoId, codigo),
    );
  }

  relatorioFinanceiro(filtros = {}) {
    return this.#consultar(() => this.#relatorios.relatorioFinanceiro(filtros));
  }

  relatorioFaturamentoPorCategoria(filtros = {}) {
    return this.#consultar(() =>
      this.#relatorios.relatorioFaturamentoPorCategoria(filtros),
    );
  }

  relatorioRepassePorVendedor(filtros = {}) {
    return this.#consultar(() =>
      this.#relatorios.relatorioRepassePorVendedor(filtros),
    );
  }

  relatorioTopProdutos(filtros = {}) {
    return this.#consultar(() =>
      this.#relatorios.relatorioTopProdutos(filtros),
    );
  }
}
