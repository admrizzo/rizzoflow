import { cn } from '@/lib/utils';

const stages = [
  { key: 'cotando', label: 'Cotando' },
  { key: 'recebido', label: 'Recebido' },
  { key: 'definido', label: 'Definido' },
  { key: 'servico_concluido', label: 'Concluído' },
  { key: 'pago', label: 'Pago' },
] as const;

interface MaintenanceStageIndicatorProps {
  stage: 'sem_prestador' | 'cotando' | 'recebido' | 'definido' | 'servico_concluido' | 'pago';
  totalProviders: number;
  receivedCount: number;
}

export function MaintenanceStageIndicator({ stage, totalProviders, receivedCount }: MaintenanceStageIndicatorProps) {
  if (stage === 'sem_prestador') return null;

  const stageIndex = stages.findIndex(s => s.key === stage);

  return (
    <div className="space-y-2">
      {/* Stage dots */}
      <div className="flex items-center gap-1">
        {stages.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div className={cn(
              "h-2.5 w-2.5 rounded-full transition-colors",
              i <= stageIndex ? "bg-primary" : "bg-muted-foreground/20"
            )} />
            <span className={cn(
              "text-[10px]",
              i <= stageIndex ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {s.label}
            </span>
            {i < stages.length - 1 && (
              <div className={cn(
                "h-px w-3",
                i < stageIndex ? "bg-primary" : "bg-muted-foreground/20"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Summary text */}
      <p className="text-[11px] text-muted-foreground">
        {totalProviders} orçamento{totalProviders !== 1 ? 's' : ''} solicitado{totalProviders !== 1 ? 's' : ''}
        {receivedCount > 0 && ` · ${receivedCount} recebido${receivedCount !== 1 ? 's' : ''}`}
      </p>
    </div>
  );
}
