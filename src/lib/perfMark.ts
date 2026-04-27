/**
 * Marcadores simples de performance para uso em desenvolvimento.
 *
 * Em produção viram no-ops para não poluir o `performance` buffer
 * nem o console do usuário. Em dev, expõem:
 *   - `perfMark(name)`        -> performance.mark
 *   - `perfMeasure(label, start, end?)` -> performance.measure + console.info
 *
 * Uso típico:
 *   perfMark('minha-fila:ready:start')
 *   ...
 *   perfMeasure('minha-fila:ready', 'minha-fila:ready:start')
 */
const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV === true;

export function perfMark(name: string): void {
  if (!isDev) return;
  try {
    performance.mark(name);
  } catch {
    /* no-op */
  }
}

export function perfMeasure(label: string, startMark: string, endMark?: string): void {
  if (!isDev) return;
  try {
    const endName = endMark ?? `${label}:end`;
    if (!endMark) {
      performance.mark(endName);
    }
    performance.measure(label, startMark, endName);
    const entries = performance.getEntriesByName(label, 'measure');
    const last = entries[entries.length - 1];
    if (last) {
      // eslint-disable-next-line no-console
      console.info(`[perf] ${label}: ${last.duration.toFixed(0)}ms`);
    }
  } catch {
    /* no-op */
  }
}