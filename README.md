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

O menu organiza as operações em **Pedidos, Clientes, Vendedores, Produtos, Cupons e Relatórios**.

- Use **↑ / ↓** para navegar e **Enter** para abrir uma opção.
- Digite para buscar opções ou filtrar registros, sem diferenciar acentos e maiúsculas.
- Nas listagens, o painel à direita mostra os detalhes do registro selecionado. Em terminais estreitos, pressione **Enter** para ver os detalhes.
- Pressione **Esc** para voltar ou cancelar um formulário. Na tela inicial, **Esc** encerra o sistema; **Ctrl+C** encerra de qualquer tela.
- Resultados e relatórios permanecem na tela até **Enter** ou **Esc**. Use **↑ / ↓** ou **Page Up / Page Down** para rolar.

O layout acompanha o tamanho do terminal. Sem terminal interativo (ou com `TERM=dumb`), o sistema oferece opções numeradas: `0` volta ou sai, e `/voltar` cancela um formulário. A variável `NO_COLOR=1` desativa as cores. Não é necessário instalar `fzf` ou outras ferramentas.

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
  cli/       Menu e interação pelo terminal
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
