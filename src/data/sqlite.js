import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const caminhoBanco = fileURLToPath(
  new URL('../../data/mercadoagil.sqlite', import.meta.url),
);
const caminhoSchema = fileURLToPath(
  new URL('../../data/schema.sql', import.meta.url),
);

const lerJson = (valor, descricao) => {
  try {
    return JSON.parse(valor);
  } catch {
    throw new Error(`O banco local contém ${descricao} inválido.`);
  }
};

const validadeIso = (validade) => new Date(validade).toISOString();

export class BancoSQLite {
  #banco;

  constructor(caminho = caminhoBanco) {
    this.#banco = new DatabaseSync(caminho);
    this.#banco.exec(readFileSync(caminhoSchema, 'utf8'));
    this.#banco.exec('PRAGMA busy_timeout = 5000');
  }

  carregarEstado() {
    this.#banco.exec('BEGIN');
    try {
      const revisao = this.#lerRevisao();
      const estado = this.#lerEstado();
      this.#banco.exec('COMMIT');
      return estado ? { ...estado, revisao } : null;
    } catch (erro) {
      this.#banco.exec('ROLLBACK');
      throw erro;
    }
  }

  #lerRevisao() {
    const registro = this.#banco
      .prepare('SELECT valor FROM metadados WHERE chave = ?')
      .get('revisao_estado');
    const revisao = registro ? Number(registro.valor) : 0;
    if (!Number.isSafeInteger(revisao) || revisao < 0) {
      throw new Error('A revisão do banco local é inválida.');
    }
    return revisao;
  }

  #lerEstado() {
    const inicializado = this.#banco
      .prepare('SELECT valor FROM metadados WHERE chave = ?')
      .get('estado_inicializado');

    if (!inicializado) return null;

    const clientes = this.#banco
      .prepare(
        `SELECT cpf, nome, email, regiao_entrega AS regiaoEntrega
         FROM clientes ORDER BY rowid`,
      )
      .all();
    const vendedores = this.#banco
      .prepare(
        `SELECT nome_loja AS nomeLoja, cnpj, email
         FROM vendedores ORDER BY rowid`,
      )
      .all();
    const produtos = this.#banco
      .prepare(
        `SELECT id, nome, preco, categoria, vendedor_cnpj AS vendedorCnpj,
                quantidade
         FROM produtos ORDER BY id`,
      )
      .all();
    const cupons = this.#banco
      .prepare(
        `SELECT codigo, tipo, valor, validade, valor_minimo AS valorMinimo,
                cumulativo
         FROM cupons ORDER BY rowid`,
      )
      .all()
      .map((cupom) => ({ ...cupom, cumulativo: Boolean(cupom.cumulativo) }));

    const itens = this.#banco
      .prepare(
        `SELECT pedido_id, produto_id, produto_json, quantidade, preco_unitario
         FROM itens_pedido ORDER BY pedido_id, posicao`,
      )
      .all()
      .reduce((porPedido, item) => {
        const lista = porPedido.get(item.pedido_id) ?? [];
        lista.push({
          produtoId: item.produto_id,
          produto: lerJson(item.produto_json, 'um item de pedido'),
          quantidade: item.quantidade,
          precoUnitario: item.preco_unitario,
        });
        porPedido.set(item.pedido_id, lista);
        return porPedido;
      }, new Map());

    const cuponsDosPedidos = this.#banco
      .prepare(
        `SELECT pedido_id, cupom_json
         FROM cupons_pedido ORDER BY pedido_id, posicao`,
      )
      .all()
      .reduce((porPedido, registro) => {
        const lista = porPedido.get(registro.pedido_id) ?? [];
        lista.push(lerJson(registro.cupom_json, 'um cupom de pedido'));
        porPedido.set(registro.pedido_id, lista);
        return porPedido;
      }, new Map());

    const pedidos = this.#banco
      .prepare(
        `SELECT id, cliente_cpf, cliente_nome, cliente_email, cliente_regiao,
                status, confirmado_em, calculo_final_json,
                itens_financeiros_json
         FROM pedidos ORDER BY id`,
      )
      .all()
      .map((pedido) => ({
        id: pedido.id,
        cliente: {
          cpf: pedido.cliente_cpf,
          nome: pedido.cliente_nome,
          email: pedido.cliente_email,
          regiaoEntrega: pedido.cliente_regiao,
        },
        status: pedido.status,
        confirmadoEm: pedido.confirmado_em,
        calculoFinal: pedido.calculo_final_json
          ? lerJson(pedido.calculo_final_json, 'o cálculo de um pedido')
          : null,
        itensFinanceiros: pedido.itens_financeiros_json
          ? lerJson(
              pedido.itens_financeiros_json,
              'os dados financeiros de um pedido',
            )
          : null,
        itens: itens.get(pedido.id) ?? [],
        cupons: cuponsDosPedidos.get(pedido.id) ?? [],
      }));

    const metadados = this.#banco
      .prepare('SELECT chave, valor FROM metadados')
      .all()
      .reduce((resultado, { chave, valor }) => {
        resultado[chave] = Number(valor);
        return resultado;
      }, {});

    return {
      versao: 1,
      clientes,
      vendedores,
      produtos,
      cupons,
      pedidos,
      sequencias: {
        proximoProdutoId: metadados.proximo_produto_id,
        proximoPedidoId: metadados.proximo_pedido_id,
      },
    };
  }

  salvarEstado(estado) {
    const revisaoEsperada = estado.revisao ?? 0;
    if (!Number.isSafeInteger(revisaoEsperada) || revisaoEsperada < 0) {
      throw new Error('A revisão informada para o banco é inválida.');
    }
    const inserirCliente = this.#banco.prepare(
      'INSERT INTO clientes (cpf, nome, email, regiao_entrega) VALUES (?, ?, ?, ?)',
    );
    const inserirVendedor = this.#banco.prepare(
      'INSERT INTO vendedores (cnpj, nome_loja, email) VALUES (?, ?, ?)',
    );
    const inserirProduto = this.#banco.prepare(
      `INSERT INTO produtos (id, nome, preco, categoria, vendedor_cnpj, quantidade)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const inserirCupom = this.#banco.prepare(
      `INSERT INTO cupons (codigo, tipo, valor, validade, valor_minimo, cumulativo)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const inserirPedido = this.#banco.prepare(
      `INSERT INTO pedidos (
         id, cliente_cpf, cliente_nome, cliente_email, cliente_regiao, status,
         confirmado_em, calculo_final_json, itens_financeiros_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const inserirItem = this.#banco.prepare(
      `INSERT INTO itens_pedido (
         pedido_id, posicao, produto_id, produto_json, quantidade, preco_unitario
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const inserirCupomPedido = this.#banco.prepare(
      'INSERT INTO cupons_pedido (pedido_id, posicao, cupom_json) VALUES (?, ?, ?)',
    );
    const salvarMetadado = this.#banco.prepare(
      `INSERT INTO metadados (chave, valor) VALUES (?, ?)
       ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
    );

    this.#banco.exec('BEGIN IMMEDIATE');
    try {
      const revisaoAtual = this.#lerRevisao();
      if (revisaoAtual !== revisaoEsperada) {
        const erro = new Error('Os dados foram alterados em outra sessão.');
        erro.codigo = 'CONFLITO_PERSISTENCIA';
        throw erro;
      }

      this.#banco.exec(`
        DELETE FROM itens_pedido;
        DELETE FROM cupons_pedido;
        DELETE FROM pedidos;
        DELETE FROM produtos;
        DELETE FROM cupons;
        DELETE FROM clientes;
        DELETE FROM vendedores;
      `);

      estado.clientes.forEach(({ cpf, nome, email, regiaoEntrega }) =>
        inserirCliente.run(cpf, nome, email, regiaoEntrega),
      );
      estado.vendedores.forEach(({ cnpj, nomeLoja, email }) =>
        inserirVendedor.run(cnpj, nomeLoja, email),
      );
      estado.produtos.forEach(
        ({ id, nome, preco, categoria, vendedorCnpj, quantidade }) =>
          inserirProduto.run(
            id,
            nome,
            preco,
            categoria,
            vendedorCnpj,
            quantidade,
          ),
      );
      estado.cupons.forEach(
        ({ codigo, tipo, valor, validade, valorMinimo, cumulativo }) =>
          inserirCupom.run(
            codigo,
            tipo,
            valor,
            validadeIso(validade),
            valorMinimo,
            Number(cumulativo),
          ),
      );
      estado.pedidos.forEach((pedido) => {
        inserirPedido.run(
          pedido.id,
          pedido.cliente.cpf,
          pedido.cliente.nome,
          pedido.cliente.email,
          pedido.cliente.regiaoEntrega,
          pedido.status,
          pedido.confirmadoEm,
          pedido.calculoFinal ? JSON.stringify(pedido.calculoFinal) : null,
          pedido.itensFinanceiros
            ? JSON.stringify(pedido.itensFinanceiros)
            : null,
        );
        pedido.itens.forEach((item, posicao) =>
          inserirItem.run(
            pedido.id,
            posicao,
            item.produtoId,
            JSON.stringify(item.produto),
            item.quantidade,
            item.precoUnitario,
          ),
        );
        pedido.cupons.forEach((cupom, posicao) =>
          inserirCupomPedido.run(pedido.id, posicao, JSON.stringify(cupom)),
        );
      });

      salvarMetadado.run('estado_inicializado', '1');
      salvarMetadado.run(
        'proximo_produto_id',
        String(estado.sequencias.proximoProdutoId),
      );
      salvarMetadado.run(
        'proximo_pedido_id',
        String(estado.sequencias.proximoPedidoId),
      );
      salvarMetadado.run('revisao_estado', String(revisaoAtual + 1));
      this.#banco.exec('COMMIT');
      return revisaoAtual + 1;
    } catch (erro) {
      this.#banco.exec('ROLLBACK');
      throw erro;
    }
  }

  fechar() {
    this.#banco.close();
  }
}
