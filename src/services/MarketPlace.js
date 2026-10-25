import { Cliente } from '../models/Cliente.js';
import { Vendedor } from '../models/Vendedor.js';
import { Produto } from '../models/Produto.js';
import { CupomDesconto } from '../models/CupomDesconto.js';
import { Estoque } from '../models/Estoque.js';

import { sucesso, falha } from '../utils/extra.js';
import { validar } from '../schemas/validar.js';

import { clienteSchema } from '../schemas/clienteSchema.js';
import { vendedorSchema } from '../schemas/vendedorSchema.js';
import { produtoSchema } from '../schemas/produtoSchema.js';
import { cupomSchema } from '../schemas/cupomSchema.js';



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

export class Marketplace {
  #clientes = [];
  #vendedores = [];
  #produtos = [];
  #cupons = [];
 #proximoProdutoId = 1;
  //#pedidos = [];
  #estoque = new Estoque();
  #proximoPedidoId = 1;
  #avisos = [];

  // Recebe os dados iniciais e cadastra cada item pelo mesmo método usado pelo menu.
  // A ordem importa: produto precisa do vendedor já cadastrado.
  constructor({ vendedores = [], clientes = [], produtos = [], cupons = [] } = {}) {
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
    return this.#clientes.find((cliente) => cliente.possuiCpf(cpf));
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
/*
  #pedidoPorId(id) {
    return this.#pedidos.find((pedido) => pedido.id === Number(id));
  }

  // Executa a ação só se o pedido existir
  #comPedido(id, acao) {
   
  }
*/
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

  buscarCliente(termo) {

}

  excluirCliente(cpf) {
  


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

  buscarVendedor(termo) {

}

  excluirVendedor(cnpj) {
   

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
    const produto = new Produto({ id: this.#proximoProdutoId, ...dadosProduto, vendedor });
  this.#proximoProdutoId += 1;
  this.#produtos = [...this.#produtos, produto];
  this.#estoque.cadastrar(produto, quantidade);
    return sucesso({ id: produto.id, nome: produto.nome });
  }

  listarProdutos() {
    return sucesso(this.#produtos.map((produto) => paraProduto(produto, this.#estoque)));
  }
 atualizarProduto(id, dados) {
  const produto = this.#produtoPorId(id);
  if (!produto) return falha(['Produto não encontrado.']);

  // Campo não informado, vazio ou só com espaços mantém o valor atual
  const informado = (valor) =>
    valor !== undefined && !(typeof valor === 'string' && valor.trim() === '');

  const manter = (campo, atual) => (informado(dados[campo]) ? dados[campo] : atual);

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
      this.#produtos.find((p) => p.nome.toLowerCase().includes(texto.toLowerCase()));

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
      return falha([`Já existe um cupom com o código ${validado.dados.codigo}.`]);
    }

    const cupom = new CupomDesconto(validado.dados);
    this.#cupons = [...this.#cupons, cupom];
    return sucesso(paraCupom(cupom));
  }

  listarCupons() {
    return sucesso(this.#cupons.map(paraCupom));
  }


  buscarCupom(codigo) {
    

}

  excluirCupom(codigo) {


  }

  // ---------- Relatórios ----------

  relatorioFinanceiro() {

}
}
