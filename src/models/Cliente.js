export class Cliente {
  #nome;
  #email;
  #cpf;
  #regiaoEntrega;

  constructor({ nome, email, cpf, regiaoEntrega }) {
    this.#nome = nome;
    this.#email = email;
    this.#cpf = cpf;
    this.#regiaoEntrega = regiaoEntrega;
  }

  get nome() {
    return this.#nome;
  }

  get email() {
    return this.#email;
  }

  // A região é calculada a partir da UF do cliente
  get regiaoEntrega() {
    return this.#regiaoEntrega;
  }

  // Permite buscar por CPF sem expor o CPF
  possuiCpf(cpf) {
    return this.#cpf === cpf;
  }

  atualizarDados({ nome, email, regiaoEntrega }) {
    this.#nome = nome;
    this.#email = email;
    this.#regiaoEntrega = regiaoEntrega;
  }

  // LGPD: o CPF é removido com rest antes de sair da classe
  dadosPublicos() {
    const { cpf, ...dadosSeguros } = {
      nome: this.#nome,
      email: this.#email,
      cpf: this.#cpf,
      regiaoEntrega: this.regiaoEntrega,
    };
    return dadosSeguros;
  }
}
