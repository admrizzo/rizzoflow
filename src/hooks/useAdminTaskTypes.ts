import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminTaskType, AdminTaskCategory } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useAdminTaskTypes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: taskTypes = [], isLoading } = useQuery({
    queryKey: ['admin-task-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_task_types')
        .select('*')
        .eq('is_active', true)
        .order('position');
      
      if (error) throw error;
      return data.map(item => ({
        ...item,
        checklist_items: Array.isArray(item.checklist_items) ? item.checklist_items : [],
      })) as AdminTaskType[];
    },
  });

  const createTaskType = useMutation({
    mutationFn: async (taskType: {
      name: string;
      description?: string;
      category: AdminTaskCategory;
      has_checklist?: boolean;
      checklist_items?: string[];
      estimated_minutes?: number;
    }) => {
      const maxPosition = taskTypes.length > 0 
        ? Math.max(...taskTypes.map(t => t.position)) + 1 
        : 0;

      const { data, error } = await supabase
        .from('admin_task_types')
        .insert({ 
          ...taskType, 
          position: maxPosition,
          checklist_items: taskType.checklist_items || [],
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-task-types'] });
      toast({ title: 'Tipo de tarefa criado com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar tipo de tarefa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateTaskType = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AdminTaskType> & { id: string }) => {
      const { data, error } = await supabase
        .from('admin_task_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-task-types'] });
      toast({ title: 'Tipo de tarefa atualizado!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar tipo de tarefa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteTaskType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_task_types')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-task-types'] });
      toast({ title: 'Tipo de tarefa arquivado!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao arquivar tipo de tarefa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    taskTypes,
    isLoading,
    createTaskType,
    updateTaskType,
    deleteTaskType,
  };
}
