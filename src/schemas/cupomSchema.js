import { z } from 'zod';

export const cupomSchema = z
  .object({
    codigo: z
      .string({ message: 'O código do cupom é obrigatório.' })
      .trim()
      .min(3, { message: 'O código precisa ter pelo menos 3 letras.' })
      .transform((codigo) => codigo.toUpperCase()),

    tipo: z.enum(['percentual', 'fixo', 'frete'], {
      message: 'Tipo inválido. Use: percentual, fixo ou frete.',
    }),

    valor: z.coerce
      .number({ message: 'O valor do cupom precisa ser um número.' })
      .nonnegative({ message: 'O valor do cupom não pode ser negativo.' }),

    // refine: a validade precisa ser uma data futura
    validade: z.coerce
      .date({ message: 'Data de validade inválida.' })
      .refine((data) => data > new Date(), {
        message: 'A validade do cupom precisa ser uma data futura.',
      }),

    valorMinimo: z.coerce
      .number({ message: 'O valor mínimo precisa ser um número.' })
      .nonnegative({ message: 'O valor mínimo não pode ser negativo.' })
      .default(0),

    cumulativo: z.boolean().default(false),
  })
  // refine: percentual não pode passar de 100%
  .refine((cupom) => cupom.tipo !== 'percentual' || cupom.valor <= 100, {
    message: 'Cupom percentual não pode passar de 100%.',
    path: ['valor'],
  });
