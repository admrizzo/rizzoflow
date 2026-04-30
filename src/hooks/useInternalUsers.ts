import { useEffect } from 'react';
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
  avatar_url?: string | null;
  must_change_password?: boolean;
  last_sign_in_at?: string | null;
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

  // Realtime: qualquer alteração em profiles / user_roles / user_boards
  // invalida a lista para refletir sem F5.
  useEffect(() => {
    const channel = supabase
      .channel('admin-users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['internal-users'] });
        queryClient.invalidateQueries({ queryKey: ['profiles'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['internal-users'] });
        queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_boards' }, () => {
        queryClient.invalidateQueries({ queryKey: ['internal-users'] });
        queryClient.invalidateQueries({ queryKey: ['all-user-boards'] });
        queryClient.invalidateQueries({ queryKey: ['my-user-boards'] });
        queryClient.invalidateQueries({ queryKey: ['admin-boards'] });
        queryClient.invalidateQueries({ queryKey: ['boards'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  /**
   * Admin redefine a senha de um usuário interno.
   * Chama a Edge Function admin-reset-password (Service Role no servidor).
   */
  const resetUserPassword = useMutation({
    mutationFn: async ({
      userId,
      password,
      mustChangePassword,
    }: { userId: string; password: string; mustChangePassword: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          user_id: userId,
          password,
          must_change_password: mustChangePassword,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['internal-users'] });
      toast.success(
        variables.mustChangePassword
          ? 'Senha redefinida. O usuário precisará criar uma nova no próximo acesso.'
          : 'Senha redefinida com sucesso.',
      );
    },
    onError: (err: Error) => {
      toast.error('Erro ao redefinir senha', { description: err.message });
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
    resetUserPassword,
  };
}