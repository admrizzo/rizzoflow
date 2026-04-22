import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RegisteredProvider {
  id: string;
  name: string;
  phone: string | null;
  specialty: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  public_token: string;
  slug: string;
}

export function useProviderRegistry(includeInactive = false) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['provider-registry', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('provider_registry')
        .select('*')
        .order('name');
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as RegisteredProvider[];
    },
  });

  const addProvider = useMutation({
    mutationFn: async (provider: { name: string; phone?: string; specialty?: string; notes?: string; created_by?: string }) => {
      const slug = provider.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data, error } = await supabase
        .from('provider_registry')
        .insert({ ...provider, slug })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-registry'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao cadastrar prestador', description: error.message, variant: 'destructive' });
    },
  });

  const updateProvider = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RegisteredProvider> & { id: string }) => {
      const { data, error } = await supabase
        .from('provider_registry')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-registry'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar prestador', description: error.message, variant: 'destructive' });
    },
  });

  return { providers, isLoading, addProvider, updateProvider };
}
