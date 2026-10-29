import { CupomDesconto } from '../../models/CupomDesconto.js';
import { cupomSchema } from '../../schemas/cupomSchema.js';
import { sucesso, falha } from '../../utils/extra.js';
import { validar } from '../../schemas/validar.js';

const paraCupom = (cupom) => ({
  codigo: cupom.codigo,
  tipo: cupom.tipo,
  valor: cupom.valor,
  valorMinimo: cupom.valorMinimo,
  validade: cupom.validade,
  cumulativo: cupom.cumulativo,
});

export class CuponsService {
  #cupons = [];

  exportarEstado() {
    return this.#cupons.map((cupom) => ({
      codigo: cupom.codigo,
      tipo: cupom.tipo,
      valor: cupom.valor,
      validade: cupom.validade.toISOString(),
      valorMinimo: cupom.valorMinimo,
      cumulativo: cupom.cumulativo,
    }));
  }

  restaurarEstado(cupons) {
    this.#cupons = cupons.map((dados) => new CupomDesconto(dados));
  }

  encontrarPorCodigo(codigo) {
    const codigoLimpo = String(codigo).trim().toUpperCase();
    return this.#cupons.find((cupom) => cupom.codigo === codigoLimpo);
  }

  cadastrarCupom(dados) {
    const validado = validar(cupomSchema, dados);
    if (!validado.ok) return validado;

    if (this.encontrarPorCodigo(validado.dados.codigo)) {
      return falha([
        `Já existe um cupom com o código ${validado.dados.codigo}.`,
      ]);
    }

    const cupom = new CupomDesconto(validado.dados);
    this.#cupons = [...this.#cupons, cupom];
    return sucesso(paraCupom(cupom));
  }

  listarCupons() {
    return sucesso(this.#cupons.map(paraCupom));
  }

  buscarCupom(codigo) {
    if (!codigo || String(codigo).trim() === '') {
      return falha(['Informe o código do cupom para realizar a busca.']);
    }

    const codigoLimpo = String(codigo).trim().toUpperCase();
    const cupom = this.encontrarPorCodigo(codigoLimpo);

    if (!cupom) {
      return falha(['Cupom não encontrado.']);
    }

    return sucesso(paraCupom(cupom));
  }

  atualizarCupom(codigo, novosDados) {
    if (
      !novosDados ||
      typeof novosDados !== 'object' ||
      Array.isArray(novosDados)
    ) {
      return falha(['Informe os dados válidos para atualizar o cupom.']);
    }

    const codigoLimpo = String(codigo).trim().toUpperCase();
    const cupom = this.encontrarPorCodigo(codigoLimpo);

    if (!cupom) {
      return falha(['Cupom não encontrado.']);
    }

    // o código não pode ser alterado
    if (
      novosDados.codigo &&
      String(novosDados.codigo).trim().toUpperCase() !== codigoLimpo
    ) {
      return falha(['O código do cupom não pode ser alterado.']);
    }

    // mesclar os dados atuais com as novas alterações mantendo o código
    const dadosParaValidar = {
      codigo: cupom.codigo,
      tipo: novosDados.tipo ?? cupom.tipo,
      valor: novosDados.valor ?? cupom.valor,
      validade: novosDados.validade ?? cupom.validade,
      valorMinimo: novosDados.valorMinimo ?? cupom.valorMinimo,
      cumulativo: novosDados.cumulativo ?? cupom.cumulativo,
    };

    // validar com o Zod via função utilitária do sistema
    const validado = validar(cupomSchema, dadosParaValidar);
    if (!validado.ok) {
      return validado;
    }

    const { tipo, valor, validade, valorMinimo, cumulativo } = validado.dados;
    cupom.atualizar({ tipo, valor, validade, valorMinimo, cumulativo });

    return sucesso(paraCupom(cupom));
  }

  // Cupom aplicado a pedido aberto não sai do catálogo: a regra chega por função injetada

  excluirCupom(codigo, possuiPedidoAberto = () => false) {
    const codigoLimpo = String(codigo ?? '')
      .trim()
      .toUpperCase();
    const indice = this.#cupons.findIndex(
      (cupomAtual) => cupomAtual.codigo === codigoLimpo,
    );

    if (indice < 0) {
      return falha(['Cupom não encontrado.']);
    }

    const cupom = this.#cupons[indice];

    if (possuiPedidoAberto(cupom.codigo)) {
      return falha([
        'Este cupom está aplicado a um pedido aberto. Retire-o do pedido antes de excluir.',
      ]);
    }

    this.#cupons = this.#cupons.filter(
      (_, indiceAtual) => indiceAtual !== indice,
    );

    return sucesso({
      codigo: codigoLimpo,
      mensagem: 'Cupom excluído com sucesso.',
    });
  }
}
