import { Cancelamento } from './terminal.js';

export const criarFormulario =
  (terminal) =>
  async (contexto, rotulo, configuracao = {}) => {
    const {
      ajuda = '',
      exemplo = '',
      validar = () => '',
    } = typeof configuracao === 'string'
      ? { ajuda: configuracao }
      : configuracao;

    terminal.cabecalho(contexto || 'Preencher dados');
    console.log(`\n${terminal.colorir(rotulo, '1;37')}`);
    if (exemplo) console.log(terminal.colorir(`Exemplo: ${exemplo}`, '90'));
    if (ajuda) console.log(`\n${ajuda}`);
    console.log(terminal.colorir('\nDigite /voltar para cancelar.', '90'));

    while (true) {
      const resposta = (
        await terminal.ler(terminal.colorir('> ', '1;32'))
      ).trim();
      if (resposta === '/voltar') throw new Cancelamento();

      const erro = validar(resposta);
      if (!erro) return resposta;
      console.log(terminal.colorir(`✖ ${erro}`, '31'));
    }
  };
