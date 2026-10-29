export class CupomDesconto {
  #codigo;
  #tipo;
  #valor;
  #validade;
  #valorMinimo;
  #cumulativo;

  constructor({
    codigo,
    tipo,
    valor,
    validade,
    valorMinimo = 0,
    cumulativo = false,
  }) {
    this.#codigo = codigo;
    this.#tipo = tipo;
    this.#valor = valor;
    this.#validade = new Date(validade);
    this.#valorMinimo = valorMinimo;
    this.#cumulativo = cumulativo;
  }

  get codigo() {
    return this.#codigo;
  }

  get tipo() {
    return this.#tipo;
  }

  get valor() {
    return this.#valor;
  }

  get valorMinimo() {
    return this.#valorMinimo;
  }

  get cumulativo() {
    return this.#cumulativo;
  }

  // Devolve uma cópia para a data original não ser alterada de fora
  get validade() {
    return new Date(this.#validade);
  }

  // Verificado na aplicação e na confirmação, não só no cadastro
  estaValido(agora = new Date()) {
    return this.#validade > agora;
  }

  atingeMinimo(subtotal) {
    return subtotal >= this.#valorMinimo;
  }

  atualizar({ tipo, valor, validade, valorMinimo, cumulativo }) {
    if (tipo !== undefined) this.#tipo = tipo;
    if (valor !== undefined) this.#valor = valor;
    if (validade !== undefined) this.#validade = new Date(validade);
    if (valorMinimo !== undefined) this.#valorMinimo = valorMinimo;
    if (cumulativo !== undefined) this.#cumulativo = cumulativo;
  }
}
