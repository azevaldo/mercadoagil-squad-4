# Contribuindo com o MercadoÁgil

Este guia explica como preparar o ambiente e enviar alterações para o projeto. Para regras de arquitetura, validação, estilo e testes, consulte também [docs/padroes-de-desenvolvimento.md](docs/padroes-de-desenvolvimento.md).

## Preparar o ambiente

Instale Node.js e npm, clone o repositório e instale as dependências:

```bash
git clone https://github.com/azevaldo/mercadoagil-squad-4.git
cd mercadoagil-squad-4
npm install
```

Inicie o menu do terminal com:

```bash
npm start
```

## Trabalhar em uma alteração

Crie uma branch a partir da `dev` para cada tarefa. Use nomes curtos e descritivos, por exemplo:

```text
feature/pedro-busca-cliente
fix/validacao-cupom
docs/guia-de-contribuicao
```

Mantenha cada alteração focada em uma tarefa. Antes de concluir, rode os testes e as verificações de código disponíveis:

```bash
npm test
npm run format:check
npm run lint
```

Se a formatação falhar, aplique-a com `npm run format`. Não inclua `node_modules`, arquivos `.env`, credenciais ou artefatos locais nos commits.

## Commits e integração

Faça commits pequenos, com mensagens que indiquem o tipo e o objetivo da alteração. Exemplos:

```text
feat: adiciona busca de vendedores
fix: corrige validação de cupom
test: cobre criação de pedido
docs: adiciona guia de contribuição
```

O fluxo usado pelo squad é abrir um Pull Request da branch de tarefa para `dev`, explicar a mudança e os testes executados e pedir revisão de outro integrante. Se o squad combinar uma integração direta para uma tarefa, confirme primeiro a branch de destino e envie apenas os arquivos daquela tarefa.

## Antes de enviar

- [ ] A alteração segue os requisitos do projeto e os padrões de desenvolvimento.
- [ ] `npm test` passou; se houver falhas conhecidas fora da alteração, elas estão descritas.
- [ ] Formatação e lint foram verificados.
- [ ] O commit não inclui segredos, dependências instaladas ou arquivos locais.
- [ ] A descrição explica o que mudou e como foi verificado.
