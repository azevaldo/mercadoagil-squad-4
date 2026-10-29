import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  linhasRegistro,
  linhasResumo,
  linhasRelatorio,
  textoSeguro,
} from '../src/commands/apresentacao.js';
import { criarAcoes } from '../src/commands/acoes.js';
import { Marketplace } from '../src/services/MarketPlace.js';
import { dadosIniciais } from '../src/data/seed.js';
import { executarMenu } from '../src/cli/menu.js';

test('navega por categorias e lista clientes', async () => {
  const marketplace = new Marketplace(dadosIniciais);
  const escolhas = [
    'Cadastros',
    'Clientes',
    'Listar clientes',
    null,
    null,
    'Sair',
  ];
  const titulos = [];
  const exibicoes = [];
  const terminal = {
    selecionar: async (titulo, opcoes) => {
      titulos.push(titulo);
      const escolha = escolhas.shift();
      if (escolha === null) return null;
      return opcoes.find((opcao) => opcao.rotulo === escolha) ?? null;
    },
  };

  await executarMenu(marketplace, {
    terminal,
    perguntar: async () => {
      throw new Error('Esta ação não deve pedir dados.');
    },
    exibir: async (titulo, linhas) => {
      exibicoes.push([titulo, ...linhas].join('\n'));
    },
  });

  assert.deepEqual(escolhas, []);
  assert.deepEqual(titulos, [
    'Menu principal',
    'Cadastros',
    'Clientes',
    'Clientes',
    'Cadastros',
    'Menu principal',
  ]);
  assert.match(exibicoes.join('\n'), /Maria Santos/);
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

test('resumo e relatório apresentam os valores corretos em reais', () => {
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

test('dados não injetam controles no terminal nem exibem CPF', () => {
  assert.equal(textoSeguro('Mouse\x1b[2J\nTeste'), 'Mouse Teste');
  assert.deepEqual(linhasRegistro({ nome: 'Maria', cpf: '52998224725' }), [
    'Nome: Maria',
  ]);
});
