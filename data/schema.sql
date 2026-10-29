PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS metadados (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clientes (
  cpf TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  regiao_entrega TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendedores (
  cnpj TEXT PRIMARY KEY,
  nome_loja TEXT NOT NULL,
  email TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  preco REAL NOT NULL,
  categoria TEXT NOT NULL,
  vendedor_cnpj TEXT NOT NULL REFERENCES vendedores(cnpj) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL CHECK (quantidade >= 0)
);

CREATE TABLE IF NOT EXISTS cupons (
  codigo TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  valor REAL NOT NULL,
  validade TEXT NOT NULL,
  valor_minimo REAL NOT NULL,
  cumulativo INTEGER NOT NULL CHECK (cumulativo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY,
  cliente_cpf TEXT NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  cliente_regiao TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('aberto', 'confirmado', 'cancelado')),
  confirmado_em TEXT,
  calculo_final_json TEXT,
  itens_financeiros_json TEXT
);

CREATE TABLE IF NOT EXISTS itens_pedido (
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  posicao INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  produto_json TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario REAL NOT NULL,
  PRIMARY KEY (pedido_id, posicao)
);

CREATE TABLE IF NOT EXISTS cupons_pedido (
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  posicao INTEGER NOT NULL,
  cupom_json TEXT NOT NULL,
  PRIMARY KEY (pedido_id, posicao)
);
