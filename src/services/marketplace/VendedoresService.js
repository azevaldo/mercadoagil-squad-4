import { Vendedor } from '../../models/Vendedor.js';
import {
  atualizacaoVendedorSchema,
  vendedorSchema,cnpjSchema,
} from '../../schemas/vendedorSchema.js';
import { sucesso, falha } from '../../utils/extra.js';
import { validar } from '../../schemas/validar.js';

const paraVendedor = (vendedor) => ({
  nomeLoja: vendedor.nomeLoja,
  cnpj: vendedor.cnpj,
  email: vendedor.email,
});

export class VendedoresService {
  #vendedores = [];
  #possuiProdutos;

  constructor({ possuiProdutos }) {
    this.#possuiProdutos = possuiProdutos;
  }

  encontrarPorCnpj(cnpj) {
    return this.#vendedores.find((vendedor) => vendedor.possuiCnpj(cnpj));
  }

  cadastrarVendedor(dados) {
    const validado = validar(vendedorSchema, dados);
    if (!validado.ok) return validado;

    if (this.encontrarPorCnpj(validado.dados.cnpj)) {
      return falha(['Já existe um vendedor com este CNPJ.']);
    }

    const vendedor = new Vendedor(validado.dados);
    this.#vendedores = [...this.#vendedores, vendedor];
    return sucesso(paraVendedor(vendedor));
  }

  listarVendedores() {
    return sucesso(this.#vendedores.map(paraVendedor));
  }

  atualizarVendedor(cnpj, dados) {
    
    const cnpjValidar=validar(cnpjSchema,cnpj);
    if(!cnpjValidar.ok) return cnpjValidar


    const vendedor = this.encontrarPorCnpj(cnpjValidar.dados.cnpj);

    if (!vendedor) return falha(['Vendedor não encontrado.']);

    const validado = validar(atualizacaoVendedorSchema, dados);
    if (!validado.ok) return validado;

    vendedor.atualizarDados(validado.dados);
    return sucesso(paraVendedor(vendedor));
  }

  buscarVendedor(termo) {
    const busca = String(termo ?? '').trim();
    if (!busca) return falha(['Informe um CNPJ ou nome para buscar.']);

    const cnpj = busca.replace(/\D/g, '');
    const nomeBusca = busca
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('pt-BR');

    const encontrados = this.#vendedores.filter((vendedor) => {
      const nome = vendedor.nomeLoja
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLocaleLowerCase('pt-BR');

      return (
        (cnpj.length === 14 && vendedor.possuiCnpj(cnpj)) ||
        nome.includes(nomeBusca)
      );
    });

    return encontrados.length
      ? sucesso(encontrados.map(paraVendedor))
      : falha(['Vendedor não encontrado.']);
  }

  excluirVendedor(cnpj) {
    
    const cnpjValidar=validar(cnpjSchema,cnpj);
    if(!cnpjValidar.ok) return cnpjValidar

    const vendedor = this.encontrarPorCnpj(cnpjValidar.dados.cnpj);

    if (!vendedor) return falha(['Vendedor não encontrado.']);

    const possuiProdutos = this.#possuiProdutos(vendedor.cnpj);

    if (possuiProdutos) {
      return falha([
        'Este vendedor possui produtos cadastrados e não pode ser excluído.',
      ]);
    }

    this.#vendedores = this.#vendedores.filter((atual) => atual !== vendedor);

    return sucesso({ mensagem: 'Vendedor excluído com sucesso.' });
  }
}
