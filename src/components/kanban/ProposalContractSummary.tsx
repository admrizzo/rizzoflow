import { CalendarDays, KeyRound, FileSignature } from 'lucide-react';
import { useProposalNegotiationSummary } from '@/hooks/useProposalNegotiationSummary';

interface Props {
  proposalLinkId: string | null | undefined;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  // Aceita YYYY-MM-DD (sem timezone) — usa apenas a data
  const onlyDate = iso.length >= 10 ? iso.slice(0, 10) : iso;
  const [y, m, d] = onlyDate.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Bloco "Contrato" no card: data pretendida de início, dia de vencimento
 * e quem retira as chaves. Lê do form_data do draft via
 * useProposalNegotiationSummary.
 */
export function ProposalContractSummary({ proposalLinkId }: Props) {
  const { data, isLoading } = useProposalNegotiationSummary(proposalLinkId);

  if (!proposalLinkId) return null;
  if (isLoading) return null;
  if (!data) return null;

  const hasContrato = !!(data.contratoDataInicio || data.diaVencimento);
  const hasRetirada = data.retiradaPorTerceiro || !!data.retiradaNome;

  if (!hasContrato && !hasRetirada) return null;

  return (
    <div className="bg-muted/30 p-4 rounded-lg border border-muted space-y-4">
      <div className="flex items-center gap-2">
        <FileSignature className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Contrato
        </h3>
      </div>

      {hasContrato && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-background rounded-md border p-3">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Início pretendido
              </p>
            </div>
            <p className="text-sm font-semibold">
              {data.contratoDataInicio ? fmtDate(data.contratoDataInicio) : 'Não informado'}
            </p>
          </div>
          <div className="bg-background rounded-md border p-3">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Vencimento do aluguel
              </p>
            </div>
            <p className="text-sm font-semibold">
              {data.diaVencimento ? `Dia ${data.diaVencimento}` : 'Não informado'}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-md border bg-background p-3">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Retirada de chaves
          </p>
        </div>
        {!data.retiradaPorTerceiro ? (
          <p className="text-sm">O próprio proponente fará a retirada.</p>
        ) : (
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold">{data.retiradaNome || 'Pessoa não informada'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              {data.retiradaCpf && <p><span className="font-medium text-foreground">CPF:</span> {data.retiradaCpf}</p>}
              {data.retiradaWhatsapp && <p><span className="font-medium text-foreground">WhatsApp:</span> {data.retiradaWhatsapp}</p>}
              {data.retiradaEmail && <p className="sm:col-span-2"><span className="font-medium text-foreground">E-mail:</span> {data.retiradaEmail}</p>}
            </div>
            {data.retiradaObservacao && (
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                <span className="font-medium text-foreground">Observação:</span> {data.retiradaObservacao}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}