import { useMemo, useCallback } from 'react';
import { useBoardConfig } from './useBoardConfig';
import { CardWithRelations } from '@/types/database';

export interface TitleContext {
  robust_code?: string | null;
  building_name?: string | null;
  address?: string | null;
  superlogica_id?: string | null;
  description?: string | null;
  // Party names by type
  parties?: {
    vendedor?: string | null;
    comprador?: string | null;
    proprietario?: string | null;
    locatario?: string | null;
  };
  // DEV board specific
  unidade?: string | null;
}

// Available tokens that can be used in title patterns
export const TITLE_TOKENS = [
  { token: '{robust_code}', label: 'Cód. Robust', description: 'Código do imóvel' },
  { token: '{building_name}', label: 'Empreendimento', description: 'Nome do imóvel/empreendimento' },
  { token: '{address}', label: 'Endereço', description: 'Endereço do imóvel' },
  { token: '{superlogica_id}', label: 'ID Superlógica', description: 'Código Superlógica' },
  { token: '{description}', label: 'Descrição', description: 'Campo de descrição' },
  { token: '{unidade}', label: 'Unidade', description: 'Número da unidade (DEV)' },
  { token: '{party:vendedor}', label: 'Vendedor', description: 'Nome do vendedor principal' },
  { token: '{party:comprador}', label: 'Comprador', description: 'Nome do comprador principal' },
  { token: '{party:proprietario}', label: 'Proprietário', description: 'Nome do proprietário' },
  { token: '{party:locatario}', label: 'Locatário', description: 'Nome do locatário' },
] as const;

/**
 * Generate a card title based on a pattern and context
 * Pattern tokens: {robust_code}, {building_name}, {party:vendedor}, etc.
 * Parts are joined with " - " and empty values are skipped
 */
export function generateTitleFromPattern(
  pattern: string,
  context: TitleContext,
  defaultTitle: string = 'Novo negócio'
): string {
  if (!pattern || pattern === '{title}') {
    // Fallback: just use whatever is provided
    return defaultTitle;
  }

  // Split pattern by " - " to handle each part separately
  // This allows patterns like "{robust_code} - {party:vendedor} - {party:comprador}"
  const patternParts = pattern.split(' - ').map(p => p.trim()).filter(Boolean);
  
  const resultParts: string[] = [];
  
  for (const part of patternParts) {
    let value = part;
    
    // Replace field tokens
    value = value.replace(/\{robust_code\}/gi, context.robust_code?.trim() || '');
    value = value.replace(/\{building_name\}/gi, context.building_name?.trim() || '');
    value = value.replace(/\{address\}/gi, context.address?.trim() || '');
    value = value.replace(/\{superlogica_id\}/gi, context.superlogica_id?.trim() || '');
    value = value.replace(/\{description\}/gi, context.description?.trim() || '');
    value = value.replace(/\{unidade\}/gi, context.unidade?.trim() || '');
    
    // Replace party tokens
    value = value.replace(/\{party:vendedor\}/gi, context.parties?.vendedor?.trim() || '');
    value = value.replace(/\{party:comprador\}/gi, context.parties?.comprador?.trim() || '');
    value = value.replace(/\{party:proprietario\}/gi, context.parties?.proprietario?.trim() || '');
    value = value.replace(/\{party:locatario\}/gi, context.parties?.locatario?.trim() || '');
    
    // Only add non-empty parts
    const trimmedValue = value.trim();
    if (trimmedValue) {
      resultParts.push(trimmedValue);
    }
  }
  
  return resultParts.length > 0 ? resultParts.join(' - ') : defaultTitle;
}

/**
 * Extract party names from card_parties array
 */
