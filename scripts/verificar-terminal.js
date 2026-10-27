import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
// O console pode consultar o terminal antes de continuar a desenhar.
tela.onData((dados) => app.write(dados));
const conteudo = () =>
  Array.from(
    { length: tela.rows },
    (_, indice) =>
      tela.buffer.active
        .getLine(tela.buffer.active.viewportY + indice)
        ?.translateToString(true) ?? '',
  ).join('\n');
const aguardar = async (texto, anterior = -1) => {
  const fim = Date.now() + 10000;
  while (Date.now() < fim) {
    if (revisao > anterior && conteudo().includes(texto)) {
      const atual = revisao;
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (revisao === atual && conteudo().includes(texto)) {
        console.log(`OK: ${texto}`);
        return;
      }
    }
    if (saida)
      throw new Error(`O aplicativo encerrou antes de mostrar ${texto}.`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Não apareceu: ${texto}\n${conteudo()}`);
};
const tecla = async (valor, esperado) => {
  const anterior = revisao;
  app.write(valor);
  await aguardar(esperado, anterior);
};

try {
  await aguardar('Menu principal');
  await tecla('\x1b[B', '› Cadastros');
  await tecla('\r', '› Clientes');
  assert.ok(
    !conteudo().includes('Menu principal'),
    'O menu anterior deve sumir.',
  );
  await tecla('\x1b', '› Pedidos');
  await tecla('\x1b[B\x1b[B\x1b[B', '› Sair');
  await tecla('\r', 'Até já! MercadoÁgil encerrado.');
  let timer;
  const evento = await Promise.race([
    terminou,
    new Promise((_, reject) => {
      timer = setTimeout(
        () =>
          reject(new Error('O aplicativo não encerrou após escolher Sair.')),
        10000,
      );
    }),
  ]).finally(() => clearTimeout(timer));
  assert.equal(evento.exitCode, 0);
  assert.ok(registro.includes('\x1b[?1049h'));
  assert.ok(registro.includes('\x1b[?1049l'));
  console.log(`PASSOU em ${process.platform}: categorias, setas, Esc e saída.`);
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
        // O processo pode já ter encerrado.
      }
    } else app.kill();
  }
  tela.dispose();
  if (process.platform === 'win32') process.exit(process.exitCode || 0);
}
