import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProposalParty {
  id: string;
  proposal_link_id: string | null;
  card_id: string | null;
  related_party_id: string | null;
  role: string;
  person_type: 'pf' | 'pj' | string;
  name: string | null;
  cpf: string | null;
  cnpj: string | null;
  rg: string | null;
  email: string | null;
  phone: string | null;
  marital_status: string | null;
  profession: string | null;
  income: number | null;
  address: string | null;
  position: number;
  metadata: Record<string, any> | null;
}

/**
 * Carrega proposal_parties pelo card. Resolve o proposal_link_id do card
 * para suportar partes que foram criadas antes do card existir.
 */
export function useProposalParties(cardId: string | null | undefined) {
  return useQuery({
    queryKey: ['proposal-parties', cardId],
    queryFn: async (): Promise<ProposalParty[]> => {
      if (!cardId) return [];
      const { data: cardRow } = await supabase
        .from('cards')
        .select('id, proposal_link_id')
        .eq('id', cardId)
        .maybeSingle();
      const proposalLinkId = (cardRow as any)?.proposal_link_id || null;

      const filter = proposalLinkId
        ? `card_id.eq.${cardId},proposal_link_id.eq.${proposalLinkId}`
        : `card_id.eq.${cardId}`;

      const { data, error } = await supabase
        .from('proposal_parties' as any)
        .select('*')
        .or(filter)
        .order('position', { ascending: true });
      if (error) throw error;

      // dedup por id (caso a OR retorne duplicados)
      const seen = new Set<string>();
      const out: ProposalParty[] = [];
      for (const p of (data as any[]) || []) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p as ProposalParty);
      }
      return out;
    },
    enabled: !!cardId,
    staleTime: 30_000,
  });
}

export const ROLE_LABELS: Record<string, string> = {
  primary_tenant: 'Locatário Principal',
  additional_tenant: 'Locatário Adicional',
  tenant_spouse: 'Cônjuge do Locatário',
  guarantor: 'Fiador',
  guarantor_spouse: 'Cônjuge do Fiador',
  company: 'Empresa',
  legal_representative: 'Representante Legal',
};