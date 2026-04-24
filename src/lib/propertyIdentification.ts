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
 * Detecta se um texto parece nome de condomínio/loteamento/edifício.
 * Auditoria do JSON real do Robust mostra que o nome do condomínio
 * costuma vir DENTRO de `endereco.bairro`, ex.:
 *   "Residencial Recanto do Bosque", "PORTAL DO SOL GREEN",
 *   "Residencial Goiânia Golfe Clube", "Condomínio X".
 * Bairros normais são "Setor Bueno", "Setor Marista", "Centro" etc.
 */
function looksLikeCondoName(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 4) return false;
  return /\b(residencial|condom[ií]nio|edif[ií]cio|edificio|portal|jardim|jardins|parque|park|village|alphaville|loteamento|aldeia|recanto|reserva|terras\s+de|moradas|vila\s+\w+|quinta\s+d[oa]|chac[ÁÃa]ras?\s+\w+|setor\s+(?:residencial|empresarial|industrial))\b/i.test(t);
}

/**
 * Detecta complementos "lixo" vindos do CRM (ex.: "00", "0", "-", "n/a").
 */
function isJunkComplement(text?: string | null): boolean {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  if (t.length === 0) return true;
  if (/^[0\-_.\s]+$/.test(t)) return true;
  if (['n/a', 'na', 'nao', 'não', 'sem', 'sn'].includes(t)) return true;
  return false;
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

/**
 * Tenta achar um nome de condomínio/prédio em qualquer lugar do JSON.
 * Inclui o campo `endereco.bairro` quando ele parece nome de condomínio
 * (que é o caso real da Robust — ver auditoria).
 */
function pickCondoName(prop: IdentifiableProperty): string | null {
  const raw = prop.raw_data || {};
  const endereco = raw?.endereco || {};

  // 1) Campos nominais explícitos (raros, mas existem em alguns CRMs)
  const explicit = [
    raw?.condominio?.nome,
    raw?.empreendimento?.nome,
    raw?.empreendimento,
    raw?.edificio,
    raw?.predio,
    endereco?.condominio,
  ];
  for (const c of explicit) {
    if (typeof c === 'string' && c.trim().length >= 3 && !looksLikeAdTitle(c)) {
      return c.trim();
    }
  }

  // 2) `endereco.bairro` quando parece condomínio/loteamento
  //    (caso real da Robust — ver auditoria)
  const bairroRaw = (endereco?.bairro || prop.bairro || '').trim();
  if (bairroRaw && looksLikeCondoName(bairroRaw)) {
    return bairroRaw;
  }

  return null;
}

/**
 * Retorna apenas o bairro "real" (não o nome do condomínio).
 * Usa apelido_bairro ou cai no bairro normal quando ele não é condomínio.
 */
function pickRealBairro(prop: IdentifiableProperty): string | null {
  const endereco = prop.raw_data?.endereco || {};
  const apelido = (endereco?.apelido_bairro || '').trim();
  if (apelido) return apelido;
  const bairroRaw = (endereco?.bairro || prop.bairro || '').trim();
  if (!bairroRaw) return null;
  if (looksLikeCondoName(bairroRaw)) return null;
  return bairroRaw;
}

function buildAddressShort(prop: IdentifiableProperty): string | null {
  const endereco = prop.raw_data?.endereco || {};
  const logradouro = (prop.logradouro || endereco.logradouro || '').trim();
  const numero = (prop.numero || endereco.numero || '').trim();
  const bairro = pickRealBairro(prop) || '';
  // Ignora número "0" / sem número
  const validNumero = numero && numero !== '0' && numero !== '00' ? numero : '';
  if (logradouro && validNumero) {
    return bairro ? `${logradouro}, ${validNumero} - ${bairro}` : `${logradouro}, ${validNumero}`;
  }
  if (logradouro) return bairro ? `${logradouro}, ${bairro}` : logradouro;
  return null;
}

export function getPropertyIdentification(prop: IdentifiableProperty): string {
  // 1) Nome do condomínio/prédio (campos explícitos OU bairro que parece condo)
  const condo = pickCondoName(prop);
  if (condo) {
    // Quando temos condomínio + complemento útil, junta para diferenciar unidades
    const endereco = prop.raw_data?.endereco || {};
    const complemento = (prop.complemento || endereco.complemento || '').trim();
    if (!isJunkComplement(complemento)) {
      return `${condo} — ${complemento}`;
    }
    return condo;
  }

  // 2) Complemento (ex.: "Apto 302") + bairro real
  const endereco = prop.raw_data?.endereco || {};
  const complemento = (prop.complemento || endereco.complemento || '').trim();
  if (!isJunkComplement(complemento)) {
    const bairro = pickRealBairro(prop);
    return bairro ? `${complemento} - ${bairro}` : complemento;
  }

  // 3) Endereço resumido (logradouro + número [+ bairro])
  const address = buildAddressShort(prop);
  if (address) return address;

  // 4) Tipo do imóvel + bairro real
  const bairro = pickRealBairro(prop);
  const tipo = (prop.tipo_imovel || '').trim();
  if (tipo && bairro) return `${tipo} - ${bairro}`;
  if (bairro) return bairro;
  if (tipo) return tipo;

  // 5) Título do CRM (somente se não parecer anúncio)
  if (prop.titulo && !looksLikeAdTitle(prop.titulo)) {
    return prop.titulo.trim();
  }

  // 6) Fallback final
  return `Imóvel ${prop.codigo_robust}`;
}

/**
 * Alias semântico solicitado pelo time. Usa exatamente a mesma regra
 * para garantir comportamento idêntico em todo o sistema.
 */
export const getPropertyDisplayName = getPropertyIdentification;
