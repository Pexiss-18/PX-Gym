// Gera docs/apresentacao/roteiro-camera-gps.html: o roteiro de fala do deck
// "Câmera e Geolocalização salvando os dados" (apresentacao-camera-gps.html).
// Para PDF: abrir o HTML no navegador e imprimir (A4, sem cabeçalho e rodapé).
//   node docs/apresentacao/dominio-interface/roteiro/camera-gps.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');
const font = (...p) => readFileSync(join(repo, 'node_modules', 'geist', 'dist', 'fonts', ...p)).toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const A = 'Assis';
const P = 'Paulo';

/** n, seção, título, segundos, quem fala, o que falar (parágrafos), frase de passagem. */
const slides = [
  { secao: 'Abertura', titulo: 'Capa', t: 15, quem: A,
    fala: ['Bom dia. Somos Assis e Paulo, e vamos apresentar o PX Gym: como o app usa a câmera e o GPS e, principalmente, como esses dados são salvos no próprio celular.'],
    passa: 'Vamos seguir os sete pontos do roteiro.' },
  { secao: 'Abertura', titulo: 'Agenda', t: 15, quem: A,
    fala: ['Primeiro o problema e a solução, depois a arquitetura, a estratégia de testes, o domínio, o TDD na prática, os adaptadores do Expo e, por fim, como tudo é gravado no banco local.'],
    passa: 'Começando pelo problema.' },
  { secao: '1 · Abertura', titulo: 'O problema e a solução', t: 40, quem: A,
    fala: [
      'O PX Gym é um app de musculação que junta evolução corporal, carga dos treinos e metas de nutrição.',
      'O problema: as fotos de evolução ficam soltas na galeria, cada uma num tamanho, sem registro de onde foram tiradas, e na academia a internet costuma falhar.',
      'A solução: a foto é tirada dentro do app, sempre no mesmo padrão, 9:16 em 1080 por 1920. A posição do GPS vai junto, e tudo é salvo no celular na hora, mesmo sem internet.',
    ],
    passa: 'Vamos ver o caminho que uma foto faz.' },
  { secao: '1 · Abertura', titulo: 'O caminho de uma foto, do toque até o banco', t: 35, quem: A,
    fala: [
      'São cinco etapas. A tela recebe o toque. A câmera captura, recorta e comprime. O arquivo vai para a pasta permanente do app. O GPS dá a posição. E uma linha é gravada no SQLite com status pending.',
      'Dois pontos importantes: a imagem só sobe para a nuvem depois, quando houver internet, e a posição nunca sobe. E se o GPS falhar, a foto é salva do mesmo jeito.',
    ],
    passa: 'Agora, como isso está organizado no código.' },
  { secao: '2 · Arquitetura', titulo: 'Clean Architecture: quatro camadas', t: 30, quem: A,
    fala: [
      'Usamos Clean Architecture com quatro camadas: telas, adaptadores, aplicação e domínio. A dependência vai sempre para dentro.',
      'O domínio não importa nada de fora: nenhum arquivo do core importa React, Expo, Supabase ou Drizzle. É isso que permite testar as regras da câmera e do GPS sem celular.',
    ],
    passa: 'E onde exatamente aparecem a câmera e o GPS?' },
  { secao: '2 · Arquitetura', titulo: 'Onde aparecem a câmera e a geolocalização', t: 30, quem: A,
    fala: [
      'A tabela mostra a mesma funcionalidade atravessando as camadas. No domínio estão a entidade ProgressPhoto, o value object GeoPoint, a regra do enquadramento e as duas interfaces, CameraGateway e LocationGateway.',
      'Na aplicação, os casos de uso. Nos adaptadores, as implementações com Expo e SQLite. E na tela, só o preview e o botão.',
    ],
    passa: 'Com essa separação, dá para testar cada parte. Como fizemos isso?' },
  { secao: '3 · Estratégia de TDD', titulo: 'Como foi feito', t: 30, quem: A,
    fala: [
      'Câmera e GPS não existem no computador dos testes, então cada camada usa um substituto. No domínio, fakes escritos à mão, como o FakeLocation, que finge um GPS com permissão negada ou sem sinal. Nos adaptadores, o Expo simulado com jest.mock. No banco, SQLite de verdade em memória, com as mesmas migrações do celular.',
      'E o ciclo foi o do TDD: vermelho, verde, refatorar.',
    ],
    passa: 'O que esses testes garantem?' },
  { secao: '3 · Estratégia de TDD', titulo: 'Nossos testes garantem que', t: 25, quem: A,
    fala: [
      'Destaque três itens: toda foto sai em 9:16, 1080 por 1920 e 92%; sem permissão ou sem sinal a foto é salva do mesmo jeito; e o SQLite guarda e devolve a posição.',
      'São 65 testes de câmera e GPS, e 425 no projeto, todos passando.',
    ],
    passa: 'Agora vamos olhar o domínio, começando pelas interfaces.' },
  { secao: '4 · Domínio e interfaces', titulo: 'A interface da câmera: CameraGateway', t: 25, quem: A,
    fala: [
      'Este é o contrato da câmera. O domínio pede três coisas: consultar a permissão, pedir a permissão e capturar. A foto volta só com o endereço, a largura e a altura. Não tem nenhum tipo do Expo aqui.',
    ],
    passa: 'O GPS segue o mesmo princípio.' },
  { secao: '4 · Domínio e interfaces', titulo: 'A interface do GPS: LocationGateway', t: 25, quem: A,
    fala: [
      'Consultar a permissão não abre diálogo. Pedir a permissão só acontece depois de um toque da pessoa. E sem sinal, a posição lança um erro do próprio domínio, o LocationUnavailableError.',
    ],
    passa: 'Além dos contratos, o domínio tem as regras. A primeira é o formato da foto.' },
  { secao: '4 · Domínio e interfaces', titulo: 'A regra do formato da foto', t: 30, quem: A,
    fala: [
      'A decisão "toda foto é 9:16, 1080 por 1920, 92%" mora aqui, em TypeScript puro. 9:16 é o formato do Story e serve para foto de corpo inteiro.',
      'A câmera tira em 4:3, então a função recorteRetrato calcula o maior 9:16 no centro. Numa foto de 3024 por 4032 sobra 2268 por 4032. O arquivo final fica entre 300 e 500 KB.',
    ],
    passa: 'Agora o Paulo segue com a segunda regra, a da coordenada.' },
  { secao: '4 · Domínio e interfaces', titulo: 'A coordenada validada: GeoPoint', t: 15, quem: P,
    fala: ['Toda posição do sensor passa por geoPoint. Latitude fora de −90 a 90 ou longitude fora de −180 a 180 é barrada antes de entrar no domínio.'],
    passa: 'E a foto em si é a entidade ProgressPhoto.' },
  { secao: '4 · Domínio e interfaces', titulo: 'A entidade: ProgressPhoto', t: 25, quem: P,
    fala: [
      'A entidade guarda o arquivo local, o caminho na nuvem, a data, o status de envio e agora a posição, o campo location.',
      'A posição é opcional, porque a pessoa pode negar a permissão. E por privacidade ela fica só no celular.',
    ],
    passa: 'Agora vamos ver como isso foi construído com TDD.' },
  { secao: '5 · TDD na prática', titulo: 'Vermelho: o teste vem antes do código', t: 30, quem: P,
    fala: [
      'As regras começaram como testes. Aqui está o teste da foto 4:3 em pé, que espera o recorte de 2268 por 4032, e o teste que diz que com permissão a posição é gravada.',
      'Na primeira rodada eles falharam: o TypeScript respondeu que a propriedade location não existia na ProgressPhoto. Esse é o vermelho. E o nome de cada teste é a própria regra.',
    ],
    passa: 'Depois do vermelho, o código mínimo para passar.' },
  { secao: '5 · TDD na prática', titulo: 'Verde: o código mínimo', t: 30, quem: P,
    fala: [
      'Este é o método do caso de uso que pega a posição. Ele consulta a permissão, só pede se veio de um toque, e qualquer falha vira null.',
      'O try/catch existe porque um teste exigiu: se o módulo de localização der erro, a foto ainda tem que ser salva. Os 7 testes novos passaram e os 288 antigos continuaram passando.',
    ],
    passa: 'Até aqui nada conhece o Expo. Agora vamos à infraestrutura.' },
  { secao: '6 · Adaptadores Expo', titulo: 'O adaptador da câmera', t: 35, quem: P,
    fala: [
      'O CameraGatewayExpo implementa o contrato com as APIs atuais do Expo SDK 57.',
      'Ele captura com qualidade 1, sem perda. Pede ao domínio o recorte. Usa o expo-image-manipulator, na API nova que encadeia crop, resize e save, porque o manipulateAsync está obsoleto. Comprime uma única vez, em 92%, e apaga o original do cache.',
    ],
    passa: 'O GPS tem o seu adaptador também.' },
  { secao: '6 · Adaptadores Expo', titulo: 'O adaptador do GPS', t: 25, quem: P,
    fala: [
      'O LocationGatewayExpo pede localização só em primeiro plano, com precisão balanceada. Se a posição nova não sair, por exemplo dentro da academia, ele usa a última conhecida. E sempre devolve um GeoPoint validado.',
    ],
    passa: 'Esses dois adaptadores mostram a ideia central da arquitetura.' },
  { secao: '6 · Adaptadores Expo', titulo: 'A infraestrutura se adequa ao domínio', t: 20, quem: P,
    fala: [
      'O Expo entrega os dados no formato dele, e o adaptador traduz para o formato do domínio. A permissão vira concedida, negada ou bloqueada; a foto vira largura e altura; o erro do SDK vira um erro do domínio. Nada do Expo passa para dentro.',
    ],
    passa: 'E onde essas peças se juntam?' },
  { secao: '6 · Adaptadores Expo', titulo: 'Composition root', t: 15, quem: P,
    fala: ['Num único arquivo. Aqui o caso de uso recebe o GPS real do Expo. No teste, ele recebe o fake. Trocar a infraestrutura é trocar uma linha.'],
    passa: 'Por fim, como os dados ficam salvos no celular.' },
  { secao: '7 · Banco local', titulo: 'Do cache para a pasta do app', t: 25, quem: P,
    fala: [
      'A câmera entrega a foto numa pasta temporária, que o sistema pode limpar. Por isso o persistCapture move o arquivo para a pasta permanente do app, com um nome em UUID.',
      'Na tela, o disparo passa askLocation true, porque é um gesto da pessoa e pode pedir a permissão do GPS.',
    ],
    passa: 'E a linha no banco?' },
  { secao: '7 · Banco local', titulo: 'A tabela progress_photos e a migração', t: 25, quem: P,
    fala: [
      'É a tabela progress_photos no SQLite, com Drizzle sobre o expo-sqlite. Ela guarda id, usuário, caminho, data, status e agora latitude e longitude.',
      'Essas duas colunas entraram por uma migração gerada pelo Drizzle, que o app aplica ao abrir. As fotos antigas continuam válidas, sem posição.',
    ],
    passa: 'Falta só a ponte entre a entidade e a tabela.' },
  { secao: '7 · Banco local', titulo: 'O repositório', t: 20, quem: P,
    fala: [
      'O repositório transforma a entidade em linha ao salvar e a linha em entidade ao ler. Sem posição vira NULL no banco. Um teste com SQLite de verdade grava a posição e confirma que ela volta igual.',
    ],
    passa: 'Para fechar.' },
  { secao: 'Fechamento', titulo: 'O que foi entregue', t: 25, quem: P,
    fala: [
      'Entregamos a foto padronizada em 9:16, a posição gravada junto, o salvamento offline no SQLite, a posição protegida no celular e o domínio sem nenhum import de framework, com 65 testes de câmera e GPS.',
      'A ideia central: a regra mora num lugar que não conhece câmera, GPS nem banco. Por isso foi provada por teste antes, e o Expo entrou depois, obedecendo ao contrato. Obrigado.',
    ],
    passa: '' },
];

