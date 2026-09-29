/*
 * A assinatura viaja como SVG em base64: vetorial (fica nítida no PDF),
 * pequena (uns poucos KB) e sem depender de captura de tela nativa.
 */

export type Ponto = { x: number; y: number };
export type Traco = Ponto[];

const arred = (n: number) => Math.round(n * 10) / 10;

/** Um <path> por traço; traço de um ponto só vira um pontinho. */
export function tracosParaSvg(tracos: Traco[], largura: number, altura: number): string {
  const caminhos = tracos
    .filter((t) => t.length > 0)
    .map((t) => {
      const [p0, ...resto] = t;
      const fim = resto.length ? resto : [{ x: p0!.x + 0.1, y: p0!.y + 0.1 }];
      return `<path d="M${arred(p0!.x)} ${arred(p0!.y)} ${fim.map((p) => `L${arred(p.x)} ${arred(p.y)}`).join(" ")}"/>`;
    })
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(largura)} ${Math.round(altura)}">` +
    `<g fill="none" stroke="#0a0b0e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${caminhos}</g></svg>`
  );
}

/** SVG só tem ASCII aqui (números e tags), então btoa direto é seguro. */
export function svgParaBase64(svg: string): string {
  return btoa(svg);
}

export function base64ParaSvg(base64: string): string {
  return atob(base64);
}
