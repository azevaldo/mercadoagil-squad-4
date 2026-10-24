export const clientes = [
  {
    nome: 'Maria Santos',
    email: 'maria.santos@example.com',
    cpf: '529.982.247-25',
    regiaoEntrega: 'Nordeste',
  },
  {
    nome: 'Joao Lima',
    email: 'joao.lima@example.com',
    cpf: '111.444.777-35',
    regiaoEntrega: 'Sul',
  },
  {
    nome: 'Ana Costa',
    email: 'ana.costa@example.com',
    cpf: '123.456.789-09',
    regiaoEntrega: 'Sudeste',
  },
];

export const vendedores = [
  {
    nomeLoja: 'TechBahia',
    cnpj: '11.222.333/0001-81',
    email: 'contato@techbahia.example.com',
  },
  {
    nomeLoja: 'Livraria Sol',
    cnpj: '45.723.174/0001-10',
    email: 'contato@livrariasol.example.com',
  },
  {
    nomeLoja: 'Casa Verde',
    cnpj: '04.252.011/0001-10',
    email: 'contato@casaverde.example.com',
  },
];

export const produtos = [
  {
    id: 1,
    nome: 'Mouse',
    preco: 120,
    categoria: 'eletronicos',
    quantidade: 10,
    vendedorCnpj: '11.222.333/0001-81',
  },
  {
    id: 2,
    nome: 'Livro de JavaScript',
    preco: 80,
    categoria: 'livros',
    quantidade: 8,
    vendedorCnpj: '45.723.174/0001-10',
  },
  {
    id: 3,
    nome: 'Teclado Mecânico',
    preco: 250,
    categoria: 'eletronicos',
    quantidade: 5,
    vendedorCnpj: '11.222.333/0001-81',
  },
  {
    id: 4,
    nome: 'Fone Bluetooth',
    preco: 180,
    categoria: 'eletronicos',
    quantidade: 7,
    vendedorCnpj: '11.222.333/0001-81',
  },
  {
    id: 5,
    nome: 'Livro de Algoritmos',
    preco: 95,
    categoria: 'livros',
    quantidade: 6,
    vendedorCnpj: '45.723.174/0001-10',
  },
  {
    id: 6,
    nome: 'Café Especial',
    preco: 28,
    categoria: 'alimentos',
    quantidade: 20,
    vendedorCnpj: '04.252.011/0001-10',
  },
  {
    id: 7,
    nome: 'Camiseta de Algodão',
    preco: 59.9,
    categoria: 'vestuario',
    quantidade: 12,
    vendedorCnpj: '04.252.011/0001-10',
  },
  {
    id: 8,
    nome: 'Caneca de Cerâmica',
    preco: 35,
    categoria: 'casa',
    quantidade: 15,
    vendedorCnpj: '04.252.011/0001-10',
  },
];

export const cupons = [
  {
    codigo: 'BEMVINDO10',
    tipo: 'percentual',
    valor: 10,
    validade: new Date('2030-12-31T23:59:59.999-03:00'),
    valorMinimo: 100,
    cumulativo: true,
  },

  {
    codigo: 'PDA15',
    tipo: 'fixo',
    valor: 15,
    validade: new Date('2030-12-31T23:59:59.999-03:00'),
    valorMinimo: 150,
    cumulativo: true,
  },
  {
    codigo: 'FRETEZERO',
    tipo: 'frete',
    valor: 0,
    validade: new Date('2030-12-31T23:59:59.999-03:00'),
    valorMinimo: 0,
    cumulativo: false,
  },
];

export const dadosIniciais = { clientes, vendedores, produtos, cupons };
