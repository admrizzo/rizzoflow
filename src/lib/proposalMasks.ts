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

// ───────── Profissão ─────────
export const PROFESSION_OPTIONS = [
  'Empregado CLT',
  'Funcionário Público',
  'Autônomo',
  'Empresário',
  'Aposentado',
  'Estudante',
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
  const found = PROFESSION_OPTIONS.find(p => p.toLowerCase() === v.toLowerCase());
  return found ?? 'Outro';
}