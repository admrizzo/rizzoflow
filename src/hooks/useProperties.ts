import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Property {
  id: string;
  codigo_robust: number;
  titulo: string | null;
  tipo_imovel: string | null;
  finalidade: string | null;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  numero: string | null;
  complemento: string | null;
  valor_aluguel: number | null;
  valor_venda: number | null;
  condominio: number | null;
  iptu: number | null;
  seguro_incendio: number | null;
  status_imovel: number | null;
  foto_principal: string | null;
  last_synced_at: string;
}

export function useProperties() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('codigo_robust');
      if (error) throw error;
      return data as Property[];
    },
    staleTime: 60000, // 1 min cache
  });

  const syncProperties = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-properties');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({
        title: 'Imóveis sincronizados!',
        description: `${data.upserted} imóveis atualizados do CRM.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro na sincronização',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return { properties, isLoading, syncProperties };
}