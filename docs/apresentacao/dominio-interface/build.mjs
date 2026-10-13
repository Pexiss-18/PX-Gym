// Monta docs/apresentacao/apresentacao-dominio-interface.html a partir dos
// arquivos NN-*.slides desta pasta. Reaproveita o <head> e o CSS do deck
// anterior (../_part1.html) e resolve, direto no código-fonte do repositório:
//
//   {{r core/domain/x.ts :: trecho :: rótulo}}   -> chip "arquivo:linha"
//   {{code core/domain/x.ts :: de :: até :: destaque ;; destaque :: small}}
//                                                -> bloco com o código real
//
// "trecho" é um pedaço literal de uma linha do arquivo. Se não existir, o
// build falha: nenhuma referência do slide aponta pra código que não está lá.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1] ?? true; };

const ALIAS = { core: 'packages/core/src', mobile: 'apps/mobile/src', db: 'packages/db/src', raiz: '.' };
const problems = [];
const report = [];
// (--report lista os trechos; --avisos lista as linhas cortadas)
let currentSlide = 0;

// ---------- fonte ----------
const files = new Map();
function source(alias) {
  if (!files.has(alias)) {
    const [head, ...rest] = alias.split('/');
    if (!(head in ALIAS)) throw new Error(`alias desconhecido em "${alias}"`);
    const real = join(root, ALIAS[head], ...rest);
    files.set(alias, readFileSync(real, 'utf8').split(/\r?\n/));
  }
  return files.get(alias);
}

/** Índice (base 0) da linha que contém o trecho; "trecho#2" = segunda ocorrência. */
function find(alias, needle, from = 0) {
  const ls = source(alias);
  let nth = 1;
  const m = needle.match(/^(.*)#(\d+)$/s);
  if (m) { needle = m[1]; nth = Number(m[2]); }
  for (let i = from; i < ls.length; i++) {
    if (ls[i].includes(needle) && --nth === 0) return i;
  }
  throw new Error(`slide ${currentSlide}: "${needle}" não encontrado em ${alias}`);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function pathHtml(alias) {
  const cut = alias.lastIndexOf('/') + 1;
  return `<u>${esc(alias.slice(0, cut))}</u><b>${esc(alias.slice(cut))}</b>`;
}

// ---------- chip de referência ----------
function ref(raw, short = false) {
  const [alias, needle, label] = raw.split(' :: ').map((s) => s.trim());
  let line = '';
  if (needle) line = `<i>:${find(alias, needle) + 1}</i>`;
  else source(alias);
  // curto: só o nome do arquivo (usado em tabelas onde a pasta já está dita)
  const path = short ? `<b>${esc(alias.slice(alias.lastIndexOf('/') + 1))}</b>` : pathHtml(alias);
  return `<span class="ref" title="${esc(alias)}">${path}${line}${label ? `<em>${esc(label)}</em>` : ''}</span>`;
}

// ---------- realce ----------
const KW = new Set(('abstract as async await break case catch class const continue default delete do else enum export extends '
  + 'false finally for from function get if implements import in instanceof interface let new null of private protected public '
  + 'readonly return set static super switch this throw true try type typeof undefined var void while yield').split(' '));

function highlight(line, state) {
  const t = line.trimStart();
  if (state.block || t.startsWith('/*') || t.startsWith('*')) {
    state.block = !t.includes('*/') && (state.block || t.startsWith('/*'));
    if (t.startsWith('*') && !state.block && !t.includes('*/')) state.block = true;
    if (t.includes('*/')) state.block = false;
    return `<u>${esc(line)}</u>`;
  }
  let out = '';
  for (let i = 0; i < line.length;) {
    const c = line[i];
    if (line.startsWith('//', i)) { out += `<u>${esc(line.slice(i))}</u>`; break; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < line.length && line[j] !== c) j += line[j] === '\\' ? 2 : 1;
      out += `<s>${esc(line.slice(i, j + 1))}</s>`;
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < line.length && /[\w$]/.test(line[j])) j++;
      const w = line.slice(i, j);
      out += KW.has(w) ? `<b>${w}</b>` : esc(w);
      i = j;
      continue;
    }
    out += esc(c);
    i++;
  }
  return out;
}

