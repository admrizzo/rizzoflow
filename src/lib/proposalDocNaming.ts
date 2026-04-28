/**
 * Helpers de nomenclatura padronizada para arquivos da proposta.
 * Padrão: [TIPO_DOC] - [NOME_PESSOA] - [TIPO_PESSOA].EXT
 * Complementar: sufixo " - COMPLEMENTAR" antes da extensão.
 */

export function sanitizeForFilename(value: string): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/[^\w\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function getFileExtension(originalName: string): string {
  const idx = originalName.lastIndexOf('.');
  if (idx <= 0 || idx === originalName.length - 1) return '';
  return originalName.slice(idx + 1).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export interface BuildDocNameOptions {
  originalName: string;
  docType: string;
  personName: string;
  personRole: string;
  isComplementary?: boolean;
  /**
   * Lista de nomes finais já existentes para a mesma proposta/pessoa.
   * Usada para tratar duplicidade com sufixo (2), (3)...
   */
  existingFinalNames?: string[];
}

export function buildStandardDocName({
  originalName,
  docType,
  personName,
  personRole,
  isComplementary = false,
  existingFinalNames = [],
}: BuildDocNameOptions): string {
  const ext = getFileExtension(originalName);
  const docPart = sanitizeForFilename(docType) || 'DOCUMENTO';
  const namePart = sanitizeForFilename(personName) || 'SEM NOME';
  const rolePart = sanitizeForFilename(personRole) || 'OUTROS';
  const compPart = isComplementary ? ' - COMPLEMENTAR' : '';
  const base = `${docPart} - ${namePart} - ${rolePart}${compPart}`;
  const finalBase = ext ? `${base}.${ext}` : base;

  const taken = new Set(existingFinalNames.map((n) => n.toUpperCase()));
  if (!taken.has(finalBase.toUpperCase())) return finalBase;

  for (let i = 2; i < 1000; i++) {
    const candidate = ext ? `${base} (${i}).${ext}` : `${base} (${i})`;
    if (!taken.has(candidate.toUpperCase())) return candidate;
  }
  return finalBase;
}