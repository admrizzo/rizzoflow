import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface UserBoard {
  id: string;
  user_id: string;
  board_id: string;
  is_board_admin: boolean;
  created_at: string;
  created_by: string | null;
}

export function useUserBoards(boardId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  // Get users assigned to a specific board
  const { data: boardUsers = [], isLoading: isLoadingBoardUsers } = useQuery({
    queryKey: ['user-boards', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      
      const { data, error } = await supabase
        .from('user_boards')
        .select('*')
        .eq('board_id', boardId);
      
      if (error) throw error;
      return data as UserBoard[];
    },
    enabled: !!boardId,
  });

  // Get all user-board assignments (for admin) - only fetch if admin
  const { data: allUserBoards = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['all-user-boards', isAdmin],
    queryFn: async () => {
      // Only super admins can see all user-board assignments
      if (!isAdmin) return [];
      
      const { data, error } = await supabase
        .from('user_boards')
        .select('*');
      
      if (error) throw error;
      return data as UserBoard[];
    },
    enabled: isAdmin,
  });

  // Get current user's own board assignments (for non-super-admins to check their board admin status)
  const { data: myUserBoards = [] } = useQuery({
    queryKey: ['my-user-boards', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_boards')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as UserBoard[];
    },
    enabled: !!user && !isAdmin,
  });

  // Get boards where current user is admin
  const { data: adminBoards = [] } = useQuery({
    queryKey: ['admin-boards', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Super admins manage all boards
      if (isAdmin) {
        const { data, error } = await supabase
          .from('boards')
          .select('id')
          .eq('is_active', true);
        
        if (error) throw error;
        return data.map(b => b.id);
      }
      
      // Board admins only see their boards
      const { data, error } = await supabase
        .from('user_boards')
        .select('board_id')
        .eq('user_id', user.id)
        .eq('is_board_admin', true);
      
      if (error) throw error;
      return data.map(ub => ub.board_id);
    },
    enabled: !!user,
  });

  const addUserToBoard = useMutation({
    mutationFn: async ({ userId, boardId, isBoardAdmin = false }: { userId: string; boardId: string; isBoardAdmin?: boolean }) => {
      const { data, error } = await supabase
        .from('user_boards')
        .insert({ user_id: userId, board_id: boardId, is_board_admin: isBoardAdmin })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-boards', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['all-user-boards'] });
      queryClient.invalidateQueries({ queryKey: ['admin-boards'] });
      queryClient.invalidateQueries({ queryKey: ['my-user-boards'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.invalidateQueries({ queryKey: ['internal-users'] });
      toast({ title: 'Acesso concedido!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao conceder acesso', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const removeUserFromBoard = useMutation({
    mutationFn: async ({ userId, boardId }: { userId: string; boardId: string }) => {
      const { error } = await supabase
        .from('user_boards')
        .delete()
        .eq('user_id', userId)
        .eq('board_id', boardId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-boards', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['all-user-boards'] });
      queryClient.invalidateQueries({ queryKey: ['admin-boards'] });
      queryClient.invalidateQueries({ queryKey: ['my-user-boards'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.invalidateQueries({ queryKey: ['internal-users'] });
      toast({ title: 'Acesso removido!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao remover acesso', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateBoardAdmin = useMutation({
    mutationFn: async ({ userId, boardId, isBoardAdmin }: { userId: string; boardId: string; isBoardAdmin: boolean }) => {
      const { error } = await supabase
        .from('user_boards')
        .update({ is_board_admin: isBoardAdmin })
        .eq('user_id', userId)
        .eq('board_id', boardId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-boards', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['all-user-boards'] });
      queryClient.invalidateQueries({ queryKey: ['admin-boards'] });
      queryClient.invalidateQueries({ queryKey: ['my-user-boards'] });
      queryClient.invalidateQueries({ queryKey: ['internal-users'] });
      toast({ title: variables.isBoardAdmin ? 'Promovido a administrador do fluxo!' : 'Removido de administrador do fluxo!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar permissão', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Helper to check if user has access to a board
  const hasAccess = (userId: string, checkBoardId: string) => {
    return allUserBoards.some(ub => ub.user_id === userId && ub.board_id === checkBoardId);
  };

  // Helper to check if user is board admin
  const isBoardAdmin = (userId: string, checkBoardId: string) => {
    // For super admins, check allUserBoards; for others, check their own boards
    const boardsToCheck = isAdmin ? allUserBoards : (userId === user?.id ? myUserBoards : allUserBoards);
    return boardsToCheck.some(ub => ub.user_id === userId && ub.board_id === checkBoardId && ub.is_board_admin);
  };

  // Check if current user can manage a specific board
  const canManageBoard = (checkBoardId: string) => {
    return adminBoards.includes(checkBoardId);
  };

  return {
    boardUsers,
    allUserBoards,
    adminBoards,
    isLoading: isLoadingBoardUsers || isLoadingAll,
    addUserToBoard,
    removeUserFromBoard,
    updateBoardAdmin,
    hasAccess,
    isBoardAdmin,
    canManageBoard,
  };
}
