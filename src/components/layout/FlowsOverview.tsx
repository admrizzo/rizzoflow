import { Board } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Home, FileX, Search, DollarSign, ClipboardList, ArrowRight, Scale, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowsOverviewProps {
  boards: Board[];
  onSelectBoard: (board: Board) => void;
  cardCounts: Record<string, number>;
  isLoading?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'home': Home,
  'file-x': FileX,
  'search': Search,
  'dollar-sign': DollarSign,
  'clipboard-list': ClipboardList,
  'scale': Scale,
  'briefcase': Briefcase,
};

function FlowCardSkeleton() {
  return (
    <Card className="bg-white/95 backdrop-blur border-0 overflow-hidden">
      <Skeleton className="h-2 w-full" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-3" />
        <Skeleton className="h-6 w-24" />
      </CardContent>
    </Card>
  );
}

export function FlowsOverview({ boards, onSelectBoard, cardCounts, isLoading }: FlowsOverviewProps) {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Seus Fluxos</h1>
        <p className="text-white/80 text-lg">Selecione um fluxo para visualizar o quadro Kanban</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {isLoading ? (
          <>
            <FlowCardSkeleton />
            <FlowCardSkeleton />
            <FlowCardSkeleton />
          </>
        ) : (
          boards.map((board) => {
            const Icon = iconMap[board.icon] || ClipboardList;
            const count = cardCounts[board.id] || 0;

            return (
              <Card
                key={board.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl",
                  "bg-white/95 backdrop-blur border-0 overflow-hidden group"
                )}
                onClick={() => onSelectBoard(board)}
              >
                <div 
                  className="h-2 w-full" 
                  style={{ backgroundColor: board.color }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${board.color}20` }}
                      >
                        <Icon 
                          className="h-5 w-5" 
                          style={{ color: board.color }}
                        />
                      </div>
                      <CardTitle className="text-lg">{board.name}</CardTitle>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardHeader>
                <CardContent>
                  {board.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {board.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary"
                      className="text-sm"
                      style={{ 
                        backgroundColor: `${board.color}15`,
                        color: board.color,
                      }}
                    >
                      {count} {count === 1 ? 'card ativo' : 'cards ativos'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {!isLoading && boards.length === 0 && (
        <div className="text-center text-white/70 py-12">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">Nenhum fluxo disponível</p>
          <p className="text-sm mt-2">Entre em contato com um administrador para obter acesso.</p>
        </div>
      )}
    </div>
  );
}
