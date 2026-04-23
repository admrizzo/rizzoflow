import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Check, AlertCircle, Plus, Trash2,
  Upload, FileText, Image, X, HelpCircle, ShieldCheck, ShieldAlert,
  Shield, MapPin, Loader2, Home, BedDouble, Bath, Maximize,
  User, Building, Phone, Mail, Briefcase, ChevronDown, Copy,
  DollarSign, Users, FileCheck, Lock, Handshake, ClipboardCheck,
  Zap, MessageSquare, CalendarDays, Info
} from 'lucide-react';
import type {
  ProposalFormData, DadosPessoais, MoradorData, FiadorData, UploadedFile,
  DocumentCategory, DocCategoryKey
} from '@/pages/PropostaLocacao';
import {
  calcPercentualComprometimento
} from '@/pages/PropostaLocacao';

// ── Constants ──
const emptyPerson: DadosPessoais = { nome: '', cpf: '', profissao: '', whatsapp: '', email: '' };
const emptyMorador: MoradorData = { tipo: '', nome: '' };
const emptyFiador: FiadorData = { nome: '', cpf: '', profissao: '', whatsapp: '', email: '', renda_mensal: '', registro_imoveis: '', estado_civil: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };

const INITIAL_DOC_CATEGORIES: DocumentCategory[] = [
  { key: 'documento_foto', label: 'Documento com foto (CPF/RG/CNH)', help: 'Envie frente e verso do documento com foto.', files: [] },
  { key: 'comprovante_residencia', label: 'Comprovante de residência', help: 'Conta de luz, água, gás ou internet dos últimos 3 meses.', files: [] },
  { key: 'comprovante_renda', label: 'Comprovante de renda', help: 'Holerite, declaração de IR, extrato bancário ou pró-labore.', files: [] },
  { key: 'estado_civil', label: 'Estado civil', help: 'Certidão de nascimento, casamento ou averbação de divórcio.', files: [] },
];

const ACCEPTED_FILE_TYPES = '.jpg,.jpeg,.png,.pdf';
const ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const CIVIL_STATUS = [
  { label: 'Solteiro(a)', icon: '👤' },
  { label: 'Casado(a)', icon: '💍' },
  { label: 'Divorciado(a)', icon: '📋' },
  { label: 'Viúvo(a)', icon: '🕊️' },
  { label: 'União Estável', icon: '🤝' },
];

const RENDA_SOURCES = [
  { value: 'Empregado(a)', icon: '💼', label: 'Empregado(a)' },
  { value: 'Funcionário Público', icon: '🏛️', label: 'Funcionário Público' },
  { value: 'Autônomo(a)', icon: '🔧', label: 'Autônomo(a)' },
  { value: 'Empresário(a)', icon: '🏢', label: 'Empresário(a)' },
];

const GARANTIA_OPTIONS = [
  { value: 'SG Cred', icon: '💳', desc: 'Análise de crédito própria', badge: 'Mais escolhida ⭐' },
  { value: 'Seguro Fiança', icon: '🛡️', desc: 'Seguradora garante o contrato', badge: null },
  { value: 'Fiador', icon: '👥', desc: 'Pessoa que garante o contrato', badge: null },
  { value: 'Título de Capitalização', icon: '📈', desc: 'Investimento como garantia', badge: null },
  { value: 'Carta Fiança', icon: '📄', desc: 'Carta bancária de garantia', badge: null },
];

const MORADOR_TYPES = [
  { value: 'eu_mesmo', label: 'Eu mesmo' },
  { value: 'filho', label: 'Filho(a)' },
  { value: 'terceiro', label: 'Terceiro' },
];

const FAQ_ITEMS = [
  { icon: '🔒', q: 'O que posso apresentar como garantia?', a: 'As opções mais comuns são: Seguro Fiança, Caução (3 meses de depósito), Fiador com imóvel quitado, Título de Capitalização ou Carta Fiança bancária.' },
  { icon: '👥', q: 'No caso de fiador, pode ser um só?', a: 'Geralmente é necessário um fiador com imóvel quitado na mesma cidade. Em alguns casos, pode ser solicitado mais de um fiador.' },
  { icon: '📄', q: 'O que é aceito como comprovação de renda?', a: 'Holerite dos últimos 3 meses, Declaração de IR, extrato bancário, pró-labore, ou declaração de contador para autônomos.' },
  { icon: '🏠', q: 'O que vale como comprovante de endereço e estado civil?', a: 'Conta de luz, água, gás ou internet dos últimos 3 meses. Para estado civil: certidão de nascimento, casamento ou averbação.' },
  { icon: '📋', q: 'Comprovação de imóvel do fiador — o que serve?', a: 'Certidão de matrícula atualizada do imóvel (máximo 30 dias) e IPTU em dia.' },
  { icon: '🔑', q: 'Em quanto tempo pego a chave?', a: 'Após aprovação da proposta e assinatura do contrato, geralmente entre 5 a 10 dias úteis.' },
  { icon: '💲', q: 'Tem algum custo no contrato?', a: 'Pode haver taxa de contrato e seguro incêndio obrigatório. Consulte os valores com o corretor.' },
];

const LOCACAO_BOARD_ID = '3b619b46-85bf-487d-955b-e1255b1bf174';
const CADASTRO_INICIADO_COLUMN_ID = '98579480-4d58-44f4-86dd-82c89e8f9f53';

const STEP_CONFIG = [
  { label: 'Imóvel e Tipo', shortLabel: 'Imóvel e Tipo', icon: Home },
  { label: 'Dados Pessoais', shortLabel: 'Dados Pessoais', icon: User },
  { label: 'Cônjuge / Sócios', shortLabel: 'Cônjuge / Sócios', icon: Users },
  { label: 'Documentos', shortLabel: 'Documentos', icon: FileCheck },
  { label: 'Moradores', shortLabel: 'Moradores', icon: BedDouble },
  { label: 'Garantia', shortLabel: 'Garantia', icon: Lock },
  { label: 'Negociação', shortLabel: 'Negociação', icon: Handshake },
  { label: 'Revisão', shortLabel: 'Revisão', icon: ClipboardCheck },
];

