import { z } from 'zod';

// Quantidade digitada no menu chega como texto: só aceita dígitos, como "3"
const quantidadeSchema = z.preprocess(
  (quantidade) => {
    if (typeof quantidade === 'number') return quantidade;
    if (typeof quantidade !== 'string' || !/^\d+$/.test(quantidade.trim())) {
      return Number.NaN;
    }

    return Number(quantidade.trim());
  },
  z
    .number({ error: 'A quantidade deve ser um número inteiro maior que zero.' })
    .int('A quantidade deve ser um número inteiro.')
    .positive('A quantidade deve ser maior que zero.'),
);

export const itemPedidoSchema = z.object({
  quantidade: quantidadeSchema,
});
