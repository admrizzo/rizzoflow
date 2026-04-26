/**
 * Domínio canônico de produção.
 * Sempre que precisar gerar links públicos (proposta, prestador, convite),
 * use `getPublicAppUrl()` para que os links saiam padronizados em
 * https://www.seurizzo.com.br em produção, e funcionem em preview/local
 * com o domínio atual.
 */
export const CANONICAL_APP_URL = 'https://www.seurizzo.com.br';

const PRODUCTION_HOSTS = new Set([
  'seurizzo.com.br',
  'www.seurizzo.com.br',
]);

/**
 * Retorna a base URL para gerar links públicos.
 * - Em produção (qualquer host de seurizzo.com.br): força o canônico com www.
 * - Em preview/local: usa window.location.origin para não quebrar testes.
 */
export function getPublicAppUrl(): string {
  if (typeof window === 'undefined') return CANONICAL_APP_URL;
  try {
    const host = window.location.hostname;
    if (PRODUCTION_HOSTS.has(host)) return CANONICAL_APP_URL;
    return window.location.origin;
  } catch {
    return CANONICAL_APP_URL;
  }
}

export function buildPublicUrl(path: string): string {
  const base = getPublicAppUrl().replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}