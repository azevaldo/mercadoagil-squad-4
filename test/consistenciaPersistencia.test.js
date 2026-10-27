import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { BancoSQLite } from '../src/data/sqlite.js';
import { dadosIniciais } from '../src/data/seed.js';
import { Marketplace } from '../src/services/MarketPlace.js';

const criarBancos = (t) => {
  const diretorio = mkdtempSync(join(tmpdir(), 'mercado-consistencia-'));
  const caminho = join(diretorio, 'teste.sqlite');
  const bancos = [];
  t.after(() => {
    bancos.forEach((banco) => banco.fechar());
    rmSync(diretorio, { recursive: true, force: true });
  });
  return {
    caminho,
    abrir() {
      const banco = new BancoSQLite(caminho);
      bancos.push(banco);
      return banco;
    },
  };
};

const construirMarketplace = (banco, estado) =>
  new Marketplace(estado ?? dadosIniciais, {
    aoAlterar: (atual) => banco.salvarEstado(atual),
    recuperarEstado: () => banco.carregarEstado(),
    persistirInicial: estado === null,
  });

const iniciarMarketplace = (banco) =>
  construirMarketplace(banco, banco.carregarEstado());

test('cadastros, alterações e exclusões permanecem no banco ao reabrir', (t) => {
  const bancos = criarBancos(t);
  const banco = bancos.abrir();
  const marketplace = iniciarMarketplace(banco);
  const cpf = '39053344705';
  const cnpj = '11444777000161';
  const validade = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  assert.equal(
    marketplace.cadastrarCliente({
      nome: 'Cliente Exemplo',
      email: 'cliente@example.com',
      cpf,
      regiaoEntrega: 'Sul',
    }).ok,
    true,
  );
  assert.equal(
    marketplace.atualizarCliente(cpf, {
      nome: 'Cliente Atualizado',
      email: 'atualizado@example.com',
      regiaoEntrega: 'Sul',
    }).ok,
    true,
  );
  assert.equal(
    marketplace.cadastrarVendedor({
      nomeLoja: 'Loja Exemplo',
      cnpj,
      email: 'loja@example.com',
    }).ok,
    true,
  );
  assert.equal(
    marketplace.atualizarVendedor(cnpj, {
      nomeLoja: 'Loja Atualizada',
      email: 'loja.atualizada@example.com',
    }).ok,
    true,
  );
  const produto = marketplace.cadastrarProduto({
    nome: 'Produto Exemplo',
    preco: 50,
    categoria: 'casa',
    quantidade: 3,
    vendedorCnpj: cnpj,
  });
  assert.equal(produto.ok, true);
  assert.equal(
    marketplace.atualizarProduto(produto.dados.id, { preco: 60, quantidade: 5 })
      .ok,
    true,
  );
  assert.equal(
    marketplace.cadastrarCupom({
      codigo: 'TESTE20',
      tipo: 'fixo',
      valor: 20,
      validade,
      valorMinimo: 0,
      cumulativo: true,
    }).ok,
    true,
  );
  assert.equal(marketplace.atualizarCupom('TESTE20', { valor: 15 }).ok, true);

  const restaurado = new Marketplace(banco.carregarEstado());
  assert.equal(
    restaurado.buscarCliente(cpf).dados[0].nome,
    'Cliente Atualizado',
  );
  assert.equal(
    restaurado.buscarVendedor(cnpj).dados[0].nomeLoja,
    'Loja Atualizada',
  );
  assert.equal(restaurado.buscarProduto(produto.dados.id).dados.preco, 60);
  assert.equal(restaurado.buscarProduto(produto.dados.id).dados.disponivel, 5);
  assert.equal(restaurado.buscarCupom('TESTE20').dados.valor, 15);

  assert.equal(marketplace.excluirProduto(produto.dados.id).ok, true);
  assert.equal(marketplace.excluirVendedor(cnpj).ok, true);
  assert.equal(marketplace.excluirCliente(cpf).ok, true);
  assert.equal(marketplace.excluirCupom('TESTE20').ok, true);
  const aposExclusoes = new Marketplace(banco.carregarEstado());
  assert.equal(aposExclusoes.buscarCliente(cpf).ok, false);
  assert.equal(aposExclusoes.buscarVendedor(cnpj).ok, false);
  assert.equal(aposExclusoes.buscarProduto(produto.dados.id).ok, false);
  assert.equal(aposExclusoes.buscarCupom('TESTE20').ok, false);
});

