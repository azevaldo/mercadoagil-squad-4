import { criarFormulario } from './formularios.js';
import { executarMenu } from './menu.js';
import { criarResultados } from './resultados.js';
import { criarTerminal } from './terminal.js';

export const iniciarMenu = async (mp) => {
  const terminal = criarTerminal();
  try {
    await executarMenu(mp, {
      terminal,
      perguntar: criarFormulario(terminal),
      exibir: criarResultados(terminal),
    });
  } finally {
    terminal.fechar();
  }

  console.log('Até já! MercadoÁgil encerrado.');
};
