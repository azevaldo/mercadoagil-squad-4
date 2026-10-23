import { z } from 'zod';
import { CATEGORIAS_PRODUTO } from '../config/regras.js';

export { CATEGORIAS_PRODUTO };

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

  const primeiroDigito = calcularDigito(digitos.slice(0, 12), [
    5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);
  const segundoDigito = calcularDigito(digitos.slice(0, 12) + primeiroDigito, [
    6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);

  return digitos.endsWith(`${primeiroDigito}${segundoDigito}`);
};

const precoSchema = z.preprocess(
  (valor) => {
    if (typeof valor === 'number') return valor;
    if (typeof valor !== 'string') return Number.NaN;

    const texto = valor.trim();
    const formatoValido = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/;
    if (!formatoValido.test(texto)) return Number.NaN;

    return Number(texto.replace(/\./g, '').replace(',', '.'));
  },
  z
    .number({ error: 'O preço deve ser numérico, como "120,50".' })
    .finite('O preço deve ser um número finito.')
    .positive('O preço deve ser maior que zero.'),
);

const quantidadeSchema = z.preprocess(
  (quantidade) => {
    if (typeof quantidade === 'number') return quantidade;
    if (typeof quantidade !== 'string' || !/^\d+$/.test(quantidade.trim())) {
      return Number.NaN;
    }

    return Number(quantidade.trim());
  },
  z
    .number({ error: 'A quantidade deve ser um número inteiro não negativo.' })
    .finite('A quantidade deve ser um número finito.')
    .int('A quantidade deve ser um número inteiro.')
    .nonnegative('A quantidade não pode ser negativa.'),
);

export const produtoSchema = z.object({
  nome: z.string().trim().min(2, 'O nome do produto deve ter pelo menos 2 caracteres.'),
  preco: precoSchema,
  categoria: z.enum(CATEGORIAS_PRODUTO, {
    error: 'A categoria informada não é válida.',
  }),
  quantidade: quantidadeSchema,
  cnpjVendedor: z
    .string()
    .trim()
    .refine(validarCnpj, 'Informe um CNPJ válido, com dígitos verificadores.')
    .transform(normalizarCnpj),
});

export const validarProduto = (entrada, vendedores) => {
  const resultado = produtoSchema.safeParse(entrada);

  if (!resultado.success) {
    return {
      ok: false,
      erros: resultado.error.issues.map((erro) => erro.message),
    };
  }

  if (
    vendedores !== undefined &&
    (!Array.isArray(vendedores) ||
      !vendedores.find(
        (vendedor) =>
          typeof vendedor?.cnpj === 'string' &&
          normalizarCnpj(vendedor.cnpj) === resultado.data.cnpjVendedor,
      ))
  ) {
    return {
      ok: false,
      erros: ['Não existe vendedor cadastrado com o CNPJ informado.'],
    };
  }

  return { ok: true, dados: resultado.data };
};
