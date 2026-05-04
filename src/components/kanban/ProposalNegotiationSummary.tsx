import { Handshake, FileSignature, Info, CalendarDays, KeyRound, Shield, UserCircle } from 'lucide-react';
import { useProposalNegotiationSummary } from '@/hooks/useProposalNegotiationSummary';

interface Props {
  proposalLinkId: string | null | undefined;
  cardGuaranteeType?: string | null;
  cardResponsible?: string | null;
  showResponsible?: boolean;
}

function fmtBRL(v: number | null) {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

const SIGN_LABEL: Record<string, string> = {
  digital: 'Assinatura digital',
  fisico: 'Assinatura física (presencial)',
};

const SIGN_HINT: Record<string, string> = {
  digital:
    'Cliente receberá o contrato por e-mail e assinará digitalmente via plataforma.',
  fisico:
    'Cliente comparecerá à imobiliária para assinatura presencial do contrato.',
};

const GUARANTEE_LABELS: Record<string, string> = {
  carta_fianca: 'Carta Fiança',
  caucao: 'Caução',
  fiador: 'Fiador',
  seguro_fianca: 'Seguro Fiança',
  sem_garantia: 'Sem Garantia',
  titulo_capitalizacao: 'Título de Capitalização',
  outro: 'Outro',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const onlyDate = iso.length >= 10 ? iso.slice(0, 10) : iso;
  const [y, m, d] = onlyDate.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function ProposalNegotiationSummary({ 
  proposalLinkId, 
  cardGuaranteeType, 
  cardResponsible,
  showResponsible = true 
}: Props) {
  const { data, isLoading } = useProposalNegotiationSummary(proposalLinkId);

  if (!proposalLinkId) return null;
  if (isLoading) {
    return (
      <div className="bg-muted/30 p-4 rounded-lg border border-muted">
        <p className="text-xs text-muted-foreground">Carregando resumo...</p>
      </div>
    );
  }
  if (!data || !data.hasData) return null;

  const rows: { label: string; value: string; emphasize?: boolean }[] = [
    { label: 'Aluguel', value: fmtBRL(data.aluguel) },
    { label: 'Condomínio', value: fmtBRL(data.condominio) },
    { label: 'IPTU', value: fmtBRL(data.iptu) },
    { label: 'Seguro incêndio', value: fmtBRL(data.seguro) },
  ];

  const hasContrato = !!(data.contratoDataInicio || data.diaVencimento);
  const hasRetirada = data.retiradaPorTerceiro || !!data.retiradaNome;
  const docsObs = data.raw_data?.documentos_observacao || data.raw_data?.form_data?.documentos?.observacao;
  const guaranteeType = cardGuaranteeType || data.tipoGarantia;

  return (
    <div className="bg-muted/30 p-4 rounded-lg border border-muted space-y-4">
      <div className="flex items-center gap-2">
        <Handshake className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Resumo da proposta
        </h3>
      </div>

      {/* Responsável */}
      {showResponsible && cardResponsible && (
        <div className="flex items-start gap-2 rounded-md border bg-background p-3">
          <UserCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Responsável pela proposta</p>
            <p className="font-semibold">{cardResponsible}</p>
          </div>
        </div>
      )}

      {/* Valores Financeiros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="bg-background rounded-md border p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {r.label}
            </p>
            <p className="text-sm font-semibold tabular-nums">{r.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-md p-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Total mensal
        </span>
        <span className="text-base font-bold text-primary tabular-nums">
          {fmtBRL(data.totalMensal)}
        </span>
      </div>

      {/* Aceite / proposta */}
      <div className="space-y-2">
        {data.aceitouValor === 'sim' && (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <Info className="h-4 w-4 text-emerald-700 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-900">
                Cliente aceitou o valor anunciado
              </p>
              {data.justificativa && (
                <p className="text-emerald-800 mt-1 whitespace-pre-wrap">
                  <span className="font-medium">Condições:</span>{' '}
                  {data.justificativa}
                </p>
              )}
            </div>
          </div>
        )}

        {data.aceitouValor === 'nao' && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <Info className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <div className="text-sm flex-1">
              <p className="font-semibold text-amber-900">
                Cliente propôs novo valor
              </p>
              <p className="text-amber-900 mt-1">
                <span className="font-medium">Valor proposto:</span>{' '}
                <span className="tabular-nums">{fmtBRL(data.valorProposto)}</span>
              </p>
              {data.justificativa && (
                <p className="text-amber-800 mt-1 whitespace-pre-wrap">
                  <span className="font-medium">Justificativa:</span>{' '}
                  {data.justificativa}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Garantia */}
      {(guaranteeType || data.observacaoGarantia) && (
        <div className="flex items-start gap-2 rounded-md border bg-background p-3">
          <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Garantia</p>
            <p className="font-semibold">
              {guaranteeType ? (GUARANTEE_LABELS[guaranteeType] || guaranteeType) : 'Não informada'}
            </p>
            {data.observacaoGarantia && (
              <p className="text-muted-foreground text-xs mt-1 whitespace-pre-wrap">
                {data.observacaoGarantia}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Assinatura */}
      {data.tipoAssinatura && (
        <div className="flex items-start gap-2 rounded-md border bg-background p-3">
          <FileSignature className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Tipo de contrato/assinatura</p>
            <p className="font-semibold">
              {SIGN_LABEL[data.tipoAssinatura] || data.tipoAssinatura}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {SIGN_HINT[data.tipoAssinatura]}
            </p>
          </div>
        </div>
      )}

      {/* Contrato (Datas) */}
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

      {/* Observação sobre documentos */}
      {docsObs && (
        <div className="rounded-md border bg-background p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileSignature className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Observação sobre documentos
            </p>
          </div>
          <p className="text-sm whitespace-pre-wrap">{docsObs}</p>
        </div>
      )}

      {/* Retirada de Chaves */}
      {hasRetirada && (
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
      )}
    </div>
  );
}
