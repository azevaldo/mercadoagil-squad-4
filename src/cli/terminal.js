import { emitKeypressEvents } from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

export class Cancelamento extends Error {}
export class Encerramento extends Error {}

const criarLeitorNaoInterativo = () => {
  const rl = createInterface({ input: stdin, output: stdout });
  const linhas = [];
  const aguardando = [];
  let fechado = false;

  rl.on('line', (linha) => {
    const espera = aguardando.shift();
    if (espera) espera.resolve(linha);
    else linhas.push(linha);
  });

  rl.once('close', () => {
    fechado = true;
    for (const espera of aguardando) espera.reject(new Encerramento());
  });

  return {
    perguntar(rotulo) {
      stdout.write(rotulo);
      if (linhas.length) return Promise.resolve(linhas.shift());
      if (fechado) return Promise.reject(new Encerramento());
      return new Promise((resolve, reject) =>
        aguardando.push({ resolve, reject }),
      );
    },
    fechar: () => rl.close(),
  };
};

const lerLinha = async (rotulo) => {
  const rl = createInterface({ input: stdin, output: stdout });
  const abortar = new AbortController();
  rl.once('SIGINT', () => abortar.abort());
  try {
    return await rl.question(rotulo, { signal: abortar.signal });
  } catch (erro) {
    if (erro.name === 'AbortError') throw new Encerramento();
    throw erro;
  } finally {
    rl.close();
  }
};

export const criarTerminal = () => {
  const interativo = Boolean(
    stdin.isTTY && stdout.isTTY && process.env.TERM !== 'dumb',
  );
  const leitor = interativo ? null : criarLeitorNaoInterativo();
  const cores = interativo && !process.env.NO_COLOR;
  let telaAberta = false;

  const colorir = (texto, codigo) =>
    cores ? `\x1b[${codigo}m${texto}\x1b[0m` : texto;
  const limpar = () => {
    if (interativo) stdout.write('\x1b[2J\x1b[H');
  };
  const cabecalho = (titulo) => {
    limpar();
    if (interativo) stdout.write('\x1b[?25h');
    console.log(colorir('MercadoÁgil', '1;36'));
    console.log(colorir(titulo, '1;37'));
    console.log(colorir('─'.repeat(28), '90'));
  };

  if (interativo) {
    stdout.write('\x1b[?1049h\x1b[?25l\x1b[2J\x1b[H');
    telaAberta = true;
  }

  const selecionar = async (titulo, opcoes, { voltar = 'voltar' } = {}) => {
    if (!interativo) {
      console.log(`\n${titulo}`);
      opcoes.forEach((opcao, indice) =>
        console.log(`${indice + 1}. ${opcao.rotulo}`),
      );
      console.log(`0. ${voltar}`);
      const resposta = await leitor.perguntar('Escolha uma opção: ');
      if (resposta.trim() === '0') return null;
      const indice = Number(resposta) - 1;
      if (Number.isInteger(indice) && opcoes[indice]) return opcoes[indice];
      console.log('Opção inválida.');
      return selecionar(titulo, opcoes, { voltar });
    }

    return new Promise((resolve, reject) => {
      let indice = 0;
      const desenhar = () => {
        stdout.write('\x1b[?25l');
        limpar();
        const linhas = [
          colorir('MercadoÁgil', '1;36'),
          colorir(titulo, '1;37'),
          colorir('─'.repeat(28), '90'),
          '',
          ...opcoes.map(({ rotulo }, atual) =>
            atual === indice
              ? `${colorir('›', '1;32')} ${colorir(rotulo, '1;32')}`
              : `  ${rotulo}`,
          ),
          '',
          colorir(`↑↓ mover   Enter escolher   Esc ${voltar}`, '90'),
        ];
        stdout.write(linhas.join('\n'));
      };
      const terminar = (valor, erro = false) => {
        stdin.removeListener('keypress', tecla);
        stdin.removeListener('end', fim);
        stdin.setRawMode(false);
        stdin.pause();
        if (erro) reject(valor);
        else resolve(valor);
      };
      const fim = () => terminar(new Encerramento(), true);
      const tecla = (_texto, key = {}) => {
        if (key.ctrl && key.name === 'c')
          return terminar(new Encerramento(), true);
        if (key.name === 'escape') return terminar(null);
        if (key.name === 'return') return terminar(opcoes[indice]);
        if (key.name === 'up') indice = Math.max(0, indice - 1);
        if (key.name === 'down')
          indice = Math.min(opcoes.length - 1, indice + 1);
        desenhar();
      };

      emitKeypressEvents(stdin);
      stdin.setRawMode(true);
      stdin.on('keypress', tecla);
      stdin.once('end', fim);
      stdin.resume();
      desenhar();
    });
  };

  const ler = (rotulo) => {
    if (interativo) stdout.write('\x1b[?25h');
    return leitor ? leitor.perguntar(rotulo) : lerLinha(rotulo);
  };

  const fechar = () => {
    if (telaAberta) {
      stdout.write('\x1b[0m\x1b[?25h\x1b[?1049l');
      telaAberta = false;
    }
    leitor?.fechar();
  };

  return { interativo, colorir, limpar, cabecalho, selecionar, ler, fechar };
};
