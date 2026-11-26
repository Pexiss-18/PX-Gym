#!/usr/bin/env node
/**
 * Gera docs/projeto-mobile.html a partir de docs/projeto-mobile.md, no
 * design do documento entregue na disciplina, e opcionalmente o PDF.
 *
 *   node docs/build-projeto.mjs          → só o HTML
 *   node docs/build-projeto.mjs --pdf    → HTML + "Px GYM - Documento de Projeto.pdf"
 *                                          (Edge ou Chrome em modo headless)
 *
 * Sem dependências: o conversor de Markdown abaixo cobre só o que o
 * documento usa (títulos, parágrafos, listas, tabelas, blocos de código,
 * citações e as figuras). Convenções do .md:
 *
 *   - O que vem antes do primeiro "## " vira a capa: título, slogan em
 *     negrito, tabela de metadados, citação (resumo) e o sumário.
 *   - "## N · Título" abre uma folha; a linha "*(…)*" logo abaixo é o
 *     subtítulo da seção no .md e some no HTML; o primeiro parágrafo vira
 *     o "lead".
 *   - "<!-- figura-svg: nome -->" antes de um bloco ```text troca o desenho
 *     ASCII pelo SVG em docs/projeto-mobile/nome.svg; o parágrafo
 *     "*Figura N — …*" logo depois vira a legenda.
 *   - Bloco ```text sem marcador vira árvore (.tree) com os comentários
 *     alinhados à direita em cinza.
 *   - "> **Título.** texto" vira a caixa de nota.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const DOCS = dirname(fileURLToPath(import.meta.url));
const MD = join(DOCS, "projeto-mobile.md");
const HTML = join(DOCS, "projeto-mobile.html");
const PDF = join(DOCS, "Px GYM - Documento de Projeto.pdf");
const PASTA = join(DOCS, "projeto-mobile");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Negrito, itálico, código e links, nessa ordem; código não é tocado. */
function inline(texto) {
  const partes = texto.split(/(`[^`]+`)/g);
  return partes
    .map((p) => {
      if (p.startsWith("`") && p.endsWith("`") && p.length > 1) return `<code>${esc(p.slice(1, -1))}</code>`;
      let h = esc(p);
      h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, url) => (url.startsWith("#") ? t : `<a href="${url}">${t}</a>`));
      h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      h = h.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>");
      return h;
    })
    .join("")
    .replace(/&lt;br&gt;/g, "<br>");
}

/** Célula da coluna "Offline": vira o selo colorido. */
function selo(texto) {
  const t = texto.replace(/\*\*/g, "").trim();
  const chave = t.toLowerCase();
  if (chave === "sim") return `<span class="yes">sim</span>`;
  if (chave === "não") return `<span class="no">não</span>`;
  return `<span class="part">${esc(chave)}</span>`;
}

function celulas(linha) {
  return linha.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

function tabela(linhas) {
  const cab = celulas(linhas[0]);
  const corpo = linhas.slice(2).map(celulas);
  const colOffline = cab.findIndex((c) => /^offline$/i.test(c));
  // coluna em que toda célula é só `código` vira monoespaçada
  const mono = cab.map((_, i) => corpo.length > 0 && corpo.every((l) => /^`[^`]+`$/.test(l[i] ?? "")));
  const th = cab
    .map((c, i) => `<th${mono[i] ? ' class="mono col-mid"' : i === 0 && cab.length > 2 ? ' class="col-narrow"' : ""}>${inline(c)}</th>`)
    .join("");
  const trs = corpo
    .map((l) => {
      const tds = l
        .map((c, i) => {
          if (i === colOffline) return `<td>${selo(c)}</td>`;
          if (mono[i]) return `<td class="mono">${esc(c.slice(1, -1))}</td>`;
          return `<td>${inline(c)}</td>`;
        })
        .join("");
      return `        <tr>${tds}</tr>`;
    })
    .join("\n");
  return `  <div class="table-wrap">\n    <table>\n      <thead><tr>${th}</tr></thead>\n      <tbody>\n${trs}\n      </tbody>\n    </table>\n  </div>`;
}

