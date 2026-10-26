import { emitKeypressEvents } from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  medidas,
  preencher,
  recortar,
  quebrarLinha,
  finalTexto,
} from './layout.js';

export class Cancelamento extends Error {}
export class Encerramento extends Error {}
export const normalizarBusca = (texto) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR');

export class Terminal {
  #interativo;
  #rl;
  #linhas;
  #caminho = [];
  #cores;
  #modoAnterior = false;

  constructor() {
    this.#interativo = Boolean(
      stdin.isTTY && stdout.isTTY && process.env.TERM !== 'dumb',
    );
    this.#cores = this.#interativo && !process.env.NO_COLOR;
    if (this.#interativo) {
      this.#modoAnterior = Boolean(stdin.isRaw);
      emitKeypressEvents(stdin, { escapeCodeTimeout: 60 });
      // O modo de leitura pertence à sessão inteira. Alterná-lo entre telas
      // deixa leituras pendentes do console Windows no modo anterior.
      stdin.setRawMode(true);
      stdout.write('\x1b[?1049h\x1b[?25l');
    } else {
      this.#rl = createInterface({ input: stdin, output: stdout });
      this.#linhas = this.#rl[Symbol.asyncIterator]();
    }
  }
  set caminho(valor) {
    this.#caminho = valor;
  }
  get #medidas() {
    return medidas(stdout.columns || 80, stdout.rows || 24);
  }
  get #largura() {
    return this.#medidas.largura;
  }
  get #altura() {
    const corpo = this.#medidas.corpo;
    return Math.max(1, corpo - (corpo >= 6 ? 3 : corpo >= 4 ? 1 : 0));
  }
  #cor(texto, codigo) {
    return this.#cores ? `\x1b[${codigo}m${texto}\x1b[0m` : texto;
  }

  #tela(titulo, linhas, rodape) {
    const largura = this.#largura;
    const borda = (linha) => this.#cor(linha, '34');
    const cabecalho = `─ MercadoÁgil${this.#caminho.length ? ` / ${this.#caminho.join(' / ')}` : ''} `;
    if (this.#medidas.minimo) {
      const linhasMinimas = [
        'Amplie o terminal',
        'Mínimo: 24 × 8',
        'Esc volta · Ctrl+C sai',
      ]
        .slice(0, Math.max(1, stdout.rows || 1))
        .map((linha) => recortar(linha, stdout.columns || 1));
      stdout.write(`\x1b[H\x1b[2J${linhasMinimas.join('\n')}`);
      return;
    }
    const conteudo = [
      borda(
        `╭${preencher(cabecalho, largura).replace(/ +$/, (espacos) => '─'.repeat(espacos.length))}╮`,
      ),
      `│${preencher(` ${titulo}`, largura)}│`,
      borda(`├${'─'.repeat(largura)}┤`),
      ...linhas.slice(0, this.#medidas.corpo).map((linha) => {
        const texto = typeof linha === 'string' ? linha : linha.texto;
        const preenchido = preencher(` ${texto}`, largura);
        const codigo =
          typeof linha === 'object' && linha.selecionada
            ? '1;36'
            : texto.startsWith('✓')
              ? '32'
              : texto.startsWith('✖') || texto.startsWith('•')
                ? '31'
                : null;
        return `│${codigo ? this.#cor(preenchido, codigo) : preenchido}│`;
      }),
      borda(`├${'─'.repeat(largura)}┤`),
      `│${preencher(` ${rodape}`, largura)}│`,
      borda(`╰${'─'.repeat(largura)}╯`),
    ];
    stdout.write(`\x1b[H\x1b[2J${conteudo.join('\n')}`);
  }

  // Cada tela possui seus listeners; o modo de leitura só muda ao entrar/sair.
  #teclas(desenhar, receber) {
    return new Promise((resolve, reject) => {
      const limpar = () => {
        stdin.removeListener('keypress', tecla);
        stdin.removeListener('end', encerrar);
        stdout.removeListener('resize', desenhar);
      };
      const concluir = (valor, erro = false) => {
        limpar();
        if (erro) reject(valor);
        else resolve(valor);
      };
      const encerrar = () => concluir(new Encerramento(), true);
      const tecla = (texto, key = {}) => {
        if (key.ctrl && key.name === 'c') return encerrar();
        if (this.#medidas.minimo && key.name !== 'escape') return;
        try {
          receber(texto, key, concluir);
        } catch (erro) {
          concluir(erro, true);
        }
      };
      stdin.on('keypress', tecla);
      stdin.once('end', encerrar);
      stdout.on('resize', desenhar);
      stdin.resume();
      desenhar();
    });
  }

  async selecionar(titulo, opcoes, { detalhes = [], voltar = 'Voltar' } = {}) {
    if (!this.#interativo) {
      console.log(`\nMercadoÁgil / ${titulo}`);
      opcoes.forEach((opcao, indice) =>
        console.log(`${indice + 1} - ${opcao.rotulo}`),
      );
      console.log(`0 - ${voltar}`);
      let resposta;
      try {
        resposta = await this.perguntar('Número ou termo de busca');
      } catch (erro) {
        if (erro instanceof Cancelamento) return null;
        throw erro;
      }
      if (resposta === '0') return null;
      const indice = Number(resposta) - 1;
      const encontrada = /^\d+$/.test(resposta)
        ? opcoes[indice]
        : opcoes.find((opcao) =>
            normalizarBusca(`${opcao.rotulo} ${opcao.busca ?? ''}`).includes(
              normalizarBusca(resposta),
            ),
          );
      if (!encontrada) {
        console.log('Opção inexistente.');
        return this.selecionar(titulo, opcoes, { detalhes, voltar });
      }
      return encontrada;
    }
    let busca = '';
    let indice = 0;
    const filtradas = () =>
      opcoes.filter((opcao) =>
        normalizarBusca(`${opcao.rotulo} ${opcao.busca ?? ''}`).includes(
          normalizarBusca(busca),
        ),
      );
    const desenhar = () => {
      const lista = filtradas();
      const selecionada = lista[indice];
      const altura = this.#altura;
      const inicio = Math.max(0, indice - altura + 1);
      const painel = selecionada?.detalhes ?? detalhes;
      const duasColunas = this.#largura >= 78;
      const esquerda = Math.floor(this.#largura * 0.46);
      const painelQuebrado = painel.flatMap((linha) =>
        quebrarLinha(linha, this.#largura - esquerda - 5),
      );
      const linhas = Array.from({ length: altura }, (_, linha) => {
        const opcao = lista[inicio + linha];
        const ativa = inicio + linha === indice;
        const texto = opcao
          ? `${ativa ? '›' : ' '} ${opcao.rotulo}`
          : linha === 0
            ? 'Nenhum resultado.'
            : '';
        return {
          texto: duasColunas
            ? `${preencher(texto, esquerda)} │ ${recortar(painelQuebrado[linha] ?? '', this.#largura - esquerda - 5)}`
            : texto,
          selecionada: Boolean(opcao && ativa),
        };
      });
      const corpo = this.#medidas.corpo;
      const metadados =
        corpo >= 6
          ? [
              `Buscar: ${busca || 'digite para filtrar'}`,
              `${lista.length} opção(ões)${lista.length ? ` · ${indice + 1}/${lista.length}` : ''}`,
              '',
            ]
          : corpo >= 4
            ? [`Buscar: ${busca || 'digite para filtrar'}`]
            : [];
      this.#tela(
        busca && corpo < 4 ? `Buscar: ${busca}` : titulo,
        [...metadados, ...linhas],
        this.#medidas.compacto
          ? '↑↓ · Enter · Esc'
          : `↑↓ navegar · Enter abrir · Esc ${voltar.toLowerCase()} · Ctrl+C sair`,
      );
    };
    return this.#teclas(desenhar, (texto, key, concluir) => {
      const lista = filtradas();
      if (key.name === 'escape') return concluir(null);
      if (texto === '/' && !busca) return;
      if (key.name === 'return') {
        if (lista[indice]) concluir(lista[indice]);
        return;
      }
      if (key.name === 'up') indice = Math.max(0, indice - 1);
      else if (key.name === 'down')
        indice = Math.min(Math.max(0, lista.length - 1), indice + 1);
      else if (key.name === 'pageup')
        indice = Math.max(0, indice - this.#altura);
      else if (key.name === 'pagedown')
        indice = Math.min(Math.max(0, lista.length - 1), indice + this.#altura);
      else if (key.name === 'backspace') {
        busca = Array.from(busca).slice(0, -1).join('');
        indice = 0;
      } else if (texto && !key.ctrl && !key.meta && !/\p{C}/u.test(texto)) {
        busca += texto;
        indice = 0;
      }
      desenhar();
    });
  }

  async perguntar(rotulo) {
    if (!this.#interativo) {
      try {
        stdout.write(`${rotulo} (/voltar para cancelar): `);
        const { value: resposta, done } = await this.#linhas.next();
        if (done) throw new Encerramento();
        if (resposta === '/voltar') throw new Cancelamento();
        return resposta.trim();
      } catch (erro) {
        if (erro instanceof Cancelamento) throw erro;
        throw new Encerramento();
      }
    }
    let valor = '';
    let inicioRotulo = 0;
    const desenhar = () => {
      const corpo = this.#medidas.corpo;
      const rotulos = quebrarLinha(rotulo, this.#largura - 2);
      const espacoRotulo = Math.max(1, corpo - (corpo >= 6 ? 4 : 1));
      inicioRotulo = Math.min(
        inicioRotulo,
        Math.max(0, rotulos.length - espacoRotulo),
      );
      const entrada = `› ${finalTexto(valor, this.#largura - 4)}▏`;
      this.#tela(
        'Preencha os dados',
        [
          ...rotulos.slice(inicioRotulo, inicioRotulo + espacoRotulo),
          ...(corpo >= 6
            ? ['', entrada, '', '↑↓ rola a pergunta · Enter confirma']
            : [entrada]),
        ],
        this.#medidas.compacto
          ? 'Enter · Esc'
          : 'Enter continuar · Backspace apagar · Esc cancelar · Ctrl+C sair',
      );
    };
    return this.#teclas(desenhar, (texto, key, concluir) => {
      if (key.name === 'escape') return concluir(new Cancelamento(), true);
      if (key.name === 'return') return concluir(valor.trim());
      if (key.name === 'up') inicioRotulo = Math.max(0, inicioRotulo - 1);
      if (key.name === 'down') inicioRotulo += 1;
      if (key.name === 'backspace')
        valor = Array.from(valor).slice(0, -1).join('');
      else if (key.ctrl && key.name === 'u') valor = '';
      else if (texto && !key.ctrl && !key.meta && !/\p{C}/u.test(texto))
        valor += texto;
      desenhar();
    });
  }

  async exibir(titulo, linhas) {
    if (!this.#interativo) {
      console.log(`\n${titulo}\n${linhas.join('\n')}`);
      return;
    }
    let inicio = 0;
    const desenhar = () => {
      const largura = Math.max(10, this.#largura - 2);
      const quebradas = linhas.flatMap((linha) => quebrarLinha(linha, largura));
      const altura = this.#medidas.corpo;
      inicio = Math.min(inicio, Math.max(0, quebradas.length - altura));
      this.#tela(
        titulo,
        quebradas.slice(inicio, inicio + altura),
        this.#medidas.compacto
          ? '↑↓ · Enter/Esc'
          : `↑↓ rolar · Enter/Esc voltar · ${inicio + 1}–${Math.min(inicio + altura, quebradas.length)}/${quebradas.length}`,
      );
      return { tamanho: quebradas.length, altura };
    };
    return this.#teclas(desenhar, (_texto, key, concluir) => {
      if (key.name === 'return' || key.name === 'escape') return concluir();
      const { tamanho, altura } = desenhar();
      if (key.name === 'up') inicio = Math.max(0, inicio - 1);
      if (key.name === 'down')
        inicio = Math.min(Math.max(0, tamanho - altura), inicio + 1);
      if (key.name === 'pageup') inicio = Math.max(0, inicio - altura);
      if (key.name === 'pagedown')
        inicio = Math.min(Math.max(0, tamanho - altura), inicio + altura);
      desenhar();
    });
  }
  fechar() {
    this.#rl?.close();
    if (this.#interativo) {
      stdin.setRawMode(this.#modoAnterior);
      stdin.pause();
      stdin.unref?.();
      stdout.write('\x1b[0m\x1b[?25h\x1b[?1049l');
    }
  }
}
