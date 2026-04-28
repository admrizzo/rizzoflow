import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Assina mudanças em user_boards e user_roles do usuário logado e
 * invalida queries relevantes para que o Dashboard reflita imediatamente
 * quando o admin alterar acessos ou papéis.
 */
export function useMyAccessRealtime() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`my-access-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_boards',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['boards'] });
          queryClient.invalidateQueries({ queryKey: ['user-boards'] });
          queryClient.invalidateQueries({ queryKey: ['my-user-boards'] });
          queryClient.invalidateQueries({ queryKey: ['admin-boards'] });
          toast.success('Seus acessos foram atualizados', {
            description: 'A lista de fluxos disponíveis foi atualizada.',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['boards'] });
          queryClient.invalidateQueries({ queryKey: ['user-roles'] });
          queryClient.invalidateQueries({ queryKey: ['internal-users'] });
          // Recarrega o perfil/roles do AuthContext
          void refreshProfile();
          toast.info('Suas permissões foram atualizadas', {
            description: 'Recarregue a página se algo não atualizar.',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, refreshProfile]);
}