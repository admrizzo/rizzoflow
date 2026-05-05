import { Handshake, FileSignature, Info, CalendarDays, KeyRound, Shield, UserCircle, Building2, MapPin, Calculator } from 'lucide-react';
import { useProposalNegotiationSummary } from '@/hooks/useProposalNegotiationSummary';
import { cn } from '@/lib/utils';

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

function fmtPercent(v: number | null) {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + '%';
}

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

  const diffAmount = data.valorProposto && data.aluguel ? data.valorProposto - data.aluguel : null;
  const diffPercent = diffAmount && data.aluguel ? (diffAmount / data.aluguel) * 100 : null;
  const guaranteeType = cardGuaranteeType || data.tipoGarantia;

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex items-center gap-2 border-b pb-4">
        <Handshake className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-bold text-foreground uppercase tracking-tight">
          Resumo da Proposta para Aprovação do Proprietário
        </h2>
      </div>

      {/* BLOCO 1: DADOS DO IMÓVEL E VALORES ANUNCIADOS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Dados do Imóvel e Valores Anunciados
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Identificação</span>
              <span className="text-xs font-mono bg-background px-1.5 py-0.5 rounded border">
                {data.codigoRobust ? `Cód. ${data.codigoRobust}` : '—'}
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">
                {data.endereco || 'Endereço não informado'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background rounded-md border p-2">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">Aluguel Anunciado</p>
              <p className="text-sm font-bold tabular-nums text-foreground">{fmtBRL(data.aluguel)}</p>
            </div>
            <div className="bg-background rounded-md border p-2">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">Condomínio</p>
              <p className="text-sm font-semibold tabular-nums text-muted-foreground">{fmtBRL(data.condominio)}</p>
            </div>
            <div className="bg-background rounded-md border p-2">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">IPTU</p>
              <p className="text-sm font-semibold tabular-nums text-muted-foreground">{fmtBRL(data.iptu)}</p>
            </div>
            <div className="bg-background rounded-md border p-2">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">Encargos/Seguro</p>
              <p className="text-sm font-semibold tabular-nums text-muted-foreground">{fmtBRL(data.seguro)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-muted/50 border rounded-md p-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Pacote Total Anunciado</span>
          <span className="text-base font-bold text-foreground tabular-nums">
            {fmtBRL(data.totalMensal)}
          </span>
        </div>

        {data.observacoesComerciais && (
          <div className="bg-muted/10 border-l-2 border-primary/20 p-3 rounded-r-md">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Observações Comerciais</p>
            <p className="text-xs text-muted-foreground italic line-clamp-3">
              "{data.observacoesComerciais}"
            </p>
          </div>
        )}
      </section>

      {/* BLOCO 2: CONDIÇÕES PROPOSTAS */}
      <section className="space-y-4 pt-2 border-t border-dashed">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Condições Propostas
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={cn(
            "rounded-lg border p-4 flex flex-col justify-center gap-1",
            data.aceitouValor === 'sim' ? "bg-emerald-50/50 border-emerald-100" : "bg-primary/5 border-primary/10"
          )}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Valor de Aluguel Proposto</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-black text-primary tabular-nums">
                {data.aceitouValor === 'sim' ? fmtBRL(data.aluguel) : fmtBRL(data.valorProposto)}
              </p>
              {data.aceitouValor === 'sim' && (
                <Badge className="bg-emerald-500 text-white border-none text-[9px] h-4">Anunciado</Badge>
              )}
            </div>
            
            {data.aceitouValor === 'nao' && diffAmount !== null && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className={cn(diffAmount > 0 ? "text-emerald-600" : "text-amber-600")}>
                  {diffAmount > 0 ? '+' : ''}{fmtBRL(diffAmount)}
                </span>
                <span className="text-muted-foreground/40">|</span>
                <span className={cn(diffAmount > 0 ? "text-emerald-600" : "text-amber-600")}>
                  {diffAmount > 0 ? '+' : ''}{fmtPercent(diffPercent)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="bg-background rounded-md border p-3 flex items-start gap-2">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Garantia Pretendida</p>
                <p className="text-sm font-bold">
                  {guaranteeType ? (GUARANTEE_LABELS[guaranteeType] || guaranteeType) : 'Não informada'}
                </p>
                {data.observacaoGarantia && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.observacaoGarantia}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-background rounded-md border p-2">
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Início Pretendido</p>
                <p className="text-sm font-semibold">{data.contratoDataInicio ? fmtDate(data.contratoDataInicio) : '—'}</p>
              </div>
              <div className="bg-background rounded-md border p-2">
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Dia Vencimento</p>
                <p className="text-sm font-semibold">{data.diaVencimento ? `Dia ${data.diaVencimento}` : '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {data.justificativa && (
          <div className="bg-amber-50/30 border border-amber-100 rounded-md p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Info className="h-3 w-3 text-amber-600" />
              <p className="text-[10px] font-bold text-amber-700 uppercase">Observação sobre o valor proposto</p>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">
              {data.justificativa}
            </p>
          </div>
        )}
      </section>

      {/* RODAPÉ DO RESUMO */}
      {showResponsible && cardResponsible && (
        <div className="flex items-center gap-2 pt-2 text-[10px] text-muted-foreground">
          <UserCircle className="h-3.5 w-3.5" />
          <span>Responsável: <strong className="text-foreground">{cardResponsible}</strong></span>
        </div>
      )}
    </div>
  );
}
