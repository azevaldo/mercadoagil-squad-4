import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../src/services/MarketPlace.js';
import { dadosIniciais } from '../src/data/seed.js';
import { criarFormularios } from '../src/commands/formularios.js';

const leitor = (respostas) => {
  const erros = [];
  const perguntas = [];
  const mp = new Marketplace(dadosIniciais);
  const f = criarFormularios(mp, async (rotulo, opcoes) => {
    perguntas.push(rotulo);
    assert.ok(opcoes.exemplo, `Faltou exemplo para ${rotulo}`);
    while (respostas.length) {
      assert.ok(respostas.length, `Faltou resposta para ${rotulo}`);
      const valor = respostas.shift();
      const erro = opcoes.validar(valor);
      if (!erro) return valor;
      erros.push({ rotulo, erro });
    }
    assert.fail(`Faltou uma resposta válida para ${rotulo}`);
  });
  return { f, mp, erros, perguntas };
};

test('rejeita CNPJ inválido, CNPJ duplicado e e-mail inválido durante o cadastro', async () => {
  const { f, mp, erros } = leitor([
    'Minha loja',
    '123',
    '11222333000181',
    '12345678000195',
    'sememail',
    'loja@example.com',
  ]);
  const dados = await f.vendedor();
  assert.equal(erros.length, 3);
  assert.match(erros[0].erro, /CNPJ válido/);
  assert.match(erros[1].erro, /Já existe/);
  assert.match(erros[2].erro, /e-mail válido/);
  assert.equal(mp.cadastrarVendedor(dados).ok, true);
});

test('rejeita percentual acima de 100, datas impossíveis e cumulatividade inválida', async () => {
  const { f, mp, erros } = leitor([
    'errado',
    'percentual',
    '101',
    '10',
    '2030-02-31',
    '2030-12-31',
    '-1',
    '100',
    'sim',
    's',
  ]);
  const dados = await f.dadosCupom();
  assert.equal(erros.length, 5);
  assert.match(erros[1].erro, /100%/);
  assert.match(erros[2].erro, /data existente/);
  assert.match(erros[4].erro, /Responda s/);
  assert.equal(mp.cadastrarCupom({ codigo: 'NOVOCUPOM', ...dados }).ok, true);
});

test('avisa ao manter valor incompatível com o novo tipo do cupom', async () => {
  const { f, erros } = leitor(['percentual', '', '50', '', '', '']);
  const dados = await f.dadosCupom({
    tipo: 'fixo',
    valor: 150,
    validade: new Date('2030-12-31'),
    valorMinimo: 0,
    cumulativo: true,
  });
  assert.equal(erros.length, 1);
  assert.match(erros[0].erro, /100%/);
  assert.equal(dados.valor, '50');
  assert.equal(dados.validade, undefined);
});

test('valida IDs, quantidade e existência antes de avançar para outro campo', async () => {
  const { f, mp, erros } = leitor([
    'abc',
    '99',
    '1',
    '0',
    '99',
    '1',
    '0',
    '1.5',
    '2',
  ]);
  mp.criarPedido('52998224725');
  assert.equal(await f.pedido(), '1');
  assert.equal(await f.produto(), '1');
  assert.equal(await f.quantidade(), '2');
  assert.equal(erros.length, 6);
});

test('recusa período invertido no segundo campo e permite filtros opcionais vazios', async () => {
  const { f, erros } = leitor([
    '2026-02-30',
    '2026-10-01',
    '2026-09-01',
    '2026-10-31',
    '',
    '',
  ]);
  const filtros = await f.filtros();
  assert.equal(erros.length, 2);
  assert.match(erros[0].erro, /data válida/);
  assert.match(erros[1].erro, /posterior/);
  assert.equal(filtros.dataFim, '2026-10-31');
  assert.equal(filtros.vendedor, '');
});
