import { Cliente } from '../../models/Cliente.js';
import {
  atualizacaoClienteSchema,
  clienteSchema,
  cpfSchema,
} from '../../schemas/clienteSchema.js';
import { sucesso, falha } from '../../utils/extra.js';
import { validar } from '../../schemas/validar.js';

const paraCliente = (cliente) => cliente.dadosPublicos();

export class ClientesService  {
  #clientes = [];

  // Consulta interna para criar pedidos sem expor a entidade pelo Marketplace.
  encontrarPorCpf(cpfNormalizado) {

     
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
    const validadoCpf=validar(cpfSchema,{cpf});
    if(!validadoCpf.ok) return validadoCpf;
    

    const cliente = this.encontrarPorCpf(validadoCpf.dados.cpf);
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

  excluirCliente(cpf,possuiPedidoAberto) {
        const validadoCpf=validar(cpfSchema,{cpf});
    if(!validadoCpf.ok) return validadoCpf;
    
    const cliente = this.encontrarPorCpf(validadoCpf.dados.cpf);


    if (!cliente) return falha(['Cliente não encontrado.']);

    if (possuiPedidoAberto(cliente)) {
    return falha([
      'Este cliente tem pedido aberto. Confirme ou cancele o pedido antes de excluir.',
    ]);
  }

    this.#clientes = this.#clientes.filter((atual) => atual !== cliente);

    return sucesso({ mensagem: 'Cliente excluído com sucesso.' });
  }
}
