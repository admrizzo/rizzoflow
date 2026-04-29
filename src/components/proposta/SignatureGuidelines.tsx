import { FileText, PenLine, Stamp, Mail, Smartphone, Zap } from 'lucide-react';
import { CollapsibleTip } from './CollapsibleTip';

interface Props {
  type: 'fisico' | 'digital' | '' | string;
}

/**
 * Orientações dinâmicas baseadas no tipo de assinatura selecionado.
 * Sem qualquer menção a custo.
 */
export function SignatureGuidelines({ type }: Props) {
  if (type === 'fisico') {
    return (
      <CollapsibleTip
        title="Orientações da assinatura — Físico / Presencial"
        icon={PenLine}
        variant="muted"
      >
        <div className="space-y-4 mt-1">
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-accent" /> Contrato impresso</li>
            <li className="flex items-center gap-2"><PenLine className="h-3.5 w-3.5 text-accent" /> Assinatura manual</li>
            <li className="flex items-center gap-2"><Stamp className="h-3.5 w-3.5 text-accent" /> Reconhecimento em cartório</li>
          </ul>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-foreground mb-2">Orientações</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
              <li>Imprimir o contrato</li>
              <li>Assinar todas as páginas</li>
              <li>Rubricar páginas intermediárias</li>
              <li>Reconhecer firma das assinaturas</li>
            </ul>
          </div>
        </div>
      </CollapsibleTip>
    );
  }
  if (type === 'digital') {
    return (
      <CollapsibleTip
        title="Orientações da assinatura — Digital"
        icon={Smartphone}
        variant="muted"
      >
        <div className="space-y-4 mt-1">
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-2"><Smartphone className="h-3.5 w-3.5 text-accent" /> Assinatura online</li>
            <li className="flex items-center gap-2"><Smartphone className="h-3.5 w-3.5 text-accent" /> Pode ser feita pelo celular ou computador</li>
            <li className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-accent" /> Processo mais rápido</li>
          </ul>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-foreground mb-2">Orientações</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
              <li className="flex items-start gap-2"><Mail className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" /><span>Você receberá o contrato por e-mail ou WhatsApp</span></li>
              <li>A assinatura será feita online</li>
              <li>Não é necessário ir ao cartório</li>
            </ul>
          </div>
        </div>
      </CollapsibleTip>
    );
  }
  return null;
}