import { Cliente } from '../models/Cliente.js';
import { Vendedor } from '../models/Vendedor.js';
import { Produto } from '../models/Produto.js';
import { CupomDesconto } from '../models/CupomDesconto.js';
import { Estoque } from '../models/Estoque.js';
import { Pedido } from '../models/Pedido.js';

import { sucesso, falha } from '../utils/extra.js';
import { validar } from '../schemas/validar.js';

import {
  atualizacaoClienteSchema,
  clienteSchema,
} from '../schemas/clienteSchema.js';
import {
  atualizacaoVendedorSchema,
  vendedorSchema,
} from '../schemas/vendedorSchema.js';
import { produtoSchema, produtoIdSchema } from '../schemas/produtoSchema.js';
import { cupomSchema } from '../schemas/cupomSchema.js';
import {
  itemPedidoSchema,
  pedidoIdSchema,
} from '../schemas/itemPedidoSchema.js';

// Formatos de saída: nunca devolvem o CPF
const paraCliente = (cliente) => cliente.dadosPublicos();

const paraVendedor = (vendedor) => ({
  nomeLoja: vendedor.nomeLoja,
  cnpj: vendedor.cnpj,
  email: vendedor.email,
});

const paraCupom = (cupom) => ({
  codigo: cupom.codigo,
  tipo: cupom.tipo,
  valor: cupom.valor,
  valorMinimo: cupom.valorMinimo,
  validade: cupom.validade,
  cumulativo: cupom.cumulativo,
});

const paraProduto = (produto, estoque) => ({
  id: produto.id,
  nome: produto.nome,
  preco: produto.preco,
  categoria: produto.categoria,
  vendedor: produto.vendedor.nomeLoja,
  disponivel: estoque.disponivel(produto.id),
});

const paraPedido = (pedido) => {
  const resumo = pedido.resumo();

  return {
    id: pedido.id,
    cliente: pedido.cliente.nome,
    status: pedido.status,
    total: resumo.dados.total,
  };
};

export class Marketplace {
  #clientes = [];
  #vendedores = [];
  #produtos = [];
  #cupons = [];
  #proximoProdutoId = 1;
  #pedidos = [];
  #estoque = new Estoque();
  #proximoPedidoId = 1;
  #avisos = [];

  // Recebe os dados iniciais e cadastra cada item pelo mesmo método usado pelo menu.
  // A ordem importa: produto precisa do vendedor já cadastrado.
  constructor({
    vendedores = [],
    clientes = [],
    produtos = [],
    cupons = [],
  } = {}) {
    const resultados = [
      ...vendedores.map((dados) => this.cadastrarVendedor(dados)),
      ...clientes.map((dados) => this.cadastrarCliente(dados)),
      ...produtos.map((dados) => this.cadastrarProduto(dados)),
      ...cupons.map((dados) => this.cadastrarCupom(dados)),
    ];

    // Construtor não devolve erro, então os problemas da carga ficam aqui
    this.#avisos = resultados
      .filter((resultado) => !resultado.ok)
      .flatMap((resultado) => resultado.erros);
  }

  // Erros encontrados ao carregar os dados iniciais
  get avisos() {
    return [...this.#avisos];
  }

  // ---------- Buscas internas ----------

  #clientePorCpf(cpf) {
    const cpfNormalizado = String(cpf).replace(/\D/g, '');
    return this.#clientes.find((cliente) => cliente.possuiCpf(cpfNormalizado));
  }

