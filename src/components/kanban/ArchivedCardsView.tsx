import { useState, useMemo } from 'react';
import { CardWithRelations, Board } from '@/types/database';
import { useCards } from '@/hooks/useCards';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardDetailDialog } from './CardDetailDialog';
import { Archive, Search, ArchiveRestore, Calendar, User, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ArchivedCardsViewProps {
  board: Board;
  onClose: () => void;
}

export function ArchivedCardsView({ board, onClose }: ArchivedCardsViewProps) {
  const { cards, archiveCard } = useCards(board.id, { includeArchived: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [unarchiveConfirmOpen, setUnarchiveConfirmOpen] = useState(false);
  const [cardToUnarchive, setCardToUnarchive] = useState<CardWithRelations | null>(null);

  // Filter only archived cards
  const archivedCards = useMemo(() => {
    let result = cards.filter(card => card.is_archived);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(card =>
        (card.robust_code?.toLowerCase().includes(query)) ||
        (card.building_name?.toLowerCase().includes(query)) ||
        (card.superlogica_id?.toLowerCase().includes(query)) ||
        (card.title?.toLowerCase().includes(query)) ||
        (card.card_number?.toString().includes(query)) ||
        (card.archive_reason?.toLowerCase().includes(query))
      );
    }

    // Sort by archived date (most recent first)
    return result.sort((a, b) => {
      const dateA = a.archived_at ? new Date(a.archived_at).getTime() : 0;
      const dateB = b.archived_at ? new Date(b.archived_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [cards, searchQuery]);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return cards.find(c => c.id === selectedCardId) || null;
  }, [selectedCardId, cards]);

  const handleUnarchiveClick = (card: CardWithRelations, e: React.MouseEvent) => {
    e.stopPropagation();
    setCardToUnarchive(card);
    setUnarchiveConfirmOpen(true);
  };

  const handleUnarchiveConfirm = () => {
    if (!cardToUnarchive) return;
    archiveCard.mutate(
      { cardId: cardToUnarchive.id, isArchived: false, reason: null },
      {
        onSuccess: () => {
          setUnarchiveConfirmOpen(false);
          setCardToUnarchive(null);
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Minimal Header */}
      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </button>
            
            <div className="w-px h-5 bg-white/20" />
            
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-white/70" />
              <span className="text-white font-medium">Arquivados</span>
              <span className="text-white/50 text-sm">
                ({archivedCards.length})
              </span>
            </div>
          </div>

          {/* Search inline */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white/10 border-0 text-white placeholder:text-white/40 focus-visible:ring-white/30"
            />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <ScrollArea className="flex-1 px-6 pb-6">
        {archivedCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/60">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <Archive className="h-8 w-8" />
            </div>
            <p className="text-lg font-medium text-white/80">
              {searchQuery ? 'Nenhum resultado' : 'Vazio'}
            </p>
            <p className="text-sm">
              {searchQuery 
                ? 'Tente outro termo de busca' 
                : 'Nenhum card arquivado neste fluxo'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {archivedCards.map((card) => (
              <div
                key={card.id}
                className="group bg-white/95 backdrop-blur rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                onClick={() => setSelectedCardId(card.id)}
              >
                {/* Color bar based on labels */}
                {card.labels && card.labels.length > 0 && (
                  <div className="flex h-1">
                    {card.labels.slice(0, 4).map((label) => (
                      <div
                        key={label.id}
                        className="flex-1"
                        style={{ backgroundColor: label.color }}
                      />
                    ))}
                  </div>
                )}
                
                <div className="p-3">
                  {/* Card number + title */}
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                      #{card.card_number}
                    </span>
                    <h3 className="font-medium text-sm leading-tight line-clamp-2 text-foreground">
                      {card.title || 'Sem identificação'}
                    </h3>
                  </div>

                  {/* Archive reason - compact */}
                  {card.archive_reason && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2 italic">
                      "{card.archive_reason}"
                    </p>
                  )}

                  {/* Meta - single line */}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
                    {card.archived_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(card.archived_at), "dd/MM/yy", { locale: ptBR })}
                      </span>
                    )}
                    {card.archived_by_profile && (
                      <span className="flex items-center gap-1 truncate">
                        <User className="h-3 w-3" />
                        {card.archived_by_profile.full_name.split(' ')[0]}
                      </span>
                    )}
                  </div>

                  {/* Unarchive button - appears on hover */}
                  <button
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={(e) => handleUnarchiveClick(card, e)}
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" />
                    Restaurar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Card Detail Dialog */}
      <CardDetailDialog
        card={selectedCard}
        open={!!selectedCard}
        onOpenChange={(open) => !open && setSelectedCardId(null)}
      />

      {/* Unarchive Confirmation Dialog */}
      <AlertDialog open={unarchiveConfirmOpen} onOpenChange={setUnarchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar Card</AlertDialogTitle>
            <AlertDialogDescription>
              Restaurar <strong>#{cardToUnarchive?.card_number}</strong> para o fluxo ativo?
              <br />
              <span className="text-muted-foreground">
                O card voltará para a primeira coluna.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnarchiveConfirm}
              disabled={archiveCard.isPending}
            >
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
