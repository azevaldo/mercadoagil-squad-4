import test from 'node:test';
import assert from 'node:assert/strict';
import { CupomDesconto } from '../src/models/CupomDesconto.js';
import { cupomSchema } from '../src/schemas/cupomSchema.js';
import { Marketplace } from '../src/services/MarketPlace.js';
import { validar } from '../src/schemas/validar.js';

// gerando data futura segura nos testes
const criarDataFutura = (dias = 30) => {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data;
};

test('valida e normaliza um cupom válido (percentual)', () => {
  const cupomValido = {
    codigo: 'desconto10',
    tipo: 'percentual',
    valor: 10,
    validade: criarDataFutura(10),
    valorMinimo: 50,
    cumulativo: true,
  };

  const resposta = validar(cupomSchema, cupomValido);

  assert.equal(resposta.ok, true);
  assert.equal(resposta.dados.codigo, 'DESCONTO10');
  assert.equal(resposta.dados.tipo, 'percentual');
  assert.equal(resposta.dados.valor, 10);
  assert.equal(resposta.dados.cumulativo, true);
});

test('rejeita cupom com código curto (< 3 letras) e tipo inválido', () => {
  const resposta = validar(cupomSchema, {
    codigo: 'AB',
    tipo: 'invalido',
    valor: 10,
    validade: criarDataFutura(5),
  });

  assert.equal(resposta.ok, false);
  assert.ok(resposta.erros.some((erro) => erro.includes('3 letras')));
  assert.ok(resposta.erros.some((erro) => erro.includes('Tipo inválido')));
});

test('rejeita cupom com data no passado (regra refine de data futura)', () => {
  const dataPassada = new Date('2020-01-01');
  const resposta = validar(cupomSchema, {
    codigo: 'VENCIDO',
    tipo: 'fixo',
    valor: 15,
    validade: dataPassada,
  });

  assert.equal(resposta.ok, false);
  assert.ok(resposta.erros.some((erro) => erro.includes('data futura')));
});

test('rejeita cupom percentual com valor acima de 100%', () => {
  const resposta = validar(cupomSchema, {
    codigo: 'SUPERDESC',
    tipo: 'percentual',
    valor: 150,
    validade: criarDataFutura(10),
  });

  assert.equal(resposta.ok, false);
  assert.ok(resposta.erros.some((erro) => erro.includes('100%')));
});

test('aceita cupom de frete com valor 0', () => {
  const resposta = validar(cupomSchema, {
    codigo: 'FRETEGRATIS',
    tipo: 'frete',
    valor: 0,
    validade: criarDataFutura(10),
  });

  assert.equal(resposta.ok, true);
  assert.equal(resposta.dados.codigo, 'FRETEGRATIS');
  assert.equal(resposta.dados.tipo, 'frete');
});

test('CupomDesconto instancia corretamente e encapsula a data de validade', () => {
  const data = criarDataFutura(5);
  const cupom = new CupomDesconto({
    codigo: 'PROMO10',
    tipo: 'percentual',
    valor: 10,
    validade: data,
    valorMinimo: 80,
    cumulativo: true,
  });

  assert.equal(cupom.codigo, 'PROMO10');
  assert.equal(cupom.tipo, 'percentual');
  assert.equal(cupom.valor, 10);
  assert.equal(cupom.valorMinimo, 80);
  assert.equal(cupom.cumulativo, true);
  assert.equal(cupom.estaValido(), true);
  assert.equal(cupom.atingeMinimo(100), true);
  assert.equal(cupom.atingeMinimo(50), false);

  // testando proteção contra mutação de data
  const dataRetornada = cupom.validade;
  dataRetornada.setFullYear(2010);
  assert.equal(cupom.estaValido(), true);
});

test('Marketplace cadastra, lista, busca, atualiza e exclui cupons', () => {
  const mp = new Marketplace();

  // cadastrando cupom
  const cadastroRes = mp.cadastrarCupom({
    codigo: 'NATAL15',
    tipo: 'fixo',
    valor: 15,
    validade: criarDataFutura(20),
    valorMinimo: 100,
    cumulativo: true,
  });

  assert.equal(cadastroRes.ok, true);
  assert.equal(cadastroRes.dados.codigo, 'NATAL15');

  // barrando cadastro quando o código do cupom está duplicado
  const duplicadoRes = mp.cadastrarCupom({
    codigo: 'natal15',
    tipo: 'fixo',
    valor: 20,
    validade: criarDataFutura(20),
  });
  assert.equal(duplicadoRes.ok, false);
  assert.ok(duplicadoRes.erros.some((e) => e.includes('Já existe um cupom')));

  // listando cupons
  const listaRes = mp.listarCupons();
  assert.equal(listaRes.ok, true);
  assert.equal(listaRes.dados.length, 1);
  assert.equal(listaRes.dados[0].codigo, 'NATAL15');

  // buscando cupons (case insensitive e espaços ignorados)
  const buscaRes = mp.buscarCupom('  natal15  ');
  assert.equal(buscaRes.ok, true);
  assert.equal(buscaRes.dados.codigo, 'NATAL15');

  const buscaInexistente = mp.buscarCupom('NAOEXISTE');
  assert.equal(buscaInexistente.ok, false);
  assert.deepEqual(buscaInexistente.erros, ['Cupom não encontrado.']);

  // atualizando cupons
  const atualizaRes = mp.atualizarCupom('NATAL15', {
    valor: 25,
    valorMinimo: 150,
  });
  assert.equal(atualizaRes.ok, true);
  assert.equal(atualizaRes.dados.valor, 25);
  assert.equal(atualizaRes.dados.valorMinimo, 150);

  // tentando alterar o código do cupom
  const tentaMudarCodigo = mp.atualizarCupom('NATAL15', {
    codigo: 'OUTROCODIGO',
  });
  assert.equal(tentaMudarCodigo.ok, false);
  assert.ok(tentaMudarCodigo.erros.some((e) => e.includes('código do cupom não pode ser alterado')));

  // excluindo cupom
  const exclusaoRes = mp.excluirCupom('natal15');
  assert.equal(exclusaoRes.ok, true);

  // confirmando que o cupom não existe mais após excluir
  const buscaAposExcluir = mp.buscarCupom('NATAL15');
  assert.equal(buscaAposExcluir.ok, false);
  assert.equal(mp.listarCupons().dados.length, 0);
});