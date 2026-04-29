import { Info } from 'lucide-react';

/**
 * Bloco explicativo padrão para campos de renda no formulário público.
 */
export function RendaInfoBlock() {
  return (
    <div className="mt-2 rounded-lg border border-info/20 bg-info/5 p-3 flex items-start gap-2">
      <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        Usamos sua renda para entender a compatibilidade com o imóvel.
        Normalmente o aluguel não deve ultrapassar 30% da renda mensal,
        mas cada caso é analisado de forma individual.
      </p>
    </div>
  );
}