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
  raw_data?: any;
}

export function useProperties() {
  return usePropertiesBase();
}

export function usePropertiesLocacao() {
  return usePropertiesBase('locacao');
}

function usePropertiesBase(finalidade?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', finalidade || 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('codigo_robust');
      if (error) throw error;
      let results = data as Property[];
      if (finalidade) {
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const needle = normalize(finalidade);
        results = results.filter(p => p.finalidade && normalize(p.finalidade).includes(needle));
      }
      return results;
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