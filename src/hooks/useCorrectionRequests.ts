import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logCardActivity } from './useCardActivityLogs';

export type CorrectionStatus = 'pending' | 'responded' | 'canceled';

export type CorrectionSection =
  | 'locatario_principal'
  | 'locatario_adicional'
  | 'conjuge'
  | 'fiador'
  | 'documentos'
  | 'garantia'
  | 'negociacao'
  | 'outro';

export interface CorrectionRequest {
  id: string;
  proposal_link_id: string;
  card_id: string | null;
  requested_by: string | null;
  status: CorrectionStatus;
  requested_sections: CorrectionSection[];
  message: string;
  created_at: string;
  responded_at: string | null;
  canceled_at: string | null;
}

const TABLE = 'proposal_correction_requests' as any;

export function useCardCorrectionRequests(cardId?: string) {
  return useQuery({
    queryKey: ['correction-requests', 'card', cardId],
    queryFn: async (): Promise<CorrectionRequest[]> => {
      if (!cardId) return [];
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data || []) as unknown) as CorrectionRequest[];
    },
    enabled: !!cardId,
    staleTime: 15000,
  });
}

export function usePublicCorrectionRequest(proposalLinkId?: string) {
  return useQuery({
    queryKey: ['correction-requests', 'public', proposalLinkId],
    queryFn: async (): Promise<CorrectionRequest | null> => {
      if (!proposalLinkId) return null;
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('proposal_link_id', proposalLinkId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return ((data as unknown) as CorrectionRequest) || null;
    },
    enabled: !!proposalLinkId,
  });
}

export function useCreateCorrectionRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      proposalLinkId: string;
      cardId: string | null;
      sections: CorrectionSection[];
      message: string;
    }) => {
      const { proposalLinkId, cardId, sections, message } = params;
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          proposal_link_id: proposalLinkId,
          card_id: cardId,
          requested_by: user?.id ?? null,
          status: 'pending',
          requested_sections: sections,
          message: message.trim(),
        })
        .select('*')
        .single();
      if (error) throw error;

      await supabase
        .from('proposal_links')
        .update({ status: 'correction_requested' })
        .eq('id', proposalLinkId);

      if (cardId) {
        await logCardActivity({
          cardId,
          actorUserId: user?.id,
          eventType: 'comment_added',
          title: '🛠 Correção solicitada',
          description: message.trim(),
          metadata: {
            kind: 'correction_requested',
            sections,
            proposal_link_id: proposalLinkId,
          },
        });
      }

      return (data as unknown) as CorrectionRequest;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['correction-requests', 'card', vars.cardId] });
      qc.invalidateQueries({ queryKey: ['cards'] });
      toast({ title: 'Correção solicitada ao cliente.' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao solicitar correção',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCancelCorrectionRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { id: string; cardId: string | null }) => {
      const { error } = await supabase
        .from(TABLE)
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', params.id);
      if (error) throw error;
      if (params.cardId) {
        await logCardActivity({
          cardId: params.cardId,
          actorUserId: user?.id,
          eventType: 'comment_added',
          title: 'Solicitação de correção cancelada',
          metadata: { kind: 'correction_canceled' },
        });
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['correction-requests', 'card', vars.cardId] });
      toast({ title: 'Solicitação cancelada.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao cancelar', description: err.message, variant: 'destructive' });
    },
  });
}

export const SECTION_LABELS: Record<CorrectionSection, string> = {
  locatario_principal: 'Dados do locatário principal',
  locatario_adicional: 'Dados do locatário adicional',
  conjuge: 'Cônjuge',
  fiador: 'Fiador',
  documentos: 'Documentos',
  garantia: 'Garantia',
  negociacao: 'Negociação',
  outro: 'Outro',
};