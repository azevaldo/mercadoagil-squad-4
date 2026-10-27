import { Marketplace } from './src/services/MarketPlace.js';
import { dadosIniciais } from './src/data/seed.js';
import { iniciarMenu } from './src/cli/index.js';

const mercado = new Marketplace(dadosIniciais);
//mercado.avisos.forEach((aviso) => console.log(`! ${aviso}`));

await iniciarMenu(mercado);
