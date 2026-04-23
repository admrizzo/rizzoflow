import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Circle, AlertCircle, Plus, Trash2, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Structured Variables ──

// dados_pessoais
export interface DadosPessoais {
  nome: string;
  cpf: string;
  profissao: string;
  whatsapp: string;
  email: string;
}

// perfil_financeiro
export interface PerfilFinanceiro {
  estado_civil: string;
  fonte_renda: string;
  renda_mensal: string; // stored as string for input, parsed to number for calc
}

// composicao
export interface MoradorData {
  tipo: 'eu_mesmo' | 'filho' | 'terceiro' | '';
  nome: string;
}

export interface Composicao {
  moradores: MoradorData[];
  responsavel_retirada: string; // empty = proponente retira
}

// garantia
export interface GarantiaInfo {
  tipo_garantia: string;
  observacao: string;
}

// negociacao
export interface Negociacao {
  valor_proposto: string;
  aceitou_valor: 'sim' | 'nao' | '';
  observacao: string;
}

// imovel
export interface Imovel {
  codigo: string;
  endereco: string;
  valor_aluguel: string;
  tipo_pessoa: 'fisica' | 'juridica' | '';
}

// Full structured proposal
export interface ProposalFormData {
  imovel: Imovel;
  dados_pessoais: DadosPessoais;
  perfil_financeiro: PerfilFinanceiro;
  conjuge: DadosPessoais;
  socios: DadosPessoais[];
  documentos_observacao: string;
  composicao: Composicao;
  garantia: GarantiaInfo;
  negociacao: Negociacao;
}

const emptyPerson: DadosPessoais = { nome: '', cpf: '', profissao: '', whatsapp: '', email: '' };
const emptyMorador: MoradorData = { tipo: '', nome: '' };

const initialData: ProposalFormData = {
  imovel: { codigo: '', endereco: '', valor_aluguel: '', tipo_pessoa: '' },
  dados_pessoais: { ...emptyPerson },
  perfil_financeiro: { estado_civil: '', fonte_renda: '', renda_mensal: '' },
  conjuge: { ...emptyPerson },
  socios: [],
  documentos_observacao: '',
  composicao: { moradores: [{ ...emptyMorador }], responsavel_retirada: '' },
  garantia: { tipo_garantia: '', observacao: '' },
  negociacao: { valor_proposto: '', aceitou_valor: '', observacao: '' },
};

