// Sobe o Metro atrás de um túnel da Cloudflare (trycloudflare.com: grátis, sem conta).
// Substitui o `expo start --tunnel`, cujo ngrok compartilhado do Expo vive batendo
// no limite de sessões (ERR_NGROK_108). O endereço muda a cada execução.
//
// Uso: npm run tunnel [-- <flags extras do expo start, ex.: -c>]
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const PORT = 8081;
const extraArgs = process.argv.slice(2);

function findCloudflared() {
  const probe = spawnSync("cloudflared", ["--version"], { stdio: "ignore", shell: true });
  if (probe.status === 0) return "cloudflared";
  // O winget instala, mas o PATH só atualiza em terminais novos.
  const candidates = [
    path.join(process.env["ProgramFiles(x86)"] ?? "", "cloudflared", "cloudflared.exe"),
    path.join(process.env.ProgramFiles ?? "", "cloudflared", "cloudflared.exe"),
    path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Links", "cloudflared.exe"),
  ];
  return candidates.find((p) => existsSync(p));
}

const cloudflared = findCloudflared();
if (!cloudflared) {
  console.error("cloudflared não encontrado. Instale com: winget install --id Cloudflare.cloudflared");
  process.exit(1);
}

const children = [];
const shutdown = (code = 0) => {
  for (const child of children) child.kill();
  process.exit(code);
};
process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());

const tunnel = spawn(cloudflared, ["tunnel", "--no-autoupdate", "--url", `http://localhost:${PORT}`], {
  stdio: ["ignore", "pipe", "pipe"],
});
children.push(tunnel);
tunnel.on("exit", (code) => {
  console.error(`\ncloudflared saiu (código ${code}).`);
  shutdown(code ?? 1);
});

let started = false;
const onTunnelOutput = (chunk) => {
  const match = chunk.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (!match || started) return;
  started = true;
  const url = match[0];
  const host = new URL(url).host;

  console.log(`\nTúnel pronto: ${url}`);
  console.log("No iPhone, digite no Safari (e escolha abrir no Expo Go):");
  console.log(`\n    exps://${host}\n`);
  // O DNS do CEFET guarda o "não existe" de um subdomínio consultado cedo demais.
  console.log("Se o Safari disser que não achou o servidor, espere ~1 minuto e tente de novo.\n");

  const expo = spawn("npx", ["expo", "start", "--port", String(PORT), ...extraArgs], {
    stdio: "inherit",
    shell: true,
    // Precisa vir do ambiente do processo: o Expo ignora essa variável vinda do .env.
    env: { ...process.env, EXPO_PACKAGER_PROXY_URL: url },
  });
  children.push(expo);
  expo.on("exit", (code) => shutdown(code ?? 0));
};
tunnel.stdout.on("data", onTunnelOutput);
tunnel.stderr.on("data", onTunnelOutput);

console.log("Abrindo túnel da Cloudflare...");
