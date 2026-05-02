import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header, FilterState } from '@/components/layout';
import { BoardSelector } from '@/components/layout/BoardSelector';
import { FlowsOverview } from '@/components/layout/FlowsOverview';
import { GlobalSearchResults } from '@/components/layout/GlobalSearchResults';
import { KanbanBoard, ArchivedCardsView } from '@/components/kanban';
import { CardStatesLegend } from '@/components/kanban/CardStatesLegend';
import { ProviderDashboard } from '@/components/kanban/maintenance/ProviderDashboard';
import { useBoards } from '@/hooks/useBoards';
import { useArchivedViewState } from '@/hooks/useArchivedViewState';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Board } from '@/types/database';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Users } from 'lucide-react';
import { NewProposalButton } from '@/components/kanban/NewProposalButton';
import { perfMark, perfMeasure } from '@/lib/perfMark';
import { usePermissions } from '@/hooks/usePermissions';
import { useMyAccessRealtime } from '@/hooks/useMyAccessRealtime';
import { useOperationalRealtime } from '@/hooks/useOperationalRealtime';

const SELECTED_BOARD_KEY = 'fluxos-sg-selected-board';

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { boards, isLoading: boardsLoading } = useBoards();
  const queryClient = useQueryClient();
  const { isCorretor, canCreateProposal } = usePermissions();

  // Reflete em tempo real alterações de papel/acessos feitas pelo admin
  useMyAccessRealtime();

  // Realtime operacional centralizado: cards, propostas, documentos,
  // checklists, comentários, atividade, prazos, responsáveis e permissões.
  useOperationalRealtime();

  // Medição em dev: tempo até Dashboard pronto.
  useEffect(() => {
    perfMark('dashboard:mount');
  }, []);
  useEffect(() => {
    if (!authLoading && !boardsLoading) {
      perfMeasure('dashboard:ready', 'dashboard:mount');
    }
  }, [authLoading, boardsLoading]);

  // Prefetch dos chunks mais usados após o Dashboard montar.
  // Isso elimina a latência de download na primeira navegação para
  // /minha-fila e /central-propostas (reload direto na rota ainda paga
  // o download, mas navegação interna fica instantânea).
  useEffect(() => {
    if (authLoading || boardsLoading) return;
    const idle =
      typeof (window as any).requestIdleCallback === 'function'
        ? (window as any).requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 200);
    idle(() => {
      void import('./MinhaFila');
      void import('./CentralPropostas');
    });
  }, [authLoading, boardsLoading]);

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

  // Persistência do card aberto via URL (?card=ID).
  // - Trocar de aba/janela e voltar mantém o card aberto.
  // - Reload na URL com ?card=ID reabre o card automaticamente.
  // - Fechar o card remove o parâmetro.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCardId = searchParams.get('card');

  // Quando a URL traz ?card=ID, propaga para o Kanban via initialCardId.
  useEffect(() => {
    if (urlCardId) {
      setPendingCardId(urlCardId);
    }
  }, [urlCardId]);

  const setUrlCardId = useCallback((id: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set('card', id);
        else next.delete('card');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

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
      setUrlCardId(cardId);
    }
  }, [boards, handleSelectBoard, setUrlCardId]);

  // Clear pending card after it's been opened
  const handleCardOpened = useCallback(() => {
    setPendingCardId(null);
    // Garante que a URL reflete o card aberto, mesmo quando a abertura
    // veio de uma notificação (não da URL).
    if (urlCardId !== pendingCardId && pendingCardId) {
      setUrlCardId(pendingCardId);
    }
  }, [pendingCardId, urlCardId, setUrlCardId]);

  const handleCardClosed = useCallback(() => {
    setUrlCardId(null);
  }, [setUrlCardId]);

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

  return (
    <div className="min-h-screen bg-background">
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
         rightSlot={
           selectedBoard?.name?.toLowerCase().includes('locação') && canCreateProposal
             ? <NewProposalButton compact />
             : undefined
         }
      />

      {/* Fina linha de cor do board selecionado — preserva identidade visual sem poluir o chrome */}
      {selectedBoard && (
        <div
          className="h-[2px] w-full"
          style={{ backgroundColor: selectedBoard.color }}
          aria-hidden="true"
        />
      )}

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

              {/* Legenda dos estados visuais — exibida acima do Kanban (apenas Locação) */}
              {selectedBoard.name?.toLowerCase().includes('locação') && (
                <CardStatesLegend />
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
                  onCardClosed={handleCardClosed}
                />
              )}
            </>
          )
        ) : (
          <>
            {/* Corretor sem board selecionado: garantir acesso ao botão de proposta */}
            {isCorretor && canCreateProposal && (
              <div className="flex items-center justify-center gap-1 px-3 pt-4">
                <NewProposalButton />
              </div>
            )}
            <FlowsOverview
              boards={boards}
              onSelectBoard={handleSelectBoard}
              cardCounts={cardCounts}
              isLoading={boardsLoading}
            />
          </>
        )}
      </main>
    </div>
  );
}

