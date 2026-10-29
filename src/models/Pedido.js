import {
  COMISSOES_POR_CATEGORIA,
  FRETE_GRATIS_A_PARTIR_DE,
  FRETE_POR_REGIAO,
  FRETE_POR_UNIDADE,
  LIMITE_CUPONS_POR_PEDIDO,
  TETO_DESCONTO_PERCENTUAL,
  TRIBUTOS_POR_CATEGORIA,
} from '../config/regras.js';
import { arredondarDinheiro, formatarReais } from '../utils/dinheiro.js';
import { sucesso, falha } from '../utils/extra.js';
import { Cliente } from './Cliente.js';
import { CupomDesconto } from './CupomDesconto.js';
import { Produto } from './Produto.js';
import { Vendedor } from './Vendedor.js';

const valorDoItem = ({ precoUnitario, quantidade }) =>
  precoUnitario * quantidade;

const subtotalDe = (itens) =>
  arredondarDinheiro(itens.reduce((soma, item) => soma + valorDoItem(item), 0));

export class Pedido {
  #id;
  #cliente;
  // Cada item guarda o preço do momento em que entrou no pedido
  #itens = [];
  #cupons = [];
  #status = 'aberto';
  // Congelado na confirmação: mudanças futuras de preço ou cupom não alteram o pedido
  #calculoFinal = null;
  #itensFinanceiros = null;
  #confirmadoEm = null;

  constructor(id, cliente) {
    this.#id = id;
    this.#cliente = cliente;
  }

  get id() {
    return this.#id;
  }

  get status() {
    return this.#status;
  }

  get cliente() {
    return this.#cliente;
  }

  // Cópias: quem recebe a lista não consegue alterar o pedido por fora
  get itens() {
    return this.#itens.map((item) => ({ ...item }));
  }

