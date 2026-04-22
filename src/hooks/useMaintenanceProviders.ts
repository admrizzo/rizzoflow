import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaintenanceProvider {
  id: string;
  card_id: string;
  provider_name: string;
  provider_phone: string | null;
  budget_value: number | null;
  budget_status: string;
  budget_sent_at: string | null;
  budget_received_at: string | null;
  is_selected: boolean;
  payment_status: string;
  payment_value: number | null;
  payment_responsible: string;
  payment_method: string | null;
  payment_notes: string | null;
  reimbursement_status: string | null;
  paid_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  payment_status_changed_by: string | null;
  payment_status_changed_at: string | null;
  reimbursement_status_changed_by: string | null;
  reimbursement_status_changed_at: string | null;
  service_completed_at: string | null;
  service_completed_by: string | null;
  service_category: string | null;
  budget_deadline: string | null;
  agreed_value: number | null;
  completion_deadline: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

export function useMaintenanceProviders(cardId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['maintenance-providers', cardId],
    queryFn: async () => {
      if (!cardId) return [];
      const { data, error } = await supabase
        .from('maintenance_providers')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at');
      if (error) throw error;
      return data as MaintenanceProvider[];
    },
    enabled: !!cardId,
  });

  const addProvider = useMutation({
    mutationFn: async (provider: {
      card_id: string;
      provider_name: string;
      provider_phone?: string;
      notes?: string;
      created_by?: string;
      service_category?: string;
      budget_deadline?: string;
    }) => {
      const { data, error } = await supabase
        .from('maintenance_providers')
        .insert({ ...provider, budget_status: 'enviado', budget_sent_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-providers', cardId] });
      toast({ title: 'Prestador adicionado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao adicionar prestador', description: error.message, variant: 'destructive' });
    },
  });

  const updateProvider = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaintenanceProvider> & { id: string }) => {
      const { data, error } = await supabase
        .from('maintenance_providers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-providers', cardId] });
      queryClient.invalidateQueries({ queryKey: ['selected-providers-board'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar prestador', description: error.message, variant: 'destructive' });
    },
  });

  const removeProvider = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenance_providers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-providers', cardId] });
      toast({ title: 'Prestador removido!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover prestador', description: error.message, variant: 'destructive' });
    },
  });

  const selectedProvider = providers.find(p => p.is_selected);
  const pendingBudgets = providers.filter(p => p.budget_status === 'pendente' || p.budget_status === 'enviado').length;
  const receivedBudgets = providers.filter(p => p.budget_status === 'recebido' || p.budget_status === 'aprovado');
  const cheapestBudget = receivedBudgets.length > 0
    ? receivedBudgets.reduce((min, p) => (p.budget_value !== null && (min === null || p.budget_value < min)) ? p.budget_value : min, null as number | null)
    : null;

  // Determine current stage
  const stage: 'sem_prestador' | 'cotando' | 'recebido' | 'definido' | 'servico_concluido' | 'pago' = (() => {
    if (providers.length === 0) return 'sem_prestador';
    if (selectedProvider?.payment_status === 'pago') return 'pago';
    if (selectedProvider?.service_completed_at) return 'servico_concluido';
    if (selectedProvider) return 'definido';
    if (receivedBudgets.length > 0) return 'recebido';
    return 'cotando';
  })();

  return {
    providers,
    isLoading,
    addProvider,
    updateProvider,
    removeProvider,
    selectedProvider,
    pendingBudgets,
    receivedBudgets,
    cheapestBudget,
    stage,
  };
}

// Hook for provider report (cross-card data)
export function useProviderReport(providerName?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['provider-report', providerName, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_providers')
        .select(`
          *,
          cards!inner(id, title, superlogica_id, address, board_id, card_number)
        `)
        .order('created_at', { ascending: false });

      if (providerName) {
        query = query.ilike('provider_name', `%${providerName}%`);
      }
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!providerName,
  });
}

// Hook to get all unique provider names for search
export function useProviderNames() {
  return useQuery({
    queryKey: ['provider-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_providers')
        .select('provider_name')
        .order('provider_name');
      if (error) throw error;
      const unique = [...new Set(data.map(d => d.provider_name))];
      return unique;
    },
  });
}
