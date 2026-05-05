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
  captador_robust_id: string | null;
  captador_nome: string | null;
  captador_email: string | null;
  captador_phone: string | null;
  last_synced_at: string;
  raw_data?: any;
}

/**
 * Versão leve para listagens e seletor de imóvel.
 * NÃO traz `raw_data` (pode ser MB de JSON por imóvel).
 * Use `useProperties()` (completo) ou `useProperty(id)` quando precisar de raw_data.
 */
export type PropertyLight = Pick<
  Property,
  | 'id'
  | 'codigo_robust'
  | 'titulo'
  | 'tipo_imovel'
  | 'finalidade'
  | 'logradouro'
  | 'bairro'
  | 'cidade'
  | 'estado'
  | 'numero'
  | 'valor_aluguel'
  | 'valor_venda'
  | 'condominio'
  | 'iptu'
  | 'seguro_incendio'
  | 'status_imovel'
  | 'foto_principal'
  | 'captador_robust_id'
  | 'captador_nome'
  | 'captador_email'
  | 'captador_phone'
  | 'last_synced_at'
>;

const LIGHT_COLUMNS =
  'id, codigo_robust, titulo, tipo_imovel, finalidade, logradouro, bairro, cidade, estado, numero, valor_aluguel, valor_venda, condominio, iptu, seguro_incendio, status_imovel, foto_principal, captador_robust_id, captador_nome, captador_email, captador_phone, last_synced_at';

export function useProperties() {
  return usePropertiesBase();
}

 export function usePropertiesLocacao() {
   return usePropertiesBase('locacao_wide');
 }

/**
 * Hook leve para telas que listam imóveis (Central de Propostas, seletor no card,
 * dashboards). Não retorna `raw_data` nem mutation de sync.
 */
export function usePropertiesLight(finalidade?: string) {
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties-light', finalidade ?? 'all'],
    queryFn: async (): Promise<PropertyLight[]> => {
      const { data, error } = await supabase
        .from('properties')
        .select(LIGHT_COLUMNS)
        .order('codigo_robust');
      if (error) throw error;
      let results = (data ?? []) as PropertyLight[];
       if (finalidade) {
         const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
         
         const isLocacao = normalize(finalidade).includes('locacao');
         if (isLocacao) {
           const locacaoTerms = ['locacao', 'aluguel', 'mensal'];
           results = results.filter(p => {
             if (!p.finalidade) return false;
             const normalizedVal = normalize(p.finalidade);
             return locacaoTerms.some(term => normalizedVal.includes(term));
           });
         } else {
           const needle = normalize(finalidade);
           results = results.filter(p => p.finalidade && normalize(p.finalidade).includes(needle));
         }
       }
      return results;
    },
    staleTime: 60_000,
  });

  return { properties, isLoading };
}

/**
 * Carrega um único imóvel COM raw_data. Usar apenas quando o consumidor realmente
 * precisa do payload bruto (ex.: detalhe da proposta pública).
 */
export function useProperty(codigoRobust?: number | string | null) {
  return useQuery({
    queryKey: ['property', codigoRobust],
    enabled: codigoRobust != null && String(codigoRobust).length > 0,
    queryFn: async (): Promise<Property | null> => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('codigo_robust', Number(codigoRobust))
        .maybeSingle();
      if (error) throw error;
      return (data as Property) ?? null;
    },
    staleTime: 60_000,
  });
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
         
         if (finalidade === 'locacao_wide') {
           // Busca ampla por locação, incluindo variações comuns
           const locacaoTerms = ['locacao', 'aluguel', 'mensal'];
           results = results.filter(p => {
             if (!p.finalidade) return false;
             const normalizedVal = normalize(p.finalidade);
             return locacaoTerms.some(term => normalizedVal.includes(term));
           });
         } else {
           const needle = normalize(finalidade);
           results = results.filter(p => p.finalidade && normalize(p.finalidade).includes(needle));
         }
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
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['properties-light'] }),
        queryClient.invalidateQueries({ queryKey: ['property'] }),
        queryClient.invalidateQueries({ queryKey: ['public-property'] }),
        queryClient.invalidateQueries({ queryKey: ['proposal-negotiation-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['cards'] }),
        queryClient.invalidateQueries({ queryKey: ['my-queue'] }),
      ]);
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
