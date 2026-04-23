import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProposalPageConfig {
  branding: {
    primary_color: string;
    logo_url: string;
    company_name: string;
    page_title: string;
    page_subtitle: string;
  };
  steps: Array<{ key: string; label: string; enabled: boolean }>;
  garantia_options: Array<{
    value: string;
    icon: string;
    badge: string | null;
    subtitle: string;
    detail: string;
    estimatePercent: number;
    vantagens: string[];
    atencao: string[];
    enabled: boolean;
  }>;
  texts: Record<string, string>;
  doc_categories: Array<{ key: string; label: string; help: string; enabled: boolean }>;
  faq: Array<{ question: string; answer: string }>;
}

const DEFAULT_CONFIG: ProposalPageConfig = {
  branding: { primary_color: '#16a34a', logo_url: '', company_name: '', page_title: 'Proposta de Locação', page_subtitle: 'Preencha os dados abaixo para enviar sua proposta' },
  steps: [],
  garantia_options: [],
  texts: {},
  doc_categories: [],
  faq: [],
};

export function useProposalPageConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery({
    queryKey: ['proposal-page-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_page_config')
        .select('config_data')
        .eq('id', 'main')
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_CONFIG;
      return data.config_data as unknown as ProposalPageConfig;
    },
    staleTime: 60000,
  });

  const updateConfig = useMutation({
    mutationFn: async (newConfig: ProposalPageConfig) => {
      const { error } = await supabase
        .from('proposal_page_config')
        .upsert({ id: 'main', config_data: newConfig as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-page-config'] });
      toast({ title: 'Configuração salva com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  return { config: config || DEFAULT_CONFIG, isLoading, updateConfig };
}