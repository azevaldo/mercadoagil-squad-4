import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { larguraTexto } from '../src/cli/layout.js';

// Ferramentas exclusivas da verificação: não entram nas dependências do aplicativo.
assert.ok(
  process.env.CLI_TEST_TOOLS,
  'Informe CLI_TEST_TOOLS com a pasta das ferramentas de teste.',
);
const ferramentas = createRequire(
  resolve(process.env.CLI_TEST_TOOLS, 'package.json'),
);
const pty = ferramentas('node-pty');
const { Terminal } = ferramentas('@xterm/headless');
const tela = new Terminal({ cols: 80, rows: 24, allowProposedApi: true });
const app = pty.spawn(process.execPath, ['index.js'], {
  name: 'xterm-256color',
  cols: 80,
  rows: 24,
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, TERM: 'xterm-256color', NO_COLOR: '1' },
});
let registro = '';
let revisao = 0;
let saida = null;
const terminou = new Promise((resolve) =>
  app.onExit((evento) => {
    saida = evento;
    resolve(evento);
  }),
);
app.onData((dados) => {
  registro += dados;
  tela.write(dados, () => {
    revisao += 1;
  });
});
// Responde às consultas do console, incluindo posição do cursor no Windows.
tela.onData((dados) => app.write(dados));
const conteudo = () =>
  Array.from(
    { length: tela.rows },
    (_, indice) =>
      tela.buffer.active
        .getLine(tela.buffer.active.viewportY + indice)
        ?.translateToString(true) ?? '',
  ).join('\n');
const aguardar = async (texto, anterior = -1, validar = () => true) => {
  const fim = Date.now() + 15000;
  while (Date.now() < fim) {
    if (revisao > anterior && conteudo().includes(texto) && validar()) {
      const atual = revisao;
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (revisao === atual && conteudo().includes(texto)) {
        console.log(`OK: ${texto}`);
        return;
      }
    }
    if (saida)
      throw new Error(
        `O aplicativo encerrou antes de mostrar ${texto}: ${JSON.stringify(saida)}`,
      );
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw new Error(`Não apareceu: ${texto}\n${conteudo()}`);
};
const tecla = async (valor, esperado) => {
  const anterior = revisao;
  app.write(valor);
  await aguardar(esperado, anterior);
};
const redimensionar = async (colunas, linhas, esperado) => {
  console.log(`Redimensionando para ${colunas} × ${linhas}`);
  const anterior = revisao;
  tela.resize(colunas, linhas);
  app.resize(colunas, linhas);
  await aguardar(esperado, anterior, () => {
    const cabecalho = conteudo().split('\n')[0];
    return cabecalho.endsWith('╮') && larguraTexto(cabecalho) === colunas;
  });
};
try {
  await aguardar('Seu marketplace');
  await tecla('\x1b[B', 'Pessoas que compram');
  await tecla('prod', '1 opção');
  await tecla('\r', 'Catálogo, preços');
  await tecla('\r', 'Consultar produtos');
  await tecla('mouse', 'Preço: R$ 120,00');
  await tecla('\r', 'Em estoque: 10');
  await tecla('\x1b', 'Consultar produtos');
  await tecla('\x1b', 'Catálogo, preços');
  await tecla('cadastrar', '1 opção');
  await tecla('\r', 'Nome');
  await tecla('Caneca azul', 'Caneca azul');
  await redimensionar(32, 10, 'Caneca azul');
  await redimensionar(120, 30, 'Caneca azul');
  await tecla('\x1b', 'Catálogo, preços');
  await tecla('\x1b', 'Seu marketplace');
  await tecla('ped', '1 opção');
  await tecla('\r', 'Da primeira compra');
  await tecla('\r', 'CPF do cliente');
  await tecla('52998224725\r', 'Operação concluída');
  await tecla('\r', 'Da primeira compra');
  await tecla('adicionar', '1 opção');
  await tecla('\r', 'Número do pedido');
  await tecla('1\r', 'Id do produto');
  await tecla('1\r', 'Quantidade');
  await tecla('1\r', 'Operação concluída');
  await tecla('\r', 'Da primeira compra');
  await tecla('confirmar', '1 opção');
  await tecla('\r', 'Número do pedido');
  await tecla('1\r', 'Total: R$ 146,50');
  app.write('\x03');
  let timer;
  const evento = await Promise.race([
    terminou,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('O menu não encerrou com Ctrl+C.')),
        10000,
      );
    }),
  ]).finally(() => clearTimeout(timer));
  assert.equal(evento.exitCode, 0);
  assert.ok(
    registro.includes('\x1b[?1049l'),
    'O aplicativo deve restaurar a tela ao sair.',
  );
  console.log(
    `PASSOU em ${process.platform}: teclas, busca, detalhes, redimensionamento, cancelamento, pedido, valores em reais e saída.`,
  );
} catch (erro) {
  console.error(erro);
  process.exitCode = 1;
} finally {
  await writeFile(join(process.env.CLI_TEST_TOOLS, 'terminal.log'), registro);
  if (!saida) {
    if (process.platform === 'win32') {
      try {
        process.kill(app.pid);
      } catch {
        /* O processo pode já ter encerrado. */
      }
    } else app.kill();
  }
  tela.dispose();
  // O teste já confirmou a saída do aplicativo acima. Finaliza também os
  // handles nativos que a ferramenta de ConPTY mantém no processo de teste.
  if (process.platform === 'win32') process.exit(process.exitCode || 0);
}
