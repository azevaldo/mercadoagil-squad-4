class Cupom {
    #codigo;
    #desconto;
    #valorMinimo;
    #dataValidade;

    constructor(codigo, desconto, valorMinimo, dataValidade) {
        this.#codigo = codigo;
        this.#desconto = desconto;
        this.#valorMinimo = valorMinimo;
        this.#dataValidade = new Date(dataValidade); // Converte para objeto de Data
    }

    // --- Getters (apenas leitura, ninguém altera os dados por fora) ---
    get codigo() {
        return this.#codigo;
    }

    get desconto() {
        return this.#desconto;
    }

    get valorMinimo() {
        return this.#valorMinimo;
    }

    get dataValidade() {
        return this.#dataValidade;
    }

    // --- Checagem 1: Diz se o cupom está dentro da validade ---
    estaValido() {
        const hoje = new Date();
        // Compara a data atual com a data de validade do cupom
        return hoje <= this.#dataValidade;
    }

    // --- Checagem 2: Diz se o subtotal atinge o valor mínimo exigido ---
    atingeValorMinimo(subtotal) {
        return subtotal >= this.#valorMinimo;
    }

    // --- Método auxiliar para exibir os dados de forma segura ---
    paraResposta() {
        return {
            codigo: this.#codigo,
            desconto: this.#desconto,
            valorMinimo: this.#valorMinimo,
            dataValidade: this.#dataValidade.toISOString().split('T')[0]
        };
    }
}

module.exports = Cupom;