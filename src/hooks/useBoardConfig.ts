import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BoardConfig } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useBoardConfig(boardId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery({
    queryKey: ['board-config', boardId],
    queryFn: async () => {
      if (!boardId) return null;
      
      const { data, error } = await supabase
        .from('board_config')
        .select('*')
        .eq('board_id', boardId)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no config exists, return default values
      if (!data) {
        return {
          id: '',
          board_id: boardId,
          show_guarantee_type: true,
          show_contract_type: true,
          show_robust_code: true,
          show_building_name: true,
          show_address: true,
          show_superlogica_id: true,
          show_proposal_responsible: true,
          show_document_deadline: true,
          show_negotiation_details: true,
          show_due_date: true,
          title_pattern: '{title}',
          creation_required_fields: [],
          show_financing_toggle: false,
          auto_create_parties: [],
          auto_apply_checklist_templates: [],
          owner_only_visibility: false,
          created_at: '',
          updated_at: '',
        } as BoardConfig;
      }
      
      return {
        ...data,
        creation_required_fields: Array.isArray(data.creation_required_fields) 
          ? data.creation_required_fields 
          : [],
        auto_create_parties: Array.isArray(data.auto_create_parties) 
          ? data.auto_create_parties 
          : [],
        auto_apply_checklist_templates: Array.isArray(data.auto_apply_checklist_templates) 
          ? data.auto_apply_checklist_templates 
          : [],
      } as BoardConfig;
    },
    enabled: !!boardId,
    staleTime: 120000, // Cache config for 2 minutes
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<BoardConfig>) => {
      if (!boardId) throw new Error('Board ID required');
      
      // Check if config exists
      const { data: existing } = await supabase
        .from('board_config')
        .select('id')
        .eq('board_id', boardId)
        .maybeSingle();
      
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('board_config')
          .update(updates)
          .eq('board_id', boardId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('board_config')
          .insert({ board_id: boardId, ...updates })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-config', boardId] });
      toast({ title: 'Configuração salva!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao salvar configuração', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    config,
    isLoading,
    updateConfig,
  };
}