test('duas sessões atualizam os dados antes de consultar ou gravar', (t) => {
  const bancos = criarBancos(t);
  const primeira = iniciarMarketplace(bancos.abrir());
  const segunda = iniciarMarketplace(bancos.abrir());

  assert.equal(primeira.atualizarProduto(1, { preco: 121 }).ok, true);
  assert.equal(segunda.buscarProduto('1').dados.preco, 121);
  assert.equal(segunda.buscarProduto('2').dados.preco, 80);
  assert.equal(segunda.atualizarProduto(2, { preco: 81 }).ok, true);
  assert.equal(primeira.buscarProduto('2').dados.preco, 81);
  const bancoDeLeitura = bancos.abrir();
  const restaurado = new Marketplace(bancoDeLeitura.carregarEstado());
  assert.equal(restaurado.buscarProduto('1').dados.preco, 121);
  assert.equal(restaurado.buscarProduto('2').dados.preco, 81);
});

test('duas instâncias que compartilham a conexão também sincronizam', (t) => {
  const bancos = criarBancos(t);
  const banco = bancos.abrir();
  const primeira = iniciarMarketplace(banco);
  const segunda = iniciarMarketplace(banco);

  assert.equal(primeira.atualizarProduto(1, { preco: 121 }).ok, true);
  assert.equal(segunda.atualizarProduto(2, { preco: 81 }).ok, true);
  assert.equal(segunda.buscarProduto('1').dados.preco, 121);
  assert.equal(primeira.atualizarProduto(3, { preco: 251 }).ok, true);
  assert.equal(primeira.buscarProduto('2').dados.preco, 81);
  assert.equal(segunda.buscarProduto('3').dados.preco, 251);
});

test('avisa e atualiza a sessão quando outra gravação ocorre durante a operação', (t) => {
  const bancos = criarBancos(t);
  const primeira = iniciarMarketplace(bancos.abrir());
  const banco2 = bancos.abrir();
  const estado = banco2.carregarEstado();
  let disputar = true;
  const segunda = new Marketplace(estado, {
    aoAlterar: (atual) => {
      if (disputar) {
        disputar = false;
        assert.equal(primeira.atualizarProduto(1, { preco: 121 }).ok, true);
      }
      return banco2.salvarEstado(atual);
    },
    recuperarEstado: () => banco2.carregarEstado(),
  });

  const conflito = segunda.atualizarProduto(2, { preco: 81 });
  assert.equal(conflito.ok, false);
  assert.match(conflito.erros[0], /outra sessão/);
  assert.equal(segunda.buscarProduto('1').dados.preco, 121);
  assert.equal(segunda.buscarProduto('2').dados.preco, 80);
  assert.equal(segunda.atualizarProduto(2, { preco: 81 }).ok, true);
});

test('sessões compartilham o estoque ao confirmar pedidos', (t) => {
  const bancos = criarBancos(t);
  const primeira = iniciarMarketplace(bancos.abrir());
  const segunda = iniciarMarketplace(bancos.abrir());

  assert.equal(primeira.criarPedido('52998224725').dados.id, 1);
  assert.equal(primeira.adicionarItem(1, 1, 10).ok, true);
  assert.equal(segunda.criarPedido('11144477735').dados.id, 2);
  assert.equal(segunda.adicionarItem(2, 1, 1).ok, true);
  assert.equal(primeira.confirmarPedido(1).ok, true);

  const resposta = segunda.confirmarPedido(2);
  assert.equal(resposta.ok, false);
  assert.match(resposta.erros[0], /Estoque insuficiente/);
  assert.equal(segunda.buscarProduto('1').dados.disponivel, 0);
  assert.equal(segunda.resumoPedido(2).dados.status, 'aberto');
});