  get cupons() {
    return [...this.#cupons];
  }

  exportarEstado() {
    return {
      id: this.#id,
      cliente: this.#cliente.dadosPersistidos(),
      status: this.#status,
      confirmadoEm: this.#confirmadoEm?.toISOString() ?? null,
      calculoFinal: this.#calculoFinal,
      itensFinanceiros: this.#itensFinanceiros,
      itens: this.#itens.map((item) => ({
        produtoId: item.produto.id,
        produto: {
          id: item.produto.id,
          nome: item.produto.nome,
          preco: item.produto.preco,
          categoria: item.produto.categoria,
          vendedor: {
            nomeLoja: item.produto.vendedor.nomeLoja,
            cnpj: item.produto.vendedor.cnpj,
            email: item.produto.vendedor.email,
          },
        },
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
      })),
      cupons: this.#cupons.map((cupom) => ({
        codigo: cupom.codigo,
        tipo: cupom.tipo,
        valor: cupom.valor,
        validade: cupom.validade.toISOString(),
        valorMinimo: cupom.valorMinimo,
        cumulativo: cupom.cumulativo,
      })),
    };
  }

  static restaurarEstado(estado, dependencias) {
    const encerrado = estado.status !== 'aberto';
    const cliente =
      (!encerrado && dependencias.buscarCliente(estado.cliente.cpf)) ||
      new Cliente(estado.cliente);
    const pedido = new Pedido(estado.id, cliente);

    pedido.#status = estado.status;
    pedido.#confirmadoEm = estado.confirmadoEm
      ? new Date(estado.confirmadoEm)
      : null;
    pedido.#calculoFinal = estado.calculoFinal;
    pedido.#itensFinanceiros = estado.itensFinanceiros;
    pedido.#itens = estado.itens.map((item) => {
      const produtoId = item.produtoId ?? item.produto.id;
      const vendedor =
        (!encerrado &&
          dependencias.buscarVendedor(item.produto.vendedor.cnpj)) ||
        new Vendedor(item.produto.vendedor);
      const produto =
        (!encerrado && dependencias.buscarProduto(produtoId)) ||
        new Produto({ ...item.produto, vendedor });

      return {
        produto,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
      };
    });
    pedido.#cupons = estado.cupons.map(
      (dados) =>
        (!encerrado && dependencias.buscarCupom(dados.codigo)) ||
        new CupomDesconto(dados),
    );

    return pedido;
  }

  #congelarDados() {
    const dadosCliente = this.#cliente.dadosPersistidos
      ? this.#cliente.dadosPersistidos()
      : { ...this.#cliente };
    this.#cliente = new Cliente(dadosCliente);
    this.#itens = this.#itens.map((item) => {
      const { produto } = item;
      const vendedor = new Vendedor({
        nomeLoja: produto.vendedor.nomeLoja,
        cnpj: produto.vendedor.cnpj,
        email: produto.vendedor.email,
      });
      return {
        ...item,
        produto: new Produto({
          id: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          categoria: produto.categoria,
          vendedor,
        }),
      };
    });
    this.#cupons = this.#cupons.map(
      (cupom) =>
        new CupomDesconto({
          codigo: cupom.codigo,
          tipo: cupom.tipo,
          valor: cupom.valor,
          validade: cupom.validade,
          valorMinimo: cupom.valorMinimo,
          cumulativo: cupom.cumulativo,
        }),
    );
  }

  contemProduto(produtoId) {
    return this.#itens.some(({ produto }) => produto.id === produtoId);
  }

  contemCupom(codigo) {
    return this.#cupons.some((cupom) => cupom.codigo === codigo);
  }

  adicionarItem(produto, quantidade) {
    const erroEdicao = this.#erroDeEdicao();
    if (erroEdicao) return falha([erroEdicao]);

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      return falha([
        'A quantidade precisa ser um número inteiro maior que zero.',
      ]);
    }

    const novosItens = this.contemProduto(produto.id)
      ? this.#itens.map((item) =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + quantidade }
            : item,
        )
      : [...this.#itens, { produto, quantidade, precoUnitario: produto.preco }];

    return this.#trocarItens(novosItens);
  }

  removerItem(produtoId) {
    const erroEdicao = this.#erroDeEdicao();
    if (erroEdicao) return falha([erroEdicao]);

    if (!this.contemProduto(produtoId)) {
      return falha([`O produto ${produtoId} não está no pedido ${this.#id}.`]);
    }

    return this.#trocarItens(
      this.#itens.filter(({ produto }) => produto.id !== produtoId),
    );
  }

  aplicarCupom(cupom) {
    const erroEdicao = this.#erroDeEdicao();
    if (erroEdicao) return falha([erroEdicao]);

    const erros = this.#validarCupons([...this.#cupons, cupom]);
    if (erros.length > 0) return falha(erros);

    this.#cupons = [...this.#cupons, cupom];
    return sucesso({ id: this.#id, cupons: this.#cupons.map((c) => c.codigo) });
  }

  resumo() {
    const calculo = this.#calculoFinal ?? this.#calcular();

    return sucesso({
      id: this.#id,
      status: this.#status,
      cliente: this.#cliente.nome,
      itens: this.#itens.map((item) => ({
        produto: item.produto.nome,
        quantidade: item.quantidade,
        valor: arredondarDinheiro(valorDoItem(item)),
      })),
      cupons: this.#cupons.map((cupom) => cupom.codigo),
      ...calculo,
      // Só pedido confirmado gera repasse (rubrica)
      repasses:
        this.#status === 'confirmado'
          ? calculo.repasses.map(({ vendedor, bruto, comissao, repasse }) => ({
              vendedor,
              bruto,
              comissao,
              repasse,
            }))
          : [],
    });
  }

  dadosFinanceiros() {
    if (this.#status !== 'confirmado' || !this.#calculoFinal) return null;

    const { total, descontos, tributos, comissao, repasses } =
      this.#calculoFinal;

    return {
      total,
      descontos,
      tributos,
      comissao,
      confirmadoEm: new Date(this.#confirmadoEm),
      repasses: repasses.map((repasse) => ({ ...repasse })),
      itens: this.#itensFinanceiros.map((item) => ({ ...item })),
    };
  }

  confirmar(estoque) {
    if (this.#status !== 'aberto') {
      return falha([`O pedido ${this.#id} já está ${this.#status}.`]);
    }

    if (this.#itens.length === 0) {
      return falha(['Não é possível confirmar um pedido vazio.']);
    }

    // Cupons são conferidos de novo: podem ter vencido depois de aplicados
    const errosCupons = this.#validarCupons(this.#cupons);
    if (errosCupons.length > 0) return falha(errosCupons);

    // Tudo ou nada: o Estoque confere todos os itens antes de dar baixa
    const baixa = estoque.baixar(this.#itens);
    if (!baixa.ok) return baixa;

    const calculoFinal = this.#calcular();
    this.#status = 'confirmado';
    this.#calculoFinal = calculoFinal;
    this.#confirmadoEm = new Date();
    this.#itensFinanceiros = this.#itens.map((item) => ({
      produtoId: item.produto.id,
      produto: item.produto.nome,
      categoria: item.produto.categoria,
      vendedor: item.produto.vendedor.nomeLoja,
      vendedorCnpj: item.produto.vendedor.cnpj,
      quantidade: item.quantidade,
      valorBruto: arredondarDinheiro(valorDoItem(item)),
    }));
    this.#congelarDados();

    return sucesso({
      id: this.#id,
      status: this.#status,
      total: this.#calculoFinal.total,
    });
  }

  cancelar(estoque) {
    if (this.#status === 'cancelado') {
      return falha([`O pedido ${this.#id} já está cancelado.`]);
    }

    // Só devolve ao estoque se a baixa já tinha acontecido
    if (this.#status === 'confirmado') {
      estoque.devolver(this.#itens);
    }

    this.#status = 'cancelado';
    this.#congelarDados();
    return sucesso({ id: this.#id, status: this.#status });
  }

  // Só aceita mudanças enquanto o pedido estiver aberto
  #erroDeEdicao() {
    return this.#status === 'aberto'
      ? null
      : `O pedido ${this.#id} está ${this.#status} e não aceita alterações.`;
  }

  // Troca os itens só se os cupons aplicados continuam atingindo o subtotal mínimo
  #trocarItens(novosItens) {
    const subtotal = subtotalDe(novosItens);

    const erros = this.#cupons
      .filter((cupom) => !cupom.atingeMinimo(subtotal))
      .map(
        (cupom) =>
          `O cupom ${cupom.codigo} exige subtotal mínimo de ${formatarReais(cupom.valorMinimo)}. Ajuste os itens ou retire o cupom.`,
      );
    if (erros.length > 0) return falha(erros);

    this.#itens = novosItens;
    return sucesso({ id: this.#id, totalItens: this.#itens.length });
  }

  // Regras de cupom: limite, repetição, cumulatividade, validade e valor mínimo
  #validarCupons(lista, itens = this.#itens) {
    const subtotal = subtotalDe(itens);

    const codigos = lista.map((cupom) => cupom.codigo);
    const repetidos = [
      ...new Set(
        codigos.filter((codigo, indice) => codigos.indexOf(codigo) !== indice),
      ),
    ];
    const naoCumulativo = lista.find((cupom) => !cupom.cumulativo);

    const erroLimite =
      lista.length > LIMITE_CUPONS_POR_PEDIDO
        ? [`O pedido aceita no máximo ${LIMITE_CUPONS_POR_PEDIDO} cupons.`]
        : [];

    const erroRepetido = repetidos.map(
      (codigo) => `O cupom ${codigo} já está no pedido.`,
    );

    const erroCumulativo =
      lista.length > 1 && naoCumulativo
        ? [
            `O cupom ${naoCumulativo.codigo} não é cumulativo e só pode ser usado sozinho.`,
          ]
        : [];

    const errosPorCupom = lista.flatMap((cupom) => [
      ...(cupom.estaValido() ? [] : [`O cupom ${cupom.codigo} está vencido.`]),
      ...(cupom.atingeMinimo(subtotal)
        ? []
        : [
            `O cupom ${cupom.codigo} exige subtotal mínimo de ${formatarReais(cupom.valorMinimo)}.`,
          ]),
    ]);

    return [
      ...erroLimite,
      ...erroRepetido,
      ...erroCumulativo,
      ...errosPorCupom,
    ];
  }

  #calcular() {
    const subtotal = subtotalDe(this.#itens);
    const unidades = this.#itens.reduce(
      (soma, { quantidade }) => soma + quantidade,
      0,
    );

    // 1) Percentuais, em sequência sobre o restante
    const aposPercentuais = this.#cupons
      .filter((cupom) => cupom.tipo === 'percentual')
      .reduce(
        (restante, cupom) =>
          arredondarDinheiro(restante * (1 - cupom.valor / 100)),
        subtotal,
      );

    // 2) Fixos, descontando o valor em reais sem passar de zero
    const aposFixos = this.#cupons
      .filter((cupom) => cupom.tipo === 'fixo')
      .reduce(
        (restante, cupom) =>
          Math.max(0, arredondarDinheiro(restante - cupom.valor)),
        aposPercentuais,
      );

    // 3) Teto: os descontos sobre os itens nunca passam de 30% do subtotal
    const teto = arredondarDinheiro(subtotal * TETO_DESCONTO_PERCENTUAL);
    const descontos = arredondarDinheiro(Math.min(subtotal - aposFixos, teto));
    const valorComDescontos = arredondarDinheiro(subtotal - descontos);

    // 4) Frete: um só por pedido, grátis com cupom de frete ou a partir de R$ 300,00
    const temCupomFrete = this.#cupons.some((cupom) => cupom.tipo === 'frete');
    const freteGratis =
      temCupomFrete || valorComDescontos >= FRETE_GRATIS_A_PARTIR_DE;
    //  console.log(this.#cliente.,this.#cliente.regiaoEntrega)
    const frete = freteGratis
      ? 0
      : arredondarDinheiro(
          FRETE_POR_REGIAO[this.#cliente.regiaoEntrega] +
            unidades * FRETE_POR_UNIDADE,
        );

    const total = arredondarDinheiro(Math.max(0, valorComDescontos + frete));

    // Tributos e comissão são calculados sobre o valor dos itens, antes dos descontos
    const linhas = this.#itens.map((item) => {
      const { produto } = item;
      const valorBruto = valorDoItem(item);
      return {
        vendedor: produto.vendedor,
        valorBruto,
        tributo: valorBruto * TRIBUTOS_POR_CATEGORIA[produto.categoria],
        comissao: valorBruto * COMISSOES_POR_CATEGORIA[produto.categoria],
      };
    });

    const soma = (valores) =>
      valores.reduce((acumulado, valor) => acumulado + valor, 0);
    const tributos = arredondarDinheiro(
      soma(linhas.map((linha) => linha.tributo)),
    );
    const comissao = arredondarDinheiro(
      soma(linhas.map((linha) => linha.comissao)),
    );

    // Repasse por vendedor: valor bruto dos itens dele menos a comissão desses itens
    const porVendedor = linhas.reduce((acumulado, linha) => {
      const atual = acumulado[linha.vendedor.cnpj] ?? {
        vendedor: linha.vendedor.nomeLoja,
        vendedorCnpj: linha.vendedor.cnpj,
        bruto: 0,
        comissao: 0,
      };
      return {
        ...acumulado,
        [linha.vendedor.cnpj]: {
          ...atual,
          bruto: atual.bruto + linha.valorBruto,
          comissao: atual.comissao + linha.comissao,
        },
      };
    }, {});

    const repasses = Object.values(porVendedor).map((linha) => ({
      vendedor: linha.vendedor,
      vendedorCnpj: linha.vendedorCnpj,
      bruto: arredondarDinheiro(linha.bruto),
      comissao: arredondarDinheiro(linha.comissao),
      repasse: arredondarDinheiro(linha.bruto - linha.comissao),
    }));

    return { subtotal, descontos, frete, tributos, total, comissao, repasses };
  }
  removerCupom(codigo) {
    const erroEdicao = this.#erroDeEdicao();
    if (erroEdicao) return falha([erroEdicao]);

    const codigoLimpo = String(codigo ?? '')
      .trim()
      .toUpperCase();
    const cupons = this.#cupons.filter((cupom) => cupom.codigo !== codigoLimpo);
    if (cupons.length === this.#cupons.length) {
      return falha([
        `O cupom ${codigoLimpo || 'informado'} não está no pedido ${this.#id}.`,
      ]);
    }

    this.#cupons = cupons;
    return sucesso({
      id: this.#id,
      cupons: cupons.map((cupom) => cupom.codigo),
    });
  }
}
