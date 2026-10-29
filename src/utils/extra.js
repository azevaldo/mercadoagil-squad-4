export const sucesso = (dados) => ({ ok: true, dados });

export const falha = (erros) => ({ ok: false, erros });
