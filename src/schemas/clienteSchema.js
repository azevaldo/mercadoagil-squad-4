import { z } from 'zod';
import { FRETE_POR_REGIAO } from '../config/regras.js';

const normalizarCpf = (cpf) => cpf.replace(/\D/g, '');

const validarCpf = (cpf) => {
  const digitos = normalizarCpf(cpf);

  if (
    !/^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(cpf) ||
    /^(\d)\1{10}$/.test(digitos)
  ) {
    return false;
  }

  const calcularDigito = (base, pesoInicial) => {
    const soma = [...base].reduce(
      (total, digito, indice) =>
        total + Number(digito) * (pesoInicial - indice),
      0,
    );
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const primeiroDigito = calcularDigito(digitos.slice(0, 9), 10);
  const segundoDigito = calcularDigito(
    digitos.slice(0, 9) + primeiroDigito,
    11,
  );

  return digitos.endsWith(`${primeiroDigito}${segundoDigito}`);
};

export const clienteSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, 'O nome do cliente deve ter pelo menos 3 caracteres.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  cpf: z
    .string()
    .trim()
    .refine(validarCpf, 'Informe um CPF válido, com dígitos verificadores.')
    .transform(normalizarCpf),
  regiaoEntrega: z.enum(Object.keys(FRETE_POR_REGIAO), {
    error: 'Informe uma região válida para entrega.',
  }),
});