// ── Helper: parse currency string to number ──
function parseCurrency(val: string): number {
  const cleaned = val.replace(/[^\d,.]/g, '').replace('.', '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

// ── Helper: calc percentual_comprometimento ──
export function calcPercentualComprometimento(valorAluguel: string, rendaMensal: string): number | null {
  const aluguel = parseCurrency(valorAluguel);
  const renda = parseCurrency(rendaMensal);
  if (renda <= 0) return null;
  return Math.round((aluguel / renda) * 10000) / 100; // 2 decimal places
}

// ── Helper: display value or "Não informado" ──
function v(val: string | undefined | null): string {
  return val && val.trim() ? val : 'Não informado';
}

const CIVIL_STATUS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável', 'Separado(a)'];
const RENDA_SOURCES = ['Empregado', 'Autônomo', 'Empresário', 'Funcionário Público'];
const GARANTIA_OPTIONS = ['Seguro Fiança', 'Caução', 'Fiador', 'Título de Capitalização', 'Carta Fiança', 'Sem Garantia'];
const MORADOR_TYPES = [
  { value: 'eu_mesmo', label: 'Eu mesmo' },
  { value: 'filho', label: 'Filho(a)' },
  { value: 'terceiro', label: 'Terceiro' },
];

function needsConjuge(data: ProposalFormData) {
  const civil = data.perfil_financeiro.estado_civil;
  return civil === 'Casado(a)' || civil === 'União Estável';
}

// ── Step labels (always 9; step 4 label changes) ──
function getStepLabels(showConjuge: boolean) {
  return [
    'Imóvel e Tipo',
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

// ── Validation per step ──
function validateStep(step: number, data: ProposalFormData): string[] {
  const errors: string[] = [];
  const showConjuge = needsConjuge(data);
  switch (step) {
    case 0:
      if (!data.imovel.endereco.trim()) errors.push('Endereço do imóvel é obrigatório');
      if (!data.imovel.tipo_pessoa) errors.push('Tipo de pessoa é obrigatório');
      break;
    case 1:
      if (!data.dados_pessoais.nome.trim()) errors.push('Nome completo é obrigatório');
      if (!data.dados_pessoais.cpf.trim()) errors.push('CPF/CNPJ é obrigatório');
      if (!data.dados_pessoais.whatsapp.trim()) errors.push('WhatsApp é obrigatório');
      if (!data.dados_pessoais.email.trim()) errors.push('E-mail é obrigatório');
      break;
    case 2:
      if (!data.perfil_financeiro.estado_civil) errors.push('Estado civil é obrigatório');
      if (!data.perfil_financeiro.fonte_renda) errors.push('Fonte de renda é obrigatória');
      if (!data.perfil_financeiro.renda_mensal.trim()) errors.push('Renda mensal é obrigatória');
      break;
    case 3:
      if (showConjuge && !data.conjuge.nome.trim()) errors.push('Nome do cônjuge é obrigatório');
      break;
    case 4:
      break;
    case 5:
      if (data.composicao.moradores.length === 0) errors.push('Informe pelo menos um morador');
      for (const m of data.composicao.moradores) {
        if (!m.tipo) errors.push('Tipo de morador é obrigatório');
      }
      break;
    case 6:
      if (!data.garantia.tipo_garantia) errors.push('Garantia é obrigatória');
      break;
    case 7:
      break;
    case 8:
      break;
  }
  return errors;
}

// ── Person fields component ──
function PersonFields({
  data,
  onChange,
  labelPrefix,
  isCnpj,
}: {
  data: DadosPessoais;
  onChange: (d: DadosPessoais) => void;
  labelPrefix: string;
  isCnpj?: boolean;
}) {
  const set = (key: keyof DadosPessoais, val: string) => onChange({ ...data, [key]: val });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label>{labelPrefix} – Nome completo <span className="text-destructive">*</span></Label>
        <Input value={data.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Nome completo" />
      </div>
      <div>
        <Label>{isCnpj ? 'CNPJ' : 'CPF'} <span className="text-destructive">*</span></Label>
        <Input value={data.cpf} onChange={(e) => set('cpf', e.target.value)} placeholder={isCnpj ? '00.000.000/0000-00' : '000.000.000-00'} />
      </div>
      <div>
        <Label>Profissão</Label>
        <Input value={data.profissao} onChange={(e) => set('profissao', e.target.value)} placeholder="Profissão" />
      </div>
      <div>
        <Label>WhatsApp <span className="text-destructive">*</span></Label>
        <Input value={data.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(00) 00000-0000" />
      </div>
      <div>
        <Label>E-mail <span className="text-destructive">*</span></Label>
        <Input type="email" value={data.email} onChange={(e) => set('email', e.target.value)} placeholder="email@exemplo.com" />
      </div>
    </div>
  );
}

// ── Main Component ──
export default function PropostaLocacao() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ProposalFormData>(initialData);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  const showConjuge = needsConjuge(data);
  const totalSteps = 9;
  const labels = getStepLabels(showConjuge);
  const progressPercent = ((step + 1) / totalSteps) * 100;

  const update = useCallback((updater: (prev: ProposalFormData) => ProposalFormData) => {
    setData(updater);
  }, []);

  // Computed values
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
      const next = step === 2 && !showConjuge ? 4 : step + 1;
      setStep(next);
      setVisited((prev) => new Set(prev).add(next));
    }
  }

  function goPrev() {
    if (step > 0) {
      const prev = step === 4 && !showConjuge ? 2 : step - 1;
      setStep(prev);
    }
  }

  function goToStep(s: number) {
    if (s === 3 && !showConjuge) return;
    if (visited.has(s)) setStep(s);
  }

  function getStepStatus(s: number): 'done' | 'current' | 'pending' | 'skipped' {
    if (s === step) return 'current';
    if (s === 3 && !showConjuge) return 'skipped';
    if (!visited.has(s)) return 'pending';
    const errs = validateStep(s, data);
    return errs.length === 0 ? 'done' : 'pending';
  }

  function handleSubmit() {
    // Validate all steps
    for (let i = 0; i < totalSteps; i++) {
      if (i === 3 && !showConjuge) continue;
      const errs = validateStep(i, data);
      if (errs.length > 0) {
        setStep(i);
        toast.error(`Pendências na etapa "${labels[i]}"`, { description: errs[0] });
        return;
      }
    }
    toast.success('Proposta enviada com sucesso!');
    navigate('/dashboard');
  }

  // ── Step Content ──
  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <Label>Código do imóvel</Label>
              <Input
                value={data.imovel.codigo}
                onChange={(e) => update(p => ({ ...p, imovel: { ...p.imovel, codigo: e.target.value } }))}
                placeholder="Ex: IMV-001"
              />
            </div>
            <div>
              <Label>Endereço do imóvel <span className="text-destructive">*</span></Label>
              <Input
                value={data.imovel.endereco}
                onChange={(e) => update(p => ({ ...p, imovel: { ...p.imovel, endereco: e.target.value } }))}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>
            <div>
              <Label>Valor do aluguel</Label>
              <Input
                value={data.imovel.valor_aluguel}
                onChange={(e) => update(p => ({ ...p, imovel: { ...p.imovel, valor_aluguel: e.target.value } }))}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label className="mb-3 block">Tipo de pessoa <span className="text-destructive">*</span></Label>
              <div className="flex gap-3">
                {(['fisica', 'juridica'] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={data.imovel.tipo_pessoa === t ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => update(p => ({ ...p, imovel: { ...p.imovel, tipo_pessoa: t } }))}
                  >
                    {t === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <PersonFields
            data={data.dados_pessoais}
            onChange={(d) => update(p => ({ ...p, dados_pessoais: d }))}
            labelPrefix="Proponente"
            isCnpj={data.imovel.tipo_pessoa === 'juridica'}
          />
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block">Estado civil <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {CIVIL_STATUS.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={data.perfil_financeiro.estado_civil === s ? 'default' : 'outline'}
                    onClick={() => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, estado_civil: s } }))}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              {showConjuge && (
                <p className="mt-2 text-sm text-muted-foreground">
                  ℹ️ Etapa de cônjuge será ativada
                </p>
              )}
            </div>
            <div>
              <Label className="mb-3 block">Fonte de renda <span className="text-destructive">*</span></Label>
              <RadioGroup value={data.perfil_financeiro.fonte_renda} onValueChange={(val) => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, fonte_renda: val } }))}>
                {RENDA_SOURCES.map((r) => (
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
                onChange={(e) => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, renda_mensal: e.target.value } }))}
                placeholder="R$ 0,00"
              />
              {percentualComprometimento !== null && parseCurrency(data.imovel.valor_aluguel) > 0 && (
                <p className={cn(
                  'mt-1 text-sm font-medium',
                  percentualComprometimento > 30 ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  Comprometimento de renda: {percentualComprometimento.toFixed(1)}%
                  {percentualComprometimento > 30 && ' ⚠️ Acima de 30%'}
                </p>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Dados do Cônjuge</h3>
            <PersonFields data={data.conjuge} onChange={(d) => update(p => ({ ...p, conjuge: d }))} labelPrefix="Cônjuge" />
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Sócios</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => update(p => ({ ...p, socios: [...p.socios, { ...emptyPerson }] }))}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar sócio
                </Button>
              </div>
              {data.socios.map((s, i) => (
                <div key={i} className="mb-6 p-4 border rounded-lg relative">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 text-destructive"
                    onClick={() => update(p => ({ ...p, socios: p.socios.filter((_, idx) => idx !== i) }))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <PersonFields
                    data={s}
                    onChange={(d) => {
                      update(p => {
                        const copy = [...p.socios];
                        copy[i] = d;
                        return { ...p, socios: copy };
                      });
                    }}
                    labelPrefix={`Sócio ${i + 1}`}
                  />
                </div>
              ))}
              {data.socios.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum sócio adicionado.</p>
              )}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">Envie ou descreva os documentos necessários para análise.</p>
            <Textarea
              value={data.documentos_observacao}
              onChange={(e) => update(p => ({ ...p, documentos_observacao: e.target.value }))}
              placeholder="Observações sobre documentos..."
              rows={6}
            />
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Moradores</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => update(p => ({ ...p, composicao: { ...p.composicao, moradores: [...p.composicao.moradores, { ...emptyMorador }] } }))}
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
            {data.composicao.moradores.map((m, i) => (
              <div key={i} className="flex items-end gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <Label>Quem vai morar <span className="text-destructive">*</span></Label>
                  <Select
                    value={m.tipo}
                    onValueChange={(v) => {
                      update(p => {
                        const copy = [...p.composicao.moradores];
                        copy[i] = { ...copy[i], tipo: v as MoradorData['tipo'] };
                        return { ...p, composicao: { ...p.composicao, moradores: copy } };
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {MORADOR_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {m.tipo === 'terceiro' && (
                  <div className="flex-1">
                    <Label>Nome</Label>
                    <Input
                      value={m.nome}
                      onChange={(e) => {
                        update(p => {
                          const copy = [...p.composicao.moradores];
                          copy[i] = { ...copy[i], nome: e.target.value };
                          return { ...p, composicao: { ...p.composicao, moradores: copy } };
                        });
                      }}
                      placeholder="Nome do morador"
                    />
                  </div>
                )}
                {data.composicao.moradores.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => update(p => ({ ...p, composicao: { ...p.composicao, moradores: p.composicao.moradores.filter((_, idx) => idx !== i) } }))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox id="chaves" checked={!!data.composicao.responsavel_retirada} onCheckedChange={(checked) => update(p => ({ ...p, composicao: { ...p.composicao, responsavel_retirada: checked ? p.composicao.responsavel_retirada || ' ' : '' } }))} />
                <Label htmlFor="chaves" className="cursor-pointer">Outra pessoa vai retirar as chaves?</Label>
              </div>
              {!!data.composicao.responsavel_retirada && (
                <div>
                  <Label>Nome da pessoa</Label>
                  <Input
                    value={data.composicao.responsavel_retirada.trim()}
                    onChange={(e) => update(p => ({ ...p, composicao: { ...p.composicao, responsavel_retirada: e.target.value } }))}
                    placeholder="Nome completo"
                  />
                </div>
              )}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block">Modalidade de garantia <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                {GARANTIA_OPTIONS.map((g) => (
                  <Button
                    key={g}
                    type="button"
                    variant={data.garantia.tipo_garantia === g ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => update(p => ({ ...p, garantia: { ...p.garantia, tipo_garantia: g } }))}
                  >
                    {g}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={data.garantia.observacao}
                onChange={(e) => update(p => ({ ...p, garantia: { ...p.garantia, observacao: e.target.value } }))}
                placeholder="Detalhes sobre a garantia..."
                rows={3}
              />
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6">
            <div>
              <Label>Valor proposto (R$)</Label>
              <Input
                value={data.negociacao.valor_proposto}
                onChange={(e) => update(p => ({ ...p, negociacao: { ...p.negociacao, valor_proposto: e.target.value } }))}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label className="mb-3 block">O cliente aceitou o valor anunciado?</Label>
              <div className="flex gap-3">
                {(['sim', 'nao'] as const).map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    variant={data.negociacao.aceitou_valor === opt ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => update(p => ({ ...p, negociacao: { ...p.negociacao, aceitou_valor: opt } }))}
                  >
                    {opt === 'sim' ? 'Sim' : 'Não'}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea
              value={data.negociacao.observacao}
              onChange={(e) => update(p => ({ ...p, negociacao: { ...p.negociacao, observacao: e.target.value } }))}
              placeholder="Condições de negociação..."
              rows={6}
            />
          </div>
        );
      case 8:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Revisão da Proposta</h3>
            {percentualComprometimento !== null && parseCurrency(data.imovel.valor_aluguel) > 0 && (
              <div className={cn(
                'p-3 rounded-lg border text-sm font-medium',
                percentualComprometimento > 30 ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-muted border-border'
              )}>
                📊 Comprometimento de renda: <strong>{percentualComprometimento.toFixed(1)}%</strong>
                {percentualComprometimento > 30 && ' — Acima do recomendado (30%)'}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <ReviewBlock title="🏠 Imóvel" items={[
                ['Código', v(data.imovel.codigo)],
                ['Endereço', v(data.imovel.endereco)],
                ['Valor aluguel', v(data.imovel.valor_aluguel)],
                ['Tipo', data.imovel.tipo_pessoa === 'fisica' ? 'Pessoa Física' : data.imovel.tipo_pessoa === 'juridica' ? 'Pessoa Jurídica' : 'Não informado'],
              ]} />
              <ReviewBlock title="👤 Dados Pessoais" items={[
                ['Nome', v(data.dados_pessoais.nome)],
                ['CPF/CNPJ', v(data.dados_pessoais.cpf)],
                ['Profissão', v(data.dados_pessoais.profissao)],
                ['WhatsApp', v(data.dados_pessoais.whatsapp)],
                ['E-mail', v(data.dados_pessoais.email)],
              ]} />
              <ReviewBlock title="💰 Perfil Financeiro" items={[
                ['Estado civil', v(data.perfil_financeiro.estado_civil)],
                ['Fonte de renda', v(data.perfil_financeiro.fonte_renda)],
                ['Renda mensal', v(data.perfil_financeiro.renda_mensal)],
              ]} />
              {showConjuge && (
                <ReviewBlock title="💍 Cônjuge" items={[
                  ['Nome', v(data.conjuge.nome)],
                  ['CPF', v(data.conjuge.cpf)],
                ]} />
              )}
              <ReviewBlock title="🏡 Composição" items={[
                ...data.composicao.moradores.map((m, i) => [`Morador ${i+1}`, MORADOR_TYPES.find(t => t.value === m.tipo)?.label || 'Não informado'] as [string, string]),
                ['Retira chaves', data.composicao.responsavel_retirada.trim() || 'Proponente'],
              ]} />
              <ReviewBlock title="🔒 Garantia" items={[
                ['Modalidade', v(data.garantia.tipo_garantia)],
              ]} />
              <ReviewBlock title="🤝 Negociação" items={[
                ['Valor proposto', v(data.negociacao.valor_proposto)],
                ['Aceitou valor', data.negociacao.aceitou_valor === 'sim' ? 'Sim' : data.negociacao.aceitou_valor === 'nao' ? 'Não' : 'Não informado'],
              ]} />
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <Home className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Proposta de Locação</h1>
            <p className="text-xs text-muted-foreground">Etapa {step + 1} de {totalSteps} — {labels[step]}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="max-w-4xl mx-auto px-4 py-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {labels.map((label, i) => {
            const status = getStepStatus(i);
            if (status === 'skipped') return null;
            return (
              <button
                key={i}
                onClick={() => goToStep(i)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                  status === 'current' && 'bg-primary text-primary-foreground',
                  status === 'done' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 cursor-pointer',
                  status === 'pending' && visited.has(i) && 'bg-destructive/10 text-destructive cursor-pointer',
                  status === 'pending' && !visited.has(i) && 'bg-muted text-muted-foreground',
                )}
              >
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

// ── Review block ──
function ReviewBlock({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="p-4 border rounded-lg">
      <h4 className="font-semibold mb-2 text-sm">{title}</h4>
      <dl className="space-y-1">
        {items.map(([label, value], i) => (
          <div key={i} className="flex justify-between text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}