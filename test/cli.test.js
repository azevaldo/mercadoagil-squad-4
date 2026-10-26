import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import {
  linhasRegistro,
  linhasResumo,
  linhasRelatorio,
  textoSeguro,
} from '../src/cli/apresentacao.js';
import { criarAcoes } from '../src/cli/acoes.js';
import { Marketplace } from '../src/services/MarketPlace.js';
import { dadosIniciais } from '../src/data/seed.js';

const entrada = `
Object.defineProperty(process.stdin, 'isTTY', { value: true });
Object.defineProperty(process.stdout, 'isTTY', { value: true });
process.stdin.setRawMode = () => {};
process.stdout.columns = Number(process.env.TEST_COLUNAS || 80);
process.stdout.rows = 24;
const { iniciarMenu } = await import('./src/cli/menu.js');
const { Marketplace } = await import('./src/services/MarketPlace.js');
const { dadosIniciais } = await import('./src/data/seed.js');
await iniciarMenu(new Marketplace(dadosIniciais));
`;

// Exercita a leitura de teclas do Node em um processo isolado, sem dependência de fzf.
const abrirTerminal = (t, colunas = 80) => {
  const ambiente = { ...process.env };
  delete ambiente.NODE_TEST_CONTEXT;
  const filho = spawn(
    process.execPath,
    ['--input-type=module', '-e', entrada],
    {
      cwd: new URL('..', import.meta.url),
      env: {
        ...ambiente,
        TERM: 'xterm-256color',
        NO_COLOR: '1',
        TEST_COLUNAS: String(colunas),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  t.after(() => {
    if (filho.exitCode === null) filho.kill();
  });
  let saida = '';
  let erros = '';
  filho.stdout.setEncoding('utf8');
  filho.stdout.on('data', (texto) => {
    saida += texto;
  });
  filho.stderr.on('data', (texto) => {
    erros += texto;
  });
  const esperar = async (texto) => {
    const fim = Date.now() + 5000;
    while (Date.now() < fim) {
      if (saida.split('\x1b[H\x1b[2J').at(-1).includes(texto)) return;
      if (filho.exitCode !== null)
        assert.fail(
          `Terminal saiu: ${filho.exitCode} ${erros} ${JSON.stringify(saida)}`,
        );
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    assert.fail(`Não apareceu: ${texto}\n${saida.slice(-3000)}\n${erros}`);
  };
  return {
    esperar,
    async tecla(tecla, esperado) {
      saida = '';
      filho.stdin.write(tecla);
      await esperar(esperado);
    },
    async sair(tecla = '\x03') {
      const terminado = once(filho, 'exit');
      filho.stdin.write(tecla);
      const [codigo] = await Promise.race([
        terminado,
        new Promise((_, reject) => {
          const timer = setTimeout(
            () =>
              reject(
                new Error('Saída travada: ' + JSON.stringify(saida) + erros),
              ),
            3000,
          );
          timer.unref();
        }),
      ]);
      assert.equal(codigo, 0, erros);
      assert.ok(saida.includes('\x1b[?25h\x1b[?1049l'));
      assert.equal(erros, '');
    },
  };
};

test('navega com setas, filtra produtos e mostra preço e estoque', async (t) => {
  const ui = abrirTerminal(t);
  await ui.esperar('Seu marketplace');
  await ui.tecla('\x1b[B', 'Pessoas que compram');
  await ui.tecla('prod', '1 opção');
  await ui.tecla('\r', 'Catálogo, preços');
  await ui.tecla('\r', 'Consultar produtos');
  await ui.tecla('mouse', 'Preço: R$ 120,00');
  await ui.tecla('\r', 'Em estoque: 10');
  await ui.tecla('\x1b', 'Consultar produtos');
  await ui.tecla('\x1b', 'Catálogo, preços');
  await ui.tecla('\x1b', 'Seu marketplace');
  await ui.sair('\x1b');
});

test('cancela um cadastro sem criar cliente e restaura o terminal no Ctrl+C', async (t) => {
  const ui = abrirTerminal(t, 50);
  await ui.esperar('Seu marketplace');
  await ui.tecla('clientes', '1 opção');
  await ui.tecla('\r', 'Pessoas que compram');
  await ui.tecla('cadastrar', '1 opção');
  await ui.tecla('\r', 'Nome');
  await ui.tecla('Cliente cancelado\r', 'E-mail');
  await ui.tecla('\x1b', 'Pessoas que compram');
  await ui.tecla('listar', '1 opção');
  await ui.tecla('\r', '3 opção');
  await ui.sair();
});

test('cupom cumulativo é perguntado uma vez e Enter mantém o valor atual', async () => {
  const mp = new Marketplace(dadosIniciais);
  const respostas = ['BEMVINDO10', '', '', '', '', ''];
  const perguntas = [];
  const acoes = criarAcoes(mp, {
    perguntar: async (texto) => {
      perguntas.push(texto);
      return respostas.shift();
    },
    mostrar: (resposta) => assert.equal(resposta.ok, true),
  });
  await acoes[19][1]();
  assert.equal(
    perguntas.filter((texto) => texto.startsWith('Cumulativo')).length,
    1,
  );
  assert.equal(mp.buscarCupom('BEMVINDO10').dados.cumulativo, true);
  assert.equal(respostas.length, 0);
});

test('resumo e relatório apresentam o pedido oficial em reais', () => {
  const mp = new Marketplace(dadosIniciais);
  mp.criarPedido('52998224725');
  mp.adicionarItem(1, 1, 1);
  mp.adicionarItem(1, 2, 1);
  mp.aplicarCupom(1, 'BEMVINDO10');
  mp.aplicarCupom(1, 'PDA15');
  mp.confirmarPedido(1);
  assert.match(
    linhasResumo(mp.resumoPedido(1)).join('\n'),
    /Total: R\$ 193,00/,
  );
  const relatorio = linhasRelatorio(mp.relatorioFinanceiro()).join('\n');
  assert.match(relatorio, /Faturamento total: R\$ 193,00/);
  assert.match(relatorio, /A repassar: R\$ 110,40/);
  assert.match(relatorio, /A repassar: R\$ 68,00/);
});

test('cadastros não injetam controles no terminal nem exibem CPF', () => {
  assert.equal(textoSeguro('Mouse\x1b[2J\nTeste'), 'Mouse Teste');
  assert.deepEqual(linhasRegistro({ nome: 'Maria', cpf: '52998224725' }), [
    'Nome: Maria',
  ]);
});

test('modo sem TTY aceita entrada em lote, opção inválida e saída por número', () => {
  const resultado = spawnSync(process.execPath, ['index.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, TERM: 'dumb' },
    input: '99\n4\n1\nMouse\n0\n0\n0\n',
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.ifError(resultado.error);
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.match(resultado.stdout, /Opção inexistente/);
  assert.match(resultado.stdout, /Preço: R\$ 120,00/);
  assert.match(resultado.stdout, /Até já!/);
  assert.ok(!resultado.stdout.includes('\x1b['));
});
