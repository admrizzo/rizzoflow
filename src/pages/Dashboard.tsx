import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header, FilterState } from '@/components/layout';
import { BoardSelector } from '@/components/layout/BoardSelector';
import { FlowsOverview } from '@/components/layout/FlowsOverview';
import { GlobalSearchResults } from '@/components/layout/GlobalSearchResults';
import { KanbanBoard, ArchivedCardsView } from '@/components/kanban';
import { ProviderDashboard } from '@/components/kanban/maintenance/ProviderDashboard';
import { useBoards } from '@/hooks/useBoards';
import { useArchivedViewState } from '@/hooks/useArchivedViewState';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Board } from '@/types/database';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Users } from 'lucide-react';
import { NewProposalButton } from '@/components/kanban/NewProposalButton';

const SELECTED_BOARD_KEY = 'fluxos-sg-selected-board';

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { boards, isLoading: boardsLoading } = useBoards();
  const queryClient = useQueryClient();
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [initialBoardLoaded, setInitialBoardLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    guaranteeType: null,
    contractType: null,
    labelId: null,
    memberId: null,
    proposalResponsible: null,
    showArchived: false,
    ownerId: null,
    creatorId: null,
    deadlineStatus: null,
    providerName: null,
  });

  // Keep last known counts to avoid UI “blinking to zero” during refetches
  const [stableCardCounts, setStableCardCounts] = useState<Record<string, number>>({});

  // View mode for maintenance board (kanban vs providers dashboard)
  const [maintenanceView, setMaintenanceView] = useState<'kanban' | 'prestadores'>('kanban');

  // State for opening a card directly from notification
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);

  // Persisted archived view state per board
  const { showArchivedView, toggleArchivedView } = useArchivedViewState(selectedBoard?.id ?? null);

  // ESC key to exit archived view
  useEffect(() => {
    if (!showArchivedView) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleArchivedView();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showArchivedView, toggleArchivedView]);

  // Fetch card counts for all boards (only non-archived cards) - one count query per board
  const { data: cardCounts = {} } = useQuery({
    queryKey: ['card-counts', boards.map(b => b.id).join(',')],
    queryFn: async () => {
      const boardIds = boards.map(b => b.id);
      if (boardIds.length === 0) return {};

      // Use parallel count queries instead of fetching all rows
      const counts: Record<string, number> = {};
      const promises = boardIds.map(async (boardId) => {
        const { count, error } = await supabase
          .from('cards')
          .select('*', { count: 'exact', head: true })
          .eq('is_archived', false)
          .eq('board_id', boardId);
        
        if (!error && count !== null) {
          counts[boardId] = count;
        }
      });
      
      await Promise.all(promises);
      return counts;
    },
    enabled: boards.length > 0,
    staleTime: 120000, // Cache for 2 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 300000, // Refresh every 5 minutes
    placeholderData: (prev) => prev ?? {},
    retry: 1,
  });

  useEffect(() => {
    if (cardCounts && Object.keys(cardCounts).length > 0) {
      setStableCardCounts(cardCounts);
    }
  }, [cardCounts]);

  // Fetch archived cards count for selected board or all boards
  const { data: archivedCount = 0 } = useQuery({
    queryKey: ['archived-count', selectedBoard?.id, boards.map(b => b.id).join(',')],
    queryFn: async () => {
      if (selectedBoard) {
        const { count, error } = await supabase
          .from('cards')
          .select('*', { count: 'exact', head: true })
          .eq('is_archived', true)
          .eq('board_id', selectedBoard.id);
        
        if (error) throw error;
        return count || 0;
      } else {
        // Count archived cards across all accessible boards
        const boardIds = boards.map(b => b.id);
        if (boardIds.length === 0) return 0;

        const { count, error } = await supabase
          .from('cards')
          .select('*', { count: 'exact', head: true })
          .eq('is_archived', true)
          .in('board_id', boardIds);
        
        if (error) throw error;
        return count || 0;
      }
    },
    enabled: !!selectedBoard || boards.length > 0,
    staleTime: 120000, // Cache for 2 minutes
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Load saved board from localStorage on mount
  useEffect(() => {
    if (boards.length > 0 && !initialBoardLoaded) {
      const savedBoardId = localStorage.getItem(SELECTED_BOARD_KEY);
      if (savedBoardId) {
        const savedBoard = boards.find(b => b.id === savedBoardId);
        if (savedBoard) {
          setSelectedBoard(savedBoard);
        }
      }
      setInitialBoardLoaded(true);
    }
  }, [boards, initialBoardLoaded]);

  // Save selected board to localStorage
  const handleSelectBoard = useCallback((board: Board | null) => {
    setSelectedBoard(board);
    if (board) {
      localStorage.setItem(SELECTED_BOARD_KEY, board.id);
    } else {
      localStorage.removeItem(SELECTED_BOARD_KEY);
    }
  }, []);

  // Handle opening a card from notification
  const handleOpenCardFromNotification = useCallback((cardId: string, boardId: string) => {
    // Find the board and select it
    const targetBoard = boards.find(b => b.id === boardId);
    if (targetBoard) {
      handleSelectBoard(targetBoard);
      setPendingCardId(cardId);
    }
  }, [boards, handleSelectBoard]);

  // Clear pending card after it's been opened
  const handleCardOpened = useCallback(() => {
    setPendingCardId(null);
  }, []);

  // Set up realtime subscriptions for instant updates across all users
  useEffect(() => {
    if (!selectedBoard) return;

    // Debounce invalidation to avoid overwhelming the client with rapid changes
    let invalidationTimer: ReturnType<typeof setTimeout> | null = null;
    const pendingInvalidations = new Set<string>();

    const scheduleInvalidation = (...keys: string[]) => {
      keys.forEach(k => pendingInvalidations.add(k));
      if (invalidationTimer) clearTimeout(invalidationTimer);
      invalidationTimer = setTimeout(() => {
        pendingInvalidations.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
        pendingInvalidations.clear();
      }, 500); // Batch invalidations within 500ms
    };

    const channel = supabase
      .channel(`board-realtime-${selectedBoard.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${selectedBoard.id}` },
        () => scheduleInvalidation('cards', 'card-counts', 'archived-count')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'columns', filter: `board_id=eq.${selectedBoard.id}` },
        () => scheduleInvalidation('columns')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => scheduleInvalidation('comments')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklist_items' },
        () => scheduleInvalidation('checklists', 'cards')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklists' },
        () => scheduleInvalidation('checklists', 'cards')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'card_labels' },
        () => scheduleInvalidation('cards')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'card_members' },
        () => scheduleInvalidation('cards')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comment_mentions' },
        () => scheduleInvalidation('mentions', 'notifications')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => scheduleInvalidation('notifications')
      )
      .subscribe();

    return () => {
      if (invalidationTimer) clearTimeout(invalidationTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient, selectedBoard]);

  if (authLoading || boardsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-foreground" />
      </div>
    );
  }

  // Determine background color - gray for overview, board color when selected
  const bgStyle = selectedBoard 
    ? { background: `linear-gradient(135deg, ${selectedBoard.color}, ${selectedBoard.color}dd)` }
    : { background: 'linear-gradient(135deg, #374151, #1f2937)' }; // Gray for overview

  return (
    <div 
      className="min-h-screen transition-colors duration-300"
      style={bgStyle}
    >
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        selectedBoard={selectedBoard}
        archivedCount={archivedCount}
        showArchivedView={showArchivedView}
        onToggleArchivedView={toggleArchivedView}
        onOpenCardFromNotification={handleOpenCardFromNotification}
      />
      
      <BoardSelector 
        boards={boards} 
        selectedBoard={selectedBoard} 
        onSelectBoard={handleSelectBoard}
         cardCounts={Object.keys(cardCounts).length > 0 ? cardCounts : stableCardCounts}
      />
      
      <main>
        {searchQuery.trim().length >= 2 ? (
          <GlobalSearchResults 
            searchQuery={searchQuery}
            boards={boards}
            onSelectBoard={(board) => {
              handleSelectBoard(board);
              setSearchQuery('');
            }}
            onOpenCard={(cardId, boardId) => {
              handleOpenCardFromNotification(cardId, boardId);
              setSearchQuery('');
            }}
            showArchived={filters.showArchived}
          />
        ) : selectedBoard ? (
          showArchivedView ? (
            <ArchivedCardsView
              board={selectedBoard}
              onClose={toggleArchivedView}
            />
          ) : (
            <>
              {/* Maintenance board tab toggle */}
              {selectedBoard.name?.toLowerCase().includes('manutenção') && (
                <div className="flex items-center gap-1 px-3 pt-2">
                  <Button
                    variant={maintenanceView === 'kanban' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setMaintenanceView('kanban')}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Kanban
                  </Button>
                  <Button
                    variant={maintenanceView === 'prestadores' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setMaintenanceView('prestadores')}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Painel dos Prestadores
                  </Button>
                </div>
              )}

              {/* "Gerar nova proposta" button for Central de Propostas board */}
              {selectedBoard.name?.toLowerCase().includes('locação') && (
                <div className="flex items-center gap-1 px-3 pt-2">
                  <NewProposalButton />
                </div>
              )}

              {selectedBoard.name?.toLowerCase().includes('manutenção') && maintenanceView === 'prestadores' ? (
                <ProviderDashboard 
                  boardId={selectedBoard.id} 
                  onOpenCard={(cardId) => {
                    setMaintenanceView('kanban');
                    setPendingCardId(cardId);
                  }}
                />
              ) : (
                <KanbanBoard 
                  board={selectedBoard} 
                  searchQuery={searchQuery}
                  filters={filters}
                  initialCardId={pendingCardId}
                  onCardOpened={handleCardOpened}
                />
              )}
            </>
          )
        ) : (
          <FlowsOverview 
            boards={boards}
            onSelectBoard={handleSelectBoard}
            cardCounts={cardCounts}
            isLoading={boardsLoading}
          />
        )}
      </main>
    </div>
  );
}

