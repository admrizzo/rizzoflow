import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';
import { toast } from 'sonner';

export interface InternalUser {
  user_id: string;
  email: string;
  full_name: string;
  department: string | null;
  role: AppRole | null;
  created_at: string;
}

/**
 * Lista todos os usuários internos do sistema (auth.users + profiles + user_roles).
 * Apenas administradores recebem dados — a checagem é feita no backend (RPC SECURITY DEFINER).
 */
export function useInternalUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['internal-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_internal_users');
      if (error) throw error;
      return (data ?? []) as InternalUser[];
    },
    staleTime: 30_000,
  });

  const setUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.rpc('set_user_role', {
        _user_id: userId,
        _role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-boards'] });
      queryClient.invalidateQueries({ queryKey: ['my-user-boards'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast.success('Papel atualizado com sucesso');
    },
    onError: (err: Error) => {
      toast.error('Erro ao atualizar papel', { description: err.message });
    },
  });

  const removeUserRole = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await supabase.rpc('remove_user_role', {
        _user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-boards'] });
      queryClient.invalidateQueries({ queryKey: ['my-user-boards'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast.success('Acesso removido');
    },
    onError: (err: Error) => {
      toast.error('Erro ao remover acesso', { description: err.message });
    },
  });

  const adminCount = users.filter((u) => u.role === 'admin').length;

  return {
    users,
    isLoading,
    error,
    adminCount,
    setUserRole,
    removeUserRole,
  };
}