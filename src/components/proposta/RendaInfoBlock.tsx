import { Info } from 'lucide-react';
import { CollapsibleTip } from './CollapsibleTip';

/**
 * Bloco explicativo padrão para campos de renda no formulário público.
 */
export function RendaInfoBlock() {
  return (
    <div className="mt-2">
      <CollapsibleTip
        title="Por que pedimos a sua renda?"
        icon={Info}
        variant="info"
      >
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          Usamos sua renda para entender a compatibilidade com o imóvel.
          Normalmente o aluguel não deve ultrapassar 30% da renda mensal,
          mas cada caso é analisado de forma individual.
        </p>
      </CollapsibleTip>
    </div>
  );
}