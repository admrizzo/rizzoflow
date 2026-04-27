import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Broker {
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
}

/**
 * Lista todos os usuários com papel 'corretor' (sincronizado em tempo real
 * com a tabela user_roles + profiles). Acessível a qualquer membro da equipe.
 */
export function useBrokers() {
  const query = useQuery({
    queryKey: ['brokers'],
    queryFn: async (): Promise<Broker[]> => {
      const { data: roleRows, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'corretor');
      if (rolesError) throw rolesError;

      const userIds = (roleRows ?? []).map((r) => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds)
        .order('full_name');
      if (profilesError) throw profilesError;

      return (profiles ?? []) as Broker[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  return {
    brokers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}