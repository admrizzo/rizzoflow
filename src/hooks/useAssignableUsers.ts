import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';

export interface AssignableUser {
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  roles: AppRole[];
}

const ASSIGNABLE_ROLES: AppRole[] = ['admin', 'gestor', 'corretor', 'administrativo'];

/**
 * Lista todos os usuários internos ativos (com qualquer papel relevante)
 * que podem ser atribuídos como responsáveis por uma proposta/card.
 *
 * Usa as tabelas `user_roles` + `profiles` (legíveis por todos os membros
 * da equipe via RLS), portanto não exige privilégio de admin.
 */
export function useAssignableUsers() {
  const query = useQuery({
    queryKey: ['assignable-users'],
    queryFn: async (): Promise<AssignableUser[]> => {
      const { data: roleRows, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ASSIGNABLE_ROLES);
      if (rolesError) throw rolesError;

      const rolesByUser = new Map<string, AppRole[]>();
      (roleRows ?? []).forEach((r: any) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        rolesByUser.set(r.user_id, arr);
      });

      const userIds = Array.from(rolesByUser.keys());
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds)
        .order('full_name');
      if (profilesError) throw profilesError;

      return (profiles ?? []).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        roles: rolesByUser.get(p.user_id) ?? [],
      }));
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}