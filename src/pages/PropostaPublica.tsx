import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Check, Circle, AlertCircle, Plus, Trash2,
  Home, Upload, FileText, Image, X, HelpCircle, ShieldCheck, ShieldAlert,
  Shield, ExternalLink, MapPin, Building2, Loader2
} from 'lucide-react';
import type {
  ProposalFormData, DadosPessoais, MoradorData, UploadedFile,
  DocumentCategory, DocCategoryKey
} from '@/pages/PropostaLocacao';
import {
  calcPercentualComprometimento
} from '@/pages/PropostaLocacao';

// ── Constants ──
const emptyPerson: DadosPessoais = { nome: '', cpf: '', profissao: '', whatsapp: '', email: '' };
const emptyMorador: MoradorData = { tipo: '', nome: '' };

const INITIAL_DOC_CATEGORIES: DocumentCategory[] = [
  { key: 'documento_foto', label: 'Documento com foto (CPF/RG/CNH)', help: 'Envie frente e verso do documento com foto.', files: [] },
  { key: 'comprovante_residencia', label: 'Comprovante de residência', help: 'Conta de luz, água, gás ou internet dos últimos 3 meses.', files: [] },
  { key: 'comprovante_renda', label: 'Comprovante de renda', help: 'Holerite, declaração de IR, extrato bancário ou pró-labore.', files: [] },
  { key: 'estado_civil', label: 'Estado civil', help: 'Certidão de nascimento, casamento ou averbação de divórcio.', files: [] },
];

const ACCEPTED_FILE_TYPES = '.jpg,.jpeg,.png,.pdf';
const ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const CIVIL_STATUS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável', 'Separado(a)'];
const RENDA_SOURCES = ['Empregado', 'Autônomo', 'Empresário', 'Funcionário Público'];
const GARANTIA_OPTIONS = ['Seguro Fiança', 'Caução', 'Fiador', 'Título de Capitalização', 'Carta Fiança', 'Sem Garantia'];
const MORADOR_TYPES = [
  { value: 'eu_mesmo', label: 'Eu mesmo' },
  { value: 'filho', label: 'Filho(a)' },
  { value: 'terceiro', label: 'Terceiro' },
];

const LOCACAO_BOARD_ID = '3b619b46-85bf-487d-955b-e1255b1bf174';
const CADASTRO_INICIADO_COLUMN_ID = '98579480-4d58-44f4-86dd-82c89e8f9f53';

