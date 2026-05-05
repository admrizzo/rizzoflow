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
        <div ref={reportRef} className="bg-white font-sans text-slate-900 leading-normal p-12">
          <div className="space-y-10">
             {/* CABEÇALHO SIMPLES */}
             <div className="flex items-start justify-between border-b border-slate-200 pb-8">
               <div className="space-y-4">
                 <img src="/logo-rizzo.png" alt="Rizzo Imobiliária" className="h-10 w-auto object-contain" />
                 <div className="space-y-1">
                    <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                      RESUMO DA PROPOSTA
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      Para aprovação do proprietário
                    </p>
                 </div>
               </div>
               <div className="text-right text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                 Data de geração: {new Date().toLocaleDateString('pt-BR')}
               </div>
             </div>

            {/* SEÇÃO 1: IMÓVEL E VALORES ANUNCIADOS */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-widest">
                1. Imóvel e valores anunciados
              </h3>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div className="grid grid-cols-4 gap-x-8 gap-y-2">
                  <div className="col-span-4 flex gap-2">
                    <span className="font-bold text-slate-500">Código do imóvel:</span>
                    <span className="text-slate-900">{data.codigoRobust || '—'}</span>
                  </div>
                  <div className="col-span-4 flex gap-2">
                    <span className="font-bold text-slate-500">Endereço:</span>
                    <span className="text-slate-900">{data.endereco || 'Endereço não informado'}</span>
                  </div>
                  
                  <div className="pt-2 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Aluguel anunciado</span>
                    <span className="font-medium">{fmtBRL(data.aluguel)}</span>
                  </div>
                  <div className="pt-2 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Condomínio</span>
                    <span className="font-medium">{fmtBRL(data.condominio)}</span>
                  </div>
                  <div className="pt-2 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">IPTU</span>
                    <span className="font-medium">{fmtBRL(data.iptu)}</span>
                  </div>
                  <div className="pt-2 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Seguro incêndio</span>
                    <span className="font-medium">{fmtBRL(data.seguro)}</span>
                  </div>
                  
                  <div className="col-span-4 mt-2 bg-slate-50 border-y border-slate-100 py-3 px-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pacote anunciado</span>
                    <span className="text-base font-bold text-slate-900">{fmtBRL(announcedPackage)}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* SEÇÃO 2: CONDIÇÕES PROPOSTAS */}
            <section className="space-y-4 pt-4">
              <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-widest">
                2. Condições propostas
              </h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm">
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Aluguel proposto</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-lg font-bold text-slate-900">{fmtBRL(proposedRent)}</span>
                      {data.aceitouValor === 'nao' && diffRentAmount !== null && (
                        <span className="text-xs font-bold text-amber-600">
                          ({fmtBRL(diffRentAmount)} | {fmtPercent(diffRentPercent)})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pacote estimado com proposta</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-lg font-bold text-slate-900">{fmtBRL(proposedPackage)}</span>
                      {diffPackageAmount !== null && diffPackageAmount !== 0 && (
                        <span className="text-xs font-bold text-amber-600">
                          ({fmtBRL(diffPackageAmount)} | {fmtPercent(diffPackagePercent)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Garantia pretendida</span>
                    <span className="font-bold text-slate-700">{guaranteeType ? (GUARANTEE_LABELS[guaranteeType] || guaranteeType) : 'Não informada'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Início pretendido</span>
                    <span className="font-bold text-slate-700">{data.contratoDataInicio ? fmtDate(data.contratoDataInicio) : 'Não informado'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Vencimento</span>
                    <span className="font-bold text-slate-700">{data.diaVencimento ? `Dia ${data.diaVencimento}` : 'Não informado'}</span>
                  </div>
                </div>

                {(data.justificativa || negotiationDetails) ? (
                  <div className="col-span-2 space-y-4 pt-2">
                    {data.justificativa && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Observações da proposta</span>
                        <p className="text-sm text-slate-600 italic leading-relaxed">"{data.justificativa}"</p>
                      </div>
                    )}
                    {negotiationDetails && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Acordo registrado pela equipe</span>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed border-l-2 border-slate-200 pl-4 py-1">{negotiationDetails}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            {/* SEÇÃO 3: RESPONSÁVEIS */}
            <section className="pt-4 grid grid-cols-2 gap-8 border-t border-slate-100">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Responsável pelo fechamento</span>
                <span className="text-sm font-bold text-slate-800">{cardResponsible || 'Imobiliária'}</span>
              </div>
              <div className="text-right flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Documento gerado eletronicamente por Rizzo Flow</span>
              </div>
            </section>

            {/* SEÇÃO 4: RETORNO DO PROPRIETÁRIO */}
            <section className="pt-10 space-y-8 border-t-[2px] border-slate-900">
              <div className="flex items-center gap-12">
                {['Aprovado', 'Reprovado', 'Contraproposta'].map(l => (
                  <div key={l} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded border border-slate-400 bg-white" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{l}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observações:</p>
                <div className="space-y-8 pt-4">
                  <div className="border-b border-slate-200 w-full" />
                  <div className="border-b border-slate-200 w-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-24 pt-12 pb-10">
                <div className="space-y-2">
                  <div className="border-b border-slate-900 w-full" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Assinatura do Proprietário</p>
                </div>
                <div className="space-y-2">
                  <div className="border-b border-slate-900 w-full flex justify-around pb-1.5 px-4">
                    <span className="text-slate-300">____</span><span className="text-slate-800">/</span>
                    <span className="text-slate-300">____</span><span className="text-slate-800">/</span>
                    <span className="text-slate-300">______</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Data</p>
                </div>
              </div>
            </section>

            {/* RODAPÉ MÍNIMO */}
            <div className="flex items-center justify-between opacity-30 pt-4">
               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Rizzo Flow · Sistema Operacional de Locação</p>
               <img src="/smile-rizzo.png" alt="" className="h-6 w-auto grayscale" />
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
