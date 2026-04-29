import { Lightbulb, Check } from 'lucide-react';
import { CollapsibleTip } from './CollapsibleTip';

/**
 * Bloco de dicas para envio de documentos no formulário público.
 */
export function DocumentTipsBlock() {
  const tips = [
    'Fotos do celular são aceitas',
    'Documento deve estar legível',
    'Enviar frente e verso quando necessário',
    'Formatos aceitos: JPG, PNG, PDF',
    'Tamanho máximo por arquivo: 10MB',
  ];
  return (
    <CollapsibleTip title="Dicas para envio dos documentos" icon={Lightbulb}>
      <ul className="space-y-1.5 mt-1">
        {tips.map(t => (
          <li key={t} className="flex items-start gap-2 text-xs text-foreground">
            <Check className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </CollapsibleTip>
  );
}