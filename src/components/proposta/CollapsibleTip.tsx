import { useState, ReactNode } from 'react';
import { ChevronDown, Lightbulb, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleTipProps {
  title: string;
  children: ReactNode;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  variant?: 'tip' | 'info' | 'muted';
}

/**
 * Bloco recolhível padrão para dicas/orientações no formulário público.
 * Visual unificado: título sempre visível com seta para expandir/recolher.
 */
export function CollapsibleTip({
  title,
  children,
  icon: Icon = Lightbulb,
  defaultOpen = false,
  variant = 'tip',
}: CollapsibleTipProps) {
  const [open, setOpen] = useState(defaultOpen);

  const palette =
    variant === 'info'
      ? {
          wrap: 'border-info/20 bg-info/5',
          iconBg: 'bg-info/10',
          iconColor: 'text-info',
        }
      : variant === 'muted'
      ? {
          wrap: 'border-border bg-muted/20',
          iconBg: 'bg-muted',
          iconColor: 'text-muted-foreground',
        }
      : {
          wrap: 'border-accent/20 bg-accent/5',
          iconBg: 'bg-accent/10',
          iconColor: 'text-accent',
        };

  return (
    <div className={cn('rounded-2xl border', palette.wrap)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            palette.iconBg
          )}
        >
          <Icon className={cn('h-4 w-4', palette.iconColor)} />
        </div>
        <h4 className="font-bold text-sm text-foreground flex-1">{title}</h4>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground shrink-0 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && <div className="px-4 pb-4 pt-0 text-sm">{children}</div>}
    </div>
  );
}