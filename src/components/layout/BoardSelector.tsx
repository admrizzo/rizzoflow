import { useLocation, Link } from 'react-router-dom';
import { Board } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Home, FileX, Search, DollarSign, ClipboardList, Check, BarChart3, Scale, Briefcase } from 'lucide-react';

interface BoardSelectorProps {
  boards: Board[];
  selectedBoard: Board | null;
  onSelectBoard: (board: Board | null) => void;
  cardCounts?: Record<string, number>;
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

export function BoardSelector({ boards, selectedBoard, onSelectBoard, cardCounts = {} }: BoardSelectorProps) {
  const location = useLocation();
  const isAdminFlow = location.pathname === '/admin-flow';

  return (
    <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto lp-thin-scroll border-b bg-sidebar/95 text-white border-white/5 scrollbar-none">
      {/* Home button removed from here as it is now in Header */}

      {boards.map((board) => {
        const Icon = iconMap[board.icon] || ClipboardList;
        const isSelected = selectedBoard?.id === board.id;
        const count = cardCounts[board.id] || 0;
        // Remove "Fluxo de " or "Fluxo " prefix for cleaner display
        const displayName = board.name.replace(/^Fluxo\s+(de\s+)?/i, '');
        
        return (
          <Button
            key={board.id}
            variant="ghost"
            size="sm"
            onClick={() => onSelectBoard(board)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md whitespace-nowrap relative",
              isSelected
                ? "bg-white text-foreground font-semibold shadow-sm hover:bg-white hover:text-foreground"
                : "bg-transparent text-white/75 hover:bg-white/10 hover:text-white"
            )}
            style={isSelected ? { boxShadow: `inset 0 -2px 0 0 ${board.color}` } : undefined}
          >
            {isSelected && (
              <Check className="h-4 w-4 text-green-600 shrink-0" />
            )}
            <Icon className={cn("h-4 w-4 shrink-0", !isSelected && "opacity-70")} />
            <span className="text-sm">{displayName}</span>
            <Badge 
              variant="secondary" 
              className={cn(
                "ml-1 h-5 min-w-[20px] px-1.5 text-xs font-medium shrink-0",
                isSelected
                  ? "bg-muted text-foreground"
                  : "bg-white/15 text-white/80"
              )}
            >
              {count}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
}

