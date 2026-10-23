class Vendedor {
    #nomeLoja;
    #cnpj;
    #email;

    constructor(nomeLoja, cnpj, email) {
        this.nomeLoja = nomeLoja; // Usa o setter para validar na criação
        this.#cnpj = cnpj;             // Atribui diretamente pois não tem setter
        this.email = email;       // Usa o setter para validar na criação
    }

    // --- Getters ---
    get nomeLoja() {
        return this.#nomeLoja;
    }

    get cnpj() {
        return this.#cnpj;
    }

    get email() {
        return this.#email;
    }

    // --- Setters com validação ---
    set nomeLoja(novoNome) {
        if (!novoNome || typeof novoNome !== 'string' || novoNome.trim() === '') {
            throw new Error("O nome da loja não pode ser vazio.");
        }
        this.#nomeLoja = novoNome.trim();
    }

    set email(novoEmail) {
        if (!novoEmail || !novoEmail.includes('@') || !novoEmail.includes('.')) {
            throw new Error("E-mail inválido.");
        }
        this.#email = novoEmail.trim();
    }
    // Nota: O CNPJ propositalmente não tem setter, conforme solicitado.

    // --- Método para resposta com CNPJ formatado ---
    paraResposta() {
        // Formata o CNPJ para o padrão XX.XXX.XXX/XXXX-XX
        const cnpjLimpo = String(this.#cnpj).replace(/\D/g, '');
        const cnpjFormatado = cnpjLimpo.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5'
        );

        return {
            nomeLoja: this.#nomeLoja,
            cnpj: cnpjFormatado,
            email: this.#email
        };
    }
}

module.exports = Vendedor;
