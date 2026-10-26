import { Cliente } from '../../models/Cliente.js';
import {
  atualizacaoClienteSchema,
  clienteSchema,
} from '../../schemas/clienteSchema.js';
import { sucesso, falha } from '../../utils/extra.js';
import { validar } from '../../schemas/validar.js';

const paraCliente = (cliente) => cliente.dadosPublicos();

export class ClientesService {
  #clientes = [];

  // Consulta interna para criar pedidos sem expor a entidade pelo Marketplace.
  encontrarPorCpf(cpf) {
    const cpfNormalizado = String(cpf).replace(/\D/g, '');
    return this.#clientes.find((cliente) => cliente.possuiCpf(cpfNormalizado));
  }

  cadastrarCliente(dados) {
    const validado = validar(clienteSchema, dados);
    if (!validado.ok) return validado;

    if (this.encontrarPorCpf(validado.dados.cpf)) {
      return falha(['Já existe um cliente com este CPF.']);
    }

    const cliente = new Cliente(validado.dados);
    this.#clientes = [...this.#clientes, cliente];
    return sucesso(paraCliente(cliente));
  }

  listarClientes() {
    return sucesso(this.#clientes.map(paraCliente));
  }

  atualizarCliente(cpf, dados) {
    const cliente = this.encontrarPorCpf(cpf);
    if (!cliente) return falha(['Cliente não encontrado.']);

    const validado = validar(atualizacaoClienteSchema, dados);
    if (!validado.ok) return validado;

    cliente.atualizarDados(validado.dados);
    return sucesso(paraCliente(cliente));
  }

  buscarCliente(termo) {
    const busca = String(termo ?? '').trim();
    if (!busca) return falha(['Informe um CPF ou nome para buscar.']);

    const cpfNormalizado = busca.replace(/\D/g, '');
    const nomeNormalizado = busca
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('pt-BR');

    const clientesEncontrados = this.#clientes.filter((cliente) => {
      const nomeCliente = cliente.nome
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLocaleLowerCase('pt-BR');

      return (
        (cpfNormalizado.length === 11 && cliente.possuiCpf(cpfNormalizado)) ||
        nomeCliente.includes(nomeNormalizado)
      );
    });

    if (clientesEncontrados.length === 0) {
      return falha(['Cliente não encontrado.']);
    }

    return sucesso(clientesEncontrados.map(paraCliente));
  }

  excluirCliente(cpf) {
    const cliente = this.encontrarPorCpf(cpf);
    if (!cliente) return falha(['Cliente não encontrado.']);

    // TODO: impedir a exclusão quando houver pedidos associados ao cliente.
    this.#clientes = this.#clientes.filter((atual) => atual !== cliente);

    return sucesso({ mensagem: 'Cliente excluído com sucesso.' });
  }
}
