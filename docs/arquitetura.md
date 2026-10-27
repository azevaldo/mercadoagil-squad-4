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

## Persistência local

`src/data/sqlite.js` cria e acessa o banco `data/mercadoagil.sqlite`; a estrutura das tabelas está em `data/schema.sql`. O arquivo do banco é ignorado pelo Git. Na primeira execução, o seed popula as tabelas; depois, cada operação bem-sucedida salva o estado em uma transação SQLite.

O estado salvo inclui cadastros, estoque, pedidos, cupons aplicados e os valores financeiros congelados na confirmação. Assim, reabrir o sistema não altera o histórico dos pedidos.

O estado completo, incluindo CPF, fica restrito à comunicação interna com o banco. Os métodos públicos de consulta continuam devolvendo respostas sem CPF.

Cada sessão mantém uma revisão dos dados. Antes de consultar ou alterar, ela carrega mudanças de outras sessões. A gravação confere a revisão dentro da transação; se outra sessão gravar durante a operação, a alteração é recusada, os dados são atualizados e o usuário pode tentar novamente. Se uma gravação falhar, o estado em memória é restaurado para não manter uma alteração que não foi confirmada.

Pedidos confirmados ou cancelados preservam os dados de cliente, produtos e cupons que tinham quando foram encerrados, mesmo que os cadastros sejam alterados ou recriados depois.

## Regras e relatórios

As regras de itens, cupons, cálculos e transições de status continuam em `Pedido`. A movimentação de estoque continua em `Estoque`, e as taxas permanecem em `config/regras.js`.

O `RelatoriosService` solicita os pedidos confirmados ao `PedidosService`, aplica os filtros e envia seus dados financeiros para as funções de cálculo em `services/relatorios.js`. Os cálculos usam os valores congelados na confirmação.

O seed continua sendo carregado pelas operações públicas, na ordem vendedores, clientes, produtos e cupons. Falhas ficam disponíveis em `Marketplace.avisos`.

## Testes

Os testes existentes continuam usando a API pública de `Marketplace`. O arquivo `test/marketplaceIntegracao.test.js` cobre a comunicação entre os serviços, o estoque compartilhado, as consultas após mudanças nos cadastros, o isolamento entre instâncias e as falhas na carga inicial.

`test/sqlite.test.js` e `test/consistenciaPersistencia.test.js` verificam a gravação, a recuperação em caso de falha e o uso por sessões simultâneas. `test/historicoPedidos.test.js` cobre a preservação dos dados dos pedidos encerrados.
