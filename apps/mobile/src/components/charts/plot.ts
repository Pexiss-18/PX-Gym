/*
 * Matemática dos gráficos — separada do componente pra manter o SVG legível.
 * Sem dependência de React ou de lib de charts: react-native-svg já está no
 * bundle nativo, então não entra módulo novo (nem risco de build no EAS).
 */

export type Point = { x: number; y: number };

/** Trecho contínuo da série: índice do primeiro ponto + valores sem buraco. */
export type Segment = { startIndex: number; values: number[] };

/**
 * Quebra a série nos buracos (null). Uma avaliação sem % de gordura não deve
 * virar uma reta atravessando o gráfico — vira duas curvas separadas.
 */
export function toSegments(values: (number | null)[]): Segment[] {
  const segments: Segment[] = [];
  let current: Segment | null = null;

  values.forEach((value, index) => {
    if (value === null) {
      current = null;
      return;
    }
    if (current === null) {
      current = { startIndex: index, values: [value] };
      segments.push(current);
    } else {
      current.values.push(value);
    }
  });

  return segments;
}

/** Domínio [min, max] com folga percentual; achata série constante. */
export function domainOf(values: number[], padRatio = 0.12): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    // Série constante: inventa uma faixa pra linha ficar no meio, não colada.
    const pad = Math.abs(min) * 0.05 || 1;
    return [min - pad, max + pad];
  }
  const pad = (max - min) * padRatio;
  return [min - pad, max + pad];
}

/**
 * Caminho SVG com interpolação cúbica monotônica (Fritsch–Carlson).
 *
 * Bézier ingênua (Catmull-Rom) ultrapassa os pontos e desenha um vale onde o
 * peso só caiu — mentira visual num gráfico de progresso. A monotônica garante
 * que a curva nunca inverte o sentido entre dois pontos reais.
 */
export function monotonePath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0]!;
    return `M ${p.x} ${p.y}`;
  }
  if (points.length === 2) {
    const [a, b] = points as [Point, Point];
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }

  const n = points.length;
  // Inclinações das secantes entre pontos consecutivos.
  const secants: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = b.x - a.x;
    secants.push(dx === 0 ? 0 : (b.y - a.y) / dx);
  }

  // Tangente em cada ponto: média das secantes vizinhas, zerada nos extremos
  // locais (é o que impede o overshoot).
  const tangents: number[] = new Array(n).fill(0);
  tangents[0] = secants[0]!;
  tangents[n - 1] = secants[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    const prev = secants[i - 1]!;
    const next = secants[i]!;
    tangents[i] = prev * next <= 0 ? 0 : (prev + next) / 2;
  }

  // Limitador de Fritsch–Carlson: mantém a tangente dentro de 3× a secante.
  for (let i = 0; i < n - 1; i++) {
    const secant = secants[i]!;
    if (secant === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const alpha = tangents[i]! / secant;
    const beta = tangents[i + 1]! / secant;
    const magnitude = Math.hypot(alpha, beta);
    if (magnitude > 3) {
      const scale = 3 / magnitude;
      tangents[i] = scale * alpha * secant;
      tangents[i + 1] = scale * beta * secant;
    }
  }

  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = (b.x - a.x) / 3;
    path += ` C ${a.x + dx} ${a.y + tangents[i]! * dx} ${b.x - dx} ${
      b.y - tangents[i + 1]! * dx
    } ${b.x} ${b.y}`;
  }
  return path;
}

/** Fecha o caminho da linha até a base, formando a área preenchida. */
export function areaPath(
  linePath: string,
  points: Point[],
  baselineY: number,
): string {
  if (points.length === 0) return "";
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}