test('processos separados detectam gravações concorrentes sem perder dados', async (t) => {
  const bancos = criarBancos(t);
  iniciarMarketplace(bancos.abrir());
  const codigo = `
    import { BancoSQLite } from './src/data/sqlite.js';
    import { Marketplace } from './src/services/MarketPlace.js';
    const banco = new BancoSQLite(process.argv[1]);
    const marketplace = new Marketplace(banco.carregarEstado(), {
      aoAlterar: (estado) => banco.salvarEstado(estado),
      recuperarEstado: () => banco.carregarEstado(),
    });
    process.send({ pronto: true });
    process.on('message', (comando) => {
      if (comando.sair) {
        banco.fechar();
        process.disconnect();
        return;
      }
      process.send(marketplace.atualizarProduto(comando.id, { preco: comando.preco }));
    });
  `;
  const ambiente = { ...process.env };
  delete ambiente.NODE_TEST_CONTEXT;

  const iniciarSessao = () => {
    const processo = spawn(
      process.execPath,
      ['--input-type=module', '-e', codigo, bancos.caminho],
      { env: ambiente, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] },
    );
    let erros = '';
    processo.stderr.on('data', (dados) => {
      erros += dados.toString();
    });
    const aguardar = () =>
      new Promise((resolve, reject) => {
        const prazo = setTimeout(() => {
          limpar();
          reject(new Error(`Sessão não respondeu. ${erros}`));
        }, 10000);
        const limpar = () => {
          clearTimeout(prazo);
          processo.off('message', receber);
          processo.off('exit', encerrar);
          processo.off('error', falhar);
        };
        const receber = (mensagem) => {
          limpar();
          resolve(mensagem);
        };
        const encerrar = (codigo) => {
          limpar();
          reject(new Error(`Sessão encerrou (${codigo}). ${erros}`));
        };
        const falhar = (erro) => {
          limpar();
          reject(erro);
        };
        processo.once('message', receber);
        processo.once('exit', encerrar);
        processo.once('error', falhar);
      });
    return { processo, aguardar, pronta: aguardar() };
  };

  const primeira = iniciarSessao();
  const segunda = iniciarSessao();
  const sessoes = [primeira, segunda];
  try {
    await Promise.all(sessoes.map((sessao) => sessao.pronta));
    const respostas = sessoes.map((sessao) => sessao.aguardar());
    primeira.processo.send({ id: 1, preco: 121 });
    segunda.processo.send({ id: 2, preco: 81 });
    const resultados = await Promise.all(respostas);
    assert.ok(resultados.some((resultado) => resultado.ok));
    const indiceConflito = resultados.findIndex((resultado) => !resultado.ok);
    if (indiceConflito !== -1) {
      assert.match(resultados[indiceConflito].erros[0], /outra sessão/);
      const sessao = sessoes[indiceConflito];
      const novaResposta = sessao.aguardar();
      sessao.processo.send(
        indiceConflito === 0 ? { id: 1, preco: 121 } : { id: 2, preco: 81 },
      );
      assert.equal((await novaResposta).ok, true);
    }

    const restaurado = new Marketplace(bancos.abrir().carregarEstado());
    assert.equal(restaurado.buscarProduto('1').dados.preco, 121);
    assert.equal(restaurado.buscarProduto('2').dados.preco, 81);
  } finally {
    await Promise.all(
      sessoes.map(async ({ processo }) => {
        if (processo.exitCode !== null || processo.signalCode !== null) return;
        const terminou = once(processo, 'exit').catch(() => {});
        const prazo = setTimeout(() => processo.kill(), 3000);
        if (processo.connected) processo.send({ sair: true });
        else processo.kill();
        await terminou;
        clearTimeout(prazo);
      }),
    );
  }
});

test('falha ao salvar restaura dados e sequência antes da próxima operação', (t) => {
  const bancos = criarBancos(t);
  const banco = bancos.abrir();
  assert.equal(banco.carregarEstado(), null);
  let falhar = false;
  const marketplace = new Marketplace(dadosIniciais, {
    aoAlterar: (estado) => {
      if (falhar) throw new Error('Falha de gravação simulada');
      return banco.salvarEstado(estado);
    },
    recuperarEstado: () => banco.carregarEstado(),
    persistirInicial: true,
  });

  falhar = true;
  assert.equal(marketplace.atualizarProduto(1, { preco: 121 }).ok, false);
  assert.equal(marketplace.buscarProduto('1').dados.preco, 120);
  assert.equal(marketplace.criarPedido('52998224725').ok, false);
  assert.equal(marketplace.listarPedidos().dados.length, 0);

  falhar = false;
  assert.equal(marketplace.criarPedido('52998224725').dados.id, 1);
  const restaurado = new Marketplace(banco.carregarEstado());
  assert.equal(restaurado.buscarProduto('1').dados.preco, 120);
  assert.equal(restaurado.listarPedidos().dados[0].id, 1);
});

test('falha ao salvar confirmação ou cancelamento não altera pedido nem estoque', (t) => {
  const banco = criarBancos(t).abrir();
  assert.equal(banco.carregarEstado(), null);
  let falhar = false;
  const marketplace = new Marketplace(dadosIniciais, {
    aoAlterar: (estado) => {
      if (falhar) throw new Error('Falha de gravação simulada');
      return banco.salvarEstado(estado);
    },
    recuperarEstado: () => banco.carregarEstado(),
    persistirInicial: true,
  });

  assert.equal(marketplace.criarPedido('52998224725').ok, true);
  assert.equal(marketplace.adicionarItem(1, 1, 2).ok, true);
  falhar = true;
  assert.equal(marketplace.confirmarPedido(1).ok, false);
  assert.equal(marketplace.resumoPedido(1).dados.status, 'aberto');
  assert.equal(marketplace.buscarProduto('1').dados.disponivel, 10);

  falhar = false;
  assert.equal(marketplace.confirmarPedido(1).ok, true);
  assert.equal(marketplace.buscarProduto('1').dados.disponivel, 8);
  falhar = true;
  assert.equal(marketplace.cancelarPedido(1).ok, false);
  assert.equal(marketplace.resumoPedido(1).dados.status, 'confirmado');
  assert.equal(marketplace.buscarProduto('1').dados.disponivel, 8);

  falhar = false;
  assert.equal(marketplace.cancelarPedido(1).ok, true);
  assert.equal(marketplace.buscarProduto('1').dados.disponivel, 10);
});

