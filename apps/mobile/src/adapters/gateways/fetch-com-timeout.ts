/**
 * fetch que desiste depois de `ms`. AbortController + setTimeout, e não
 * AbortSignal.timeout: o polyfill do React Native não garante o método estático.
 */
export async function fetchComTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
