import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CardFieldValue {
  id: string;
  card_id: string;
  field_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export function useCardFieldValues(cardId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: values = [], isLoading } = useQuery({
    queryKey: ['card-field-values', cardId],
    queryFn: async () => {
      if (!cardId) return [];
      
      const { data, error } = await supabase
        .from('card_field_values')
        .select('*')
        .eq('card_id', cardId);
      
      if (error) throw error;
      return data as CardFieldValue[];
    },
    enabled: !!cardId,
  });

  const upsertValue = useMutation({
    mutationFn: async ({ cardId, fieldId, value }: { cardId: string; fieldId: string; value: string | null }) => {
      // First try to update existing
      const { data: existing } = await supabase
        .from('card_field_values')
        .select('id')
        .eq('card_id', cardId)
        .eq('field_id', fieldId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('card_field_values')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('card_field_values')
          .insert({ card_id: cardId, field_id: fieldId, value })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['card-field-values', cardId] });
      // Also invalidate vacancy deadline values to update card display in kanban
      queryClient.invalidateQueries({ queryKey: ['vacancy-deadline-values'] });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao salvar valor', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const getValueForField = (fieldId: string): string | null => {
    const fieldValue = values.find(v => v.field_id === fieldId);
    return fieldValue?.value || null;
  };

  return {
    values,
    isLoading,
    upsertValue,
    getValueForField,
  };
}
