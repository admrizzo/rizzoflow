/**
 * Regra de identificação de imóveis para títulos de cards/propostas.
 * Prioridade:
 *  1. Nome do condomínio/prédio (Property.titulo do CRM)
 *  2. Complemento do imóvel
 *  3. Bairro + tipo do imóvel
 *  4. Fallback: "Imóvel <código>"
 */
export interface IdentifiableProperty {
  codigo_robust: number | string;
  titulo?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  tipo_imovel?: string | null;
  raw_data?: any;
}

function looksGeneric(title: string | null | undefined): boolean {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  if (t.length < 3) return true;
  // Títulos genéricos vindos do anúncio que não identificam o prédio
  if (/^(apartamento|casa|sobrado|kitnet|loft|im[oó]vel|sala)\b/.test(t)) return true;
  return false;
}

export function getPropertyIdentification(prop: IdentifiableProperty): string {
  // 1. Nome do condomínio/prédio (campo "titulo" do CRM)
  if (prop.titulo && !looksGeneric(prop.titulo)) {
    return prop.titulo.trim();
  }

  // 2. Complemento (pode estar em complemento ou em raw_data.endereco.complemento)
  const rawComplemento = prop.raw_data?.endereco?.complemento as string | undefined;
  const complemento = (prop.complemento || rawComplemento || '').trim();
  if (complemento) {
    return complemento;
  }

  // 3. Bairro + tipo do imóvel
  const bairro = (prop.bairro || '').trim();
  const tipo = (prop.tipo_imovel || '').trim();
  if (bairro && tipo) return `${tipo} no ${bairro}`;
  if (bairro) return bairro;
  if (tipo) return tipo;

  // 4. Fallback final
  return `Imóvel ${prop.codigo_robust}`;
}
