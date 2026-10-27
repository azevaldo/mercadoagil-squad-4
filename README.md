# MercadoÁgil

Sistema de marketplace executado pelo terminal, desenvolvido em JavaScript e Node.js como projeto final do Módulo 1.

## Funcionalidades

- Cadastro, consulta, atualização e remoção de clientes, vendedores, produtos e cupons.
- Criação e gerenciamento de pedidos: adicionar ou remover itens, aplicar cupons, consultar resumo, confirmar e cancelar.
- Controle de estoque, cálculo de frete, descontos, tributos e comissões.
- Relatórios financeiros, com filtros por período, vendedor e cliente.
- Validação de dados e proteção de informações pessoais nas respostas do sistema.

## Requisitos

- Node.js 24.15 ou superior
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
- Cada campo mostra uma orientação e um exemplo. **Enter** valida o campo antes de avançar; se houver erro, corrija o valor sem preencher novamente os campos anteriores. **Ctrl+U** limpa o campo atual.
- Cada área e ação explica sua finalidade. Pressione **?** para ler a explicação completa sem executar a operação; **Esc** retorna à mesma seleção e busca.
- Nas listagens, o painel à direita mostra os detalhes do registro selecionado. Em terminais estreitos, pressione **Enter** para ver os detalhes.
- Pressione **Esc** para voltar ou cancelar um formulário. Na tela inicial, **Esc** encerra o sistema; **Ctrl+C** encerra de qualquer tela.
- Resultados e relatórios permanecem na tela até **Enter** ou **Esc**. Use **↑ / ↓** ou **Page Up / Page Down** para rolar.

O layout usa a largura e a altura atuais do terminal e se reorganiza ao redimensionar a janela, preservando a busca e o formulário. Em janelas baixas, a lista acompanha a seleção e os resultados podem ser rolados. O tamanho mínimo é 24 colunas por 8 linhas; abaixo disso, amplie a janela para continuar. Use **↑ / ↓** para ler perguntas longas em formulários compactos. Sem terminal interativo (ou com `TERM=dumb`), o sistema oferece opções numeradas: `0` volta ou sai, e `/voltar` cancela um formulário. A variável `NO_COLOR=1` desativa as cores. Não é necessário instalar `fzf` ou outras ferramentas.

Na primeira execução, o sistema carrega os dados de exemplo de `src/data/seed.js` e cria o banco local `data/mercadoagil.sqlite`. Os cadastros, pedidos e alterações de estoque ficam salvos para a próxima execução. O arquivo do banco é local e não é enviado ao GitHub.

Para voltar aos dados iniciais, feche o programa e apague `data/mercadoagil.sqlite`. O banco será criado novamente na próxima execução.

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
  data/      Dados iniciais e acesso ao SQLite
  models/    Entidades do domínio
  schemas/   Validação de dados
  services/  Operações do marketplace e relatórios
  utils/     Funções auxiliares
data/
  schema.sql Estrutura das tabelas SQLite
test/        Testes automatizados
docs/        Documentação de desenvolvimento
```

## Contribuição

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para as orientações de desenvolvimento e contribuição. Os padrões técnicos do projeto estão em [docs/padroes-de-desenvolvimento.md](docs/padroes-de-desenvolvimento.md).

A divisão das responsabilidades do Marketplace está descrita em [docs/arquitetura.md](docs/arquitetura.md).