test('restaura a cópia anterior mesmo se o banco não puder ser lido', (t) => {
  const banco = criarBancos(t).abrir();
  assert.equal(banco.carregarEstado(), null);
  let falharGravacao = false;
  let falharLeitura = false;
  const marketplace = new Marketplace(dadosIniciais, {
    aoAlterar: (estado) => {
      if (falharGravacao) {
        falharLeitura = true;
        throw new Error('Falha simulada ao salvar');
      }
      return banco.salvarEstado(estado);
    },
    recuperarEstado: () => {
      if (falharLeitura) throw new Error('Falha simulada ao ler');
      return banco.carregarEstado();
    },
    persistirInicial: true,
  });

  falharGravacao = true;
  assert.equal(marketplace.atualizarProduto(1, { preco: 121 }).ok, false);
  assert.equal(marketplace.buscarProduto('1').ok, false);
  falharLeitura = false;
  assert.equal(marketplace.buscarProduto('1').dados.preco, 120);
  assert.equal(marketplace.criarPedido('52998224725').ok, false);
  falharLeitura = false;
  assert.equal(marketplace.listarPedidos().dados.length, 0);
});

test('restaura a cópia anterior se o estado recuperado estiver inconsistente', (t) => {
  const banco = criarBancos(t).abrir();
  assert.equal(banco.carregarEstado(), null);
  let falharGravacao = false;
  let corromperLeitura = false;
  const marketplace = new Marketplace(dadosIniciais, {
    aoAlterar: (estado) => {
      if (falharGravacao) {
        corromperLeitura = true;
        throw new Error('Falha simulada ao salvar');
      }
      return banco.salvarEstado(estado);
    },
    recuperarEstado: () =>
      corromperLeitura
        ? { versao: 1, produtos: [{ id: 1, vendedorCnpj: 'inexistente' }] }
        : banco.carregarEstado(),
    persistirInicial: true,
  });

  falharGravacao = true;
  assert.equal(marketplace.atualizarProduto(1, { preco: 121 }).ok, false);
  corromperLeitura = false;
  assert.equal(marketplace.buscarProduto('1').dados.preco, 120);
  assert.equal(marketplace.listarClientes().dados.length, 3);
});

test('inicializações simultâneas não substituem os dados já salvos', (t) => {
  const bancos = criarBancos(t);
  const banco1 = bancos.abrir();
  const banco2 = bancos.abrir();
  const estado1 = banco1.carregarEstado();
  const estado2 = banco2.carregarEstado();
  assert.equal(estado1, null);
  assert.equal(estado2, null);

  const primeira = construirMarketplace(banco1, estado1);
  assert.equal(primeira.atualizarProduto(1, { preco: 121 }).ok, true);
  const segunda = construirMarketplace(banco2, estado2);
  assert.equal(segunda.buscarProduto('1').dados.preco, 121);
  assert.equal(segunda.atualizarProduto(2, { preco: 81 }).ok, true);
});

test('abre e atualiza banco anterior que ainda não tem revisão', (t) => {
  const bancos = criarBancos(t);
  iniciarMarketplace(bancos.abrir());
  const conexao = new DatabaseSync(bancos.caminho);
  try {
    conexao
      .prepare('DELETE FROM metadados WHERE chave = ?')
      .run('revisao_estado');
  } finally {
    conexao.close();
  }

  const banco = bancos.abrir();
  const marketplace = iniciarMarketplace(banco);
  assert.equal(marketplace.atualizarProduto(1, { preco: 121 }).ok, true);
  assert.equal(banco.carregarEstado().revisao, 1);
});

test('API pública do marketplace não oferece exportação de CPF', () => {
  const marketplace = new Marketplace(dadosIniciais);
  assert.equal(marketplace.exportarEstado, undefined);
  assert.equal('cpf' in marketplace.listarClientes().dados[0], false);
  assert.equal(
    'cpf' in marketplace.buscarCliente('52998224725').dados[0],
    false,
  );
});
