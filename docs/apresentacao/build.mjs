// Monta docs/apresentacao/apresentacao-px-gym.html a partir dos _partN.html,
// embutindo as fontes Geist em base64 para o arquivo abrir sem internet.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const parts = ['_part1', '_part2', '_part3', '_part4', '_part5', '_part6']
  .map((n) => readFileSync(join(here, n + '.html'), 'utf8'))
  .join('\n');

const font = (...p) => readFileSync(join(root, 'node_modules', 'geist', 'dist', 'fonts', ...p)).toString('base64');

const html = parts
  .replace('__GEIST_SANS__', font('geist-sans', 'Geist-Variable.woff2'))
  .replace('__GEIST_MONO__', font('geist-mono', 'GeistMono-Variable.woff2'));

const out = join(here, 'apresentacao-px-gym.html');
writeFileSync(out, html, 'utf8');
console.log(`${html.match(/<section class="slide/g).length} slides · ${(statSync(out).size / 1024).toFixed(0)} KB`);
