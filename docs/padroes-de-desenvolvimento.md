# Padrões de desenvolvimento do MercadoÁgil

**Proposta inicial para revisão e aprovação do Squad 4**  
Projeto final do Módulo 1 - JavaScript e Node.js

## 1. Objetivo e escopo

Este guia combina práticas simples para organizar o código do microsserviço de pedidos do MercadoÁgil. A ideia é ajudar cada integrante a encontrar os arquivos, entender onde cada regra deve ficar e integrar contribuições com um estilo consistente.

Este documento cobre organização do código, nomes, validação, respostas, dinheiro, listas, privacidade e testes. O fluxo de branches, commits e pull requests fica no documento de boas práticas de Git e GitHub do Irlan, para não duplicar orientações.

Este é um documento de proposta. O squad deve revisar e ajustar os acordos antes de tratá-los como padrão oficial. Em caso de conflito, prevalecem a rubrica e os requisitos do projeto.

## 2. Organização dos arquivos

Cada arquivo deve ter uma responsabilidade fácil de explicar. A estrutura planejada é:

```text
src/
  models/    Classes de domínio, como Cliente, Pedido e Estoque
  schemas/   Schemas Zod e helper de validação
  services/  Marketplace e relatórios
  config/    Taxas, alíquotas, comissões, limites e regiões
  utils/     Funções reutilizáveis, como arredondamento de dinheiro
  data/      Seed com dados iniciais
  cli/       Menu, leitura do teclado e exibição de respostas
```

Uma camada chama a próxima. A interface não deve tomar decisões de negócio:

- **Models** representam as entidades e protegem seu estado.
- **Schemas** validam e normalizam dados que chegam do usuário ou do seed.
- **Marketplace** oferece as operações públicas e coordena as regras do serviço.
- **CLI** coleta opções, chama o Marketplace e apresenta o resultado.
- **Config** concentra valores de negócio em vez de espalhá-los pelos arquivos.
- **Utils** reúne funções genéricas compartilhadas, sem regras específicas de uma entidade.

O menu não deve calcular frete, decidir se um pedido pode ser confirmado nem alterar estoque diretamente.

## 3. Nomes, formatação e módulos

Nomes claros ajudam mais do que comentários longos. Prefira palavras em português para conceitos do domínio e mantenha o mesmo idioma em nomes relacionados.

| Elemento | Convenção | Exemplo |
| --- | --- | --- |
| Classe e arquivo da classe | `PascalCase` | `Pedido` em `Pedido.js` |
| Variável e método | `camelCase`; métodos começam com verbo | `subtotal`, `calcularFrete()` |
| Schema | Nome da entidade seguido de `Schema` | `clienteSchema.js` |
| Constante de configuração | `MAIUSCULAS_COM_UNDERSCORE` | `TETO_DESCONTO` |
| Booleano | Nome que indique uma condição | `estaValido`, `podeCancelar` |

### Formatação

- Use dois espaços para indentação, ponto e vírgula e aspas simples em JavaScript, seguindo o estilo dos exemplos já existentes no repositório.
- Use `const` por padrão. Use `let` quando precisar reatribuir. Não use `var`.
- Separe blocos de lógica com linhas em branco e quebre expressões longas quando isso melhorar a leitura.
- Comentários devem explicar o motivo de uma regra de negócio, não repetir o que a linha já diz.
- Se o squad adotar Prettier, mantenha sua configuração no repositório para todos obterem a mesma formatação.

### Módulos

O projeto usa `"type": "module"`. Mantenha `import` e `export`, sem misturar com `require` e `module.exports`. Inclua a extensão `.js` nos caminhos relativos e exporte explicitamente o que outros arquivos precisam usar.

```js
// src/services/Marketplace.js
import { Pedido } from '../models/Pedido.js';

export class Marketplace {
  // operações do serviço
}
```

Antes de criar um nome ou padrão novo, procure um exemplo equivalente no projeto e siga-o.

## 4. Classes, validação e respostas

Cada parte deve ter uma responsabilidade fácil de explicar. A lógica de negócio não deve ficar misturada no menu.

- Classes representam entidades e protegem seu estado. Mudanças importantes devem acontecer por métodos próprios, como `confirmar()` e `cancelar()`.
- O estoque deve mudar por métodos do Estoque; o status do pedido deve mudar por métodos do Pedido.
- Schemas validam e normalizam entradas. As mensagens devem ser específicas e em português.
- Falhas esperadas, como CPF inválido ou estoque insuficiente, devem ser devolvidas como respostas, sem derrubar o programa.

Trate tudo que veio do teclado como dado ainda não confiável. Use `safeParse` para validar sem interromper o fluxo:

```js
const resultado = clienteSchema.safeParse(entrada);

if (!resultado.success) {
  return {
    ok: false,
    erros: resultado.error.issues.map((item) => item.message),
  };
}

return { ok: true, dados: resultado.data };
```

Os métodos públicos do Marketplace devem responder de forma consistente:

```js
// Sucesso
{ ok: true, dados: { id: 7, total: 193 } }

// Falha esperada
{ ok: false, erros: ['Estoque insuficiente: Mouse'] }
```

Não use exceções para o fluxo normal de validação. A CLI deve exibir as mensagens recebidas e continuar funcionando após uma opção ou entrada inválida.

