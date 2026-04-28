import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProposalDocument {
  id: string;
  card_id: string | null;
  proposal_link_id: string | null;
  party_id: string | null;
  category: string;
  category_label: string;
  owner_type: string;
  owner_label: string | null;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string;
  uploaded_at: string;
  is_complementary?: boolean | null;
  original_file_name?: string | null;
  uploaded_by?: string | null;
}

export interface CategorizedDocument extends ProposalDocument {
  signedUrl?: string;
}

export function useProposalDocuments(cardId: string | null | undefined) {
  return useQuery({
    queryKey: ['proposal-documents', cardId],
    queryFn: async (): Promise<ProposalDocument[]> => {
      if (!cardId) return [];
      // Resolve o proposal_link_id do card para conseguir buscar também
      // documentos que foram enviados ANTES da existência do card_id
      // (uploads progressivos do link público).
      const { data: cardRow } = await supabase
        .from('cards')
        .select('id, proposal_link_id')
        .eq('id', cardId)
        .maybeSingle();
      const proposalLinkId = cardRow?.proposal_link_id || null;

      const filter = proposalLinkId
        ? `card_id.eq.${cardId},proposal_link_id.eq.${proposalLinkId}`
        : `card_id.eq.${cardId}`;

      const { data, error } = await supabase
        .from('proposal_documents')
        .select('*')
        .or(filter)
        .order('owner_type', { ascending: true })
        .order('uploaded_at', { ascending: true });
      if (error) throw error;

      // Dedup por storage_path (caso um mesmo doc seja registrado 2x)
      const seen = new Set<string>();
      const result: ProposalDocument[] = [];
      for (const d of (data || []) as ProposalDocument[]) {
        const key = d.storage_path || d.id;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(d);
      }
      return result;
    },
    enabled: !!cardId,
    staleTime: 30_000,
  });
}

/**
 * Gera uma URL assinada de curta duração para visualizar/baixar
 * o arquivo do bucket privado.
 */
export async function getProposalDocumentSignedUrl(
  storagePath: string,
  expiresInSec = 600,
  options?: { download?: boolean | string },
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('proposal-documents')
    .createSignedUrl(storagePath, expiresInSec, options as any);
  if (error || !data?.signedUrl) {
    console.error('Erro ao gerar URL assinada:', error);
    return null;
  }
  return data.signedUrl;
}

export const OWNER_TYPE_ORDER = [
  'proponente',
  'conjuge',
  'empresa',
  'representante',
  'fiador',
  'outros',
] as const;

export const OWNER_TYPE_LABELS: Record<string, string> = {
  proponente: 'Proponente',
  conjuge: 'Cônjuge',
  empresa: 'Empresa',
  representante: 'Representante Legal',
  fiador: 'Fiadores',
  outros: 'Outros',
};