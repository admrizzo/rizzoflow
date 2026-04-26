import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCardQueries } from '@/lib/queryInvalidation';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useProfiles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      return data as Profile[];
    },
    staleTime: 300000, // Cache for 5 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });

  const addMemberToCard = useMutation({
    mutationFn: async ({ cardId, userId }: { cardId: string; userId: string }) => {
      const { error } = await supabase
        .from('card_members')
        .insert({ card_id: cardId, user_id: userId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
      toast({ title: 'Membro adicionado!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao adicionar membro', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const removeMemberFromCard = useMutation({
    mutationFn: async ({ cardId, userId }: { cardId: string; userId: string }) => {
      const { error } = await supabase
        .from('card_members')
        .delete()
        .eq('card_id', cardId)
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
      toast({ title: 'Membro removido!' });
    },
  });

  return {
    profiles,
    isLoading,
    addMemberToCard,
    removeMemberFromCard,
  };
}