export function extractPartyNames(cardParties?: Array<{ party_type: string; name?: string | null; party_number: number }> | null): TitleContext['parties'] {
  if (!cardParties || cardParties.length === 0) return {};
  
  const parties: TitleContext['parties'] = {};
  
  // Get party #1 for each type (the primary one)
  for (const party of cardParties) {
    if (party.party_number === 1 && party.name) {
      const type = party.party_type.toLowerCase();
      if (type === 'vendedor') parties.vendedor = party.name;
      else if (type === 'comprador') parties.comprador = party.name;
      else if (type === 'proprietario') parties.proprietario = party.name;
      else if (type === 'locatario') parties.locatario = party.name;
    }
  }
  
  return parties;
}

/**
 * Build title context from a card and additional field values
 */
export function buildTitleContext(
  card?: Partial<CardWithRelations> | null,
  fieldValues?: Record<string, string | null>,
  cardParties?: Array<{ party_type: string; name?: string | null; party_number: number }> | null
): TitleContext {
  // Merge card data with field value overrides
  return {
    robust_code: fieldValues?.robust_code ?? card?.robust_code,
    building_name: fieldValues?.building_name ?? card?.building_name,
    address: fieldValues?.address ?? card?.address,
    superlogica_id: fieldValues?.superlogica_id ?? card?.superlogica_id,
    description: fieldValues?.description ?? card?.description,
    unidade: fieldValues?.unidade,
    parties: {
      vendedor: fieldValues?.['party:vendedor'] ?? extractPartyNames(cardParties)?.vendedor,
      comprador: fieldValues?.['party:comprador'] ?? extractPartyNames(cardParties)?.comprador,
      proprietario: fieldValues?.['party:proprietario'] ?? extractPartyNames(cardParties)?.proprietario,
      locatario: fieldValues?.['party:locatario'] ?? extractPartyNames(cardParties)?.locatario,
    },
  };
}

/**
 * Hook to generate and update card titles based on board configuration
 */
export function useTitlePattern(boardId?: string) {
  const { config, isLoading } = useBoardConfig(boardId);
  
  const titlePattern = useMemo(() => {
    return config?.title_pattern || '{title}';
  }, [config?.title_pattern]);
  
  const generateTitle = useCallback((
    context: TitleContext,
    defaultTitle: string = 'Novo negócio'
  ): string => {
    return generateTitleFromPattern(titlePattern, context, defaultTitle);
  }, [titlePattern]);
  
  /**
   * Check if a field affects the title and should trigger a title update
   */
  const fieldAffectsTitle = useCallback((fieldName: string): boolean => {
    if (!titlePattern || titlePattern === '{title}') return false;
    
    const lowerPattern = titlePattern.toLowerCase();
    const lowerField = fieldName.toLowerCase();
    
    // Check direct field tokens
    if (lowerField === 'robust_code' && lowerPattern.includes('{robust_code}')) return true;
    if (lowerField === 'building_name' && lowerPattern.includes('{building_name}')) return true;
    if (lowerField === 'address' && lowerPattern.includes('{address}')) return true;
    if (lowerField === 'superlogica_id' && lowerPattern.includes('{superlogica_id}')) return true;
    if (lowerField === 'description' && lowerPattern.includes('{description}')) return true;
    if (lowerField === 'unidade' && lowerPattern.includes('{unidade}')) return true;
    
    // Check party tokens
    if (lowerField.startsWith('party:')) {
      const partyType = lowerField.replace('party:', '');
      return lowerPattern.includes(`{party:${partyType}}`);
    }
    
    return false;
  }, [titlePattern]);
  
  /**
   * Check if any party type affects the title
   */
  const partyAffectsTitle = useCallback((partyType: string): boolean => {
    if (!titlePattern || titlePattern === '{title}') return false;
    return titlePattern.toLowerCase().includes(`{party:${partyType.toLowerCase()}}`);
  }, [titlePattern]);
  
  return {
    titlePattern,
    isLoading,
    generateTitle,
    fieldAffectsTitle,
    partyAffectsTitle,
    hasCustomPattern: titlePattern !== '{title}',
  };
}
