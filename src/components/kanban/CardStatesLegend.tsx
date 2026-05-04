import { cn } from '@/lib/utils';
import { FilterState } from '@/components/layout';

interface CardStatesLegendProps {
  className?: string;
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
}

/**
 * Legenda visual rápida dos estados de card — espelha o design C do preview.
 */
 const LEGEND: { id: 'overdue' | 'correction_requested' | 'next_action_overdue' | 'in_day' | 'fallback' | 'docs_received' | 'unseen', label: string, dot: string, barClass: string }[] = [
   { id: 'in_day', label: 'Em dia', dot: 'hsl(142 45% 53%)', barClass: 'border-l-[hsl(142_45%_53%)]' },
   { id: 'docs_received', label: 'Doc. recebidos', dot: 'hsl(150 40% 48%)', barClass: 'border-l-[hsl(150_40%_48%)]' },
   { id: 'correction_requested', label: 'Correção solicitada', dot: 'hsl(28 70% 55%)', barClass: 'border-l-[hsl(28_70%_55%)]' },
   { id: 'next_action_overdue', label: 'Pendência', dot: 'hsl(340 100% 45%)', barClass: 'border-l-[hsl(340_100%_45%)]' },
   { id: 'overdue', label: 'Vencido', dot: 'hsl(350 75% 42%)', barClass: 'border-l-[hsl(350_75%_42%)]' },
   { id: 'unseen', label: 'Não visto', dot: 'hsl(0 100% 50%)', barClass: 'border-l-red-500' },
 ];

export function CardStatesLegend({ className, filters, onFiltersChange }: CardStatesLegendProps) {
  const handleToggleFilter = (item: typeof LEGEND[0]) => {
    if (!onFiltersChange || !filters) return;

    const newFilters = { ...filters };

    if (item.id === 'docs_received') {
      newFilters.docsReceived = !filters.docsReceived;
      // Clear other visual state related filters when toggling docs_received? 
      // User said "coexist", so we keep others.
    } else if (item.id === 'unseen') {
      newFilters.unseenOnly = !filters.unseenOnly;
    } else {
      newFilters.visualState = filters.visualState === item.id ? null : item.id as any;
    }

    onFiltersChange(newFilters);
  };

  const isSelected = (item: typeof LEGEND[0]) => {
    if (!filters) return false;
    if (item.id === 'docs_received') return filters.docsReceived;
    if (item.id === 'unseen') return filters.unseenOnly;
    return filters.visualState === item.id;
  };

  return (
    <div className={cn('px-4 pt-2 pb-1', className)}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Estados visuais do card
        </span>
        <span className="text-[10.5px] text-muted-foreground/70">· legenda rápida</span>
      </div>
      <div className="overflow-x-auto lp-thin-scroll scrollbar-none">
        <div className="inline-flex gap-1.5 items-stretch min-w-max">
          {LEGEND.map((l) => (
            <button
              key={l.id}
              onClick={() => handleToggleFilter(l)}
              title={l.label}
              className={cn(
                'inline-flex items-center gap-2 h-7 px-2.5 rounded-md bg-card border border-border whitespace-nowrap transition-all',
                'border-l-[3px] hover:bg-accent/5',
                l.barClass,
                isSelected(l) && 'ring-2 ring-primary ring-inset bg-accent/10 border-primary shadow-sm'
              )}
            >
              <span
                className={cn(
                  "w-[7px] h-[7px] rounded-full shrink-0",
                  l.id === 'unseen' && "animate-pulse"
                )}
                style={{ background: l.dot }}
              />
               <span className="text-[11.5px] font-semibold text-foreground">{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}