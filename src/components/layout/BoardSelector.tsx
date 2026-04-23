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
    <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto">
      {/* Home/All flows button */}
      <Button
        variant="ghost"
        size="sm"
        asChild={isAdminFlow}
        onClick={isAdminFlow ? undefined : () => onSelectBoard(null)}
        className={cn(
          "flex items-center gap-2 px-4 py-1.5 rounded-md transition-all whitespace-nowrap border-2",
          !selectedBoard && !isAdminFlow
            ? "bg-white text-primary font-semibold border-white shadow-md" 
            : "bg-transparent text-white border-white/50 hover:bg-white/10 hover:border-white"
        )}
      >
        {isAdminFlow ? (
          <Link to="/dashboard">
            <Home className="h-4 w-4" />
            <span>Meus Fluxos</span>
          </Link>
        ) : (
          <>
            <Home className="h-4 w-4" />
            <span>Meus Fluxos</span>
          </>
        )}
      </Button>

      <div className="w-px h-6 bg-white/30 mx-1" />

      {/* Admin Flow button - using Link for proper navigation */}
      <Button
        variant="ghost"
        size="sm"
        asChild
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all whitespace-nowrap",
          isAdminFlow 
            ? "bg-white text-gray-900 font-semibold shadow-md hover:bg-white hover:text-gray-900" 
            : "bg-slate-600/50 text-white/80 hover:bg-slate-600 hover:text-white border border-slate-500"
        )}
      >
        <Link to="/admin-flow">
          {isAdminFlow && <Check className="h-4 w-4 text-green-600" />}
          <BarChart3 className="h-4 w-4" />
          <span>Métricas</span>
        </Link>
      </Button>

      <div className="w-px h-6 bg-white/30 mx-1" />

      {boards.map((board) => {
        // Hide "Central de Propostas" — it's a dashboard, not a kanban flow
        if (board.name.toLowerCase().includes('central de propostas')) return null;
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
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap relative",
              isSelected 
                ? "bg-white text-gray-900 font-bold shadow-lg hover:bg-white hover:text-gray-900 ring-2 ring-white/50 scale-105" 
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            )}
          >
            {isSelected && (
              <Check className="h-4 w-4 text-green-600 shrink-0" />
            )}
            <Icon className={cn("h-4 w-4 shrink-0", !isSelected && "opacity-70")} />
            <span className={cn(
              "transition-all",
              isSelected ? "text-base" : "text-sm"
            )}>{displayName}</span>
            <Badge 
              variant="secondary" 
              className={cn(
                "ml-1 h-5 min-w-[20px] px-1.5 text-xs font-medium shrink-0",
                isSelected 
                  ? "bg-green-100 text-green-800 ring-1 ring-green-300" 
                  : "bg-white/20 text-white/80"
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

