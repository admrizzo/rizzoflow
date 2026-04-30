/**
 * Máscaras e validações usadas no formulário público de proposta.
 * Mantêm compatibilidade com dados antigos: parsers aceitam valores
 * já formatados ou crus; máscaras nunca jogam fora dígitos extras
 * silenciosamente em valores legados (apenas reformatam ao salvar).
 */

// ───────── CPF ─────────
export function maskCPF(value: string): string {
  const d = (value || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function isValidCPF(value: string): boolean {
  const cpf = (value || '').replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === parseInt(cpf.charAt(10));
}

// ───────── Telefone / WhatsApp ─────────
export function maskPhone(value: string): string {
  const d = (value || '').replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  const d = (value || '').replace(/\D/g, '');
  // aceita 10 (fixo) ou 11 (celular) dígitos
  return d.length === 10 || d.length === 11;
}

// ───────── Profissão / Ocupação ─────────
// Lista de PROFISSÕES (o que a pessoa faz). Diferente de fonte de renda.
export const PROFESSION_OPTIONS = [
  'Arquiteto(a)',
  'Médico(a)',
  'Advogado(a)',
  'Corretor(a)',
  'Professor(a)',
  'Vendedor(a)',
  'Empresário(a)',
  'Aposentado(a)',
  'Estudante',
  'Do lar',
  'Outro',
] as const;

export type ProfessionOption = typeof PROFESSION_OPTIONS[number];

/**
 * Dado um valor livre/legado, retorna o option pré-definido ou 'Outro'.
 * Mantém compatibilidade com propostas antigas em texto livre.
 */
export function detectProfessionOption(value: string | null | undefined): ProfessionOption {
  const v = (value || '').trim();
  if (!v) return '' as unknown as ProfessionOption;
  const lower = v.toLowerCase();
  const found = PROFESSION_OPTIONS.find(p => p.toLowerCase() === lower);
  if (found) return found;
  // Mapeamentos legados — valores antigos que ficavam misturados com fonte de renda
  if (lower.startsWith('arquitet')) return 'Arquiteto(a)';
  if (lower.startsWith('médic') || lower.startsWith('medic')) return 'Médico(a)';
  if (lower.startsWith('advogad')) return 'Advogado(a)';
  if (lower.startsWith('corretor')) return 'Corretor(a)';
  if (lower.startsWith('professor')) return 'Professor(a)';
  if (lower.startsWith('vendedor')) return 'Vendedor(a)';
  if (lower.startsWith('empresári') || lower.startsWith('empresari')) return 'Empresário(a)';
  if (lower.startsWith('aposentad')) return 'Aposentado(a)';
  if (lower.includes('estudante')) return 'Estudante';
  if (lower.includes('do lar') || lower.includes('dona de casa')) return 'Do lar';
  return 'Outro';
}

// ───────── Fonte de renda (de onde vem o dinheiro) ─────────
// Diferente de profissão: aqui descrevemos a ORIGEM da renda mensal.
export const INCOME_TYPE_OPTIONS = [
  'Salário CLT',
  'Funcionário público / concursado',
  'Pró-labore / empresa própria',
  'Autônomo / prestação de serviço',
  'Aposentadoria / pensão',
  'Rendimentos / investimentos',
  'Ajuda familiar',
  'Outro',
] as const;

export type IncomeTypeOption = typeof INCOME_TYPE_OPTIONS[number];

/**
 * Mapeia valores legados (ex.: "Empregado", "Empregado(a)", "Empresário(a)")
 * para o novo conjunto de opções. Mantém compatibilidade com propostas antigas.
 * Retorna 'Outro' quando o valor existe mas não bate com nenhuma opção.
 * Retorna '' quando o valor é vazio.
 */
export function detectIncomeTypeOption(value: string | null | undefined): IncomeTypeOption | '' {
  const raw = (value || '').trim();
  if (!raw) return '';
  const v = raw.toLowerCase();
  // Match direto com novas opções
  const direct = INCOME_TYPE_OPTIONS.find(o => o.toLowerCase() === v);
  if (direct) return direct;
  // Mapeamentos legados — antigamente "tipo de renda" reusava valores de profissão
  if (v.includes('clt') || v.startsWith('empregado') || v.startsWith('salário') || v.startsWith('salario')) return 'Salário CLT';
  if (v.includes('público') || v.includes('publico') || v.includes('servidor') || v.includes('concurs')) return 'Funcionário público / concursado';
  if (v.includes('pró-labore') || v.includes('pro-labore') || v.includes('prolabore') || v.startsWith('empresári') || v.startsWith('empresari') || v.includes('empresa própria') || v.includes('empresa propria')) return 'Pró-labore / empresa própria';
  if (v.startsWith('autônomo') || v.startsWith('autonomo') || v.includes('prestação de serviço') || v.includes('prestacao de servico') || v.includes('freelan')) return 'Autônomo / prestação de serviço';
  if (v.includes('aposentad') || v.includes('pension')) return 'Aposentadoria / pensão';
  if (v.includes('aluguel') || v.includes('investiment') || v.includes('rendiment')) return 'Rendimentos / investimentos';
  if (v.includes('ajuda') || v.includes('familiar') || v.includes('família') || v.includes('familia')) return 'Ajuda familiar';
  return 'Outro';
}

// ───────── E-mail ─────────
export function isValidEmail(value: string): boolean {
  const v = (value || '').trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ───────── Validade de fiador ─────────
type FiadorRequirementType = 'renda' | 'imovel';
export type FiadorRequirementState = 'pendente' | 'em_preenchimento' | 'cumprido';

export interface FiadorRequirementStatus {
  state: FiadorRequirementState;
  fiador?: { nome?: string; tipo_fiador?: string } | null;
  missing: string[];
}

export interface FiadorRequirementSummary {
  renda: FiadorRequirementStatus;
  imovel: FiadorRequirementStatus;
  hasIncomeGuarantor: boolean;
  hasPropertyGuarantor: boolean;
}

function fiadorMatchesRequirement(tipo: string | undefined, requisito: FiadorRequirementType): boolean {
  if (requisito === 'renda') return tipo === 'renda' || tipo === 'ambos';
  return tipo === 'imovel' || tipo === 'ambos';
}

function hasRequiredFiles(
  documentos: Array<{ key?: string; files?: unknown[] }> | undefined,
  keys: string[],
): boolean {
  return keys.every((key) => documentos?.some((doc) => doc.key === key && (doc.files || []).length > 0));
}

export function getFiadorRequirementMissing(
  f: Parameters<typeof isFiadorMinValid>[0] & { documentos?: Array<{ key?: string; files?: unknown[] }> },
  requisito: FiadorRequirementType,
): string[] {
  const missing: string[] = [];
  const tipo = f?.tipo_fiador;
  if (!fiadorMatchesRequirement(tipo, requisito)) missing.push('tipo de fiador');
  if (!(f?.nome || '').trim()) missing.push('nome completo');
  if (!isValidCPF(f?.cpf || '')) missing.push('CPF válido');
  if (!isValidPhone(f?.whatsapp || '')) missing.push('WhatsApp/telefone válido');
  if (!isValidEmail(f?.email || '')) missing.push('e-mail válido');
  const requiresIncomeDocs = requisito === 'renda' || tipo === 'ambos';
  const requiresPropertyDocs = requisito === 'imovel' || tipo === 'ambos';
  if (requiresIncomeDocs && !(f?.renda_mensal || '').trim()) missing.push('renda mensal');
  if (!hasRequiredFiles(f?.documentos, ['documento_foto', 'comprovante_residencia', 'certidao_estado_civil'])) {
    missing.push('documentos pessoais obrigatórios');
  }
  if (requiresIncomeDocs && !hasRequiredFiles(f?.documentos, ['comprovante_renda'])) {
    missing.push('documentos de renda');
  }
  if (requiresPropertyDocs && !hasRequiredFiles(f?.documentos, ['matricula_imovel'])) {
    missing.push('matrícula/certidão do imóvel');
  }
  return missing;
}

export function isFiadorRequirementComplete(
  f: Parameters<typeof isFiadorMinValid>[0] & { documentos?: Array<{ key?: string; files?: unknown[] }> },
  requisito: FiadorRequirementType,
): boolean {
  return getFiadorRequirementMissing(f, requisito).length === 0;
}

function getSingleFiadorRequirementStatus(
  fiadores: Array<Parameters<typeof isFiadorMinValid>[0] & { documentos?: Array<{ key?: string; files?: unknown[] }> }>,
  requisito: FiadorRequirementType,
): FiadorRequirementStatus {
  const started = fiadores.filter((f) => fiadorMatchesRequirement(f?.tipo_fiador, requisito));
  const complete = started.find((f) => isFiadorRequirementComplete(f, requisito));
  if (complete) return { state: 'cumprido', fiador: complete, missing: [] };
  if (started.length === 0) return { state: 'pendente', fiador: null, missing: [] };
  return { state: 'em_preenchimento', fiador: started[0], missing: getFiadorRequirementMissing(started[0], requisito) };
}

export function getFiadorRequirementStates(
  fiadores: Array<Parameters<typeof isFiadorMinValid>[0] & { documentos?: Array<{ key?: string; files?: unknown[] }> }>,
): FiadorRequirementSummary {
  const renda = getSingleFiadorRequirementStatus(fiadores, 'renda');
  const imovel = getSingleFiadorRequirementStatus(fiadores, 'imovel');
  return {
    renda,
    imovel,
    hasIncomeGuarantor: renda.state === 'cumprido',
    hasPropertyGuarantor: imovel.state === 'cumprido',
  };
}

/**
 * Considera um fiador "válido" para fins de cálculo dos requisitos
 * (fiador com renda / fiador com imóvel) na etapa Garantia.
 *
 * Mínimos exigidos:
 * - tipo_fiador definido ('renda' | 'imovel' | 'ambos')
 * - nome completo preenchido
 * - CPF válido
 * - telefone/WhatsApp válido
 * - e-mail válido
 * - se incluir renda, renda_mensal preenchida
 *
 * Documentos, endereço e cônjuge continuam sendo exigidos pela
 * validação final do envio — esta função só governa os badges/chips
 * e o gating dos botões "Adicionar fiador com renda/imóvel".
 */
export function isFiadorMinValid(f: {
  tipo_fiador?: string;
  nome?: string;
  cpf?: string;
  whatsapp?: string;
  email?: string;
  renda_mensal?: string;
}): boolean {
  const tipo = f?.tipo_fiador;
  if (tipo !== 'renda' && tipo !== 'imovel' && tipo !== 'ambos') return false;
  if (!(f?.nome || '').trim()) return false;
  if (!isValidCPF(f?.cpf || '')) return false;
  if (!isValidPhone(f?.whatsapp || '')) return false;
  if (!isValidEmail(f?.email || '')) return false;
  if ((tipo === 'renda' || tipo === 'ambos') && !(f?.renda_mensal || '').trim()) return false;
  return true;
}

/** Existe um fiador iniciado (tipo selecionado) mas ainda incompleto para o requisito dado. */
export function hasFiadorInProgress(
  fiadores: Array<{ tipo_fiador?: string } & Parameters<typeof isFiadorMinValid>[0]>,
  requisito: 'renda' | 'imovel',
): boolean {
  return getSingleFiadorRequirementStatus(fiadores, requisito).state === 'em_preenchimento';
}