import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowRight } from 'lucide-react';
import { Board } from '@/types/database';

interface GlobalSearchResultsProps {
  searchQuery: string;
  boards: Board[];
  onSelectBoard: (board: Board) => void;
  onOpenCard?: (cardId: string, boardId: string) => void;
  showArchived?: boolean;
}

interface SearchResult {
  id: string;
  card_number: number;
  title: string;
  robust_code: string | null;
  building_name: string | null;
  superlogica_id: string | null;
  is_archived: boolean;
  board_id: string;
  board_name: string;
  board_color: string;
  column_name: string;
}

export function GlobalSearchResults({ searchQuery, boards, onSelectBoard, onOpenCard, showArchived = false }: GlobalSearchResultsProps) {

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['global-search', searchQuery, showArchived],
    queryFn: async () => {
      const query = searchQuery.toLowerCase().trim();
      const boardIds = boards.map(b => b.id);
      
      if (boardIds.length === 0) return [];

      // PostgREST uses commas to separate .or() conditions.
      // We must avoid bare commas in the search term breaking the filter.
      // Dots and slashes are safe inside ilike values.
      const sanitized = query.replace(/,/g, '');

      const searchFields = [
        'robust_code', 'building_name', 'superlogica_id', 'title',
        'address', 'description', 'proposal_responsible', 'negotiation_details'
      ];
      const orFilter = searchFields.map(f => `${f}.ilike.%${sanitized}%`).join(',');

      let dbQuery = supabase
        .from('cards')
        .select(`
          id,
          card_number,
          title,
          robust_code,
          building_name,
          superlogica_id,
          address,
          description,
          proposal_responsible,
          negotiation_details,
          board_id,
          is_archived,
          columns!inner(name)
        `)
        .in('board_id', boardIds)
        .or(orFilter);

      // Global search always includes archived cards so users can find anything

      const { data, error } = await dbQuery;

      if (error) throw error;

      // Enrich with board info and format
      return (data || []).map(card => {
        const board = boards.find(b => b.id === card.board_id);
        return {
          id: card.id,
          card_number: card.card_number,
          title: card.title,
          robust_code: card.robust_code,
          building_name: card.building_name,
          superlogica_id: card.superlogica_id,
          is_archived: card.is_archived,
          board_id: card.board_id,
          board_name: board?.name || 'Fluxo',
          board_color: board?.color || '#f97316',
          column_name: (card.columns as any)?.name || '',
        } as SearchResult;
      });
    },
    enabled: searchQuery.trim().length >= 2,
  });

  // Group results by board
  const resultsByBoard = results.reduce((acc, result) => {
    if (!acc[result.board_id]) {
      acc[result.board_id] = {
        board_name: result.board_name,
        board_color: result.board_color,
        cards: [],
      };
    }
    acc[result.board_id].cards.push(result);
    return acc;
  }, {} as Record<string, { board_name: string; board_color: string; cards: SearchResult[] }>);

  if (searchQuery.trim().length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/70">
        <Search className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg">Digite pelo menos 2 caracteres para buscar</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/70">
        <Search className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg">Nenhum resultado encontrado para "{searchQuery}"</p>
        <p className="text-sm mt-2">Tente buscar por código, nome do prédio ou ID Superlógica</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white">
          {results.length} {results.length === 1 ? 'resultado' : 'resultados'} para "{searchQuery}"
        </h2>
      </div>

      <div className="space-y-6">
        {Object.entries(resultsByBoard).map(([boardId, { board_name, board_color, cards }]) => {
          const board = boards.find(b => b.id === boardId);
          
          return (
            <div key={boardId} className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: board_color }}
                />
                <h3 className="text-white font-medium">{board_name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {cards.length} {cards.length === 1 ? 'card' : 'cards'}
                </Badge>
              </div>

              <div className="grid gap-2">
                {cards.map(card => (
                  <Card
                    key={card.id}
                  className={`cursor-pointer hover:shadow-lg transition-all rounded-xl bg-card border group ${card.is_archived ? 'opacity-60 grayscale-[0.5]' : ''}`}
                    onClick={() => {
                      if (onOpenCard) {
                        onOpenCard(card.id, card.board_id);
                      } else {
                        const b = boards.find(bb => bb.id === card.board_id);
                        if (b) onSelectBoard(b);
                      }
                    }}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">#{card.card_number}</span>
                          {card.is_archived && (
                            <Badge variant="secondary" className="text-xs bg-gray-200">
                              Arquivado
                            </Badge>
                          )}
                          {card.robust_code && (
                            <Badge variant="outline" className="text-xs">
                              {card.robust_code}
                            </Badge>
                          )}
                          {card.superlogica_id && (
                            <Badge variant="outline" className="text-xs">
                              SL: {card.superlogica_id}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm truncate">{card.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Coluna: {card.column_name}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
