import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Carrega o public_token do proposal_link associado a um card,
 * permitindo gerar/copiar o link público da proposta a partir
 * do CardDetailDialog sem ter que abrir a Central de Propostas.
 */
export function useProposalLinkPublicToken(proposalLinkId?: string | null) {
  return useQuery({
    queryKey: ['proposal-link-public-token', proposalLinkId],
    queryFn: async (): Promise<string | null> => {
      if (!proposalLinkId) return null;
      const { data, error } = await supabase
        .from('proposal_links')
        .select('public_token')
        .eq('id', proposalLinkId)
        .maybeSingle();
      if (error) throw error;
      return (data?.public_token as string | undefined) || null;
    },
    enabled: !!proposalLinkId,
    staleTime: 5 * 60_000,
  });
}