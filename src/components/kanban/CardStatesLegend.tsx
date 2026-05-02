import { cn } from '@/lib/utils';

/**
 * Legenda visual rápida dos estados de card — espelha o design C do preview.
 * Apenas elemento informativo: NÃO altera lógica, dados ou regras.
 */
const LEGEND: { label: string; code: string; color: string; barClass: string }[] = [
  { label: 'Em dia',              code: 'LOC-2901', color: 'hsl(142 45% 53%)', barClass: 'shadow-[inset_3px_0_0_0_hsl(142_45%_53%)]' },
  { label: 'Doc. recebidos',      code: 'LOC-2902', color: 'hsl(150 40% 48%)', barClass: 'shadow-[inset_3px_0_0_0_hsl(150_40%_48%)]' },
  { label: 'Correção solicitada', code: 'LOC-2903', color: 'hsl(28 70% 55%)',  barClass: 'shadow-[inset_3px_0_0_0_hsl(28_70%_55%)]' },
  { label: 'Pendência',           code: 'LOC-2904', color: 'hsl(340 100% 45%)',barClass: 'shadow-[inset_3px_0_0_0_hsl(340_100%_45%)]' },
  { label: 'Vencido',             code: 'LOC-2905', color: 'hsl(350 75% 42%)', barClass: 'shadow-[inset_3px_0_0_0_hsl(350_75%_42%)]' },
  { label: 'Neutro',              code: 'LOC-2906', color: 'hsl(210 10% 65%)', barClass: 'shadow-[inset_3px_0_0_0_hsl(210_10%_65%)]' },
];

export function CardStatesLegend({ className }: { className?: string }) {
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
            <div
              key={l.code}
              title={l.label}
              className={cn(
                'inline-flex items-center gap-2 h-7 px-2.5 rounded-md bg-card border border-border whitespace-nowrap',
                l.barClass,
                "pl-3"
              )}
            >
              <span className="text-[11.5px] font-semibold text-foreground">{l.label}</span>
              <span className="text-[9.5px] font-semibold tracking-wide text-muted-foreground/70">
                {l.code}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}