function parseCurrency(val: string): number {
  const cleaned = val.replace(/[^\d,.]/g, '').replace('.', '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function v(val: string | undefined | null): string {
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

function getStepLabels(showConjuge: boolean) {
  return [
    'Dados Pessoais',
    'Estado Civil e Renda',
    showConjuge ? 'Cônjuge / Sócios' : 'Cônjuge / Sócios',
    'Documentos',
    'Moradores',
    'Garantia',
    'Negociação',
    'Revisão Final',
  ];
}

function validateStep(step: number, data: ProposalFormData): string[] {
  const errors: string[] = [];
  const showConjuge = needsConjuge(data);
  switch (step) {
    case 0:
      if (!data.dados_pessoais.nome.trim()) errors.push('Nome completo é obrigatório');
      if (!data.dados_pessoais.cpf.trim()) errors.push('CPF/CNPJ é obrigatório');
      if (!data.dados_pessoais.whatsapp.trim()) errors.push('WhatsApp é obrigatório');
      if (!data.dados_pessoais.email.trim()) errors.push('E-mail é obrigatório');
      break;
    case 1:
      if (!data.perfil_financeiro.estado_civil) errors.push('Estado civil é obrigatório');
      if (!data.perfil_financeiro.fonte_renda) errors.push('Fonte de renda é obrigatória');
      if (!data.perfil_financeiro.renda_mensal.trim()) errors.push('Renda mensal é obrigatória');
      break;
    case 2:
      if (showConjuge && !data.conjuge.nome.trim()) errors.push('Nome do cônjuge é obrigatório');
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

// ── Person fields ──
function PersonFields({ data, onChange, labelPrefix, isCnpj }: {
  data: DadosPessoais; onChange: (d: DadosPessoais) => void; labelPrefix: string; isCnpj?: boolean;
}) {
  const set = (key: keyof DadosPessoais, val: string) => onChange({ ...data, [key]: val });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label>{labelPrefix} – Nome completo <span className="text-destructive">*</span></Label>
        <Input value={data.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" />
      </div>
      <div>
        <Label>{isCnpj ? 'CNPJ' : 'CPF'} <span className="text-destructive">*</span></Label>
        <Input value={data.cpf} onChange={e => set('cpf', e.target.value)} placeholder={isCnpj ? '00.000.000/0000-00' : '000.000.000-00'} />
      </div>
      <div>
        <Label>Profissão</Label>
        <Input value={data.profissao} onChange={e => set('profissao', e.target.value)} placeholder="Profissão" />
      </div>
      <div>
        <Label>WhatsApp <span className="text-destructive">*</span></Label>
        <Input value={data.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(00) 00000-0000" />
      </div>
      <div>
        <Label>E-mail <span className="text-destructive">*</span></Label>
        <Input type="email" value={data.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
      </div>
    </div>
  );
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
  const sc = needsConjuge(data);
  const allLabels = getStepLabels(sc);
  const pending: { step: number; label: string; errors: string[]; critical: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    if (i === 2 && !sc) continue;
    const errs = validateStep(i, data);
    if (errs.length > 0) {
      const critical = [0, 1, 5].includes(i);
      pending.push({ step: i, label: allLabels[i], errors: errs, critical });
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

// ── Main Component ──
export default function PropostaPublica() {
  const { codigoRobust } = useParams<{ codigoRobust: string }>();
  const codigo = codigoRobust || '';

  // Load property from local DB
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

  // Find the proposal_link for this code to get broker info
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

  // Update proposal_link status to em_preenchimento on load
  useEffect(() => {
    if (proposalLink && proposalLink.status === 'nao_acessado') {
      supabase
        .from('proposal_links')
        .update({ status: 'em_preenchimento', accessed_at: new Date().toISOString() })
        .eq('id', proposalLink.id)
        .then();
    }
  }, [proposalLink]);

  // Form state
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
    garantia: { tipo_garantia: '', observacao: '' },
    negociacao: { valor_proposto: '', aceitou_valor: '', observacao: '' },
  });
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill property data
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
  const labels = getStepLabels(showConjuge);
  const progressPercent = ((step + 1) / totalSteps) * 100;

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
    }
  }

  function goPrev() {
    if (step > 0) {
      const prev = step === 3 && !showConjuge ? 1 : step - 1;
      setStep(prev);
    }
  }

  function goToStep(s: number) {
    if (s === 2 && !showConjuge) return;
    if (visited.has(s)) setStep(s);
  }

  function getStepStatus(s: number): 'done' | 'current' | 'pending' | 'skipped' {
    if (s === step) return 'current';
    if (s === 2 && !showConjuge) return 'skipped';
    if (!visited.has(s)) return 'pending';
    const errs = validateStep(s, data);
    return errs.length === 0 ? 'done' : 'pending';
  }

  // Financial summary
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
      `**Bairro:** ${property?.bairro || 'N/A'}`,
      `**Cidade:** ${property?.cidade || 'N/A'}`,
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
      `**Status:** Nova proposta`,
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

      // Update proposal_link status
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

  // ── Loading / Error states ──
  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando dados do imóvel...</p>
        </div>
      </div>
    );
  }

  if (propertyError || !property) {
    const msg = (propertyError as any)?.message === 'not_found'
      ? 'Imóvel não encontrado ou indisponível.'
      : 'Não foi possível carregar os dados do imóvel. Tente novamente mais tarde.';
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Proposta inválida ou expirada</h2>
            <p className="text-muted-foreground">{msg}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Proposta enviada!</h2>
            <p className="text-muted-foreground">
              Sua proposta para o imóvel Cód. {property.codigo_robust} foi enviada com sucesso.
              Entraremos em contato em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Step Content ──
  function renderStep() {
    switch (step) {
      case 0:
        return (
          <PersonFields
            data={data.dados_pessoais}
            onChange={d => update(p => ({ ...p, dados_pessoais: d }))}
            labelPrefix="Proponente"
            isCnpj={data.imovel.tipo_pessoa === 'juridica'}
          />
        );
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block">Estado civil <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {CIVIL_STATUS.map(s => (
                  <Button key={s} type="button" size="sm"
                    variant={data.perfil_financeiro.estado_civil === s ? 'default' : 'outline'}
                    onClick={() => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, estado_civil: s } }))}
                  >{s}</Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-3 block">Fonte de renda <span className="text-destructive">*</span></Label>
              <RadioGroup value={data.perfil_financeiro.fonte_renda} onValueChange={val => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, fonte_renda: val } }))}>
                {RENDA_SOURCES.map(r => (
                  <div key={r} className="flex items-center gap-2">
                    <RadioGroupItem value={r} id={`renda-${r}`} />
                    <Label htmlFor={`renda-${r}`} className="cursor-pointer">{r}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Renda mensal <span className="text-destructive">*</span></Label>
              <Input
                value={data.perfil_financeiro.renda_mensal}
                onChange={e => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, renda_mensal: e.target.value } }))}
                placeholder="R$ 0,00"
              />
              {percentualComprometimento !== null && parseCurrency(data.imovel.valor_aluguel) > 0 && (
                <p className={cn('mt-1 text-sm font-medium', percentualComprometimento > 30 ? 'text-destructive' : 'text-muted-foreground')}>
                  Comprometimento de renda: {percentualComprometimento.toFixed(1)}%
                  {percentualComprometimento > 30 && ' ⚠️ Acima de 30%'}
                </p>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Dados do Cônjuge</h3>
            <PersonFields data={data.conjuge} onChange={d => update(p => ({ ...p, conjuge: d }))} labelPrefix="Cônjuge" />
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Sócios</h3>
                <Button type="button" size="sm" variant="outline" onClick={() => update(p => ({ ...p, socios: [...p.socios, { ...emptyPerson }] }))}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar sócio
                </Button>
              </div>
              {data.socios.map((s, i) => (
                <div key={i} className="mb-6 p-4 border rounded-lg relative">
                  <Button type="button" size="icon" variant="ghost" className="absolute top-2 right-2 text-destructive"
                    onClick={() => update(p => ({ ...p, socios: p.socios.filter((_, idx) => idx !== i) }))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <PersonFields data={s} onChange={d => { update(p => { const copy = [...p.socios]; copy[i] = d; return { ...p, socios: copy }; }); }} labelPrefix={`Sócio ${i + 1}`} />
                </div>
              ))}
              {data.socios.length === 0 && <p className="text-sm text-muted-foreground">Nenhum sócio adicionado.</p>}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            {data.documentos.map((cat, catIdx) => {
              const status = cat.files.length === 0 ? 'pendente' : 'concluido';
              return (
                <div key={cat.key} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{cat.label}</h4>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                          status === 'concluido' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800')}>
                          {status === 'concluido' ? `${cat.files.length} arquivo(s)` : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <HelpCircle className="h-3 w-3 shrink-0" /> {cat.help}
                      </p>
                    </div>
                  </div>
                  {cat.files.length > 0 && (
                    <div className="space-y-1">
                      {cat.files.map(file => (
                        <div key={file.id} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1.5">
                          {file.type.startsWith('image/') ? <Image className="h-4 w-4 text-muted-foreground shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <span className="truncate flex-1">{file.name}</span>
                          <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                            onClick={() => update(p => { const docs = [...p.documentos]; docs[catIdx] = { ...docs[catIdx], files: docs[catIdx].files.filter(f => f.id !== file.id) }; return { ...p, documentos: docs }; })}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
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
            <div>
              <Label>Observações adicionais</Label>
              <Textarea value={data.documentos_observacao} onChange={e => update(p => ({ ...p, documentos_observacao: e.target.value }))} placeholder="Observações..." rows={3} />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Moradores</h3>
              <Button type="button" size="sm" variant="outline"
                onClick={() => update(p => ({ ...p, composicao: { ...p.composicao, moradores: [...p.composicao.moradores, { ...emptyMorador }] } }))}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
            {data.composicao.moradores.map((m, i) => (
              <div key={i} className="flex items-end gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <Label>Quem vai morar <span className="text-destructive">*</span></Label>
                  <Select value={m.tipo} onValueChange={v => update(p => { const copy = [...p.composicao.moradores]; copy[i] = { ...copy[i], tipo: v as MoradorData['tipo'] }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {MORADOR_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {m.tipo === 'terceiro' && (
                  <div className="flex-1">
                    <Label>Nome</Label>
                    <Input value={m.nome} onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[i] = { ...copy[i], nome: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })} placeholder="Nome do morador" />
                  </div>
                )}
                {data.composicao.moradores.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" className="text-destructive"
                    onClick={() => update(p => ({ ...p, composicao: { ...p.composicao, moradores: p.composicao.moradores.filter((_, idx) => idx !== i) } }))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <Label className="mb-3 block">Modalidade de garantia <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {GARANTIA_OPTIONS.map(g => (
                <Button key={g} type="button" variant={data.garantia.tipo_garantia === g ? 'default' : 'outline'} className="justify-start"
                  onClick={() => update(p => ({ ...p, garantia: { ...p.garantia, tipo_garantia: g } }))}>{g}</Button>
              ))}
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={data.garantia.observacao} onChange={e => update(p => ({ ...p, garantia: { ...p.garantia, observacao: e.target.value } }))} placeholder="Detalhes..." rows={3} />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <Label>Valor proposto (R$)</Label>
              <Input value={data.negociacao.valor_proposto} onChange={e => update(p => ({ ...p, negociacao: { ...p.negociacao, valor_proposto: e.target.value } }))} placeholder="R$ 0,00" />
            </div>
            <div>
              <Label className="mb-3 block">Aceitou o valor anunciado?</Label>
              <div className="flex gap-3">
                {(['sim', 'nao'] as const).map(opt => (
                  <Button key={opt} type="button" variant={data.negociacao.aceitou_valor === opt ? 'default' : 'outline'} className="flex-1"
                    onClick={() => update(p => ({ ...p, negociacao: { ...p.negociacao, aceitou_valor: opt } }))}>{opt === 'sim' ? 'Sim' : 'Não'}</Button>
                ))}
              </div>
            </div>
            <Textarea value={data.negociacao.observacao} onChange={e => update(p => ({ ...p, negociacao: { ...p.negociacao, observacao: e.target.value } }))} placeholder="Condições..." rows={4} />
          </div>
        );
      case 7:
        return <ReviewStepPublic data={data} showConjuge={showConjuge} percentual={percentualComprometimento} onGoToStep={s => { setStep(s); setVisited(prev => new Set(prev).add(s)); }} />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Property Header */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {property.foto_principal && (
              <img
                src={property.foto_principal}
                alt={property.titulo || ''}
                className="w-full sm:w-40 h-32 sm:h-28 object-cover rounded-lg"
              />
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold">Cód. {property.codigo_robust}</h1>
                <Badge className="bg-primary text-primary-foreground">LOCAÇÃO</Badge>
              </div>
              <p className="text-sm font-medium">{property.titulo || `Imóvel ${property.codigo_robust}`}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[property.logradouro, property.numero, property.bairro, property.cidade].filter(Boolean).join(', ')}
              </p>
              {totalMensal && (
                <div className="flex flex-wrap gap-3 text-xs">
                  <span>Aluguel: <strong>{formatCurrency(totalMensal.aluguel)}</strong></span>
                  {totalMensal.cond > 0 && <span>Cond: {formatCurrency(totalMensal.cond)}</span>}
                  {totalMensal.iptu > 0 && <span>IPTU: {formatCurrency(totalMensal.iptu)}</span>}
                  {totalMensal.seguro > 0 && <span>Seguro: {formatCurrency(totalMensal.seguro)}</span>}
                  <span className="font-bold text-primary">Total: {formatCurrency(totalMensal.total)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Etapa {step + 1} de {totalSteps} — {labels[step]}</p>
          <p className="text-xs font-medium text-primary">{Math.round(progressPercent)}%</p>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="max-w-4xl mx-auto px-4 py-3 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {labels.map((label, i) => {
            const status = getStepStatus(i);
            if (status === 'skipped') return null;
            return (
              <button key={i} onClick={() => goToStep(i)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                  status === 'current' && 'bg-primary text-primary-foreground',
                  status === 'done' && 'bg-green-100 text-green-800 cursor-pointer',
                  status === 'pending' && visited.has(i) && 'bg-destructive/10 text-destructive cursor-pointer',
                  status === 'pending' && !visited.has(i) && 'bg-muted text-muted-foreground',
                )}>
                {status === 'done' && <Check className="h-3 w-3" />}
                {status === 'current' && <Circle className="h-3 w-3 fill-current" />}
                {status === 'pending' && visited.has(i) && <AlertCircle className="h-3 w-3" />}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-4xl mx-auto px-4 pb-32">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{labels[step]}</CardTitle>
          </CardHeader>
          <CardContent>{renderStep()}</CardContent>
        </Card>
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-3 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="outline" onClick={goPrev} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          {step < totalSteps - 1 ? (
            <Button onClick={goNext}>
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-1" /> Enviar Proposta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Review Step ──
function ReviewStepPublic({ data, showConjuge, percentual, onGoToStep }: {
  data: ProposalFormData; showConjuge: boolean; percentual: number | null; onGoToStep: (step: number) => void;
}) {
  const { score, points, reasons } = calcScore(data, percentual);
  const pendingSteps = getPendingSteps(data);
  const hasCritical = pendingSteps.some(p => p.critical);

  const scoreConfig = {
    forte: { icon: ShieldCheck, color: 'bg-green-100 border-green-300 text-green-800', label: 'Proposta Forte' },
    media: { icon: Shield, color: 'bg-amber-100 border-amber-300 text-amber-800', label: 'Proposta Média' },
    risco: { icon: ShieldAlert, color: 'bg-destructive/10 border-destructive/30 text-destructive', label: 'Proposta de Risco' },
  };
  const sc = scoreConfig[score];
  const ScoreIcon = sc.icon;

  return (
    <div className="space-y-6">
      <div className={cn('p-4 rounded-lg border flex items-start gap-4', sc.color)}>
        <ScoreIcon className="h-8 w-8 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold">{sc.label}</h3>
            <span className="text-sm font-medium opacity-75">{points}/100 pts</span>
          </div>
          {reasons.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {reasons.map((r, i) => <li key={i} className="text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" /> {r}</li>)}
            </ul>
          )}
        </div>
      </div>

      {pendingSteps.length > 0 && (
        <div className="p-4 rounded-lg border border-amber-300 bg-amber-50">
          <h4 className="font-semibold text-sm text-amber-900 mb-2">⚠️ Etapas que precisam de atenção</h4>
          <div className="space-y-2">
            {pendingSteps.map(ps => (
              <div key={ps.step} className="flex items-center justify-between bg-background rounded px-3 py-2 border">
                <div>
                  <span className="text-sm font-medium">{ps.label}</span>
                  {ps.critical && <span className="ml-2 text-xs text-destructive font-semibold">Crítico</span>}
                  <p className="text-xs text-muted-foreground">{ps.errors[0]}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onGoToStep(ps.step)}>Completar</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <ReviewBlock title="👤 Dados Pessoais" items={[
          ['Nome', v(data.dados_pessoais.nome)], ['CPF', v(data.dados_pessoais.cpf)],
          ['WhatsApp', v(data.dados_pessoais.whatsapp)], ['E-mail', v(data.dados_pessoais.email)],
        ]} onFix={() => onGoToStep(0)} />
        <ReviewBlock title="💰 Perfil Financeiro" items={[
          ['Estado civil', v(data.perfil_financeiro.estado_civil)],
          ['Renda mensal', v(data.perfil_financeiro.renda_mensal)],
          ...(percentual !== null ? [['Comprometimento', `${percentual.toFixed(1)}%`] as [string, string]] : []),
        ]} onFix={() => onGoToStep(1)} />
        <ReviewBlock title="🔒 Garantia" items={[['Modalidade', v(data.garantia.tipo_garantia)]]} onFix={() => onGoToStep(5)} />
        <ReviewBlock title="📄 Documentos" items={
          data.documentos.map(cat => [cat.label, cat.files.length > 0 ? `${cat.files.length} ✅` : 'Pendente ⚠️'] as [string, string])
        } onFix={() => onGoToStep(3)} />
      </div>

      {hasCritical && (
        <div className="p-3 rounded-lg border border-destructive bg-destructive/5 text-destructive text-sm font-medium">
          🚫 Pendências críticas. Regularize antes de enviar.
        </div>
      )}
    </div>
  );
}

function ReviewBlock({ title, items, onFix }: { title: string; items: [string, string][]; onFix?: () => void }) {
  const hasNotInformed = items.some(([, val]) => val === 'Não informado' || val.includes('Pendente'));
  return (
    <div className={cn('p-4 border rounded-lg', hasNotInformed && 'border-amber-300')}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">{title}</h4>
        {hasNotInformed && onFix && <Button size="sm" variant="ghost" className="h-6 text-xs text-primary" onClick={onFix}>Completar</Button>}
      </div>
      <dl className="space-y-1">
        {items.map(([label, value], i) => (
          <div key={i} className="flex justify-between text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={cn('font-medium', (value === 'Não informado' || value.includes('Pendente')) && 'text-destructive')}>{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}