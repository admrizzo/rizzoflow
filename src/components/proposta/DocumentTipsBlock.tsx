import { Lightbulb, Check } from 'lucide-react';

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
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Lightbulb className="h-4 w-4 text-accent" />
        </div>
        <h4 className="font-bold text-sm text-foreground">Dicas para envio dos documentos</h4>
      </div>
      <ul className="space-y-1.5">
        {tips.map(t => (
          <li key={t} className="flex items-start gap-2 text-xs text-foreground">
            <Check className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}