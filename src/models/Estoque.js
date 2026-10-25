import { sucesso, falha } from '../utils/extra.js';

export class Estoque {
  #quantidades = new Map();

  cadastrar(produto, quantidade) {
    this.#quantidades.set(produto.id, quantidade);
    return sucesso({ produtoId: produto.id, quantidade });
  }

  remover(produtoId) {
    this.#quantidades.delete(produtoId);
    return sucesso({ produtoId });
  }

  disponivel(produtoId) {
    return this.#quantidades.get(produtoId) ?? 0;
  }

  // Confere todos os itens de uma vez e lista todos os que faltam
  faltas(itens) {
    return itens
      .filter(
        ({ produto, quantidade }) => quantidade > this.disponivel(produto.id),
      )
      .map(
        ({ produto, quantidade }) =>
          `Estoque insuficiente: ${produto.nome} (pedido ${quantidade}, disponível ${this.disponivel(produto.id)})`,
      );
  }

  // Dá baixa em todos os itens (chamado só depois de conferir as faltas)
  baixar(itens) {
    const faltando = this.faltas(itens);
    if (faltando.length > 0) return falha(faltando);

    itens.forEach(({ produto, quantidade }) =>
      this.#quantidades.set(
        produto.id,
        this.disponivel(produto.id) - quantidade,
      ),
    );
    return sucesso({ baixados: itens.length });
  }
  devolver(itens) {
    itens.forEach(({ produto, quantidade }) =>
      this.#quantidades.set(
        produto.id,
        this.disponivel(produto.id) + quantidade,
      ),
    );
  }
}
