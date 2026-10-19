// Monta docs/apresentacao/apresentacao-sintec.html (II SINTEC 2026) a partir de
// slides.html. Reaproveita o <head> e o CSS de ../_part1.html e o script de
// navegação de ../dominio-interface/_tail.html, e embute em base64 as fontes,
// os logos do evento (logos/) e os prints do app (prints/NN-nome.png|jpg).
//
//   {{icon nome}}                    -> ícone SVG traçado
//   {{shelf}}                        -> faixa de realização e apoio do template
//   {{print 01-inicio :: Título :: legenda}}
//                                    -> celular com prints/01-inicio.*; sem o
//                                       arquivo, mostra o espaço reservado
//
// node docs/apresentacao/sintec/build.mjs [--audit]
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const audit = process.argv.includes('--audit');

const b64 = (p) => readFileSync(p).toString('base64');
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const dataUri = (p) => `data:${MIME[p.split('.').pop().toLowerCase()]};base64,${b64(p)}`;

// ---------- ícones (traço 2, mesmo desenho do Lucide usado no app) ----------
const VOLT = 'oklch(0.87 0.23 126)';
const svg = (d, stroke = VOLT, w = 2) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const DUMBBELL = 'M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11';
const ICONS = {
  'dumbbell-ink': svg(DUMBBELL, 'oklch(0.2 0.008 264)', 2.4),
  dumbbell: svg(DUMBBELL),
  'wifi-off': svg('M12 20h.01M8.5 16.43a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 4.17-2.65M10.66 5c4.01-.36 8.14.9 11.34 3.76M16.85 11.25a10 10 0 0 1 2.22 1.68M5 13a10 10 0 0 1 5.24-2.76M2 2l20 20'),
  trend: svg('M22 7l-8.5 8.5-5-5L2 17M16 7h6v6'),
  spark: svg('M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 3v4M21 5h-4'),
  pin: svg('M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'),
  image: svg('M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21', 'oklch(0.62 0.012 264)', 1.6),
};

// ---------- logos do template do SINTEC ----------
const logo = (file, alt, cls = '') =>
  `<img src="${dataUri(join(here, 'logos', file))}" alt="${alt}"${cls ? ` class="${cls}"` : ''}>`;
const SHELF = `<div class="shelf">
    ${logo('sintec.jpg', 'SINTEC', 'sintec')}
    <span class="div"></span>
    <div class="grp"><span class="lbl">Realização</span>
      ${logo('cefet-mg.png', 'CEFET-MG Campus Varginha')}
      ${logo('bsi.png', 'Bacharelado em Sistemas de Informação', 'lg')}
      ${logo('site.png', 'SITE: Semana de Inovação, Tecnologia e Empreendedorismo')}
    </div>
    <span class="div"></span>
    <div class="grp"><span class="lbl">Apoio</span>
      ${logo('sebrae.png', 'Sebrae')}
      ${logo('trens-de.png', 'Trens Dê, criações diversas em 3D', 'sm')}
      ${logo('nascente.png', 'Nascente, incubadora de empresas do CEFET-MG', 'sm')}
      ${logo('dedc.png', 'Diretoria de Extensão e Desenvolvimento Comunitário', 'lg')}
      ${logo('porto-inovacao.png', 'Porto Inovação', 'lg')}
    </div>
  </div>`;

// ---------- prints do app ----------
const missing = [];
function print(body) {
  const [name, title, caption] = body.split(' :: ').map((s) => s.trim());
  const file = ['png', 'jpg', 'jpeg', 'webp'].map((e) => join(here, 'prints', `${name}.${e}`)).find(existsSync);
  if (!file) missing.push(name);
  const screen = file
    ? `<img src="${dataUri(file)}" alt="Tela ${title} do Px GYM">`
    : `<div class="empty">${ICONS.image}<span>prints/${name}.png</span></div>`;
  return `<figure class="phone"><div class="frame"><div class="screen">${screen}</div></div>`
    + `<figcaption><b>${title}</b><span>${caption}</span></figcaption></figure>`;
}

const slides = readFileSync(join(here, 'slides.html'), 'utf8')
  .replace(/\{\{icon ([\w-]+)\}\}/g, (_, n) => {
    if (!ICONS[n]) throw new Error(`ícone desconhecido: ${n}`);
    return ICONS[n];
  })
  .replaceAll('{{shelf}}', SHELF)
  .replace(/\{\{print ([\s\S]*?)\}\}/g, (_, b) => print(b));

// ---------- montagem ----------
const font = (...p) => readFileSync(join(root, 'node_modules', 'geist', 'dist', 'fonts', ...p)).toString('base64');
const head = readFileSync(join(here, '..', '_part1.html'), 'utf8')
  .replace(/<title>[\s\S]*?<\/title>/, '<title>Px GYM — II SINTEC 2026</title>')
  .replace('</style>', readFileSync(join(here, '_extra.css'), 'utf8') + '\n</style>')
  .replace('__GEIST_SANS__', font('geist-sans', 'Geist-Variable.woff2'))
  .replace('__GEIST_MONO__', font('geist-mono', 'GeistMono-Variable.woff2'));

let tail = readFileSync(join(here, '..', 'dominio-interface', '_tail.html'), 'utf8')
  .replace('Px GYM &nbsp;·&nbsp; Domínio e Interface Primeiro', 'Px GYM &nbsp;·&nbsp; II SINTEC 2026');
if (audit) tail = tail.replace('</body>', `<script>${readFileSync(join(here, '..', 'dominio-interface', '_audit.js'), 'utf8')}</script>\n</body>`);

const html = `${head}\n${slides}\n${tail}`;
const out = join(here, '..', 'apresentacao-sintec.html');
writeFileSync(out, html, 'utf8');
console.log(`${html.match(/<section class="slide/g).length} slides · ${(statSync(out).size / 1024).toFixed(0)} KB`);
if (missing.length) console.log(`prints faltando (${missing.length}): ${missing.join(', ')}`);