/** Árvore de diretórios/rotas: nomes de layout em destaque, comentário em cinza. */
function arvore(codigo) {
  return codigo
    .split("\n")
    .map((linha) => {
      const m = /^(.*?[^\s│├└─])( {2,})(\S.*)$/.exec(linha);
      const realca = (s) => esc(s).replace(/([\w()[\]/.-]*_layout\.tsx|^[\w-]+\/$)/g, '<span class="k">$1</span>');
      if (!m || /^[\s│]*$/.test(m[1])) {
        // linha só com o comentário (continuação) ou sem comentário
        const c = /^([\s│]*)(\S.*)$/.exec(linha);
        if (c && /^[\s│]{6,}$/.test(c[1]) && !/[├└]/.test(linha) && !/\.\w+$/.test(c[2])) {
          return `${c[1]}<span class="c">${esc(c[2])}</span>`;
        }
        return realca(linha);
      }
      return `${realca(m[1])}${m[2]}<span class="c">${esc(m[3])}</span>`;
    })
    .join("\n");
}

/** Código com comentários (// ou --) em cinza. */
function codigoRealcado(codigo) {
  return codigo
    .split("\n")
    .map((linha) => {
      const m = /^(.*?)(\/\/.*|--.*)$/.exec(linha);
      if (m && !/["'].*(\/\/|--).*["']/.test(m[1] + m[2].slice(0, 2))) return `${esc(m[1])}<span class="c">${esc(m[2])}</span>`;
      return esc(linha);
    })
    .join("\n");
}

function blocos(md) {
  const linhas = md.replace(/\r\n/g, "\n").split("\n");
  const saida = [];
  let i = 0;
  let svgPendente = null;
  let figuraAberta = false;
  let leadPendente = false;

  const fecharFigura = (legenda) => {
    if (!figuraAberta) return;
    if (legenda) saida.push(`    <figcaption>${legenda}</figcaption>`);
    saida.push("  </figure>");
    figuraAberta = false;
  };

  while (i < linhas.length) {
    const l = linhas[i];

    if (/^\s*$/.test(l) || l === "---") {
      i++;
      continue;
    }

    const marcador = /^<!--\s*figura-svg:\s*([\w-]+)\s*-->$/.exec(l.trim());
    if (marcador) {
      svgPendente = marcador[1];
      i++;
      continue;
    }

    if (l.startsWith("```")) {
      const lang = l.slice(3).trim();
      const corpo = [];
      i++;
      while (i < linhas.length && !linhas[i].startsWith("```")) corpo.push(linhas[i++]);
      i++;
      const codigo = corpo.join("\n");
      if (svgPendente) {
        const arquivo = join(PASTA, `${svgPendente}.svg`);
        if (!existsSync(arquivo)) throw new Error(`Figura não encontrada: ${arquivo}`);
        saida.push("  <figure>", readFileSync(arquivo, "utf8").trimEnd());
        figuraAberta = true;
        svgPendente = null;
      } else if (lang === "text") {
        saida.push("  <figure>", `<div class="tree">${arvore(codigo)}</div>`);
        figuraAberta = true;
      } else {
        saida.push(`  <pre class="code">${codigoRealcado(codigo)}</pre>`);
      }
      continue;
    }

    const legenda = /^\*Figura (\d+) — (.*)\*$/.exec(l.trim());
    if (legenda) {
      fecharFigura(`<b>Figura ${legenda[1]}.</b> ${inline(legenda[2])}`);
      i++;
      continue;
    }
    fecharFigura(null);

    const titulo = /^(#{2,4}) (.*)$/.exec(l);
    if (titulo) {
      const nivel = titulo[1].length;
      if (nivel === 2) {
        const m = /^(\d+) · (.*)$/.exec(titulo[2]);
        saida.push("</section>", "", `<!-- ============================ ${m ? m[1] : ""} ============================ -->`, '<section class="sheet">');
        saida.push(m ? `  <h2><span class="n">${m[1].padStart(2, "0")}</span> ${inline(m[2])}</h2>` : `  <h2>${inline(titulo[2])}</h2>`);
        leadPendente = true;
        i++;
        // "*(Expo Router)*" logo abaixo do título é só marcação do .md
        while (i < linhas.length && /^\s*$/.test(linhas[i])) i++;
        if (/^\*\(.*\)\*$/.test(linhas[i]?.trim() ?? "")) i++;
        continue;
      }
      saida.push(`  <h${nivel}>${inline(titulo[2])}</h${nivel}>`);
      leadPendente = false;
      i++;
      continue;
    }

    if (l.startsWith("|")) {
      const t = [];
      while (i < linhas.length && linhas[i].startsWith("|")) t.push(linhas[i++]);
      saida.push(tabela(t));
      leadPendente = false;
      continue;
    }

    if (l.startsWith(">")) {
      const p = [];
      while (i < linhas.length && linhas[i].startsWith(">")) p.push(linhas[i++].replace(/^>\s?/, ""));
      const texto = inline(p.join(" ")).replace(/^<strong>([^<]+)<\/strong>/, "<b>$1</b>");
      saida.push(`  <div class="note">\n    <p>${texto}</p>\n  </div>`);
      leadPendente = false;
      continue;
    }

    if (/^(- |\d+\. )/.test(l)) {
      const ordenada = /^\d+\. /.test(l);
      const itens = [];
      while (i < linhas.length && /^(- |\d+\. )/.test(linhas[i])) {
        let item = linhas[i++].replace(/^(- |\d+\. )/, "");
        while (i < linhas.length && /^ {2,}\S/.test(linhas[i])) item += " " + linhas[i++].trim();
        itens.push(`    <li>${inline(item)}</li>`);
      }
      const tag = ordenada ? 'ol class="steps"' : "ul";
      saida.push(`  <${tag}>\n${itens.join("\n")}\n  </${ordenada ? "ol" : "ul"}>`);
      leadPendente = false;
      continue;
    }

    const p = [];
    while (i < linhas.length && !/^\s*$/.test(linhas[i]) && !/^(#|\||>|```|- |\d+\. |<!--)/.test(linhas[i])) p.push(linhas[i++]);
    saida.push(`  <p${leadPendente ? ' class="lead"' : ""}>${inline(p.join(" "))}</p>`);
    leadPendente = false;
  }
  fecharFigura(null);
  return saida.join("\n");
}

function capa(md) {
  const linhas = md.replace(/\r\n/g, "\n").split("\n");
  const titulo = linhas.find((l) => l.startsWith("# ")).slice(2);
  const slogan = (linhas.find((l) => /^\*\*.*\*\*$/.test(l.trim())) ?? "").replace(/\*\*/g, "");
  const meta = linhas
    .filter((l) => /^\| \*\*/.test(l))
    .map((l) => {
      const [dt, dd] = celulas(l);
      const tecnico = /Stack|Backend/.test(dt);
      const valor = dd.split(" · ");
      const html = tecnico
        ? valor.reduce((acc, v, k) => acc + (k === 0 ? "" : k % 3 === 0 ? "<br>" : " · ") + esc(v), "")
        : dt.includes("Autores")
          ? valor.map(esc).join("<br>")
          : inline(dd);
      return `    <div>\n      <dt>${dt.replace(/\*\*/g, "")}</dt>\n      <dd${tecnico ? ' class="mono"' : ""}>${html}</dd>\n    </div>`;
    })
    .join("\n");
  const resumo = linhas.filter((l) => l.startsWith("> ")).map((l) => l.slice(2)).join(" ");
  const sumario = linhas
    .filter((l) => /^\d+\. \[/.test(l))
    .map((l) => {
      const texto = /\[([^\]]+)\]/.exec(l)[1];
      const [nome, sub] = texto.split(" · ");
      return `      <li>${esc(nome)}${sub ? ` <span>· ${esc(sub)}</span>` : ""}</li>`;
    })
    .join("\n");
  const [px, ...resto] = titulo.split(" — ")[0].split(" ");
  return `<!-- ============================ COVER ============================ -->
<section class="sheet cover">
  <h1 class="wordmark">${esc(px)} <span class="gym">${esc(resto.join(" "))}</span></h1>

  <p class="tagline">${inline(slogan)}</p>

  <dl class="meta">
${meta}
  </dl>

  <div class="abstract">
    <p>${inline(resumo)}</p>
  </div>

  <nav class="toc">
    <ol>
${sumario}
    </ol>
  </nav>
`;
}

function gerarHtml() {
  const md = readFileSync(MD, "utf8");
  const corte = md.search(/^## /m);
  const cabecalho = readFileSync(join(PASTA, "cabecalho.html"), "utf8").trimEnd();
  const corpo = blocos(md.slice(corte));
  return [
    "<!doctype html>",
    '<html lang="pt-BR">',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<!-- Gerado por docs/build-projeto.mjs a partir de docs/projeto-mobile.md. Não edite à mão. -->",
    cabecalho,
    "",
    capa(md.slice(0, corte)) + corpo,
    "</section>",
    "</html>",
    "",
  ].join("\n");
}

function navegador() {
  const candidatos = [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  const achado = candidatos.find((c) => existsSync(c));
  if (!achado) throw new Error("Edge ou Chrome não encontrado para gerar o PDF.");
  return achado;
}

writeFileSync(HTML, gerarHtml());
console.log(`HTML: ${HTML}`);

if (process.argv.includes("--pdf")) {
  execFileSync(navegador(), [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--virtual-time-budget=10000",
    `--print-to-pdf=${PDF}`,
    pathToFileURL(HTML).href,
  ], { stdio: "inherit" });
  console.log(`PDF: ${PDF}`);
}
