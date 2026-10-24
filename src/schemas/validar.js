import {sucesso,falha} from '../utils/extra.js'
/*
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
*/
 
export const validar = (schema, dados) => {
  const resultado = schema.safeParse(dados);
  return resultado.success
    ? sucesso(resultado.data)
    : falha(resultado.error.issues.map((issue) => issue.message));
};