  #vendedorPorCnpj(cnpj) {
    return this.#vendedores.find((vendedor) => vendedor.possuiCnpj(cnpj));
  }

  #produtoPorId(id) {
    return this.#produtos.find((produto) => String(produto.id) === String(id));
  }

  #cupomPorCodigo(codigo) {
    const codigoLimpo = String(codigo).trim().toUpperCase();
    return this.#cupons.find((cupom) => cupom.codigo === codigoLimpo);
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
  // ---------- Clientes ----------

  cadastrarCliente(dados) {
    const validado = validar(clienteSchema, dados);
    if (!validado.ok) return validado;

    if (this.#clientePorCpf(validado.dados.cpf)) {
      return falha(['Já existe um cliente com este CPF.']);
    }

    const cliente = new Cliente(validado.dados);
    this.#clientes = [...this.#clientes, cliente];
    return sucesso(paraCliente(cliente));
  }

  listarClientes() {
    return sucesso(this.#clientes.map(paraCliente));
  }

  atualizarCliente(cpf, dados) {
    const cliente = this.#clientePorCpf(cpf);
    if (!cliente) return falha(['Cliente não encontrado.']);

    const validado = validar(atualizacaoClienteSchema, dados);
    if (!validado.ok) return validado;

    cliente.atualizarDados(validado.dados);
    return sucesso(paraCliente(cliente));
  }

  buscarCliente(termo) {
    const busca = String(termo ?? '').trim();
    if (!busca) return falha(['Informe um CPF ou nome para buscar.']);

    const cpfNormalizado = busca.replace(/\D/g, '');
    const nomeNormalizado = busca
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('pt-BR');

    const clientesEncontrados = this.#clientes.filter((cliente) => {
      const nomeCliente = cliente.nome
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLocaleLowerCase('pt-BR');

      return (
        (cpfNormalizado.length === 11 && cliente.possuiCpf(cpfNormalizado)) ||
        nomeCliente.includes(nomeNormalizado)
      );
    });

    if (clientesEncontrados.length === 0) {
      return falha(['Cliente não encontrado.']);
    }

    return sucesso(clientesEncontrados.map(paraCliente));
  }

  excluirCliente(cpf) {
    const cliente = this.#clientePorCpf(cpf);
    if (!cliente) return falha(['Cliente não encontrado.']);

    // TODO: impedir a exclusão quando houver pedidos associados ao cliente.
    this.#clientes = this.#clientes.filter((atual) => atual !== cliente);

    return sucesso({ mensagem: 'Cliente excluído com sucesso.' });
  }

  // ---------- Vendedores ----------

  cadastrarVendedor(dados) {
    const validado = validar(vendedorSchema, dados);
    if (!validado.ok) return validado;

    if (this.#vendedorPorCnpj(validado.dados.cnpj)) {
      return falha(['Já existe um vendedor com este CNPJ.']);
    }

    const vendedor = new Vendedor(validado.dados);
    this.#vendedores = [...this.#vendedores, vendedor];
    return sucesso(paraVendedor(vendedor));
  }

  listarVendedores() {
    return sucesso(this.#vendedores.map(paraVendedor));
  }

  atualizarVendedor(cnpj, dados) {
    const cnpjNormalizado = String(cnpj ?? '').replace(/\D/g, '');
    const vendedor = this.#vendedorPorCnpj(cnpjNormalizado);

    if (!vendedor) return falha(['Vendedor não encontrado.']);

    const validado = validar(atualizacaoVendedorSchema, dados);
    if (!validado.ok) return validado;

    vendedor.atualizarDados(validado.dados);
    return sucesso(paraVendedor(vendedor));
  }

  buscarVendedor(termo) {
    const busca = String(termo ?? '').trim();
    if (!busca) return falha(['Informe um CNPJ ou nome para buscar.']);

    const cnpj = busca.replace(/\D/g, '');
    const nomeBusca = busca
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('pt-BR');

    const encontrados = this.#vendedores.filter((vendedor) => {
      const nome = vendedor.nomeLoja
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLocaleLowerCase('pt-BR');

      return (
        (cnpj.length === 14 && vendedor.possuiCnpj(cnpj)) ||
        nome.includes(nomeBusca)
      );
    });

    return encontrados.length
      ? sucesso(encontrados.map(paraVendedor))
      : falha(['Vendedor não encontrado.']);
  }

  excluirVendedor(cnpj) {
    const cnpjNormalizado = String(cnpj ?? '').replace(/\D/g, '');
    const vendedor = this.#vendedorPorCnpj(cnpjNormalizado);

    if (!vendedor) return falha(['Vendedor não encontrado.']);

    const possuiProdutos = this.#produtos.some(
      (produto) => produto.vendedor.cnpj === vendedor.cnpj,
    );

    if (possuiProdutos) {
      return falha([
        'Este vendedor possui produtos cadastrados e não pode ser excluído.',
      ]);
    }

    this.#vendedores = this.#vendedores.filter((atual) => atual !== vendedor);

    return sucesso({ mensagem: 'Vendedor excluído com sucesso.' });
  }


  // ---------- Produtos ----------

  cadastrarProduto(dados) {
    const validado = validar(produtoSchema, dados);
    if (!validado.ok) return validado;

    // Estoque e CNPJ não fazem parte do produto
    const { quantidade, vendedorCnpj, ...dadosProduto } = validado.dados;

    const vendedor = this.#vendedorPorCnpj(vendedorCnpj);
    if (!vendedor) return falha(['Vendedor não cadastrado.']);

    if (this.#produtoPorId(dadosProduto.id)) {
      return falha([`Já existe um produto com o id ${dadosProduto.id}.`]);
    }

    //console.log(vendedor.nomeLoja);
    const produto = new Produto({
      id: this.#proximoProdutoId,
      ...dadosProduto,
      vendedor,
    });
    this.#proximoProdutoId += 1;
    this.#produtos = [...this.#produtos, produto];
    this.#estoque.cadastrar(produto, quantidade);

    return sucesso({ id: produto.id, nome: produto.nome });
  }

  listarProdutos() {
    return sucesso(
      this.#produtos.map((produto) => paraProduto(produto, this.#estoque)),
    );
  }
  atualizarProduto(id, dados) {
    const produto = this.#produtoPorId(id);
    if (!produto) return falha(['Produto não encontrado.']);

    // Campo não informado, vazio ou só com espaços mantém o valor atual
    const informado = (valor) =>
      valor !== undefined &&
      !(typeof valor === 'string' && valor.trim() === '');

    const manter = (campo, atual) =>
      informado(dados[campo]) ? dados[campo] : atual;

    const validado = validar(produtoSchema, {
      nome: manter('nome', produto.nome),
      preco: manter('preco', produto.preco),
      categoria: manter('categoria', produto.categoria),
      quantidade: manter('quantidade', this.#estoque.disponivel(produto.id)),
      vendedorCnpj: produto.vendedor.cnpj,
    });
    if (!validado.ok) return validado;

    const { nome, preco, categoria, quantidade } = validado.dados;
    produto.atualizar({ nome, preco, categoria });
    this.#estoque.cadastrar(produto, quantidade);

    return sucesso(paraProduto(produto, this.#estoque));
  }
  buscarProduto(termo) {
    const texto = String(termo).trim();

    const produto =
      this.#produtoPorId(texto) ??
      this.#produtos.find((p) =>
        p.nome.toLowerCase().includes(texto.toLowerCase()),
      );

    return produto
      ? sucesso(paraProduto(produto, this.#estoque))
      : falha([`Produto não encontrado: ${texto}`]);
  }

  excluirProduto(id) {
    const produto = this.#produtoPorId(id);
    if (!produto) return falha(['Produto não encontrado.']);

    /* if (this.#pedidos.some((pedido) => pedido.status === 'aberto' && pedido.contemProduto(produto.id))) {
      return falha(['Este produto está em um pedido aberto. Remova-o do pedido antes de excluir.']);
    }*/

    this.#produtos = this.#produtos.filter((p) => p !== produto);
    this.#estoque.remover(produto.id);
    return sucesso({ removido: produto.nome });
  }

  // ---------- Cupons ----------

  cadastrarCupom(dados) {
    const validado = validar(cupomSchema, dados);
    if (!validado.ok) return validado;

    if (this.#cupomPorCodigo(validado.dados.codigo)) {
      return falha([
        `Já existe um cupom com o código ${validado.dados.codigo}.`,
      ]);
    }

    const cupom = new CupomDesconto(validado.dados);
    this.#cupons = [...this.#cupons, cupom];
    return sucesso(paraCupom(cupom));
  }

  listarCupons() {
    return sucesso(this.#cupons.map(paraCupom));
  }

  buscarCupom(codigo) {
    if (!codigo || String(codigo).trim() === '') {
      return falha(['Informe o código do cupom para realizar a busca.']);
    }

    const codigoLimpo = String(codigo).trim().toUpperCase();
    const cupom = this.#cupomPorCodigo(codigoLimpo);

    if (!cupom) {
      return falha(['Cupom não encontrado.']);
    }

    return sucesso(paraCupom(cupom));
  }

  atualizarCupom(codigo, novosDados) {
    const codigoLimpo = String(codigo).trim().toUpperCase();
    const cupom = this.#cupomPorCodigo(codigoLimpo);

    if (!cupom) {
      return falha(['Cupom não encontrado.']);
    }

    // o código não pode ser alterado
    if (
      novosDados.codigo &&
      String(novosDados.codigo).trim().toUpperCase() !== codigoLimpo
    ) {
      return falha(['O código do cupom não pode ser alterado.']);
    }

    // mesclar os dados atuais com as novas alterações mantendo o código
    const dadosParaValidar = {
      codigo: cupom.codigo,
      tipo: novosDados.tipo ?? cupom.tipo,
      valor: novosDados.valor ?? cupom.valor,
      validade: novosDados.validade ?? cupom.validade,
      valorMinimo: novosDados.valorMinimo ?? cupom.valorMinimo,
      cumulativo: novosDados.cumulativo ?? cupom.cumulativo,
    };

    // validar com o Zod via função utilitária do sistema
    const validado = validar(cupomSchema, dadosParaValidar);
    if (!validado.ok) {
      return validado;
    }

    const { tipo, valor, validade, valorMinimo, cumulativo } = validado.dados;
    cupom.atualizar({ tipo, valor, validade, valorMinimo, cumulativo });

    return sucesso(paraCupom(cupom));
  }

  excluirCupom(codigo) {
    const codigoLimpo = String(codigo).trim().toUpperCase();
    const cupom = this.#cupomPorCodigo(codigoLimpo);

    if (!cupom) {
      return falha(['Cupom não encontrado.']);
    }

    this.#cupons = this.#cupons.filter(
      (cupomAtual) => cupomAtual.codigo !== codigoLimpo,
    );

    return sucesso({
      codigo: codigoLimpo,
      mensagem: 'Cupom excluído com sucesso.',
    });
  }

  criarPedido(cpf) {
    const cliente = this.#clientePorCpf(cpf);
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

  // ---------- Pedidos ----------

  removerItem(pedidoId, produtoId) {
    const pedidoValidado = validar(pedidoIdSchema, { pedidoId });
    if (!pedidoValidado.ok) return pedidoValidado;

    const produtoValidado = validar(produtoIdSchema, { produtoId });
    if (!produtoValidado.ok) return produtoValidado;

    return this.#comPedido(pedidoValidado.dados.pedidoId, (pedido) => {
      const produto = this.#produtoPorId(produtoValidado.dados.produtoId);
      if (!produto) return falha([`Produto ${produtoId} não encontrado.`]);

      return pedido.removerItem(produto.id);
    });
  }

  adicionarItem(pedidoId, produtoId, quantidade) {
    const quantidadeValidada = validar(itemPedidoSchema, { quantidade });
    if (!quantidadeValidada.ok) return quantidadeValidada;

    return this.#comPedido(pedidoId, (pedido) => {
      const produto = this.#produtoPorId(produtoId);
      if (!produto) return falha([`Produto ${produtoId} não encontrado.`]);

      return pedido.adicionarItem(
        produto,
        quantidadeValidada.dados.quantidade,
      );
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

  // ---------- Relatórios ----------

  relatorioFinanceiro() {}
}
