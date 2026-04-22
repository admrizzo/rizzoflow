import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface UserRoleWithProfile {
  user_id: string;
  role: AppRole;
  profile?: {
    full_name: string;
    department: string | null;
  };
}

export function useUserRoles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (error) throw error;
      return data as UserRoleWithProfile[];
    },
  });

  const setUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First, delete any existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;

      // Then insert the new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: 'Função do usuário atualizada!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar função', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const removeUserRole = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: 'Acesso do usuário removido!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao remover acesso', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const getUserRole = (userId: string): AppRole | null => {
    const userRole = userRoles.find(ur => ur.user_id === userId);
    return userRole?.role || null;
  };

  return {
    userRoles,
    isLoading,
    setUserRole,
    removeUserRole,
    getUserRole,
  };
}