const perguntas = [
  { q: 'Por que não usar a opção de proporção do próprio expo-camera?', r: 'A propriedade ratio só funciona no Android. Recortando depois com o expo-image-manipulator, o resultado é igual no Android e no iOS, e a regra do recorte fica no domínio, testada.', ver: 'slide 16' },
  { q: 'Por que capturar em qualidade 1 e depois salvar em 92%?', r: 'Cada vez que um JPEG é salvo ele perde um pouco. Capturando sem perda e comprimindo uma única vez no final, a foto perde qualidade uma vez só.', ver: 'slide 16' },
  { q: 'E se a pessoa negar a permissão de localização?', r: 'A foto é salva normalmente, sem posição. Tem teste para isso, e também para GPS sem sinal e para erro no serviço de localização.', ver: 'slides 14 e 15' },
  { q: 'Por que a posição não vai para o Supabase?', r: 'Privacidade: a posição de uma foto de corpo pode revelar onde a pessoa mora ou treina. Ela é útil no celular, e o envio para a nuvem só leva a imagem e a data.', ver: 'slides 13 e 22' },
  { q: 'Como vocês testam a câmera sem câmera?', r: 'No domínio, a regra do recorte é uma função pura. No adaptador, o expo-camera e o expo-image-manipulator são simulados com jest.mock, e o teste confere o recorte, o tamanho e a qualidade pedidos.', ver: 'slides 7 e 16' },
  { q: 'O que acontece com as fotos antigas depois da migração?', r: 'A migração só adiciona as colunas de latitude e longitude. As fotos antigas continuam lá, com essas colunas vazias.', ver: 'slide 21' },
  { q: 'Por que o domínio define a interface e não o Expo?', r: 'Assim o domínio não depende de biblioteca nenhuma. Se o Expo mudar a API, como aconteceu com o manipulateAsync, só o adaptador muda; domínio, casos de uso e testes ficam iguais.', ver: 'slides 9, 10 e 18' },
];

