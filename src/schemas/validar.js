
export function validar(schema, dados) {
    const resultado = schema.safeParse(dados);

    if (!resultado.success) {
        return {
            ok: false,
            erros: resultado.error.issues.map(
                (erro) => erro.message
            )
        };
    }

    return {
        ok: true,
        dados: resultado.data
    };
}
