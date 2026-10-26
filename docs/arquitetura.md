# Organização do Marketplace

O menu chama apenas os métodos públicos de `src/services/MarketPlace.js`. Essa classe conecta os serviços, carrega o seed e preserva as respostas `{ ok, dados }` e `{ ok, erros }`.

As operações ficam em `src/services/marketplace/`:

| Serviço | Responsabilidade |
| --- | --- |
| `ClientesService` | Cadastro, validação, busca, atualização e exclusão de clientes; respostas sem CPF. |
| `VendedoresService` | Operações de vendedores e consulta dos produtos vinculados antes de excluir. |
| `ProdutosService` | Operações de produtos, geração dos IDs e atualização do estoque do catálogo. |
| `CuponsService` | Operações de cupons e consulta por código normalizado. |
| `PedidosService` | Criação dos pedidos, geração dos IDs e coordenação de itens, cupons, confirmação e cancelamento. |
| `RelatoriosService` | Validação dos filtros e seleção dos pedidos confirmados para os relatórios. |

## Estado e dependências

Cada serviço mantém sua coleção em um campo privado. Cada instância de `Marketplace` cria seus próprios serviços e um único `Estoque`, compartilhado por produtos e pedidos. Não há coleções ou contadores globais.

As consultas entre serviços são passadas pelo construtor como funções. Por exemplo, pedidos recebem consultas de cliente, produto e cupom; vendedores recebem uma consulta para saber se ainda possuem produtos. As consultas acessam o estado atual, inclusive após novos cadastros ou exclusões.

Essas consultas internas podem retornar entidades para outro serviço. Os serviços permanecem privados no `Marketplace`, que devolve à CLI apenas as respostas públicas existentes.

## Regras e relatórios

As regras de itens, cupons, cálculos e transições de status continuam em `Pedido`. A movimentação de estoque continua em `Estoque`, e as taxas permanecem em `config/regras.js`.

O `RelatoriosService` solicita os pedidos confirmados ao `PedidosService`, aplica os filtros e envia seus dados financeiros para as funções de cálculo em `services/relatorios.js`. Os cálculos usam os valores congelados na confirmação.

O seed continua sendo carregado pelas operações públicas, na ordem vendedores, clientes, produtos e cupons. Falhas ficam disponíveis em `Marketplace.avisos`.

## Testes

Os testes existentes continuam usando a API pública de `Marketplace`. O arquivo `test/marketplaceIntegracao.test.js` cobre a comunicação entre os serviços, o estoque compartilhado, as consultas após mudanças nos cadastros, o isolamento entre instâncias e as falhas na carga inicial.
