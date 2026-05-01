import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useColumns } from '@/hooks/useColumns';
import { useCards } from '@/hooks/useCards';
import { useBoardFields } from '@/hooks/useBoardFields';
import { useBoardConfig } from '@/hooks/useBoardConfig';
import { useCardViews } from '@/hooks/useCardViews';
import { useAuth } from '@/contexts/AuthContext';
import { useUserBoards } from '@/hooks/useUserBoards';
import { useProfiles } from '@/hooks/useProfiles';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KanbanColumn } from './KanbanColumn';
import { AddColumnButton } from './AddColumnButton';
import { CardDetailDialog } from './CardDetailDialog';
import { CardWithRelations, Board } from '@/types/database';
import { FilterState } from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface KanbanBoardProps {
  board: Board;
  searchQuery?: string;
  filters?: FilterState;
  initialCardId?: string | null;
  onCardOpened?: () => void;
  /**
   * Disparado quando o card aberto é fechado pelo usuário (X / Esc / Voltar).
   * Usado pelo Dashboard para sincronizar o parâmetro `?card=` na URL.
   */
  onCardClosed?: () => void;
}

export function KanbanBoard({ board, searchQuery = '', filters, initialCardId, onCardOpened, onCardClosed }: KanbanBoardProps) {
  const { columns, isLoading: columnsLoading, reorderColumns } = useColumns(board.id);
  const { cards, isLoading: cardsLoading, moveCard } = useCards(board.id);
  const { fields } = useBoardFields(board.id);
  const { config: boardConfig } = useBoardConfig(board.id);
  const { hasUnseenChanges, markAsViewed } = useCardViews(board.id);
  const { isAdmin, user } = useAuth();
  const { isBoardAdmin } = useUserBoards();
  const { toast } = useToast();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  // Keep a stable snapshot so the dialog doesn't unmount if cards refetch momentarily
  const [selectedCardSnapshot, setSelectedCardSnapshot] = useState<CardWithRelations | null>(null);
  
  // Click-and-drag scroll state
  const boardRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const scrollTopRef = useRef(0);
  
  // Auto-scroll during card drag
  const isDraggingCardRef = useRef(false);
  const autoScrollIntervalRef = useRef<number | null>(null);
  // Check if this board has owner_only_visibility enabled
  const isCurrentUserBoardAdmin = user?.id ? isBoardAdmin(user.id, board.id) : false;
  const showOwnerAvatar = boardConfig?.owner_only_visibility && (isAdmin || isCurrentUserBoardAdmin);
  const { profiles } = useProfiles();

  // Build responsible names map: for each card, find the responsible based on column's default_responsible_id
  // or fall back to the first card member
  const responsibleNames = useMemo(() => {
    const map: Record<string, string> = {};
    cards.forEach(card => {
      // Priority 1: explicit responsible user assigned to the card
      if (card.responsible_user_profile?.full_name) {
        map[card.id] = card.responsible_user_profile.full_name;
        return;
      }
      if (card.responsible_user_id) {
        const profile = profiles.find(p => p.user_id === card.responsible_user_id);
        if (profile) {
          map[card.id] = profile.full_name;
          return;
        }
      }
      const col = columns.find(c => c.id === card.column_id);
      if (col?.default_responsible_id) {
        const profile = profiles.find(p => p.user_id === col.default_responsible_id);
        if (profile) {
          map[card.id] = profile.full_name;
          return;
        }
      }
      // Fallback to first member
      if (card.members && card.members.length > 0) {
        map[card.id] = card.members[0].full_name;
      }
    });
    return map;
  }, [cards, columns, profiles]);

  // When initialCardId changes (from notification), open that card
  useEffect(() => {
    if (initialCardId) {
      setSelectedCardId(initialCardId);
      onCardOpened?.();
    }
  }, [initialCardId, onCardOpened]);

  // Find the vacancy deadline field ID
  const vacancyDeadlineFieldId = useMemo(() => {
    const field = fields.find(f => 
      f.field_type === 'date' && f.field_name.toLowerCase().includes('desocupação')
    );
    return field?.id;
  }, [fields]);

  // Find the category field ID (for Manutenção board)
  const categoryFieldId = useMemo(() => {
    const field = fields.find(f => 
      f.field_type === 'select' && f.field_name.toLowerCase().includes('categoria')
    );
    return field?.id;
  }, [fields]);

  // Find the completion deadline field ID (for Manutenção board - "Previsão de Término")
  const completionDeadlineFieldId = useMemo(() => {
    const field = fields.find(f => 
      f.field_type === 'date' && f.field_name.toLowerCase().includes('previsão de término')
    );
    return field?.id;
  }, [fields]);

  // Find the budget deadline field ID (for Manutenção board - "Prazo para Orçamento")
  const budgetDeadlineFieldId = useMemo(() => {
    const field = fields.find(f => 
      f.field_type === 'date' && f.field_name.toLowerCase().includes('prazo para orçamento')
    );
    return field?.id;
  }, [fields]);

  // Fetch vacancy deadline values for all cards in this board
  const { data: vacancyDeadlineValues = {} } = useQuery({
    queryKey: ['vacancy-deadline-values', board.id, vacancyDeadlineFieldId],
    queryFn: async () => {
      if (!vacancyDeadlineFieldId) return {};
      
      const cardIds = cards.map(c => c.id);
      if (cardIds.length === 0) return {};

      const { data, error } = await supabase
        .from('card_field_values')
        .select('card_id, value')
        .eq('field_id', vacancyDeadlineFieldId)
        .in('card_id', cardIds);
      
      if (error) throw error;
      
      return data.reduce((acc, item) => {
        acc[item.card_id] = item.value;
        return acc;
      }, {} as Record<string, string | null>);
    },
    enabled: !!vacancyDeadlineFieldId && cards.length > 0,
  });

  // Fetch category field values for all cards (for Manutenção board)
  const { data: categoryValues = {} } = useQuery({
    queryKey: ['category-field-values', board.id, categoryFieldId],
    queryFn: async () => {
      if (!categoryFieldId) return {};
      
      const cardIds = cards.map(c => c.id);
      if (cardIds.length === 0) return {};

      const { data, error } = await supabase
        .from('card_field_values')
        .select('card_id, value')
        .eq('field_id', categoryFieldId)
        .in('card_id', cardIds);
      
      if (error) throw error;
      
      return data.reduce((acc, item) => {
        acc[item.card_id] = item.value;
        return acc;
      }, {} as Record<string, string | null>);
    },
    enabled: !!categoryFieldId && cards.length > 0,
  });

  // Fetch selected providers for all cards (for Manutenção board)
  const isMaintenanceBoard = board.name?.toLowerCase().includes('manutenção');
  const { data: selectedProviders = {} } = useQuery({
    queryKey: ['selected-providers-board', board.id],
    queryFn: async () => {
      const cardIds = cards.map(c => c.id);
      if (cardIds.length === 0) return {};

      const { data, error } = await supabase
        .from('maintenance_providers')
        .select('card_id, provider_name, budget_value, agreed_value, service_category')
        .eq('is_selected', true)
        .in('card_id', cardIds);
      
      if (error) throw error;
      
      return data.reduce((acc, item) => {
        acc[item.card_id] = {
          name: item.provider_name,
          value: (item as any).agreed_value ?? item.budget_value,
        };
        return acc;
      }, {} as Record<string, { name: string; value: number | null }>);
    },
    enabled: isMaintenanceBoard && cards.length > 0,
  });

  // Fetch ALL providers per card (for provider filter)
  const { data: allProvidersMap = {} } = useQuery({
    queryKey: ['all-providers-board', board.id],
    queryFn: async () => {
      const cardIds = cards.map(c => c.id);
      if (cardIds.length === 0) return {};

      const { data, error } = await supabase
        .from('maintenance_providers')
        .select('card_id, provider_name')
        .in('card_id', cardIds);
      
      if (error) throw error;
      
      const map: Record<string, string[]> = {};
      data.forEach(item => {
        if (!map[item.card_id]) map[item.card_id] = [];
        map[item.card_id].push(item.provider_name);
      });
      return map;
    },
    enabled: isMaintenanceBoard && cards.length > 0,
  });

  // Fetch completion deadline values for all cards (for Manutenção board)
  const { data: completionDeadlineValues = {} } = useQuery({
    queryKey: ['completion-deadline-values', board.id, completionDeadlineFieldId],
    queryFn: async () => {
      if (!completionDeadlineFieldId) return {};
      
      const cardIds = cards.map(c => c.id);
      if (cardIds.length === 0) return {};

      const { data, error } = await supabase
        .from('card_field_values')
        .select('card_id, value')
        .eq('field_id', completionDeadlineFieldId)
        .in('card_id', cardIds);
      
      if (error) throw error;
      
      return data.reduce((acc, item) => {
        acc[item.card_id] = item.value;
        return acc;
      }, {} as Record<string, string | null>);
    },
    enabled: !!completionDeadlineFieldId && cards.length > 0,
  });

  // Fetch budget deadline values for all cards (for Manutenção board)
  const { data: budgetDeadlineValues = {} } = useQuery({
    queryKey: ['budget-deadline-values', board.id, budgetDeadlineFieldId],
    queryFn: async () => {
      if (!budgetDeadlineFieldId) return {};
      
      const cardIds = cards.map(c => c.id);
      if (cardIds.length === 0) return {};

      const { data, error } = await supabase
        .from('card_field_values')
        .select('card_id, value')
        .eq('field_id', budgetDeadlineFieldId)
        .in('card_id', cardIds);
      
      if (error) throw error;
      
      return data.reduce((acc, item) => {
        acc[item.card_id] = item.value;
        return acc;
      }, {} as Record<string, string | null>);
    },
    enabled: !!budgetDeadlineFieldId && cards.length > 0,
  });
  
  // Filter cards based on search query and filters
  const filteredCards = useMemo(() => {
    let result = cards;

    // Apply search filter (by any field: robust_code, building_name, superlogica_id, title, card_number, address, description, proposal_responsible, negotiation_details)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(card => 
        (card.robust_code?.toLowerCase().includes(query)) ||
        (card.building_name?.toLowerCase().includes(query)) ||
        (card.superlogica_id?.toLowerCase().includes(query)) ||
        (card.title?.toLowerCase().includes(query)) ||
        (card.card_number?.toString().includes(query)) ||
        (card.address?.toLowerCase().includes(query)) ||
        (card.description?.toLowerCase().includes(query)) ||
        (card.proposal_responsible?.toLowerCase().includes(query)) ||
        (card.negotiation_details?.toLowerCase().includes(query))
      );
    }

    // Apply guarantee type filter
    if (filters?.guaranteeType) {
      result = result.filter(card => card.guarantee_type === filters.guaranteeType);
    }

    // Apply contract type filter
    if (filters?.contractType) {
      result = result.filter(card => card.contract_type === filters.contractType);
    }

    // Apply label filter
    if (filters?.labelId) {
      result = result.filter(card => 
        card.labels?.some(label => label.id === filters.labelId)
      );
    }

    // Apply member filter
    if (filters?.memberId) {
      result = result.filter(card => 
        card.members?.some(member => member.user_id === filters.memberId)
      );
    }

    // Apply proposal responsible filter (partial match)
    if (filters?.proposalResponsible) {
      const searchTerm = filters.proposalResponsible.toLowerCase();
      result = result.filter(card => 
        card.proposal_responsible?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply owner filter (for admins filtering by card creator)
    if (filters?.ownerId) {
      result = result.filter(card => card.created_by === filters.ownerId);
    }

    // Apply creator filter
    if (filters?.creatorId) {
      result = result.filter(card => card.created_by === filters.creatorId);
    }

    // Apply deadline status filter
    if (filters?.deadlineStatus) {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      result = result.filter(card => {
        if (!card.document_deadline) return false;
        
        const deadline = new Date(card.document_deadline);
        const isMet = card.deadline_met || card.deadline_dispensed;
        
        switch (filters.deadlineStatus) {
          case 'overdue':
            return !isMet && deadline < now;
          case 'upcoming':
            return !isMet && deadline >= now && deadline <= sevenDaysFromNow;
          case 'met':
            return isMet;
          default:
            return true;
        }
      });
    }

    // Apply provider filter
    if (filters?.providerName) {
      result = result.filter(card => {
        const providers = allProvidersMap[card.id] || [];
        return providers.includes(filters.providerName!);
      });
    }

    return result;
  }, [cards, searchQuery, filters, allProvidersMap]);

  // Filter cards based on archived state
  const activeCards = useMemo(() => 
    filteredCards.filter(card => !card.is_archived), 
    [filteredCards]
  );

  const displayCards = filters?.showArchived ? filteredCards : activeCards;

  // Create ordered list of all cards for navigation (column order, then position)
  const orderedCardIds = useMemo(() => {
    const result: string[] = [];
    columns.forEach(column => {
      const columnCards = displayCards
        .filter(card => card.column_id === column.id)
        .sort((a, b) => a.position - b.position);
      columnCards.forEach(card => result.push(card.id));
    });
    return result;
  }, [columns, displayCards]);
  
  // Always get the latest card data from the cards array
  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return cards.find(c => c.id === selectedCardId) || null;
  }, [selectedCardId, cards]);

  // Keep snapshot in sync when we do have the card; otherwise keep last snapshot to avoid flicker
  useEffect(() => {
    if (!selectedCardId) {
      setSelectedCardSnapshot(null);
      return;
    }

    if (selectedCard) {
      setSelectedCardSnapshot(selectedCard);
    }
  }, [selectedCardId, selectedCard]);

  // Navigation handlers
  const handleNavigatePrevious = useCallback(() => {
    if (!selectedCardId) return;
    const currentIndex = orderedCardIds.indexOf(selectedCardId);
    if (currentIndex > 0) {
      const prevCardId = orderedCardIds[currentIndex - 1];
      setSelectedCardId(prevCardId);
      markAsViewed(prevCardId);
    }
  }, [selectedCardId, orderedCardIds, markAsViewed]);

  const handleNavigateNext = useCallback(() => {
    if (!selectedCardId) return;
    const currentIndex = orderedCardIds.indexOf(selectedCardId);
    if (currentIndex < orderedCardIds.length - 1) {
      const nextCardId = orderedCardIds[currentIndex + 1];
      setSelectedCardId(nextCardId);
      markAsViewed(nextCardId);
    }
  }, [selectedCardId, orderedCardIds, markAsViewed]);

  // Calculate navigation state
  const navigationInfo = useMemo(() => {
    if (!selectedCardId) return { hasPrevious: false, hasNext: false, currentIndex: 0, total: 0 };
    const currentIndex = orderedCardIds.indexOf(selectedCardId);
    return {
      hasPrevious: currentIndex > 0,
      hasNext: currentIndex < orderedCardIds.length - 1,
      currentIndex: currentIndex + 1,
      total: orderedCardIds.length,
    };
  }, [selectedCardId, orderedCardIds]);

  // Click-and-drag scroll handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only activate on direct board background clicks (not on cards or columns)
    const target = e.target as HTMLElement;
    if (target.closest('[data-rfd-draggable-id]') || target.closest('button') || target.closest('input')) {
      return;
    }
    
    if (!boardRef.current) return;
    
    isDraggingRef.current = true;
    startXRef.current = e.pageX - boardRef.current.offsetLeft;
    startYRef.current = e.pageY - boardRef.current.offsetTop;
    scrollLeftRef.current = boardRef.current.scrollLeft;
    scrollTopRef.current = boardRef.current.scrollTop;
    boardRef.current.style.cursor = 'grabbing';
    boardRef.current.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !boardRef.current) return;
    
    e.preventDefault();
    const x = e.pageX - boardRef.current.offsetLeft;
    const y = e.pageY - boardRef.current.offsetTop;
    const walkX = (x - startXRef.current) * 1.5; // Multiplier for faster scroll
    const walkY = (y - startYRef.current) * 1.5;
    boardRef.current.scrollLeft = scrollLeftRef.current - walkX;
    boardRef.current.scrollTop = scrollTopRef.current - walkY;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    if (boardRef.current) {
      boardRef.current.style.cursor = 'grab';
      boardRef.current.style.userSelect = '';
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (boardRef.current) {
        boardRef.current.style.cursor = 'grab';
        boardRef.current.style.userSelect = '';
      }
    }
  }, []);

  // Auto-scroll when dragging card near edges
  const startAutoScroll = useCallback((direction: 'left' | 'right') => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
    }
    
    const scrollSpeed = direction === 'left' ? -20 : 20;
    autoScrollIntervalRef.current = window.setInterval(() => {
      if (boardRef.current) {
        boardRef.current.scrollLeft += scrollSpeed;
      }
    }, 16); // ~60fps
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);

  // Handle drag start - enable auto-scroll detection via mousemove
  const handleDragStart = useCallback(() => {
    isDraggingCardRef.current = true;
    
    const handleMouseMoveDuringDrag = (e: MouseEvent) => {
      if (!isDraggingCardRef.current || !boardRef.current) return;
      
      const boardRect = boardRef.current.getBoundingClientRect();
      const edgeThreshold = 120; // pixels from edge to start scrolling
      
      const mouseX = e.clientX;
      const leftEdge = boardRect.left + edgeThreshold;
      const rightEdge = boardRect.right - edgeThreshold;
      
      if (mouseX < leftEdge) {
        startAutoScroll('left');
      } else if (mouseX > rightEdge) {
        startAutoScroll('right');
      } else {
        stopAutoScroll();
      }
    };
    
    window.addEventListener('mousemove', handleMouseMoveDuringDrag);
    (window as any).__dragMouseMoveHandler = handleMouseMoveDuringDrag;
  }, [startAutoScroll, stopAutoScroll]);

  const isLoading = columnsLoading || cardsLoading;

  const handleDragEnd = (result: DropResult) => {
    // Stop auto-scroll and cleanup
    isDraggingCardRef.current = false;
    stopAutoScroll();
    
    // Remove mousemove listener
    if ((window as any).__dragMouseMoveHandler) {
      window.removeEventListener('mousemove', (window as any).__dragMouseMoveHandler);
      delete (window as any).__dragMouseMoveHandler;
    }
    
    const { destination, source, type, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    // Columns cannot be reordered - only cards can be moved
    if (type === 'column') {
      return;
    }

    // BLOCKING RULE: To move to "Ativo" column, ALL checklists must be complete
    const destColumn = columns.find(c => c.id === destination.droppableId);
    if (destColumn?.name === 'Ativo') {
      const card = cards.find(c => c.id === draggableId);
      if (card) {
        const allItems = card.checklists?.flatMap(cl => cl.items || []) || [];
        const activeItems = allItems.filter(i => !i.is_dismissed);
        const pendingItems = activeItems.filter(i => !i.is_completed);
        if (pendingItems.length > 0) {
          toast({
            title: 'Existem pendências no processo',
            description: `Regularize ${pendingItems.length} item(ns) pendente(s) antes de concluir.`,
            variant: 'destructive',
          });
          return;
        }
      }
    }

    // Card was moved
    moveCard.mutate({
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
    });
  };

  const getCardsForColumn = (columnId: string) => {
    return displayCards
      .filter(card => card.column_id === columnId)
      .sort((a, b) => a.position - b.position);
  };

  if (isLoading) {
    return (
      <div className="flex gap-2 p-2 sm:p-3 overflow-x-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex-shrink-0 w-56 sm:w-60 md:w-64">
            <Skeleton className="h-8 mb-1.5 rounded-t-lg" />
            <Skeleton className="h-16 mb-1.5" />
            <Skeleton className="h-16 mb-1.5" />
            <Skeleton className="h-6" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Droppable droppableId="board" type="column" direction="horizontal">
          {(provided) => (
            <div
              ref={(el) => {
                provided.innerRef(el);
                (boardRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              }}
              {...provided.droppableProps}
              className="flex gap-2 p-2 sm:p-3 overflow-auto min-h-[calc(100vh-8rem)] cursor-grab select-none lp-thin-scroll"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
                {columns.map((column, index) => (
                  <div key={column.id}>
                    <KanbanColumn
                      column={column}
                      cards={getCardsForColumn(column.id)}
                      onCardClick={(card) => {
                        setSelectedCardSnapshot(card);
                        window.setTimeout(() => {
                          setSelectedCardId(card.id);
                          markAsViewed(card.id);
                        }, 0);
                      }}
                      boardId={board.id}
                      boardName={board.name}
                      isFirstColumn={index === 0}
                      vacancyDeadlineValues={vacancyDeadlineValues}
                      categoryValues={categoryValues}
                      selectedProviders={selectedProviders}
                      completionDeadlineValues={completionDeadlineValues}
                      budgetDeadlineValues={budgetDeadlineValues}
                      showOwnerAvatar={showOwnerAvatar}
                      hasUnseenChanges={hasUnseenChanges}
                      responsibleNames={responsibleNames}
                  />
                </div>
              ))}
              {provided.placeholder}
              <AddColumnButton boardId={board.id} />
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <CardDetailDialog
        card={selectedCardSnapshot}
        // Only open when we have a stable snapshot to render.
        // This prevents the first-open "blink/close" when selectedCardSnapshot is still null.
        open={!!selectedCardId && !!selectedCardSnapshot}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCardId(null);
            onCardClosed?.();
          }
        }}
      />
    </>
  );
}