function parseCurrency(val: string): number {
  const cleaned = val.replace(/[^\d,.]/g, '').replace('.', '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function vv(val: string | undefined | null): string {
  return val && val.trim() ? val : 'Não informado';
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return 'N/A';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function needsConjuge(data: ProposalFormData) {
  const civil = data.perfil_financeiro.estado_civil;
  return civil === 'Casado(a)' || civil === 'União Estável';
}

function validateStep(step: number, data: ProposalFormData): string[] {
  const errors: string[] = [];
  switch (step) {
    case 0: break; // Imóvel e Tipo — auto-preenchido
    case 1:
      if (!data.dados_pessoais.nome.trim()) errors.push('Nome completo é obrigatório');
      if (!data.dados_pessoais.cpf.trim()) errors.push('CPF/CNPJ é obrigatório');
      if (!data.perfil_financeiro.estado_civil) errors.push('Estado civil é obrigatório');
      if (!data.dados_pessoais.whatsapp.trim()) errors.push('WhatsApp é obrigatório');
      if (!data.dados_pessoais.email.trim()) errors.push('E-mail é obrigatório');
      if (!data.perfil_financeiro.fonte_renda) errors.push('Fonte de renda é obrigatória');
      if (!data.perfil_financeiro.renda_mensal.trim()) errors.push('Renda mensal é obrigatória');
      break;
    case 2:
      if (needsConjuge(data) && !data.conjuge.nome.trim()) errors.push('Nome do cônjuge é obrigatório');
      break;
    case 4:
      if (data.composicao.moradores.length === 0) errors.push('Informe pelo menos um morador');
      for (const m of data.composicao.moradores) {
        if (!m.tipo) errors.push('Tipo de morador é obrigatório');
      }
      break;
    case 5:
      if (!data.garantia.tipo_garantia) errors.push('Garantia é obrigatória');
      break;
  }
  return errors;
}

interface PropertyData {
  codigo_robust: number;
  titulo: string | null;
  tipo_imovel: string | null;
  finalidade: string | null;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  numero: string | null;
  complemento: string | null;
  valor_aluguel: number | null;
  condominio: number | null;
  iptu: number | null;
  seguro_incendio: number | null;
  foto_principal: string | null;
  status_imovel: number | null;
}

// ── Score ──
type ProposalScore = 'forte' | 'media' | 'risco';
function calcScore(data: ProposalFormData, percentual: number | null): { score: ProposalScore; points: number; reasons: string[] } {
  let points = 0;
  const reasons: string[] = [];
  if (percentual !== null && percentual > 0) {
    if (percentual <= 25) points += 40;
    else if (percentual <= 30) { points += 30; reasons.push('Comprometimento 25-30%'); }
    else if (percentual <= 40) { points += 15; reasons.push('Comprometimento acima de 30%'); }
    else { reasons.push('Comprometimento acima de 40%'); }
  }
  const g = data.garantia.tipo_garantia;
  if (g === 'Seguro Fiança' || g === 'Caução') points += 30;
  else if (g === 'Fiador' || g === 'Título de Capitalização' || g === 'Carta Fiança') points += 20;
  else if (g === 'Sem Garantia') reasons.push('Sem garantia');
  const totalDocs = data.documentos.length;
  const completeDocs = data.documentos.filter(c => c.files.length > 0).length;
  if (totalDocs > 0) {
    points += Math.round((completeDocs / totalDocs) * 30);
    if (completeDocs < totalDocs) reasons.push(`${totalDocs - completeDocs} doc(s) pendente(s)`);
  }
  const score: ProposalScore = points >= 70 ? 'forte' : points >= 40 ? 'media' : 'risco';
  return { score, points, reasons };
}

function getPendingSteps(data: ProposalFormData): { step: number; label: string; errors: string[]; critical: boolean }[] {
  const pending: { step: number; label: string; errors: string[]; critical: boolean }[] = [];
  const sc = needsConjuge(data);
  for (let i = 0; i < 7; i++) {
    if (i === 2 && !sc) continue;
    const errs = validateStep(i, data);
    if (errs.length > 0) {
      const critical = [1, 5].includes(i);
      pending.push({ step: i, label: STEP_CONFIG[i].label, errors: errs, critical });
    }
  }
  return pending;
}

function mapGarantia(label: string): string | null {
  const map: Record<string, string> = {
    'Fiador': 'fiador', 'Seguro Fiança': 'seguro_fianca', 'Caução': 'caucao',
    'Título de Capitalização': 'titulo_capitalizacao', 'Carta Fiança': 'carta_fianca', 'Sem Garantia': 'sem_garantia',
  };
  return map[label] || null;
}

// ── Stepper Component ──
function StepperHeader({ currentStep, totalSteps, onGoToStep, visited, data }: {
  currentStep: number; totalSteps: number; onGoToStep: (s: number) => void;
  visited: Set<number>; data: ProposalFormData;
}) {
  const showConjuge = needsConjuge(data);
  return (
    <div className="bg-white border-b sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <p className="text-center text-sm font-semibold text-foreground mb-4 tracking-wide">
          Registro de Interesse na Locação
        </p>
        <div className="flex items-center justify-center gap-0 overflow-x-auto">
          {STEP_CONFIG.map((cfg, i) => {
            if (i === 2 && !showConjuge) return null;
            const isActive = i === currentStep;
            const isDone = visited.has(i) && i !== currentStep && validateStep(i, data).length === 0;
            const isClickable = true;
            const displayNum = i + 1;

            return (
              <div key={i} className="flex items-center">
                {i > 0 && !(i === 2 && !showConjuge) && (
                  <div className={cn('w-4 sm:w-8 h-[2px] mx-0.5', isDone || isActive ? 'bg-primary' : 'bg-border')} />
                )}
                <button
                  onClick={() => onGoToStep(i)}
                  className="flex flex-col items-center gap-1 group transition-all cursor-pointer"
                >
                  <div className={cn(
                    'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all',
                    isActive && 'border-primary bg-primary text-primary-foreground shadow-md scale-110',
                    isDone && !isActive && 'border-primary bg-primary text-primary-foreground',
                    !isActive && !isDone && 'border-border bg-white text-muted-foreground',
                  )}>
                    {isDone ? <Check className="h-4 w-4" /> : displayNum}
                  </div>
                  <span className={cn(
                    'text-[10px] sm:text-xs font-medium whitespace-nowrap max-w-[60px] sm:max-w-[80px] truncate',
                    isActive && 'text-primary font-semibold',
                    isDone && !isActive && 'text-primary',
                    !isActive && !isDone && 'text-muted-foreground',
                  )}>
                    {cfg.shortLabel}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── FAQ Accordion ──
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="bg-white rounded-2xl border p-6 mt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Dúvidas rápidas</h3>
          <p className="text-xs text-muted-foreground">{FAQ_ITEMS.length} perguntas mais comuns</p>
        </div>
      </div>
      <div className="divide-y">
        {FAQ_ITEMS.map((faq, i) => (
          <div key={i}>
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center gap-3 py-3.5 text-left hover:bg-muted/30 rounded-lg px-2 transition-colors"
            >
              <span className="text-base">{faq.icon}</span>
              <span className="flex-1 text-sm font-medium text-foreground">{faq.q}</span>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', openIdx === i && 'rotate-180')} />
            </button>
            {openIdx === i && (
              <div className="pl-10 pr-4 pb-3 text-sm text-muted-foreground leading-relaxed">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section Wrapper ──
function FormSection({ icon: Icon, title, children, className }: {
  icon: typeof User; title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('bg-white rounded-2xl border p-6 sm:p-8', className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-bold text-foreground text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Main Component ──
export default function PropostaPublica() {
  const { codigoRobust } = useParams<{ codigoRobust: string }>();
  const codigo = codigoRobust || '';

  const { data: property, isLoading: propertyLoading, error: propertyError } = useQuery({
    queryKey: ['public-property', codigo],
    queryFn: async () => {
      const codigoNum = parseInt(codigo, 10);
      if (isNaN(codigoNum)) throw new Error('Código inválido');
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('codigo_robust', codigoNum)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('not_found');
      return data as PropertyData;
    },
    enabled: !!codigo,
    retry: false,
  });

  const { data: proposalLink } = useQuery({
    queryKey: ['public-proposal-link', codigo],
    queryFn: async () => {
      const codigoNum = parseInt(codigo, 10);
      if (isNaN(codigoNum)) return null;
      const { data } = await supabase
        .from('proposal_links')
        .select('*')
        .eq('codigo_robust', codigoNum)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!codigo,
  });

  useEffect(() => {
    if (proposalLink && proposalLink.status === 'nao_acessado') {
      supabase
        .from('proposal_links')
        .update({ status: 'em_preenchimento', accessed_at: new Date().toISOString() })
        .eq('id', proposalLink.id)
        .then();
    }
  }, [proposalLink]);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<ProposalFormData>({
    imovel: { codigo: '', endereco: '', valor_aluguel: '', tipo_pessoa: 'fisica' },
    dados_pessoais: { ...emptyPerson },
    perfil_financeiro: { estado_civil: '', fonte_renda: '', renda_mensal: '' },
    conjuge: { ...emptyPerson },
    socios: [],
    documentos: INITIAL_DOC_CATEGORIES.map(c => ({ ...c, files: [] })),
    documentos_observacao: '',
    composicao: { moradores: [{ ...emptyMorador }], responsavel_retirada: '' },
    garantia: { tipo_garantia: '', observacao: '', fiadores: [] },
    negociacao: { valor_proposto: '', aceitou_valor: '', observacao: '' },
  });
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [submitted, setSubmitted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (property) {
      const endereco = [property.logradouro, property.numero, property.bairro, property.cidade, property.estado].filter(Boolean).join(', ');
      setData(prev => ({
        ...prev,
        imovel: {
          ...prev.imovel,
          codigo: String(property.codigo_robust),
          endereco,
          valor_aluguel: property.valor_aluguel ? String(property.valor_aluguel) : '',
        }
      }));
    }
  }, [property]);

  const showConjuge = needsConjuge(data);
  const totalSteps = 8;

  const update = useCallback((updater: (prev: ProposalFormData) => ProposalFormData) => {
    setData(updater);
  }, []);

  const percentualComprometimento = calcPercentualComprometimento(
    data.imovel.valor_aluguel,
    data.perfil_financeiro.renda_mensal
  );

  const stepErrors = validateStep(step, data);
  const isStepValid = stepErrors.length === 0;

  function goNext() {
    if (!isStepValid) {
      toast.error('Preencha os campos obrigatórios', { description: stepErrors[0] });
      return;
    }
    if (step < totalSteps - 1) {
      const next = step === 1 && !showConjuge ? 3 : step + 1;
      setStep(next);
      setVisited(prev => new Set(prev).add(next));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goPrev() {
    if (step > 0) {
      const prev = step === 3 && !showConjuge ? 1 : step - 1;
      setStep(prev);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goToStep(s: number) {
    if (s === 2 && !showConjuge) return;
    setStep(s);
    setVisited(prev => new Set(prev).add(s));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const totalMensal = useMemo(() => {
    if (!property) return null;
    const aluguel = property.valor_aluguel || 0;
    const cond = property.condominio || 0;
    const iptu = property.iptu || 0;
    const seguro = property.seguro_incendio || 0;
    return { aluguel, cond, iptu, seguro, total: aluguel + cond + iptu + seguro };
  }, [property]);

  async function handleSubmit() {
    const pending = getPendingSteps(data);
    const critical = pending.filter(p => p.critical);
    if (critical.length > 0) {
      toast.error('Pendências críticas', { description: critical[0].errors[0] });
      setStep(critical[0].step);
      return;
    }

    const renda = parseCurrency(data.perfil_financeiro.renda_mensal);
    const aluguel = parseCurrency(data.imovel.valor_aluguel);
    const percentualCalc = renda > 0 ? (aluguel / renda) * 100 : null;
    const { score, points } = calcScore(data, percentualCalc);
    const scoreLabel = score === 'forte' ? 'Forte' : score === 'media' ? 'Média' : 'Risco';
    const garantiaLabel = data.garantia.tipo_garantia || 'Não informado';
    const clientName = data.dados_pessoais.nome || 'Não informado';
    const imovelCodigo = data.imovel.codigo;
    const brokerName = proposalLink?.broker_name || 'Não identificado';

    const cardTitle = `${clientName} — ${imovelCodigo}`;
    const descriptionLines = [
      `**Cliente:** ${clientName}`,
      `**CPF:** ${data.dados_pessoais.cpf || 'N/A'}`,
      `**WhatsApp:** ${data.dados_pessoais.whatsapp || 'N/A'}`,
      `**E-mail:** ${data.dados_pessoais.email || 'N/A'}`,
      '',
      `**Imóvel:** ${imovelCodigo}`,
      `**Endereço:** ${data.imovel.endereco || 'N/A'}`,
      `**Valor Aluguel:** ${formatCurrency(property?.valor_aluguel)}`,
      property?.condominio ? `**Condomínio:** ${formatCurrency(property.condominio)}` : '',
      property?.iptu ? `**IPTU:** ${formatCurrency(property.iptu)}` : '',
      property?.seguro_incendio ? `**Seguro Incêndio:** ${formatCurrency(property.seguro_incendio)}` : '',
      `**Valor Proposto:** ${data.negociacao.valor_proposto || 'N/A'}`,
      '',
      `**Renda Mensal:** R$ ${renda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `**Comprometimento:** ${percentualCalc ? percentualCalc.toFixed(1) + '%' : 'N/A'}`,
      `**Garantia:** ${garantiaLabel}`,
      `**Score:** ${scoreLabel} (${points}/100)`,
      `**Corretor:** ${brokerName}`,
    ];

    try {
      const { data: existingCards } = await supabase
        .from('cards')
        .select('position')
        .eq('column_id', CADASTRO_INICIADO_COLUMN_ID)
        .eq('is_archived', false)
        .order('position', { ascending: false })
        .limit(1);
      const nextPosition = existingCards && existingCards.length > 0 ? existingCards[0].position + 1 : 0;

      const { error } = await supabase.from('cards').insert({
        title: cardTitle,
        description: descriptionLines.filter(Boolean).join('\n'),
        board_id: LOCACAO_BOARD_ID,
        column_id: CADASTRO_INICIADO_COLUMN_ID,
        position: nextPosition,
        created_by: proposalLink?.broker_user_id || null,
        address: data.imovel.endereco || null,
        robust_code: imovelCodigo || null,
        building_name: property?.titulo || null,
        guarantee_type: mapGarantia(garantiaLabel) as any,
        column_entered_at: new Date().toISOString(),
      });
      if (error) throw error;

      if (proposalLink) {
        await supabase
          .from('proposal_links')
          .update({ status: 'enviada' })
          .eq('id', proposalLink.id);
      }

      setSubmitted(true);
      toast.success('Proposta enviada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao enviar proposta:', err);
      toast.error('Erro ao enviar proposta', { description: err.message });
    }
  }

  // ── Loading / Error / Submitted states ──
  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Carregando dados do imóvel...</p>
        </div>
      </div>
    );
  }

  if (propertyError || !property) {
    const msg = (propertyError as any)?.message === 'not_found'
      ? 'Imóvel não encontrado ou indisponível.'
      : 'Não foi possível carregar os dados do imóvel. Tente novamente mais tarde.';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border max-w-md w-full p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Proposta inválida ou expirada</h2>
          <p className="text-muted-foreground text-sm">{msg}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border max-w-md w-full p-10 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Proposta enviada! 🎉</h2>
          <p className="text-muted-foreground">
            Sua proposta para o imóvel Cód. {property.codigo_robust} foi enviada com sucesso.
            Entraremos em contato em breve.
          </p>
        </div>
      </div>
    );
  }

  // ── Step Renderers ──
  function renderStep0() {
    const addressParts = [property.logradouro, property.numero, property.bairro, property.cidade].filter(Boolean);
    return (
      <div className="space-y-6">
        {/* Welcome */}
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Home className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Bem-vindo à sua proposta! 🏠</h2>
          <p className="text-muted-foreground mt-1 text-sm">Confira os dados do imóvel abaixo e prossiga com sua proposta.</p>
        </div>

        {/* Property Card */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            {property.foto_principal && (
              <div className="sm:w-52 h-48 sm:h-auto relative overflow-hidden">
                <img src={property.foto_principal} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                    Cód. {property.codigo_robust}
                  </span>
                  {property.tipo_imovel && (
                    <span className="text-xs text-muted-foreground">{property.tipo_imovel}</span>
                  )}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copiado!'); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </button>
              </div>

              <h3 className="font-bold text-foreground leading-tight">
                {property.titulo || `Imóvel ${property.codigo_robust}`}
              </h3>

              {addressParts.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {addressParts.join(', ')}
                  {property.estado && `/${property.estado}`}
                </p>
              )}

              {/* Financial breakdown */}
              {totalMensal && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Aluguel</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(totalMensal.aluguel)}</p>
                  </div>
                  {totalMensal.cond > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Condomínio</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(totalMensal.cond)}</p>
                    </div>
                  )}
                  {totalMensal.iptu > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">IPTU/mês</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(totalMensal.iptu)}</p>
                    </div>
                  )}
                  {totalMensal.seguro > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Seguro incêndio</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(totalMensal.seguro)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fluxo */}
        <div className="bg-white rounded-xl border px-4 py-3 flex items-center gap-2 text-sm">
          <Home className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Fluxo selecionado automaticamente:</span>
          <span className="font-bold text-foreground">Locação</span>
        </div>

        {/* Tipo de proponente */}
        <div>
          <h3 className="font-bold text-foreground mb-3">Tipo de proponente</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'fisica' as const, label: 'Pessoa Física', desc: 'CPF, RG, dados pessoais', icon: User },
              { value: 'juridica' as const, label: 'Pessoa Jurídica', desc: 'CNPJ, contrato social, sócios', icon: Building },
            ].map(opt => {
              const selected = data.imovel.tipo_pessoa === opt.value;
              return (
                <button key={opt.value}
                  onClick={() => update(p => ({ ...p, imovel: { ...p.imovel, tipo_pessoa: opt.value } }))}
                  className={cn(
                    'relative p-5 rounded-2xl border-2 text-left transition-all',
                    selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                  )}
                >
                  {selected && (
                    <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary" />
                  )}
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <opt.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-bold text-foreground text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <FAQSection />
      </div>
    );
  }

  function renderStep1() {
    const isCnpj = data.imovel.tipo_pessoa === 'juridica';
    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <User className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Vamos nos conhecer! 👋</h2>
          <p className="text-muted-foreground mt-1 text-sm">Preencha seus dados pessoais. Campos com <span className="text-red-500">*</span> são obrigatórios.</p>
        </div>

        {/* Informações Pessoais */}
        <FormSection icon={User} title="Informações Pessoais">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Nome completo <span className="text-red-500">*</span></Label>
              <Input value={data.dados_pessoais.nome} onChange={e => update(p => ({ ...p, dados_pessoais: { ...p.dados_pessoais, nome: e.target.value } }))} placeholder="Nome completo" className="mt-1.5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">{isCnpj ? 'CNPJ' : 'CPF'} <span className="text-red-500">*</span></Label>
                <Input value={data.dados_pessoais.cpf} onChange={e => update(p => ({ ...p, dados_pessoais: { ...p.dados_pessoais, cpf: e.target.value } }))} placeholder={isCnpj ? '00.000.000/0000-00' : '000.000.000-00'} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm font-medium">Profissão <span className="text-red-500">*</span></Label>
                <Input value={data.dados_pessoais.profissao} onChange={e => update(p => ({ ...p, dados_pessoais: { ...p.dados_pessoais, profissao: e.target.value } }))} placeholder="Sua profissão" className="mt-1.5" />
              </div>
            </div>
          </div>
        </FormSection>

        {/* Contato */}
        <FormSection icon={Phone} title="Contato">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">WhatsApp <span className="text-red-500">*</span></Label>
              <div className="flex gap-2 mt-1.5">
                <div className="flex items-center gap-1 px-3 bg-muted rounded-md border text-sm text-muted-foreground shrink-0">
                  🇧🇷 +55
                </div>
                <Input value={data.dados_pessoais.whatsapp} onChange={e => update(p => ({ ...p, dados_pessoais: { ...p.dados_pessoais, whatsapp: e.target.value } }))} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">E-mail <span className="text-red-500">*</span></Label>
              <Input type="email" value={data.dados_pessoais.email} onChange={e => update(p => ({ ...p, dados_pessoais: { ...p.dados_pessoais, email: e.target.value } }))} placeholder="seu@email.com" className="mt-1.5" />
            </div>
          </div>
        </FormSection>

        {/* Estado Civil e Renda */}
        <FormSection icon={DollarSign} title="Estado Civil e Renda">
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium mb-3 block">Estado Civil <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {CIVIL_STATUS.map(s => (
                  <button key={s.label} type="button"
                    onClick={() => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, estado_civil: s.label } }))}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all',
                      data.perfil_financeiro.estado_civil === s.label
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    {data.perfil_financeiro.estado_civil === s.label && <span className="text-xs">●</span>}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {(data.perfil_financeiro.estado_civil === 'Casado(a)' || data.perfil_financeiro.estado_civil === 'União Estável') && (
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium">O(a) cônjuge/companheiro(a) vai fazer parte do contrato? <span className="text-red-500">*</span></p>
                <p className="text-xs text-muted-foreground">Se sim, será necessário preencher os dados dele(a) na próxima etapa.</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button variant="outline" className="h-10">Sim, vai participar</Button>
                  <Button variant="outline" className="h-10">Não, apenas eu</Button>
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium mb-3 block">Fonte de Renda <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                {RENDA_SOURCES.map(r => (
                  <button key={r.value} type="button"
                    onClick={() => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, fonte_renda: r.value } }))}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border text-sm font-medium text-left transition-all',
                      data.perfil_financeiro.fonte_renda === r.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    <span className="text-lg">{r.icon}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Renda Mensal <span className="text-red-500">*</span></Label>
              <Input
                value={data.perfil_financeiro.renda_mensal}
                onChange={e => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, renda_mensal: e.target.value } }))}
                placeholder="R$ 0,00"
                className="mt-1.5"
              />
              {percentualComprometimento !== null && parseCurrency(data.imovel.valor_aluguel) > 0 && (
                <div className={cn(
                  'mt-2 p-3 rounded-lg text-sm font-medium flex items-center gap-2',
                  percentualComprometimento > 30 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                )}>
                  {percentualComprometimento > 30 ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  Comprometimento de renda: {percentualComprometimento.toFixed(1)}%
                  {percentualComprometimento > 30 && ' — acima de 30%'}
                </div>
              )}
            </div>
          </div>
        </FormSection>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Cônjuge e Sócios</h2>
          <p className="text-muted-foreground mt-1 text-sm">Preencha os dados do cônjuge e adicione sócios, se houver.</p>
        </div>

        <FormSection icon={User} title="Dados do Cônjuge">
          <PersonFieldsClean data={data.conjuge} onChange={d => update(p => ({ ...p, conjuge: d }))} />
        </FormSection>

        <FormSection icon={Users} title="Sócios">
          <div className="space-y-4">
            {data.socios.map((s, i) => (
              <div key={i} className="p-4 border rounded-xl relative">
                <Button type="button" size="icon" variant="ghost" className="absolute top-2 right-2 text-red-500 hover:text-red-700 h-8 w-8"
                  onClick={() => update(p => ({ ...p, socios: p.socios.filter((_, idx) => idx !== i) }))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <p className="text-xs font-semibold text-muted-foreground mb-3">Sócio {i + 1}</p>
                <PersonFieldsClean data={s} onChange={d => { update(p => { const copy = [...p.socios]; copy[i] = d; return { ...p, socios: copy }; }); }} />
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full rounded-xl"
              onClick={() => update(p => ({ ...p, socios: [...p.socios, { ...emptyPerson }] }))}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar sócio
            </Button>
          </div>
        </FormSection>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileCheck className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Documentos 📋</h2>
          <p className="text-muted-foreground mt-1 text-sm">Envie os documentos necessários para análise da proposta.</p>
        </div>

        <div className="space-y-4">
          {data.documentos.map((cat, catIdx) => {
            const done = cat.files.length > 0;
            return (
              <div key={cat.key} className={cn('bg-white rounded-2xl border p-5 space-y-3', done && 'border-green-200')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground">{cat.label}</h4>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider',
                        done ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                        {done ? `${cat.files.length} arquivo(s)` : 'Pendente'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {cat.help}
                    </p>
                  </div>
                </div>
                {cat.files.length > 0 && (
                  <div className="space-y-1.5">
                    {cat.files.map(file => (
                      <div key={file.id} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
                        {file.type.startsWith('image/') ? <Image className="h-4 w-4 text-muted-foreground shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className="truncate flex-1 text-foreground">{file.name}</span>
                        <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                        <button className="text-red-400 hover:text-red-600 p-1"
                          onClick={() => update(p => { const docs = [...p.documentos]; docs[catIdx] = { ...docs[catIdx], files: docs[catIdx].files.filter(f => f.id !== file.id) }; return { ...p, documentos: docs }; })}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 cursor-pointer text-sm text-primary font-medium hover:bg-primary/5 border-2 border-dashed border-primary/30 rounded-xl py-3 transition-colors">
                  <Upload className="h-4 w-4" /> Adicionar arquivo
                  <input type="file" accept={ACCEPTED_FILE_TYPES} multiple className="hidden" onChange={e => {
                    const fileList = e.target.files;
                    if (!fileList) return;
                    let rejected = 0;
                    Array.from(fileList).forEach(file => {
                      if (!ACCEPTED_MIMES.includes(file.type)) { rejected++; return; }
                      if (file.size > MAX_FILE_SIZE) { rejected++; return; }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const uploaded: UploadedFile = { id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type, dataUrl: reader.result as string };
                        update(p => { const docs = [...p.documentos]; docs[catIdx] = { ...docs[catIdx], files: [...docs[catIdx].files, uploaded] }; return { ...p, documentos: docs }; });
                      };
                      reader.readAsDataURL(file);
                    });
                    if (rejected > 0) toast.error(`${rejected} arquivo(s) rejeitado(s)`);
                    e.target.value = '';
                  }} />
                </label>
              </div>
            );
          })}
        </div>

        <FormSection icon={FileText} title="Observações">
          <Textarea value={data.documentos_observacao} onChange={e => update(p => ({ ...p, documentos_observacao: e.target.value }))} placeholder="Alguma observação sobre seus documentos?" rows={3} />
        </FormSection>
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-8">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Home className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Queremos te conhecer melhor! 😊</h2>
          <p className="text-muted-foreground mt-2 text-base">Conte-nos quem vai morar no imóvel para prepararmos tudo da melhor forma pra você.</p>
        </div>

        {/* "Você está alugando..." card selection */}
        <div className="bg-card rounded-2xl border p-6 space-y-5">
          <h3 className="font-bold text-foreground text-lg">Você está alugando…</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { value: 'eu_mesmo', icon: User, label: 'Para eu mesmo morar', desc: 'Você será o inquilino e morador do imóvel' },
              { value: 'filho', icon: Home, label: 'Para um filho(a)', desc: 'Alugando para seu filho ou filha' },
              { value: 'terceiro', icon: Users, label: 'Para um conhecido', desc: 'Amigo, parente ou outra pessoa' },
            ].map(opt => {
              const firstMorador = data.composicao.moradores[0];
              const isSelected = firstMorador?.tipo === opt.value;
              const Icon = opt.icon;
              return (
                <button key={opt.value} type="button"
                  onClick={() => update(p => ({ ...p, composicao: { ...p.composicao, moradores: [{ tipo: opt.value as MoradorData['tipo'], nome: opt.value === 'eu_mesmo' ? '' : p.composicao.moradores[0]?.nome || '' }] } }))}
                  className={cn(
                    'flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 hover:shadow-sm'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
                    isSelected ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Icon className={cn('h-6 w-6', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <p className={cn('font-bold text-sm', isSelected ? 'text-primary' : 'text-foreground')}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Name input for filho/terceiro */}
        {data.composicao.moradores[0]?.tipo && data.composicao.moradores[0].tipo !== 'eu_mesmo' && (
          <div className="bg-card rounded-2xl border p-6 space-y-3">
            <Label className="text-sm font-semibold">Nome do morador</Label>
            <Input
              value={data.composicao.moradores[0]?.nome || ''}
              onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[0] = { ...copy[0], nome: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
              placeholder="Nome completo de quem vai morar"
              className="h-12 text-base"
            />
          </div>
        )}

        {/* "Outra pessoa vai retirar as chaves?" toggle */}
        <div className="bg-card rounded-2xl border p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground text-sm">Outra pessoa vai retirar as chaves?</h4>
                <button type="button"
                  onClick={() => update(p => ({ ...p, composicao: { ...p.composicao, responsavel_retirada: p.composicao.responsavel_retirada ? '' : 'terceiro' } }))}
                  className={cn(
                    'relative w-12 h-7 rounded-full transition-colors shrink-0',
                    data.composicao.responsavel_retirada ? 'bg-primary' : 'bg-muted-foreground/20'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-sm',
                    data.composicao.responsavel_retirada ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'
                  )} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Se <strong className="text-foreground">você mesmo</strong> vai retirar as chaves, deixe desativado. Ative apenas se <strong className="text-foreground">outra pessoa</strong> ficará responsável por recebê-las na imobiliária.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStep5() {
    return (
      <div className="space-y-8">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Garantia do contrato 🔒</h2>
          <p className="text-muted-foreground mt-2 text-base">A garantia protege tanto você quanto o proprietário. Escolha a modalidade que melhor se encaixa no seu perfil.</p>
        </div>

        {/* FAQ accordion */}
        <div className="bg-card rounded-2xl border p-5">
          <details className="group">
            <summary className="flex items-center gap-3 cursor-pointer list-none">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="font-semibold text-foreground text-sm flex-1">Não sei qual garantia escolher. O que fazer?</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="text-sm text-muted-foreground mt-3 ml-[3.25rem]">
              A modalidade mais prática é o <strong className="text-foreground">SG Cred</strong> (análise de crédito própria). Se preferir, o <strong className="text-foreground">Seguro Fiança</strong> também é bastante utilizado. 
              Em caso de dúvida, prossiga com a que preferir — nosso time entrará em contato para orientá-lo.
            </p>
          </details>
        </div>

        {/* Garantia cards - horizontal row like SG */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {GARANTIA_OPTIONS.map(g => {
            const selected = data.garantia.tipo_garantia === g.value;
            return (
              <button key={g.value} type="button" 
                onClick={() => update(p => ({ ...p, garantia: { ...p.garantia, tipo_garantia: g.value } }))}
                className={cn(
                  'relative flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all',
                  selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-muted-foreground/30 hover:shadow-sm'
                )}
              >
                {g.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warning text-warning-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    {g.badge}
                  </span>
                )}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                  selected ? 'bg-primary/10' : 'bg-muted'
                )}>
                  <span className="text-xl">{g.icon}</span>
                </div>
                <p className={cn('font-bold text-xs', selected ? 'text-primary' : 'text-foreground')}>{g.value}</p>
              </button>
            );
          })}
        </div>

        {/* Warning note */}
        <p className="text-sm text-muted-foreground text-center">
          ⚠️ Não trabalhamos com depósito caução. As modalidades acima são as únicas formas de garantia aceitas.
        </p>

        {/* Observations */}
        <div className="bg-card rounded-2xl border p-6 space-y-3">
          <Label className="text-sm font-semibold block">Observações sobre a garantia <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea value={data.garantia.observacao} onChange={e => update(p => ({ ...p, garantia: { ...p.garantia, observacao: e.target.value } }))} placeholder="Detalhes adicionais sobre a garantia..." rows={3} />
        </div>
      </div>
    );
  }

  function renderStep6() {
    return (
      <div className="space-y-8">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Handshake className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Negociação 🤝</h2>
          <p className="text-muted-foreground mt-2 text-base">Escolha como deseja prosseguir com o valor do aluguel.</p>
        </div>

        {/* Two option cards side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Accept announced value */}
          <button type="button"
            onClick={() => update(p => ({ ...p, negociacao: { ...p.negociacao, aceitou_valor: 'sim', valor_proposto: '' } }))}
            className={cn(
              'relative p-6 rounded-2xl border-2 text-left transition-all',
              data.negociacao.aceitou_valor === 'sim'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border hover:border-muted-foreground/40 hover:shadow-sm'
            )}
          >
            {data.negociacao.aceitou_valor === 'sim' && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                ✓ Mais indicado
              </span>
            )}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Alugar pelo valor anunciado</h3>
                <p className="text-muted-foreground text-sm mt-0.5">Garanta logo o seu!</p>
              </div>
            </div>
            {property && (
              <div className="bg-background rounded-xl p-4 border">
                <span className="text-2xl font-bold text-foreground">
                  {property.valor_aluguel ? `R$ ${Number(property.valor_aluguel).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Valor a consultar'}
                </span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-3">
              Sua proposta tem <strong className="text-foreground">prioridade na análise</strong>. Imóveis bons vão rápido — não perca a oportunidade!
            </p>
          </button>

          {/* Option 2: Negotiate */}
          <button type="button"
            onClick={() => update(p => ({ ...p, negociacao: { ...p.negociacao, aceitou_valor: 'nao' } }))}
            className={cn(
              'relative p-6 rounded-2xl border-2 text-left transition-all',
              data.negociacao.aceitou_valor === 'nao'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border hover:border-muted-foreground/40 hover:shadow-sm'
            )}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Quero negociar o valor</h3>
                <p className="text-muted-foreground text-sm mt-0.5">Sujeito à aprovação do proprietário</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Você pode propor um valor diferente. A proposta será enviada ao proprietário, que poderá <strong className="text-foreground">aceitar, recusar ou contrapropor</strong>.
            </p>
          </button>
        </div>

        {/* Negotiate value input - appears when "negotiate" is selected */}
        {data.negociacao.aceitou_valor === 'nao' && (
          <div className="bg-card rounded-2xl border p-6 space-y-4">
            <Label className="text-sm font-semibold block">Qual valor você propõe? (R$)</Label>
            <Input value={data.negociacao.valor_proposto} onChange={e => update(p => ({ ...p, negociacao: { ...p.negociacao, valor_proposto: e.target.value } }))} placeholder="R$ 0,00" className="text-lg h-12" />
          </div>
        )}

        {/* Observations */}
        <div className="bg-card rounded-2xl border p-6 space-y-3">
          <Label className="text-sm font-semibold block">Condições ou observações <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea value={data.negociacao.observacao} onChange={e => update(p => ({ ...p, negociacao: { ...p.negociacao, observacao: e.target.value } }))} placeholder="Descreva suas condições ou observações..." rows={4} />
        </div>

        {/* Important info cards */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Informações importantes</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">Contrato de 30 meses</h4>
                <p className="text-muted-foreground text-sm mt-1">Todos os nossos contratos residenciais são de <strong className="text-foreground">30 meses</strong>, com liberação da multa rescisória após <strong className="text-foreground">15 meses</strong> completados.</p>
              </div>
            </div>
            <div className="bg-card rounded-2xl border p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                <Info className="h-5 w-5 text-info" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">Enviar não gera vínculo</h4>
                <p className="text-muted-foreground text-sm mt-1">Mesmo no valor anunciado, sua proposta passa por <strong className="text-foreground">análise de crédito</strong> e respeita a <strong className="text-foreground">fila de interessados</strong> no imóvel.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStep7() {
    return <ReviewStepPublic data={data} showConjuge={showConjuge} percentual={percentualComprometimento} onGoToStep={s => { setStep(s); setVisited(prev => new Set(prev).add(s)); }} termsAccepted={termsAccepted} onTermsChange={setTermsAccepted} property={property} />;
  }

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6, renderStep7];

  return (
    <div className="min-h-screen bg-gray-50">
      <StepperHeader currentStep={step} totalSteps={totalSteps} onGoToStep={goToStep} visited={visited} data={data} />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 pb-32">
        {stepRenderers[step]?.()}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 z-20 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" onClick={goPrev} disabled={step === 0} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          {step < totalSteps - 1 ? (
            <Button onClick={goNext} className="flex-1 h-12 rounded-xl text-base font-bold">
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => {
              const pending = getPendingSteps(data);
              const critical = pending.filter(p => p.critical);
              if (!termsAccepted) {
                toast.error('Aceite os termos', { description: 'Você precisa aceitar os termos para enviar o registro.' });
                return;
              }
              if (critical.length > 0) {
                toast.error('Pendências críticas impedem o envio', { description: `Corrija: ${critical[0].label} — ${critical[0].errors[0]}` });
                setStep(critical[0].step);
                setVisited(prev => new Set(prev).add(critical[0].step));
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              handleSubmit();
            }} disabled={!termsAccepted || getPendingSteps(data).some(p => p.critical)} className="flex-1 h-12 rounded-xl text-base font-bold bg-green-600 hover:bg-green-700 disabled:bg-muted disabled:text-muted-foreground">
              <ArrowRight className="h-4 w-4 mr-1" /> Enviar Registro
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable Person Fields (clean version) ──
function PersonFieldsClean({ data, onChange }: { data: DadosPessoais; onChange: (d: DadosPessoais) => void }) {
  const set = (key: keyof DadosPessoais, val: string) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Nome completo <span className="text-red-500">*</span></Label>
        <Input value={data.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" className="mt-1.5" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">CPF <span className="text-red-500">*</span></Label>
          <Input value={data.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" className="mt-1.5" />
        </div>
        <div>
          <Label className="text-sm font-medium">Profissão</Label>
          <Input value={data.profissao} onChange={e => set('profissao', e.target.value)} placeholder="Profissão" className="mt-1.5" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">WhatsApp <span className="text-red-500">*</span></Label>
          <Input value={data.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(00) 00000-0000" className="mt-1.5" />
        </div>
        <div>
          <Label className="text-sm font-medium">E-mail <span className="text-red-500">*</span></Label>
          <Input type="email" value={data.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" className="mt-1.5" />
        </div>
      </div>
    </div>
  );
}

// ── Review Step ──
function ReviewStepPublic({ data, showConjuge, percentual, onGoToStep, termsAccepted, onTermsChange, property }: {
  data: ProposalFormData; showConjuge: boolean; percentual: number | null; onGoToStep: (step: number) => void;
  termsAccepted: boolean; onTermsChange: (v: boolean) => void; property: PropertyData;
}) {
  const pendingSteps = getPendingSteps(data);
  const hasCritical = pendingSteps.some(p => p.critical);
  const hasPending = pendingSteps.length > 0;
  const totalDocs = data.documentos.reduce((acc, c) => acc + c.files.length, 0);

  const firstPendingStep = pendingSteps.length > 0 ? pendingSteps[0] : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <ClipboardCheck className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Quase lá! 🎉</h2>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">Revise todas as informações antes de enviar seu registro de interesse.</p>
      </div>

      {/* Pending steps alert */}
      {hasPending && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6">
          <p className="text-red-600 font-bold text-sm mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> Algumas etapas precisam de atenção
          </p>
          <div className="space-y-3">
            {pendingSteps.map(ps => (
              <div key={ps.step} className="flex items-center justify-between bg-white rounded-xl px-5 py-4 border border-red-100">
                <span className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Etapa {ps.step + 1}: {ps.label}
                </span>
                <button onClick={() => onGoToStep(ps.step)} className="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors">
                  Completar →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data blocks */}
      <div className="space-y-5">
        {/* Dados Pessoais */}
        <ReviewBlockNew title="Dados Pessoais" icon="👤" onFix={() => onGoToStep(1)} hasPending={!data.dados_pessoais.nome.trim()}>
          <ReviewRow label="Nome" value={vv(data.dados_pessoais.nome)} />
          <ReviewRow label="CPF" value={vv(data.dados_pessoais.cpf)} />
          <ReviewRow label="Profissão" value={vv(data.dados_pessoais.profissao)} />
          <ReviewRow label="WhatsApp" value={vv(data.dados_pessoais.whatsapp)} />
          <ReviewRow label="E-mail" value={vv(data.dados_pessoais.email)} />
          <ReviewRow label="Estado Civil" value={vv(data.perfil_financeiro.estado_civil)} />
          <ReviewRow label="Renda" value={vv(data.perfil_financeiro.renda_mensal)} />
          {percentual !== null && <ReviewRow label="Comprometimento" value={`${percentual.toFixed(1)}%`} warn={percentual > 30} />}
        </ReviewBlockNew>

        {/* Documentos */}
        <ReviewBlockNew title="Documentos" icon="📄" onFix={() => onGoToStep(3)} hasPending={totalDocs === 0}>
          <p className="text-sm text-muted-foreground">{totalDocs} documento(s) enviado(s)</p>
        </ReviewBlockNew>

        {/* Moradores e Contrato */}
        <ReviewBlockNew title="Moradores e Contrato" icon="🏠" onFix={() => onGoToStep(4)} hasPending={data.composicao.moradores.length === 0 || !data.composicao.moradores[0]?.tipo}>
          <ReviewRow label="Inquilino" value={data.composicao.moradores[0]?.tipo === 'eu_mesmo' ? 'O próprio locatário' : data.composicao.moradores[0]?.tipo === 'terceiro' ? data.composicao.moradores[0]?.nome || 'Terceiro' : vv(data.composicao.moradores[0]?.tipo)} />
          <ReviewRow label="Total de moradores" value={String(data.composicao.moradores.length)} />
        </ReviewBlockNew>

        {/* Garantia */}
        <ReviewBlockNew title="Garantia" icon="🔒" onFix={() => onGoToStep(5)} hasPending={!data.garantia.tipo_garantia}>
          <ReviewRow label="Modalidade" value={vv(data.garantia.tipo_garantia)} />
          {data.garantia.observacao && <ReviewRow label="Observação" value={data.garantia.observacao} />}
        </ReviewBlockNew>

        {/* Negociação */}
        <ReviewBlockNew title="Negociação" icon="🤝" onFix={() => onGoToStep(6)}>
          <ReviewRow label="Aceitou valor anunciado" value={data.negociacao.aceitou_valor === 'sim' ? 'Sim' : data.negociacao.aceitou_valor === 'nao' ? 'Não' : 'Não informado'} />
          {data.negociacao.valor_proposto && <ReviewRow label="Valor proposto" value={data.negociacao.valor_proposto} />}
          {data.negociacao.observacao && <ReviewRow label="Observação" value={data.negociacao.observacao} />}
        </ReviewBlockNew>
      </div>

      {/* Terms */}
      <div className="bg-white rounded-2xl border p-6 sm:p-8 space-y-5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Declaro que as informações acima refletem os valores e condições <strong>anunciados na data do registro</strong>. 
          Os valores de aluguel, condomínio, IPTU, seguro incêndio e demais encargos são informados pela administradora, 
          condomínio e seguradoras responsáveis e <strong>podem variar</strong> entre o período do cadastro do anúncio e a contratação. 
          Declara o proponente estar ciente disso e que as confirmações serão feitas no ato da locação diretamente com cada responsável.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Seus dados pessoais serão tratados conforme a <strong>LGPD (Lei Geral de Proteção de Dados)</strong> e serão utilizados 
          exclusivamente para os fins deste registro de interesse.
        </p>
        <label className="flex items-start gap-3 bg-muted/50 rounded-xl p-4 cursor-pointer hover:bg-muted/70 transition-colors">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => onTermsChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground leading-relaxed">
            Li e aceito os termos acima. Declaro que todas as informações fornecidas são verdadeiras e autorizo a 
            <strong> Rizzo Imobiliária</strong> a realizar as consultas e verificações necessárias para análise deste registro de interesse.
          </span>
        </label>
      </div>

      {/* Email notice */}
      <div className="bg-white rounded-2xl border p-5 flex items-center justify-center gap-3 text-sm text-muted-foreground">
        <Mail className="h-5 w-5 shrink-0" />
        Você receberá uma cópia deste registro no seu e-mail.
      </div>

      {/* Submit block */}
      {hasPending && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center space-y-4">
          <p className="text-red-600 font-bold text-sm">Complete as etapas acima para liberar o envio</p>
          {firstPendingStep && (
            <button
              onClick={() => onGoToStep(firstPendingStep.step)}
              className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 rounded-xl py-3 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors"
            >
              <AlertCircle className="h-4 w-4" /> Ir para a primeira etapa pendente
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewBlockNew({ title, icon, children, onFix, hasPending = false }: {
  title: string; icon: string; children: React.ReactNode; onFix?: () => void; hasPending?: boolean;
}) {
  return (
    <div className={cn('bg-white rounded-2xl border p-6 sm:p-8', hasPending && 'border-red-200')}>
      <div className="flex items-center justify-between mb-5">
        <h4 className="font-bold text-foreground flex items-center gap-2">
          {hasPending && <AlertCircle className="h-4 w-4 text-red-500" />}
          <span>{icon}</span> {title}
        </h4>
        {onFix && (
          <button onClick={onFix} className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
            ✏️ Completar
          </button>
        )}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function ReviewRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  const isNotInformed = value === 'Não informado';
  return (
    <div className="flex justify-between items-baseline py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium text-right', isNotInformed && 'text-red-500', warn && 'text-red-500')}>
        {value}
      </span>
    </div>
  );
}