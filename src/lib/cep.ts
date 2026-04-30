/**
 * Helpers de CEP brasileiro.
 */

export function formatCep(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function onlyCepDigits(value: string): string {
  return (value || '').replace(/\D/g, '').slice(0, 8);
}

export function isValidCep(value: string): boolean {
  return onlyCepDigits(value).length === 8;
}

export interface CepLookupResult {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/**
 * Busca CEP usando ViaCEP, com fallback para BrasilAPI.
 * Retorna null se não encontrado ou em caso de erro de rede em ambos.
 */
export async function lookupCep(rawCep: string, signal?: AbortSignal): Promise<CepLookupResult | null> {
  const cep = onlyCepDigits(rawCep);
  if (cep.length !== 8) return null;

  // 1) ViaCEP
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal });
    if (res.ok) {
      const data = await res.json();
      if (data && !data.erro) {
        return {
          cep: formatCep(cep),
          logradouro: String(data.logradouro || ''),
          bairro: String(data.bairro || ''),
          cidade: String(data.localidade || ''),
          uf: String(data.uf || '').toUpperCase().slice(0, 2),
        };
      }
      // ViaCEP respondeu mas CEP não existe — tenta BrasilAPI como fallback
    }
  } catch (_) {
    // segue para BrasilAPI
  }

  // 2) BrasilAPI
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, { signal });
    if (res.ok) {
      const data = await res.json();
      return {
        cep: formatCep(cep),
        logradouro: String(data.street || ''),
        bairro: String(data.neighborhood || ''),
        cidade: String(data.city || ''),
        uf: String(data.state || '').toUpperCase().slice(0, 2),
      };
    }
  } catch (_) {
    // ignora
  }

  return null;
}