// ---------- bloco de código ----------
function code(raw) {
  const [alias, from, to = '+12', hl = '', opts = ''] = raw.split(' :: ').map((s) => s.trim());
  const ls = source(alias);
  const start = find(alias, from);
  let end;
  if (/^\+\d+$/.test(to)) end = start + Number(to.slice(1)) - 1;
  else if (to.startsWith('<')) { end = find(alias, to.slice(1), start + 1) - 1; while (ls[end].trim() === '') end--; }
  else end = find(alias, to, start + 1);
  end = Math.min(end, ls.length - 1);

  const small = /\bsmall\b/.test(opts);
  const cols = Number((opts.match(/cols=(\d+)/) || [])[1] || (small ? 90 : 86));
  const marks = hl ? hl.split(' ;; ').map((s) => s.trim()).filter(Boolean) : [];
  const slice = ls.slice(start, end + 1);
  const indent = Math.min(...slice.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  const state = { block: false };
  let widest = 0;
  const body = slice.map((full, k) => {
    let text = full.slice(indent);
    widest = Math.max(widest, text.length);
    if (text.length > cols) {
      text = text.slice(0, cols - 1) + '…';
      problems.push(`slide ${currentSlide}: linha ${start + k + 1} de ${alias} cortada (${full.slice(indent).length} > ${cols})`);
    }
    const on = marks.some((m) => full.includes(m));
    return `<span class="l${on ? ' h' : ''}"><span class="n">${start + k + 1}</span>${highlight(text, state) || ' '}</span>`;
  }).join('');
  for (const m of marks) if (!slice.some((l) => l.includes(m))) problems.push(`slide ${currentSlide}: destaque "${m}" fora do trecho de ${alias}`);
  report.push({ slide: currentSlide, arquivo: alias, linhas: `${start + 1}-${end + 1}`, n: slice.length, largura: widest });
  const range = start === end ? `L${start + 1}` : `L${start + 1}–${end + 1}`;
  return `<figure class="cb${small ? ' small' : ''}"><figcaption class="cap"><span>${pathHtml(alias)}</span><i>${range}</i></figcaption><pre>${body}</pre></figure>`;
}

const expand = (html) => html.replace(/\{\{(code|rs|r)\s+([\s\S]*?)\}\}/g, (_, kind, body) => (kind === 'code' ? code(body) : ref(body, kind === 'rs')));

// ---------- DSL de slides ----------
function compile(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('@@raw')) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('@@end')) buf.push(lines[i++]);
      i++;
      const raw = buf.join('\n');
      currentSlide += (raw.match(/<section class="slide/g) || []).length;
      out.push(expand(raw));
      continue;
    }
    if (!line.startsWith('=== ')) { i++; continue; }
    currentSlide++;
    const [sec, cls = ''] = line.slice(4).split(' :: ').map((s) => s.trim());
    let title = '', sub = '', refs = '';
    const body = [];
    i++;
    while (i < lines.length && !lines[i].startsWith('=== ') && !lines[i].startsWith('@@raw')) {
      const l = lines[i++];
      if (!title && l.startsWith('# ')) title = l.slice(2);
      else if (!sub && body.length === 0 && l.startsWith('> ')) sub = l.slice(2);
      else if (l.startsWith('@refs ')) refs = l.slice(6);
      else body.push(l);
    }
    const tight = /\btight\b/.test(cls);
    const extra = cls.replace(/\btight\b/, '').trim();
    const chips = refs
      ? `<div class="refs"><span class="lb">No código</span>${refs.split(' ;; ').map((r) => ref(r)).join('')}</div>`
      : '';
    out.push(
      `<section class="slide${extra ? ' ' + extra : ''}" data-sec="${esc(sec)}">\n`
      + `  <div class="head${tight ? ' tight' : ''}"><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>\n`
      + `  <div class="body">${expand(body.join('\n'))}${chips}</div>\n</section>`,
    );
  }
  return out.join('\n\n');
}

// ---------- montagem ----------
const font = (...p) => readFileSync(join(root, 'node_modules', 'geist', 'dist', 'fonts', ...p)).toString('base64');
const head = readFileSync(join(here, '..', '_part1.html'), 'utf8')
  .replace(/<title>[\s\S]*?<\/title>/, '<title>Px GYM — Domínio e Interface Primeiro</title>')
  .replace('</style>', readFileSync(join(here, '_extra.css'), 'utf8') + '\n</style>')
  .replace('__GEIST_SANS__', font('geist-sans', 'Geist-Variable.woff2'))
  .replace('__GEIST_MONO__', font('geist-mono', 'GeistMono-Variable.woff2'));

let tail = readFileSync(join(here, '_tail.html'), 'utf8');
if (flag('--audit')) tail = tail.replace('</body>', `<script>${readFileSync(join(here, '_audit.js'), 'utf8')}</script>
</body>`);

// Dois decks: resumo/ (o que se apresenta) e completo/ (tudo, para consulta).
const SETS = { resumo: 'apresentacao-dominio-interface.html', completo: 'apresentacao-dominio-interface-completa.html' };
const only = typeof flag('--set') === 'string' ? [flag('--set')] : Object.keys(SETS);
for (const set of only) {
  currentSlide = 0;
  const before = report.length;
  const dir = join(here, set);
  const slides = readdirSync(dir).filter((f) => f.endsWith('.slides')).sort()
    .map((f) => compile(readFileSync(join(dir, f), 'utf8'))).join('\n\n');
  const html = `${head}
${slides}
${tail}`;
  const out = typeof flag('--out') === 'string' ? flag('--out') : join(here, '..', SETS[set]);
  writeFileSync(out, html, 'utf8');
  console.log(`${set}: ${html.match(/<section class="slide/g).length} slides · ${report.length - before} trechos de código · ${(statSync(out).size / 1024).toFixed(0)} KB`);
}

if (flag('--report')) console.table(report);
if (flag('--avisos')) for (const p of problems) console.warn('aviso:', p);
