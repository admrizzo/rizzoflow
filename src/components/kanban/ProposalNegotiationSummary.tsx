 import { Handshake, FileSignature, Info, CalendarDays, KeyRound, Shield, UserCircle, Download, Loader2, CheckCheck, Square, CheckSquare } from 'lucide-react';
import { useProposalNegotiationSummary } from '@/hooks/useProposalNegotiationSummary';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState, useRef } from 'react';
 import html2canvas from 'html2canvas';
 import { jsPDF } from 'jspdf';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Calculator } from 'lucide-react';

interface Props {
  proposalLinkId: string | null | undefined;
  cardGuaranteeType?: string | null;
  cardResponsible?: string | null;
  showResponsible?: boolean;
  negotiationDetails?: string | null;
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
  showResponsible = true,
  negotiationDetails
}: Props) {
  const { data, isLoading } = useProposalNegotiationSummary(proposalLinkId);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!proposalLinkId) return null;
  if (isLoading) {
    return (
      <div className="bg-muted/30 p-4 rounded-lg border border-muted">
        <p className="text-xs text-muted-foreground">Carregando resumo...</p>
      </div>
    );
  }
  if (!data || !data.hasData) return null;

   const handleExport = async () => {
     if (!reportRef.current) return;
     setIsExporting(true);
     try {
       const clone = reportRef.current.cloneNode(true) as HTMLElement;
       clone.style.position = 'fixed';
       clone.style.top = '0';
       clone.style.left = '0';
       clone.style.width = '850px';
       clone.style.padding = '40px';
       clone.style.backgroundColor = '#ffffff';
       clone.style.display = 'block';
       
       const hiddenElements = clone.querySelectorAll('.hidden');
       hiddenElements.forEach(el => el.classList.remove('hidden'));
 
       document.body.appendChild(clone);
       
       const images = clone.getElementsByTagName('img');
       await Promise.all(Array.from(images).map(img => {
         if (img.complete) return Promise.resolve();
         return new Promise(resolve => {
           img.onload = resolve;
           img.onerror = resolve;
         });
       }));
 
       await new Promise(resolve => setTimeout(resolve, 300));
 
       const canvas = await html2canvas(clone, {
         scale: 1.5,
         backgroundColor: '#ffffff',
         useCORS: true,
         logging: false,
         width: 850,
         windowWidth: 850,
       });
 
       document.body.removeChild(clone);
 
       const imgData = canvas.toDataURL('image/jpeg', 0.85);
       const pdf = new jsPDF({
         orientation: 'portrait',
         unit: 'mm',
         format: 'a4'
       });
       
       const imgWidth = 210;
       const imgHeight = (canvas.height * imgWidth) / canvas.width;
       
       pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
       
       const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
       const filename = `RESUMO PROPOSTA IMÓVEL COD: ${data.codigoRobust || 'IMÓVEL'} - ${dateStr}.pdf`;
       pdf.save(filename);
     } catch (err) {
       console.error('Erro ao gerar resumo:', err);
     } finally {
       setIsExporting(false);
     }
   };

   const announcedRent = data.aluguel || 0;
   const announcedCondo = data.condominio || 0;
   const announcedIPTU = data.iptu || 0;
   const announcedInsurance = data.seguro || 0;
   const announcedPackage = announcedRent + announcedCondo + announcedIPTU + announcedInsurance;
 
   const proposedRent = data.aceitouValor === 'sim' ? announcedRent : (data.valorProposto || announcedRent);
   const proposedPackage = proposedRent + announcedCondo + announcedIPTU + announcedInsurance;
 
   const diffRentAmount = proposedRent - announcedRent;
   const diffRentPercent = announcedRent > 0 ? (diffRentAmount / announcedRent) * 100 : null;
 
   const diffPackageAmount = proposedPackage - announcedPackage;
   const diffPackagePercent = announcedPackage > 0 ? (diffPackageAmount / announcedPackage) * 100 : null;
 
  const guaranteeType = cardGuaranteeType || data.tipoGarantia;

  const rows: { label: string; value: string; emphasize?: boolean }[] = [
    { label: 'Aluguel', value: fmtBRL(data.aluguel) },
    { label: 'Condomínio', value: fmtBRL(data.condominio) },
    { label: 'IPTU', value: fmtBRL(data.iptu) },
    { label: 'Seguro incêndio', value: fmtBRL(data.seguro) },
  ];

  const hasContrato = !!(data.contratoDataInicio || data.diaVencimento);
  const hasRetirada = data.retiradaPorTerceiro || !!data.retiradaNome;
  const docsObs = data.documentosObservacao;

  return (
    <div className="bg-muted/30 p-4 rounded-lg border border-muted space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Handshake className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Resumo da proposta
          </h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 gap-1.5 text-[10px] font-bold uppercase tracking-tight bg-background border-primary/20 text-primary hover:bg-primary/5"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Baixar Resumo (PDF)
        </Button>
      </div>

      {/* Responsável */}
      {showResponsible && cardResponsible && (
        <div className="flex items-start gap-2 rounded-md border bg-background p-3">
          <UserCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm">
             <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Responsável pelo fechamento da proposta</p>
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

      {/* Acordo Interno / Observações Finais */}
      {negotiationDetails && (
        <div className="rounded-md border-2 border-primary/20 bg-primary/5 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCheck className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-primary uppercase tracking-wider">
              Acordo final / observações internas
            </p>
          </div>
          <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
            {negotiationDetails}
          </p>
        </div>
      )}

      {/* Hidden container for export only - THE OWNER REPORT LAYOUT */}
      <div className="hidden">
        <div ref={reportRef} className="bg-white font-sans text-slate-900 leading-normal relative overflow-hidden">
          {/* Background Watermark Smile */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none -rotate-12">
            <img src="/smile-rizzo.png" alt="" className="w-[450px] h-auto" />
          </div>
          
          <div className="space-y-8 relative z-10">
             {/* HEADER RIZZO */}
             <div className="flex items-start justify-between border-b-[4px] border-[#304955] pb-6">
               <div className="flex items-center gap-4">
                 <img src="/logo-rizzo.png" alt="Rizzo Imobiliária" className="h-14 w-auto object-contain" />
                 <div className="h-10 w-[1px] bg-slate-200 mx-2" />
                 <div>
                    <h1 className="text-3xl font-black tracking-tighter text-[#1e293b] uppercase leading-none">
                     Resumo da Proposta
                   </h1>
                    <p className="text-[11px] font-bold text-[#304955] uppercase tracking-[0.3em] mt-2">
                     Para Aprovação do Proprietário
                   </p>
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Documento Oficial</p>
                 <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg shadow-sm">
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Gerado em</p>
                   <p className="text-sm font-black text-slate-800 tabular-nums">{new Date().toLocaleDateString('pt-BR')}</p>
                 </div>
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
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Código do Imóvel</span>
                    <span className="text-lg font-black text-[#1e293b] leading-none">
                      {data.codigoRobust || '—'}
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

                <div className="flex items-center justify-between bg-[#1e293b] rounded-xl p-4 text-white shadow-lg border-b-4 border-[#304955]">
                 <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-1.5 rounded-lg">
                      <Calculator className="h-4 w-4 text-white" />
                   </div>
                   <span className="text-[11px] font-black uppercase tracking-[0.15em] opacity-90">Pacote Total Anunciado</span>
                 </div>
                 <span className="text-2xl font-black tabular-nums">{fmtBRL(announcedPackage)}</span>
               </div>
            </section>

            {/* BLOCO 2: CONDIÇÕES PROPOSTAS */}
            <section className="space-y-4 pt-6 border-t-2 border-slate-50">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#304955]" />
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                  Condições Propostas
                </h3>
              </div>

               <div className="grid grid-cols-1 gap-6">
                 <div className="grid grid-cols-2 gap-6">
                   <div className={cn(
                      "rounded-xl border p-5 flex flex-col justify-center gap-3 shadow-sm",
                      data.aceitouValor === 'sim' ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
                   )}>
                     <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aluguel Proposto</p>
                       {data.aceitouValor === 'sim' && (
                         <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Igual Anúncio</span>
                       )}
                     </div>
                     
                     <p className="text-3xl font-black text-slate-900 tabular-nums leading-none">
                       {fmtBRL(proposedRent)}
                     </p>
                     
                     {data.aceitouValor === 'nao' && diffRentAmount !== null && (
                       <div className="flex items-center gap-2 text-xs font-bold pt-1 border-t border-slate-200/50">
                         <span className={cn(diffRentAmount >= 0 ? "text-emerald-600" : "text-amber-600")}>
                           {diffRentAmount > 0 ? '+' : ''}{fmtBRL(diffRentAmount)}
                         </span>
                         <span className="text-slate-300">|</span>
                         <span className={cn(diffRentAmount >= 0 ? "text-emerald-600" : "text-amber-600")}>
                           {diffRentAmount > 0 ? '+' : ''}{fmtPercent(diffRentPercent)}
                         </span>
                         <span className="text-[9px] text-slate-400 font-medium uppercase ml-auto">vs anunciado</span>
                       </div>
                     )}
                   </div>
 
                   <div className={cn(
                     "rounded-xl border-2 p-5 flex flex-col justify-center gap-3 shadow-md",
                     diffPackageAmount >= 0 ? "bg-slate-50 border-slate-200" : "bg-amber-50/50 border-amber-100"
                   )}>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pacote Proposto Estimado</p>
                     <p className="text-3xl font-black text-slate-900 tabular-nums leading-none">
                       {fmtBRL(proposedPackage)}
                     </p>
                     <div className="flex items-center gap-2 text-xs font-bold pt-1 border-t border-slate-200/50">
                       <span className={cn(diffPackageAmount >= 0 ? "text-slate-600" : "text-amber-600")}>
                         {diffPackageAmount > 0 ? '+' : ''}{fmtBRL(diffPackageAmount)}
                       </span>
                       <span className="text-slate-300">|</span>
                       <span className={cn(diffPackageAmount >= 0 ? "text-slate-600" : "text-amber-600")}>
                         {diffPackageAmount > 0 ? '+' : ''}{fmtPercent(diffPackagePercent)}
                       </span>
                       <span className="text-[9px] text-slate-400 font-medium uppercase ml-auto">vs anunciado</span>
                     </div>
                   </div>
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

            {/* BLOCO 3: ACORDO REGISTRADO PELA EQUIPE */}
            {negotiationDetails && (
              <section className="space-y-4 pt-6 border-t-2 border-slate-50">
                <div className="flex items-center gap-2">
                  <CheckCheck className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                    Acordo registrado pela equipe
                  </h3>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 shadow-sm">
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                    {negotiationDetails}
                  </p>
                </div>
              </section>
            )}
            </section>

             {/* SEÇÃO DE APROVAÇÃO DO PROPRIETÁRIO */}
             <section className="pt-8 space-y-6 border-t-[3px] border-slate-100">
               <div className="flex items-center gap-2">
                 <FileSignature className="h-5 w-5 text-slate-400" />
                 <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider">
                   Retorno do Proprietário
                 </h3>
               </div>
               
               <div className="grid grid-cols-3 gap-8">
                 <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <Square className="h-6 w-6 text-slate-300" />
                   <span className="text-sm font-bold text-slate-700 uppercase">Aprovado</span>
                 </div>
                 <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <Square className="h-6 w-6 text-slate-300" />
                   <span className="text-sm font-bold text-slate-700 uppercase">Reprovado</span>
                 </div>
                 <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <Square className="h-6 w-6 text-slate-300" />
                   <span className="text-sm font-bold text-slate-700 uppercase">Contraproposta</span>
                 </div>
               </div>
 
               <div className="space-y-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Observações do proprietário:</p>
                 <div className="space-y-6">
                   <div className="border-b border-slate-200 w-full h-2" />
                   <div className="border-b border-slate-200 w-full h-2" />
                   <div className="border-b border-slate-200 w-full h-2" />
                 </div>
               </div>
 
               <div className="grid grid-cols-2 gap-12 pt-12">
                 <div className="space-y-2">
                   <div className="border-b-2 border-slate-800 w-full pt-8" />
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Assinatura do Proprietário</p>
                 </div>
                 <div className="space-y-2">
                   <div className="border-b-2 border-slate-800 w-full pt-8 flex justify-around">
                     <span className="text-slate-300">____</span>
                     <span className="text-slate-800">/</span>
                     <span className="text-slate-300">____</span>
                     <span className="text-slate-800">/</span>
                     <span className="text-slate-300">______</span>
                   </div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Data</p>
                 </div>
               </div>
             </section>
 
             {/* RODAPÉ DO RESUMO */}
             <div className="pt-10 flex items-end justify-between border-t border-slate-100">
               <div className="space-y-1">
                 <div className="flex items-center gap-2">
                   <UserCircle className="h-4 w-4 text-slate-400" />
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Responsável pelo fechamento: <span className="text-[#1e293b] font-black">{cardResponsible || 'Imobiliária'}</span>
                   </p>
                 </div>
                 <p className="text-[9px] text-slate-300 font-medium ml-6 italic">Documento gerado eletronicamente pelo sistema Rizzo Flow</p>
               </div>
               <div className="flex items-center gap-3">
                 <div className="text-right">
                    <p className="text-[10px] font-black text-[#304955] leading-none">RIZZO IMOBILIÁRIA</p>
                   <p className="text-[9px] font-bold text-slate-400 tracking-tighter leading-none mt-1">RIZZO FLOW · OPERACIONAL</p>
                 </div>
                  <img src="/smile-rizzo.png" alt="Rizzo" className="h-10 w-auto grayscale opacity-10" />
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
