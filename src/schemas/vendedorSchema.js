import { z } from 'zod';

const normalizarCnpj = (cnpj) => cnpj.replace(/\D/g, '');

const validarCnpj = (cnpj) => {
  const digitos = normalizarCnpj(cnpj);

  if (
    !/^(?:\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/.test(cnpj) ||
    /^(\d)\1{13}$/.test(digitos)
  ) {
    return false;
  }

  const calcularDigito = (base, pesos) => {
    const soma = [...base].reduce(
      (total, digito, indice) => total + Number(digito) * pesos[indice],
      0,
    );
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiroDigito = calcularDigito(
    digitos.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const segundoDigito = calcularDigito(
    digitos.slice(0, 12) + primeiroDigito,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return digitos.endsWith(`${primeiroDigito}${segundoDigito}`);
};

export const vendedorSchema = z.object({
  nomeLoja: z.string().trim().min(1, 'O nome da loja é obrigatório.'),
  cnpj: z
    .string()
    .trim()
    .refine(validarCnpj, 'Informe um CNPJ válido, com dígitos verificadores.')
    .transform(normalizarCnpj),
  email: z.string().trim().email('Informe um e-mail válido.'),
});

export const atualizacaoVendedorSchema = vendedorSchema
  .pick({ nomeLoja: true, email: true })
  .strict();
