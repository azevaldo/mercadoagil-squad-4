import { z } from 'zod';

export const cupomSchema = z.object({
    codigo: z.string({
        required_error: "O código é obrigatório."
    }).min(1, "O código não pode estar vazio.").toUpperCase(),

    desconto: z.number({
        required_error: "O percentual de desconto é obrigatório."
    }).min(0, "O desconto não pode ser negativo.")
      .max(100, "O percentual de desconto não pode ser superior a 100."),

    valorMinimo: z.number({
        required_error: "O valor mínimo é obrigatório."
    }).min(0, "O valor mínimo não pode ser negativo."),

    dataValidade: z.string({
        required_error: "A data de validade é obrigatória."
    }).refine((data) => {
        const dataInformada = new Date(data);
        const hoje = new Date();
        // Zera as horas para comparar apenas os dias corretamente
        hoje.setHours(0, 0, 0, 0);
        return !isNaN(dataInformada.getTime()) && dataInformada >= hoje;
    }, {
        message: "A data de validade deve ser futura (ou a partir de hoje)."
    })
});

// Função auxiliar para validar sem quebrar o programa
export function validarCupom(dados) {
    const resultado = cupomSchema.safeParse(dados);
    
    if (!resultado.success) {
        // Extrai as mensagens de erro de forma amigável
        const erros = resultado.error.errors.map(err => ({
            campo: err.path.join('.'),
            mensagem: err.message
        }));
        return { ok: false, erros };
    }

    return { ok: true, dados: resultado.data };
}