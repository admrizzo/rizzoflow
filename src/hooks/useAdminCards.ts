import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminCard, AdminTaskCategory, AdminChecklistItem } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

// Helper to convert Json to AdminChecklistItem[]
function parseChecklistItems(items: Json | null): AdminChecklistItem[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map(item => {
    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      return {
        content: String((item as Record<string, unknown>).content || ''),
        is_completed: Boolean((item as Record<string, unknown>).is_completed),
        completed_at: (item as Record<string, unknown>).completed_at as string | null | undefined,
      };
    }
    return { content: '', is_completed: false };
  });
}

// Helper to convert AdminChecklistItem[] to Json
function serializeChecklistItems(items: AdminChecklistItem[]): Json {
  return items.map(item => ({
    content: item.content,
    is_completed: item.is_completed,
    completed_at: item.completed_at || null,
  })) as Json;
}

export function useAdminCards(userId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['admin-cards', userId],
    queryFn: async () => {
      let query = supabase
        .from('admin_cards')
        .select('*')
        .order('started_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.map(item => ({
        ...item,
        checklist_items: parseChecklistItems(item.checklist_items as Json),
      })) as AdminCard[];
    },
  });

  const createCard = useMutation({
    mutationFn: async (cardData: {
      title: string;
      description?: string;
      category: AdminTaskCategory;
      task_type_id?: string;
      checklist_items?: AdminChecklistItem[];
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('admin_cards')
        .insert({ 
          title: cardData.title,
          description: cardData.description,
          category: cardData.category,
          task_type_id: cardData.task_type_id,
          user_id: user.id,
          checklist_items: serializeChecklistItems(cardData.checklist_items || []),
        })
        .select()
        .single();
      
      if (error) throw error;
      return {
        ...data,
        checklist_items: parseChecklistItems(data.checklist_items as Json),
      } as AdminCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] });
      toast({ title: 'Tarefa criada com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar tarefa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateCard = useMutation({
    mutationFn: async ({ id, checklist_items, ...updates }: Partial<AdminCard> & { id: string }) => {
      const updatePayload: Record<string, unknown> = { ...updates };
      if (checklist_items) {
        updatePayload.checklist_items = serializeChecklistItems(checklist_items);
      }

      const { data, error } = await supabase
        .from('admin_cards')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return {
        ...data,
        checklist_items: parseChecklistItems(data.checklist_items as Json),
      } as AdminCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar tarefa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const completeCard = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('admin_cards')
        .update({ 
          status: 'concluido',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return {
        ...data,
        checklist_items: parseChecklistItems(data.checklist_items as Json),
      } as AdminCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] });
      toast({ title: 'Tarefa concluída!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao concluir tarefa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const cancelCard = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from('admin_cards')
        .update({ 
          status: 'cancelado',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return {
        ...data,
        checklist_items: parseChecklistItems(data.checklist_items as Json),
      } as AdminCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] });
      toast({ title: 'Tarefa cancelada!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao cancelar tarefa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateChecklist = useMutation({
    mutationFn: async ({ id, checklist_items }: { id: string; checklist_items: AdminChecklistItem[] }) => {
      const { data, error } = await supabase
        .from('admin_cards')
        .update({ checklist_items: serializeChecklistItems(checklist_items) })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return {
        ...data,
        checklist_items: parseChecklistItems(data.checklist_items as Json),
      } as AdminCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar checklist', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Get cards grouped by status
  const cardsByStatus = {
    em_andamento: cards.filter(c => c.status === 'em_andamento'),
    concluido: cards.filter(c => c.status === 'concluido'),
    cancelado: cards.filter(c => c.status === 'cancelado'),
  };

  return {
    cards,
    cardsByStatus,
    isLoading,
    createCard,
    updateCard,
    completeCard,
    cancelCard,
    updateChecklist,
  };
}
