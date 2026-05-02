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
    <Card className="bg-card border border-border overflow-hidden">
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
    <div className="min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center px-6 py-12 bg-background/50">
      <div className="text-center mb-12 space-y-3">
        <h1 className="text-4xl font-black text-foreground tracking-tight">Seus Fluxos</h1>
        <p className="text-muted-foreground text-lg font-medium max-w-md mx-auto">Selecione uma área de operação para gerenciar seus processos no Kanban</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
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
              <div
                key={board.id}
                className="group relative cursor-pointer"
                onClick={() => onSelectBoard(board)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                <Card className="bg-card border-border/40 overflow-hidden group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-300 rounded-3xl h-full flex flex-col">
                  <div className="h-2 w-full" style={{ backgroundColor: board.color }} />
                  <CardHeader className="pb-4 pt-8">
                    <div className="flex items-start justify-between">
                      <div className="space-y-4">
                        <div 
                          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner"
                          style={{ backgroundColor: `${board.color}15` }}
                        >
                          <Icon 
                            className="h-7 w-7" 
                            style={{ color: board.color }}
                          />
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight">{board.name}</CardTitle>
                      </div>
                      <div className="p-2 rounded-full bg-muted/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <div>
                      {board.description && (
                        <p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed">
                          {board.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <Badge 
                        variant="secondary"
                        className="px-3 py-1 text-xs font-bold rounded-full"
                        style={{ 
                          backgroundColor: `${board.color}15`,
                          color: board.color,
                        }}
                      >
                        {count} {count === 1 ? 'PROCESSO' : 'PROCESSOS'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })
        )}
      </div>

      {!isLoading && boards.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">Nenhum fluxo disponível</p>
          <p className="text-sm mt-2">Entre em contato com um administrador para obter acesso.</p>
        </div>
      )}
    </div>
  );
}
