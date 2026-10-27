// Gera roteiro.html (fonte do PDF docs/apresentacao/roteiro-dominio-interface.pdf).
// Depois: abrir roteiro.html no Edge/Chrome e imprimir em PDF (A4, sem cabeçalho e rodapé do navegador).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { slides } from './slides.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');
const font = (...p) => readFileSync(join(repo, 'node_modules', 'geist', 'dist', 'fonts', ...p)).toString('base64');
const thumb = (n) => readFileSync(join(here, 'thumbs', String(n).padStart(3, '0') + '.jpg')).toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const total = slides.reduce((a, s) => a + s.t, 0);
let acc = 0;
const marks = slides.map((s) => { const ini = acc; acc += s.t; return { ...s, ini, fim: acc }; });
const secoes = [];
for (const s of marks) {
  const last = secoes[secoes.length - 1];
  if (last && last.nome === s.secao) { last.fim = s.fim; last.ate = s.n; last.t += s.t; }
  else secoes.push({ nome: s.secao, de: s.n, ate: s.n, ini: s.ini, fim: s.fim, t: s.t });
}

const slideHtml = (s) => `
<section class="sl">
  <div class="slh">
    <img src="data:image/jpeg;base64,${thumb(s.n)}" alt="">
    <div class="meta">
      <div class="num">Slide ${s.n} <span>de ${slides.length}</span></div>
      <h3>${esc(s.titulo)}</h3>
      <div class="tempo"><b>${s.t} s</b> · no relógio: ${mmss(s.ini)} → ${mmss(s.fim)}</div>
      <p class="obj"><b>Objetivo.</b> ${esc(s.objetivo)}</p>
    </div>
  </div>
  <div class="bloco fala"><h4>O que falar</h4>${s.fala.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  <div class="duo">
    <div class="bloco"><h4>Onde apontar</h4><ul>${s.apontar.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>
    <div class="bloco"><h4>Se o tempo estiver curto</h4><p>${esc(s.curto)}</p>${s.transicao ? `<h4 style="margin-top:9px">Frase de passagem</h4><p class="pass">“${esc(s.transicao)}”</p>` : ''}</div>
  </div>
  ${s.perguntas.length ? `<div class="bloco qa"><h4>Perguntas que podem vir aqui</h4>${s.perguntas.map((q) => `<div class="q"><p class="qq">${esc(q.q)}</p><p>${esc(q.r)}</p><p class="ver">Onde mostrar: ${esc(q.ver)}</p></div>`).join('')}</div>` : ''}
</section>`;

const front = readFileSync(join(here, 'frente.html'), 'utf8')
  .replace('__TOTAL__', `${Math.round(total / 60)} minutos`)
  .replace('__TABELA_TEMPO__', secoes.map((s) => `<tr><td>${esc(s.nome)}</td><td class="c">${s.de === s.ate ? s.de : `${s.de}–${s.ate}`}</td><td class="c">${mmss(s.t)}</td><td class="c">${mmss(s.ini)} → ${mmss(s.fim)}</td></tr>`).join('')
    + `<tr class="tot"><td>Total</td><td class="c">1–${slides.length}</td><td class="c">${mmss(total)}</td><td></td></tr>`);
const back = readFileSync(join(here, 'fundo.html'), 'utf8');

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Roteiro de apresentação — Domínio e Interface Primeiro</title>
<style>
@font-face{font-family:'Geist';src:url(data:font/woff2;base64,${font('geist-sans', 'Geist-Variable.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:'Geist Mono';src:url(data:font/woff2;base64,${font('geist-mono', 'GeistMono-Variable.woff2')}) format('woff2');font-weight:100 900}
${readFileSync(join(here, 'roteiro.css'), 'utf8')}
</style></head><body>
${front}
<h1 class="parte">Parte 2 — Roteiro slide a slide</h1>
<p class="lead">Cada bloco traz a miniatura do slide, o tempo, o que falar, onde apontar e as perguntas que podem surgir naquele ponto. O texto de “o que falar” é para ser estudado, não lido: entenda a ideia de cada parágrafo e diga com as suas palavras.</p>
${marks.map(slideHtml).join('\n')}
${back}
</body></html>`;
writeFileSync(join(here, 'roteiro.html'), html, 'utf8');
console.log('ok', (html.length / 1024).toFixed(0), 'KB ·', mmss(total), 'de fala');
