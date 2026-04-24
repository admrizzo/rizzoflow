/**
 * Regra de identificação de imóveis para títulos de cards/propostas.
 * Ordem de prioridade (operacional, NÃO comercial):
 *  1. Nome do condomínio/prédio (raw_data.condominio.nome ou raw_data.empreendimento)
 *  2. Complemento do imóvel (ex.: "Apto 302")
 *  3. Endereço resumido (logradouro + número, opcionalmente bairro)
 *  4. Tipo do imóvel + bairro (ex.: "Apartamento - Setor Bueno")
 *  5. Título do CRM somente se NÃO for texto comercial de anúncio
 *  6. Fallback final: "Imóvel <código>"
 *
 * IMPORTANTE: nunca usar o título comercial do anúncio (ex.: "Viva com
 * praticidade no Setor Bueno") como identificação operacional.
 */
export interface IdentifiableProperty {
  codigo_robust: number | string;
  titulo?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  tipo_imovel?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  cidade?: string | null;
  raw_data?: any;
}

/**
 * Detecta títulos comerciais de anúncio.
 * Heurísticas:
 *  - frases longas com verbos/adjetivos típicos de marketing
 *  - começam com chamada genérica ("Viva", "Aproveite", "Conheça"...)
 *  - contém pontuação/expressões típicas de anúncio
 *  - começa com tipo de imóvel genérico ("Apartamento ...", "Casa ...")
 */
function looksLikeAdTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  if (t.length < 3) return true;

  // Tipo genérico no início (ex.: "Apartamento no Setor Bueno")
  if (/^(apartamento|casa|sobrado|kitnet|loft|im[oó]vel|sala|cobertura|studio|flat|terreno|gal[pã]ao)\b/.test(t)) {
    return true;
  }

  // Chamadas comerciais típicas
  const adStarters = [
    'viva', 'aproveite', 'conhe[çc]a', 'descubra', 'more', 'lindo', 'linda',
    'amplo', 'ampla', 'excelente', 'maravilhoso', 'maravilhosa', 'oportunidade',
    'novo', 'nova', 'pronto para morar', 'alto padr[ãa]o', 'reformado', 'reformada',
  ];
  const starterRegex = new RegExp(`^(${adStarters.join('|')})\\b`, 'i');
  if (starterRegex.test(t)) return true;

  // Frases de venda no meio do texto
  if (/\b(praticidade|conforto|sofistica[çc][ãa]o|exclusivid|localiza[çc][ãa]o privilegiada)\b/.test(t)) {
    return true;
  }

  // Muito longo costuma ser anúncio (mais de 5 palavras com mais de 35 chars)
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 5 && t.length > 35) return true;

  return false;
}

function pickFromRaw(prop: IdentifiableProperty): string | null {
  const raw = prop.raw_data;
  if (!raw || typeof raw !== 'object') return null;
  const candidates = [
    raw?.condominio?.nome,
    raw?.condominio,
    raw?.empreendimento?.nome,
    raw?.empreendimento,
    raw?.endereco?.condominio,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length >= 3 && !looksLikeAdTitle(c)) {
      return c.trim();
    }
  }
  return null;
}

function buildAddressShort(prop: IdentifiableProperty): string | null {
  const raw = prop.raw_data?.endereco || {};
  const logradouro = (prop.logradouro || raw.logradouro || '').trim();
  const numero = (prop.numero || raw.numero || '').trim();
  const bairro = (prop.bairro || raw.bairro || '').trim();
  if (logradouro && numero) {
    return bairro ? `${logradouro}, ${numero} - ${bairro}` : `${logradouro}, ${numero}`;
  }
  if (logradouro) return bairro ? `${logradouro}, ${bairro}` : logradouro;
  return null;
}

export function getPropertyIdentification(prop: IdentifiableProperty): string {
  // 1. Nome do condomínio/prédio (raw_data)
  const fromRaw = pickFromRaw(prop);
  if (fromRaw) return fromRaw;

  // 2. Complemento (ex.: "Apto 302")
  const rawComplemento = prop.raw_data?.endereco?.complemento as string | undefined;
  const complemento = (prop.complemento || rawComplemento || '').trim();
  if (complemento) {
    const bairro = (prop.bairro || '').trim();
    return bairro ? `${complemento} - ${bairro}` : complemento;
  }

  // 3. Endereço resumido (logradouro + número [+ bairro])
  const address = buildAddressShort(prop);
  if (address) return address;

  // 4. Tipo do imóvel + bairro
  const bairro = (prop.bairro || '').trim();
  const tipo = (prop.tipo_imovel || '').trim();
  if (tipo && bairro) return `${tipo} - ${bairro}`;
  if (bairro) return bairro;
  if (tipo) return tipo;

  // 5. Título do CRM (somente se não parecer anúncio)
  if (prop.titulo && !looksLikeAdTitle(prop.titulo)) {
    return prop.titulo.trim();
  }

  // 6. Fallback final
  return `Imóvel ${prop.codigo_robust}`;
}

/**
 * Alias semântico solicitado pelo time. Usa exatamente a mesma regra
 * para garantir comportamento idêntico em todo o sistema.
 */
export const getPropertyDisplayName = getPropertyIdentification;
