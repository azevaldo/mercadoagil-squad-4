export class Produto {
  #id;
  #nome;
  #preco;
  #categoria;
  #vendedor;

  constructor({ id, nome, preco, categoria, vendedor }) {
    if (!vendedor || typeof vendedor.nomeLoja !== 'string') {
      throw new TypeError('O produto deve estar associado a um vendedor com nome de loja.');
    }

    this.#id = id;
    this.#nome = nome;
    this.#preco = preco;
    this.#categoria = categoria;
    this.#vendedor = vendedor;
  }

  get id() {
    return this.#id;
  }

  get nome() {
    return this.#nome;
  }

  get preco() {
    return this.#preco;
  }

  get categoria() {
    return this.#categoria;
  }

  get vendedor() {
    return this.#vendedor;
  }

  toJSON() {
    return {
      id: this.#id,
      nome: this.#nome,
      preco: this.#preco,
      categoria: this.#categoria,
      vendedor: this.#vendedor.nomeLoja,
    };
  }
}
