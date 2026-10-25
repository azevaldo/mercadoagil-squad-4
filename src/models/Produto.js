export class Produto {
  #id;
  #nome;
  #preco;
  #categoria;
  #vendedor;

  constructor({ id, nome, preco, categoria, vendedor }) {
   

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
atualizar({ nome, preco, categoria }) {
  this.#nome = nome;
  this.#preco = preco;
  this.#categoria = categoria;
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
