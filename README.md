# MercadoÁgil

Sistema de marketplace executado pelo terminal, desenvolvido em JavaScript e Node.js como projeto final do Módulo 1.

## Funcionalidades

- Cadastro, consulta, atualização e remoção de clientes, vendedores, produtos e cupons.
- Criação e gerenciamento de pedidos: adicionar ou remover itens, aplicar cupons, consultar resumo, confirmar e cancelar.
- Controle de estoque, cálculo de frete, descontos, tributos e comissões.
- Relatórios financeiros, com filtros por período, vendedor e cliente.
- Validação de dados e proteção de informações pessoais nas respostas do sistema.

## Requisitos

- Node.js
- npm

## Como executar

Clone o repositório, instale as dependências e inicie o menu:

```bash
git clone https://github.com/azevaldo/mercadoagil-squad-4.git
cd mercadoagil-squad-4
npm install
npm start
```

O menu organiza as operações em **Pedidos, Cadastros e Relatórios**. Em Cadastros, escolha Clientes, Vendedores, Produtos ou Cupons.

- Use **↑ / ↓** para mover a seleção e **Enter** para abrir uma categoria ou executar uma ação.
- Use **Esc** para voltar ao menu anterior; escolha **Sair** ou pressione **Ctrl+C** para encerrar.
- Listar exibe os registros no terminal. Use as ações de busca para encontrar um registro específico.
- Os campos mostram um exemplo quando disponível. Digite `/voltar` para cancelar o preenchimento atual.

Em terminais sem suporte a teclas interativas (ou com `TERM=dumb`), o menu oferece opções numeradas; `0` volta ou sai.

> Os dados iniciais são carregados de `src/data/seed.js` e mantidos em memória durante a execução. Eles não são salvos entre execuções.

## Testes e verificações

Execute os testes:

```bash
npm test
```

Verifique a formatação e o lint:

```bash
npm run check
```

Para aplicar a formatação:

```bash
npm run format
```

## Estrutura do projeto

```text
src/
  cli/       Menu, teclado, formulários e resultados do terminal
    index.js
    menu.js
    terminal.js
    formularios.js
    resultados.js
  commands/  Ações, formulários e apresentação dos resultados
  config/    Regras de negócio
  data/      Dados iniciais
  models/    Entidades do domínio
  schemas/   Validação de dados
  services/  Operações do marketplace e relatórios
  utils/     Funções auxiliares
test/        Testes automatizados
docs/        Documentação de desenvolvimento
```

## Contribuição

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para as orientações de desenvolvimento e contribuição. Os padrões técnicos do projeto estão em [docs/padroes-de-desenvolvimento.md](docs/padroes-de-desenvolvimento.md).

A divisão das responsabilidades do Marketplace está descrita em [docs/arquitetura.md](docs/arquitetura.md).