## 5. Listas, cópias e privacidade

Use o método de array que descreve a intenção. Isso facilita a leitura e atende aos requisitos do projeto.

| Intenção | Método | Exemplo |
| --- | --- | --- |
| Encontrar um item | `find` | Produto por ID |
| Encontrar uma posição | `findIndex` | Índice de um cupom |
| Selecionar itens | `filter` | Pedidos confirmados |
| Transformar itens | `map` | Resumos para exibição |
| Somar ou agrupar | `reduce` | Faturamento por categoria |

```js
const confirmados = pedidos.filter(
  ({ status }) => status === 'confirmado',
);

const faturamento = confirmados.reduce(
  (total, pedido) => total + pedido.total,
  0,
);
```

Prefira criar resultados novos a alterar silenciosamente a lista original. Spread cria uma cópia rasa: objetos aninhados ainda podem ser compartilhados. Evite modificar objetos recebidos; quando precisar mudar uma estrutura, crie explicitamente o novo array ou objeto.

Siga a rubrica: use `map`, `filter`, `find`, `findIndex` e `reduce` para processar listas. Não use `for` ou `while` para percorrer dados; o laço que mantém o menu aberto pode usar `while`.

### LGPD e dados de cliente

O CPF não deve aparecer em listagem, resumo, relatório ou mensagem de erro. Para uma resposta pública, remova o campo e mostre apenas a máscara prevista. Não imprima objetos completos de cliente no terminal de depuração.

```js
const { cpf, ...clienteSeguro } = cliente;
return { ...clienteSeguro, cpf: mascararCpf(cpf) };
```

## 6. Regras do negócio e valores

Números que representam políticas do marketplace devem ter uma única fonte. Concentre em `src/config/regras.js`:

- taxas de frete por região e valor por unidade;
- limite para frete grátis;
- alíquotas e comissões por categoria;
- teto de desconto e máximo de cupons.

O Pedido e os relatórios consultam essas configurações. Não copie percentuais e taxas para vários arquivos.

### Dinheiro

- Use as funções compartilhadas de `dinheiro.js` para arredondar valores e formatar reais.
- Mantenha valores numéricos durante os cálculos. `R$ 1.234,50` é uma representação para exibição; não some strings formatadas.
- Aplique o arredondamento nos pontos definidos pelo grupo e mantenha duas casas no resumo e nos relatórios.
- `toFixed()` devolve texto. Não o use como se fosse um número nem corrija diferenças de centavos com arredondamentos improvisados em vários arquivos.
- Para exibir moeda, `Intl.NumberFormat` pode aplicar o padrão brasileiro.

```js
const formatadorReais = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

formatadorReais.format(1234.5); // 'R$ 1.234,50'
```

O menu mostra valores já formatados e mensagens claras. Ele não deve duplicar cálculos do Pedido ou do Marketplace. Uma opção inválida deve mostrar um aviso e permitir que o menu continue.

Use o pedido de referência da rubrica para conferir mudanças em cupom, frete, comissão e repasse: subtotal de R$ 200, descontos de R$ 35, frete de R$ 28 e total de R$ 193.

## 7. Testes e checklist de conclusão

Escreva ou atualize testes para a regra que mudou. Para cada fluxo importante, cubra um caso válido e pelo menos um caso de erro ou limite.

- **Pedido:** pedido vazio; confirmação com estoque suficiente; confirmação com vários itens em falta sem baixa parcial.
- **Cupons:** vencido; abaixo do mínimo; repetido; não cumulativo; limite de dois; teto de 30%.
- **Frete e dinheiro:** regiões diferentes; frete grátis; arredondamento; pedido de referência.
- **Privacidade:** respostas e listagens nunca expõem o CPF completo.
- **Relatórios:** somente pedidos confirmados entram nos totais.

Uma tarefa está pronta quando:

- o código está no módulo certo;
- dados inválidos retornam erro legível no formato combinado;
- a regra e seus casos limite têm teste ou verificação manual clara;
- o programa inicia e continua após uma opção inválida;
- nenhuma saída mostra CPF completo;
- nomes, formatação e mensagens seguem este guia.

## 8. Fontes para estudar

- [MDN - Módulos JavaScript (pt-BR)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Guide/Modules): importar, exportar e dividir arquivos.
- [Node.js - ECMAScript modules](https://nodejs.org/api/esm.html): como Node interpreta `package.json` e `import`/`export`.
- [MDN - Classes JavaScript (pt-BR)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Classes): classes, métodos e instâncias.
- [MDN - Arrays (pt-BR)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Guide/Indexed_collections): `map`, `filter` e `reduce`.
- [MDN - Spread (pt-BR)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Operators/Spread_syntax): cópias e suas limitações.
- [Zod - Uso básico e `safeParse`](https://zod.dev/basics#handling-errors): validar entradas sem interromper o fluxo.
- [MDN - `Intl.NumberFormat` (pt-BR)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat): formatação de moeda e números.
- [Node.js - Test runner](https://nodejs.org/api/test.html): testes com `node:test`.
- [Prettier - Configuração](https://prettier.io/docs/configuration): configurar formatação compartilhada, caso o grupo adote a ferramenta.

Referências consultadas em 23/10/2026. Este guia não substitui a rubrica. Em caso de conflito, sigam os requisitos do projeto e decidam em conjunto.
