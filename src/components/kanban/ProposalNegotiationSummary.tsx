import { Handshake, Info, CalendarDays, Shield, UserCircle, Building2, MapPin, Calculator, Download, Loader2 } from 'lucide-react';
import { useProposalNegotiationSummary } from '@/hooks/useProposalNegotiationSummary';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Badge } from '@/components/ui/badge';

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
}: Props) {
  const { data, isLoading } = useProposalNegotiationSummary(proposalLinkId);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!proposalLinkId || !data || !data.hasData) return null;

  const handleExport = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const clone = reportRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.width = '800px';
      clone.style.padding = '40px';
      clone.style.backgroundColor = '#ffffff';
      clone.style.display = 'block';
      
      // Force visibility for cloned elements that might be hidden by CSS classes
      const hiddenElements = clone.querySelectorAll('.hidden');
      hiddenElements.forEach(el => el.classList.remove('hidden'));

      document.body.appendChild(clone);
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: 800,
        windowWidth: 800,
      });

      document.body.removeChild(clone);

      const link = document.createElement('a');
      const filename = `resumo-proposta-${data.codigoRobust || 'imovel'}-${new Date().toISOString().slice(0, 10)}.png`;
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Erro ao gerar resumo:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const diffAmount = data.valorProposto && data.aluguel ? data.valorProposto - data.aluguel : null;
  const diffPercent = diffAmount && data.aluguel ? (diffAmount / data.aluguel) * 100 : null;
  const guaranteeType = cardGuaranteeType || data.tipoGarantia;

  return (
    <div className="flex flex-col gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="w-fit gap-2 text-xs font-semibold h-8 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
        onClick={handleExport}
        disabled={isLoading || isExporting}
      >
        {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Baixar resumo da proposta (PDF/Imagem)
      </Button>

      {/* Hidden container for export only */}
      <div className="hidden">
        <div ref={reportRef} className="bg-white font-sans text-slate-900 leading-normal">
          <div className="space-y-8">
            {/* HEADER PRINCIPAL */}
            <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-6">
              <Handshake className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800 uppercase">
                  Resumo da Proposta
                </h1>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Para Aprovação do Proprietário
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gerado em</p>
                <p className="text-xs font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* BLOCO 1: DADOS DO IMÓVEL E VALORES ANUNCIADOS */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                  Dados do Imóvel e Valores Anunciados
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Identificação</span>
                    <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                      {data.codigoRobust ? `Cód. ${data.codigoRobust}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                      {data.endereco || 'Endereço não informado'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg border border-slate-100 p-3 shadow-sm">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Aluguel Anunciado</p>
                    <p className="text-base font-bold text-slate-800">{fmtBRL(data.aluguel)}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-100 p-3 shadow-sm">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Condomínio</p>
                    <p className="text-sm font-semibold text-slate-600">{fmtBRL(data.condominio)}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-100 p-3 shadow-sm">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">IPTU</p>
                    <p className="text-sm font-semibold text-slate-600">{fmtBRL(data.iptu)}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-100 p-3 shadow-sm">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Seguro Incêndio</p>
                    <p className="text-sm font-semibold text-slate-600">{fmtBRL(data.seguro)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-800 rounded-xl p-4 text-white shadow-md">
                <span className="text-xs font-bold uppercase tracking-widest opacity-70">Pacote Total Anunciado</span>
                <span className="text-xl font-black">{fmtBRL(data.totalMensal)}</span>
              </div>

              {data.observacoesComerciais && (
                <div className="bg-slate-50 border-l-4 border-slate-200 p-4 rounded-r-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide">Observações do Anúncio</p>
                  <p className="text-sm text-slate-600 italic leading-relaxed">
                    "{data.observacoesComerciais}"
                  </p>
                </div>
              )}
            </section>

            {/* BLOCO 2: CONDIÇÕES PROPOSTAS */}
            <section className="space-y-4 pt-6 border-t-2 border-slate-50">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                  Condições Propostas
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className={cn(
                  "rounded-xl border-2 p-5 flex flex-col justify-center gap-2 shadow-sm",
                  data.aceitouValor === 'sim' ? "bg-emerald-50 border-emerald-100" : "bg-primary/5 border-primary/10"
                )}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Aluguel Proposto</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-primary">
                      {data.aceitouValor === 'sim' ? fmtBRL(data.aluguel) : fmtBRL(data.valorProposto)}
                    </p>
                    {data.aceitouValor === 'sim' && (
                      <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Igual Anúncio</span>
                    )}
                  </div>
                  
                  {data.aceitouValor === 'nao' && diffAmount !== null && (
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className={cn(diffAmount > 0 ? "text-emerald-600" : "text-amber-600")}>
                        {diffAmount > 0 ? '+' : ''}{fmtBRL(diffAmount)}
                      </span>
                      <span className="text-slate-200">|</span>
                      <span className={cn(diffAmount > 0 ? "text-emerald-600" : "text-amber-600")}>
                        {diffAmount > 0 ? '+' : ''}{fmtPercent(diffPercent)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-start gap-3">
                    <Shield className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Garantia Pretendida</p>
                      <p className="text-sm font-bold text-slate-800">
                        {guaranteeType ? (GUARANTEE_LABELS[guaranteeType] || guaranteeType) : 'Não informada'}
                      </p>
                      {data.observacaoGarantia && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{data.observacaoGarantia}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg border border-slate-100 p-3 shadow-sm">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">Início</p>
                      <p className="text-sm font-bold text-slate-700">{data.contratoDataInicio ? fmtDate(data.contratoDataInicio) : '—'}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-100 p-3 shadow-sm">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">Vencimento</p>
                      <p className="text-sm font-bold text-slate-700">{data.diaVencimento ? `Dia ${data.diaVencimento}` : '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {data.justificativa && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4 text-amber-600" />
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Observações sobre a proposta</p>
                  </div>
                  <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap italic">
                    "{data.justificativa}"
                  </p>
                </div>
              )}
            </section>

            {/* RODAPÉ DO RESUMO */}
            <div className="pt-8 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-slate-300" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Responsável: <span className="text-slate-700">{cardResponsible || 'Imobiliária'}</span>
                </p>
              </div>
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">
                RIZZO FLOW · OPERACIONAL
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
