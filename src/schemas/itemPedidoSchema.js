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
    .number({
      error: 'A quantidade deve ser um número inteiro maior que zero.',
    })
    .int('A quantidade deve ser um número inteiro.')
    .positive('A quantidade deve ser maior que zero.'),
);

// Id do pedido chega como texto da CLI ou como número: só aceita inteiro maior que zero
const idPedidoSchema = z.preprocess(
  (id) => {
    if (typeof id === 'number') return id;
    if (typeof id !== 'string' || !/^\d+$/.test(id.trim())) {
      return Number.NaN;
    }

    return Number(id.trim());
  },
  z
    .number({
      error: 'O id do pedido deve ser um número inteiro maior que zero.',
    })
    .int('O id do pedido deve ser um número inteiro.')
    .positive('O id do pedido deve ser maior que zero.'),
);

export const itemPedidoSchema = z.object({
  quantidade: quantidadeSchema,
});

export const pedidoIdSchema = z.object({
  pedidoId: idPedidoSchema,
});
