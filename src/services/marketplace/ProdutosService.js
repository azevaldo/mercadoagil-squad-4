import { Produto } from '../../models/Produto.js';
import { produtoSchema } from '../../schemas/produtoSchema.js';
import { sucesso, falha } from '../../utils/extra.js';
import { validar } from '../../schemas/validar.js';

const paraProduto = (produto, estoque) => ({
  id: produto.id,
  nome: produto.nome,
  preco: produto.preco,
  categoria: produto.categoria,
  vendedor: produto.vendedor.nomeLoja,
  disponivel: estoque.disponivel(produto.id),
});

export class ProdutosService {
  #produtos = [];
  #proximoProdutoId = 1;
  #estoque;
  #buscarVendedor;

  constructor({ estoque, buscarVendedor }) {
    this.#estoque = estoque;
    this.#buscarVendedor = buscarVendedor;
  }

  encontrarPorId(id) {
    return this.#produtos.find((produto) => String(produto.id) === String(id));
  }

  possuiVendedor(cnpj) {
    return this.#produtos.some((produto) => produto.vendedor.cnpj === cnpj);
  }

  cadastrarProduto(dados) {
    const validado = validar(produtoSchema, dados);
    if (!validado.ok) return validado;

    // Estoque e CNPJ não fazem parte do produto
    const { quantidade, vendedorCnpj, ...dadosProduto } = validado.dados;

    const vendedor = this.#buscarVendedor(vendedorCnpj);
    if (!vendedor) return falha(['Vendedor não cadastrado.']);

    if (this.encontrarPorId(dadosProduto.id)) {
      return falha([`Já existe um produto com o id ${dadosProduto.id}.`]);
    }

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
    const produto = this.encontrarPorId(id);
    if (!produto) return falha(['Produto não encontrado.']);
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
      return falha(['Informe os dados válidos para atualizar o produto.']);
    }

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
      this.encontrarPorId(texto) ??
      this.#produtos.find((p) =>
        p.nome.toLowerCase().includes(texto.toLowerCase()),
      );

    return produto
      ? sucesso(paraProduto(produto, this.#estoque))
      : falha([`Produto não encontrado: ${texto}`]);
  }

  excluirProduto(id, possuiPedidoAberto = () => false) {
    const produto = this.encontrarPorId(id);
    if (!produto) return falha(['Produto não encontrado.']);

    if (possuiPedidoAberto(produto.id))
      return falha([
        'Este produto está em um pedido aberto. Remova-o do pedido antes de excluir.',
      ]);

    this.#produtos = this.#produtos.filter((p) => p !== produto);
    this.#estoque.remover(produto.id);
    return sucesso({ removido: produto.nome });
  }
  /*excluirProduto(id) {
    const produto = this.encontrarPorId(id);
    if (!produto) return falha(['Produto não encontrado.']);

    this.#produtos = this.#produtos.filter((p) => p !== produto);
    this.#estoque.remover(produto.id);
    return sucesso({ removido: produto.nome });
  }*/
}