const total = slides.reduce((a, s) => a + s.t, 0);
let acc = 0;
const marks = slides.map((s, i) => { const ini = acc; acc += s.t; return { ...s, n: i + 1, ini, fim: acc }; });
const secoes = [];
for (const s of marks) {
  const last = secoes.at(-1);
  if (last && last.nome === s.secao) { last.ate = s.n; last.t += s.t; last.fim = s.fim; last.quem.add(s.quem); }
  else secoes.push({ nome: s.secao, de: s.n, ate: s.n, t: s.t, ini: s.ini, fim: s.fim, quem: new Set([s.quem]) });
}

const slideHtml = (s) => `
<section class="sl">
  <div class="cab"><span class="n">${s.n}</span><h3>${esc(s.titulo)}</h3><span class="who">${s.quem}</span><span class="tm">${s.t} s · ${mmss(s.ini)} → ${mmss(s.fim)}</span></div>
  <div class="bloco fala">${s.fala.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  ${s.passa ? `<p class="pass">Passagem: “${esc(s.passa)}”</p>` : ''}
</section>`;

const css = readFileSync(join(here, 'roteiro.css'), 'utf8');
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Roteiro — PX Gym: Câmera e Geolocalização</title>
<style>
@font-face{font-family:'Geist';src:url(data:font/woff2;base64,${font('geist-sans', 'Geist-Variable.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:'Geist Mono';src:url(data:font/woff2;base64,${font('geist-mono', 'GeistMono-Variable.woff2')}) format('woff2');font-weight:100 900}
${css}
.sl .cab{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.sl .cab .n{font-family:'Geist Mono',monospace;font-weight:700;color:#5b8a00;min-width:22px}
.sl .cab h3{margin:0;flex:1 1 auto}
.sl .cab .who{font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;background:#eef6dc;color:#3d5c00}
.sl .cab .tm{font-family:'Geist Mono',monospace;font-size:12px;color:#666}
.sl .pass{margin:6px 0 0;font-size:13px;color:#555;font-style:italic}
.sec{margin:26px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5b8a00;font-weight:700}
</style></head><body>
<div class="capa">
  <div class="mk"><i></i>PX Gym</div>
  <h1>Roteiro de apresentação</h1>
  <div class="r"></div>
  <p>Câmera e Geolocalização salvando os dados. O que falar em cada um dos ${slides.length} slides do deck <b>apresentacao-camera-gps.html</b>, em cerca de ${Math.round(total / 60)} minutos.</p>
  <div class="pe">Assis Damasceno · Paulo Rogério · 2026</div>
</div>

<h1 class="parte" style="break-before:auto">Antes de apresentar</h1>
<h2>A mensagem em uma frase</h2>
<div class="caixa v"><p><b>A regra de negócio mora num lugar que não conhece câmera, GPS nem banco. Por isso ela foi provada por teste antes, e o Expo entrou depois, obedecendo ao contrato que o domínio definiu.</b></p></div>
<p>Se der branco em algum momento, volte para essa frase. Todo slide é uma evidência dela.</p>

<h2>Divisão e tempo</h2>
<p><b>Assis</b> apresenta do slide 1 ao 11 (problema, arquitetura, testes, interfaces e a regra do formato da foto) e <b>Paulo</b> do 12 ao 23 (coordenada, entidade, TDD na prática, adaptadores e banco). A troca acontece no fim do slide 11, com a frase de passagem.</p>
<table>
  <thead><tr><th>Seção</th><th class="c">Slides</th><th class="c">Quem</th><th class="c">Duração</th><th class="c">No relógio</th></tr></thead>
  <tbody>${secoes.map((s) => `<tr><td>${esc(s.nome)}</td><td class="c">${s.de === s.ate ? s.de : `${s.de}–${s.ate}`}</td><td class="c">${[...s.quem].join(' e ')}</td><td class="c">${mmss(s.t)}</td><td class="c">${mmss(s.ini)} → ${mmss(s.fim)}</td></tr>`).join('')}
  <tr class="tot"><td>Total</td><td class="c">1–${slides.length}</td><td></td><td class="c">${mmss(total)}</td><td></td></tr></tbody>
</table>
<div class="caixa">
  <h4>Se o tempo apertar</h4>
  <p>Passe com uma frase só pelos slides 2 (agenda), 12 (GeoPoint), 18 (tabela de tradução) e 19 (composition root). Os que não podem ser cortados são o 4 (o caminho da foto), o 11 (a regra 9:16), o 14 e o 15 (TDD na prática), o 16 (adaptador da câmera) e o 21 (a tabela no SQLite).</p>
</div>

<h2>Checklist do dia</h2>
<ul class="chk">
  <li>Abrir <code>docs/apresentacao/apresentacao-camera-gps.html</code> no navegador, no slide 1, em tela cheia (tecla F).</li>
  <li>Passar os slides uma vez no projetor e ver se o código está legível do fundo da sala.</li>
  <li>Ter o app aberto no celular, se for mostrar a câmera funcionando, fora do modo de demonstração.</li>
  <li>Cronômetro à vista. Setas avançam e voltam; a tecla O mostra todos os slides.</li>
</ul>

<h1 class="parte">Slide a slide</h1>
<p class="lead">O texto é um resumo do que falar, não para ler em voz alta: entenda a ideia e diga com suas palavras. A frase de passagem ajuda a emendar com o próximo slide.</p>
${marks.map((s, i) => (i === 0 || marks[i - 1].secao !== s.secao ? `<div class="sec">${esc(s.secao)}</div>` : '') + slideHtml(s)).join('\n')}

<h1 class="parte">Perguntas prováveis</h1>
${perguntas.map((q) => `<div class="bloco qa"><div class="q"><p class="qq">${esc(q.q)}</p><p>${esc(q.r)}</p><p class="ver">Onde mostrar: ${esc(q.ver)}</p></div></div>`).join('\n')}
</body></html>`;

const out = join(repo, 'docs', 'apresentacao', 'roteiro-camera-gps.html');
writeFileSync(out, html, 'utf8');
console.log(`roteiro: ${slides.length} slides · ${mmss(total)} · ${out}`);
