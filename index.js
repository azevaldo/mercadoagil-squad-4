import { Marketplace } from './src/services/MarketPlace.js';
import { dadosIniciais } from './src/data/seed.js';
import { iniciarMenu } from './src/cli/index.js';
import { BancoSQLite } from './src/data/sqlite.js';

const banco = new BancoSQLite();

try {
  const estadoSalvo = banco.carregarEstado();
  const mercado = new Marketplace(estadoSalvo ?? dadosIniciais, {
    aoAlterar: (estado) => banco.salvarEstado(estado),
  });

  if (!estadoSalvo) banco.salvarEstado(mercado.exportarEstado());
  mercado.avisos.forEach((aviso) => console.log(`! ${aviso}`));

  await iniciarMenu(mercado);
} finally {
  banco.fechar();
}
