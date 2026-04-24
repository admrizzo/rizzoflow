import { useState, useCallback, useEffect } from 'react';
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
import { ArrowLeft, ArrowRight, Check, Circle, AlertCircle, Plus, Trash2, Home, Upload, FileText, Image, X, HelpCircle, ShieldCheck, ShieldAlert, Shield, ExternalLink, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePropertiesLocacao, Property } from '@/hooks/useProperties';
import { useProposalDraft, calcFormProgress, INTERNAL_STEP_WEIGHTS } from '@/hooks/useProposalDraft';
import { Cloud, CloudOff, Loader2 as Loader2Icon } from 'lucide-react';
import { FiadorSection } from '@/components/proposta/FiadorSection';
import { EmpresaForm } from '@/components/proposta/EmpresaForm';
import { RepresentantesForm } from '@/components/proposta/RepresentantesForm';

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
  regime_bens: string;
  conjuge_participa: 'sim' | 'nao' | '';
}

// composicao
export interface MoradorData {
  tipo: 'eu_mesmo' | 'filho' | 'terceiro' | '';
  nome: string;
  relacao?: string;
  whatsapp?: string;
  email?: string;
}

export interface Composicao {
  moradores: MoradorData[];
  responsavel_retirada: string; // empty = proponente retira
  retirada_nome?: string;
  retirada_whatsapp?: string;
  retirada_cpf?: string;
  retirada_email?: string;
}

// garantia
export interface GarantiaInfo {
  tipo_garantia: string;
  observacao: string;
  fiadores: FiadorData[];
}

export type FiadorTipo = 'renda' | 'imovel' | '';

export type FiadorDocKey =
  | 'documento_foto'
  | 'comprovante_renda'
  | 'matricula_imovel'
  | 'comprovante_residencia'
  | 'certidao_estado_civil'
  | 'documento_conjuge'
  | 'renda_conjuge';

export interface FiadorDocumentCategory {
  key: FiadorDocKey;
  label: string;
  help: string;
  files: UploadedFile[];
}

export interface FiadorConjugeData {
  nome: string;
  cpf: string;
  documento_identidade: string;
  whatsapp: string;
  email: string;
}

export interface FiadorData {
  // Tipo do fiador (regra principal Rizzo: 1 com renda + 1 com imóvel)
  tipo_fiador: FiadorTipo;
  // Dados pessoais (padrão para todos)
  nome: string;
  cpf: string;
  profissao: string;
  whatsapp: string;
  email: string;
  estado_civil: string;
  // Tipo "renda"
  renda_mensal: string;
  // Tipo "imovel"
  registro_imoveis: string;
  // Endereço
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  // Cônjuge (mesma lógica do inquilino)
  regime_bens: string;
  conjuge_participa: 'sim' | 'nao' | '';
  conjuge: FiadorConjugeData;
  // Documentos por fiador
  documentos: FiadorDocumentCategory[];
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

// ── Pessoa Jurídica ──
export interface EmpresaData {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  data_abertura: string;
  ramo_atividade: string;
  telefone: string;
  email: string;
  // Endereço da empresa
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  // Capacidade financeira PJ
  faturamento_mensal: string;
  regime_tributario: string;
  tempo_atividade: string;
}

export interface RepresentanteLegal {
  nome: string;
  cpf: string;
  profissao: string;
  whatsapp: string;
  email: string;
  // Endereço do representante
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  // Papéis na empresa
  is_socio: boolean;
  is_administrador: boolean;
  is_signatario: boolean;
}

// documentos
export type DocCategoryKey = 'documento_foto' | 'comprovante_residencia' | 'comprovante_renda' | 'estado_civil';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string; // mime
  dataUrl: string; // base64 for preview
}

export interface DocumentCategory {
  key: DocCategoryKey;
  label: string;
  help: string;
  files: UploadedFile[];
}

// Full structured proposal
export interface ProposalFormData {
  imovel: Imovel;
  dados_pessoais: DadosPessoais;
  perfil_financeiro: PerfilFinanceiro;
  conjuge: DadosPessoais;
  socios: DadosPessoais[];
  documentos: DocumentCategory[];
  documentos_observacao: string;
  composicao: Composicao;
  garantia: GarantiaInfo;
  negociacao: Negociacao;
  // ── Pessoa Jurídica ──
  empresa: EmpresaData;
  representantes: RepresentanteLegal[];
}

const emptyPerson: DadosPessoais = { nome: '', cpf: '', profissao: '', whatsapp: '', email: '' };
const emptyMorador: MoradorData = { tipo: '', nome: '' };
const emptyFiadorConjuge: FiadorConjugeData = { nome: '', cpf: '', documento_identidade: '', whatsapp: '', email: '' };

export const emptyEmpresa: EmpresaData = {
  razao_social: '', nome_fantasia: '', cnpj: '', data_abertura: '',
  ramo_atividade: '', telefone: '', email: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
  faturamento_mensal: '', regime_tributario: '', tempo_atividade: '',
};

export const emptyRepresentante: RepresentanteLegal = {
  nome: '', cpf: '', profissao: '', whatsapp: '', email: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
  is_socio: true, is_administrador: false, is_signatario: true,
};

export const REGIME_TRIBUTARIO_OPTIONS = [
  'Simples Nacional',
  'Lucro Presumido',
  'Lucro Real',
  'MEI',
  'Outro',
];

// Categorias de documentos para Pessoa Jurídica
export const PJ_DOC_CATEGORIES: DocumentCategory[] = [
  { key: 'documento_foto' as DocCategoryKey, label: 'Contrato Social', help: 'Contrato social e última alteração registrada na Junta Comercial.', files: [] },
  { key: 'comprovante_residencia' as DocCategoryKey, label: 'Cartão CNPJ', help: 'Cartão CNPJ atualizado emitido pela Receita Federal.', files: [] },
  { key: 'comprovante_renda' as DocCategoryKey, label: 'Balanço patrimonial e balancete', help: 'Último balanço patrimonial e balancete recente assinados pelo contador.', files: [] },
  { key: 'estado_civil' as DocCategoryKey, label: 'DRE — Demonstração do Resultado', help: 'DRE do último ano calendário assinada pelo contador.', files: [] },
];

// Categorias de documentos por tipo de fiador (regras Rizzo)
const FIADOR_DOC_RENDA: FiadorDocumentCategory[] = [
  { key: 'documento_foto', label: 'Documento oficial com foto', help: 'CNH, ou RG + CPF (frente e verso). Documento dentro da validade.', files: [] },
  { key: 'comprovante_renda', label: 'Comprovante de renda', help: '3 últimos contracheques, extratos bancários ou declaração de IR.', files: [] },
  { key: 'comprovante_residencia', label: 'Comprovante de residência', help: 'Conta de luz, água, gás ou internet — emitido nos últimos 90 dias.', files: [] },
  { key: 'certidao_estado_civil', label: 'Certidão de estado civil', help: 'Certidão de nascimento, casamento ou averbação de divórcio.', files: [] },
];
const FIADOR_DOC_IMOVEL: FiadorDocumentCategory[] = [
  { key: 'documento_foto', label: 'Documento oficial com foto', help: 'CNH, ou RG + CPF (frente e verso). Documento dentro da validade.', files: [] },
  { key: 'matricula_imovel', label: 'Certidão de matrícula do imóvel', help: 'Matrícula atualizada — emitida nos últimos 90 dias. Imóvel quitado em Goiânia.', files: [] },
  { key: 'comprovante_residencia', label: 'Comprovante de residência', help: 'Conta de luz, água, gás ou internet — emitido nos últimos 90 dias.', files: [] },
  { key: 'certidao_estado_civil', label: 'Certidão de estado civil', help: 'Certidão de nascimento, casamento ou averbação de divórcio.', files: [] },
];
const FIADOR_DOC_CONJUGE_OBRIG: FiadorDocumentCategory = {
  key: 'documento_conjuge', label: 'Documento do cônjuge (obrigatório)',
  help: 'CNH, ou RG + CPF do cônjuge (frente e verso). Documento dentro da validade.', files: [],
};
const FIADOR_DOC_CONJUGE_RENDA: FiadorDocumentCategory = {
  key: 'renda_conjuge', label: 'Comprovante de renda do cônjuge (opcional)',
  help: 'Reforça a análise de crédito. Holerite, IR ou extrato bancário.', files: [],
};

function buildFiadorDocs(tipo: FiadorTipo, casadoComConjuge: boolean): FiadorDocumentCategory[] {
  const base = tipo === 'imovel'
    ? FIADOR_DOC_IMOVEL.map(c => ({ ...c, files: [] }))
    : FIADOR_DOC_RENDA.map(c => ({ ...c, files: [] }));
  if (casadoComConjuge) {
    base.push({ ...FIADOR_DOC_CONJUGE_OBRIG, files: [] });
    base.push({ ...FIADOR_DOC_CONJUGE_RENDA, files: [] });
  }
  return base;
}

function makeEmptyFiador(tipo: FiadorTipo = ''): FiadorData {
  return {
    tipo_fiador: tipo,
    nome: '', cpf: '', profissao: '', whatsapp: '', email: '',
    estado_civil: '',
    renda_mensal: '',
    registro_imoveis: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
    regime_bens: '', conjuge_participa: '',
    conjuge: { ...emptyFiadorConjuge },
    documentos: tipo ? buildFiadorDocs(tipo, false) : [],
  };
}

function fiadorIsCasado(f: FiadorData): boolean {
  return f.estado_civil === 'Casado(a)' || f.estado_civil === 'União Estável';
}
function fiadorNeedsConjuge(f: FiadorData): boolean {
  if (!fiadorIsCasado(f)) return false;
  if (!f.regime_bens) return false;
  if (f.regime_bens === 'Separação total / absoluta de bens') return f.conjuge_participa === 'sim';
  return true;
}

const INITIAL_DOC_CATEGORIES: DocumentCategory[] = [
  {
    key: 'documento_foto',
    label: 'Documento com foto (CPF/RG/CNH)',
    help: 'Envie frente e verso do documento com foto. Aceitos: JPG, PNG ou PDF.',
    files: [],
  },
  {
    key: 'comprovante_residencia',
    label: 'Comprovante de residência',
    help: 'Conta de luz, água, gás ou internet dos últimos 3 meses.',
    files: [],
  },
  {
    key: 'comprovante_renda',
    label: 'Comprovante de renda',
    help: 'Holerite, declaração de IR, extrato bancário ou pró-labore.',
    files: [],
  },
  {
    key: 'estado_civil',
    label: 'Estado civil',
    help: 'Certidão de nascimento, casamento ou averbação de divórcio.',
    files: [],
  },
];

const ACCEPTED_FILE_TYPES = '.jpg,.jpeg,.png,.pdf';
const ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const initialData: ProposalFormData = {
  imovel: { codigo: '', endereco: '', valor_aluguel: '', tipo_pessoa: '' },
  dados_pessoais: { ...emptyPerson },
  perfil_financeiro: { estado_civil: '', fonte_renda: '', renda_mensal: '', regime_bens: '', conjuge_participa: '' },
  conjuge: { ...emptyPerson },
  socios: [],
  documentos: INITIAL_DOC_CATEGORIES.map(c => ({ ...c, files: [] })),
  documentos_observacao: '',
  composicao: { moradores: [{ ...emptyMorador }], responsavel_retirada: '' },
  garantia: { tipo_garantia: '', observacao: '', fiadores: [] },
  negociacao: { valor_proposto: '', aceitou_valor: '', observacao: '' },
  empresa: { ...emptyEmpresa },
  representantes: [],
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
const REGIME_BENS_OPTIONS = [
  'Comunhão parcial de bens',
  'Comunhão universal de bens',
  'Separação total / absoluta de bens',
  'Participação final nos aquestos',
];
const RENDA_SOURCES = ['Empregado', 'Autônomo', 'Empresário', 'Funcionário Público'];
const GARANTIA_OPTIONS = ['Seguro Fiança', 'Caução', 'Fiador', 'Título de Capitalização', 'Carta Fiança', 'Sem Garantia'];
const MORADOR_TYPES = [
  { value: 'eu_mesmo', label: 'Eu mesmo' },
  { value: 'filho', label: 'Filho(a)' },
  { value: 'terceiro', label: 'Terceiro' },
];

function isCasadoOuUniao(data: ProposalFormData) {
  const civil = data.perfil_financeiro.estado_civil;
  return civil === 'Casado(a)' || civil === 'União Estável';
}

function needsConjuge(data: ProposalFormData) {
  // PJ não tem cônjuge — empresa não tem estado civil
  if (data.imovel.tipo_pessoa === 'juridica') return false;
  if (!isCasadoOuUniao(data)) return false;
  const regime = data.perfil_financeiro.regime_bens;
  if (!regime) return false;
  if (regime === 'Separação total / absoluta de bens') {
    return data.perfil_financeiro.conjuge_participa === 'sim';
  }
  return true;
}

function isPJ(data: ProposalFormData) {
  return data.imovel.tipo_pessoa === 'juridica';
}

// ── Step labels (always 9; step 4 label changes) ──
function getStepLabels(showConjuge: boolean, pj: boolean = false) {
  return [
    'Imóvel e Tipo',
    pj ? 'Dados da Empresa' : 'Dados Pessoais',
    pj ? 'Capacidade Financeira' : 'Estado Civil e Renda',
    pj ? 'Representantes Legais' : (showConjuge ? 'Cônjuge / Sócios' : 'Cônjuge / Sócios'),
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
  const pj = isPJ(data);
  switch (step) {
    case 0:
      if (!data.imovel.codigo.trim()) errors.push('Selecione um imóvel do CRM (Cód no Robust obrigatório)');
      if (!data.imovel.endereco.trim()) errors.push('Endereço do imóvel é obrigatório');
      if (!data.imovel.tipo_pessoa) errors.push('Tipo de pessoa é obrigatório');
      break;
    case 1:
      if (pj) {
        if (!data.empresa.razao_social.trim()) errors.push('Razão Social é obrigatória');
        if (!data.empresa.cnpj.trim()) errors.push('CNPJ é obrigatório');
        if (!data.empresa.ramo_atividade.trim()) errors.push('Ramo de atividade é obrigatório');
        if (!data.empresa.telefone.trim()) errors.push('Telefone da empresa é obrigatório');
        if (!data.empresa.email.trim()) errors.push('E-mail da empresa é obrigatório');
        break;
      }
      if (!data.dados_pessoais.nome.trim()) errors.push('Nome completo é obrigatório');
      if (!data.dados_pessoais.cpf.trim()) errors.push('CPF/CNPJ é obrigatório');
      if (!data.dados_pessoais.whatsapp.trim()) errors.push('WhatsApp é obrigatório');
      if (!data.dados_pessoais.email.trim()) errors.push('E-mail é obrigatório');
      break;
    case 2:
      if (pj) {
        if (!data.empresa.faturamento_mensal.trim()) errors.push('Faturamento mensal é obrigatório');
        if (!data.empresa.regime_tributario) errors.push('Regime tributário é obrigatório');
        break;
      }
      if (!data.perfil_financeiro.estado_civil) errors.push('Estado civil é obrigatório');
      if (isCasadoOuUniao(data) && !data.perfil_financeiro.regime_bens) errors.push('Regime de bens é obrigatório');
      if (isCasadoOuUniao(data) && data.perfil_financeiro.regime_bens === 'Separação total / absoluta de bens' && !data.perfil_financeiro.conjuge_participa) errors.push('Informe se o cônjuge participará do contrato');
      if (!data.perfil_financeiro.fonte_renda) errors.push('Fonte de renda é obrigatória');
      if (!data.perfil_financeiro.renda_mensal.trim()) errors.push('Renda mensal é obrigatória');
      break;
    case 3:
      if (pj) {
        if (data.representantes.length === 0) errors.push('Adicione pelo menos um representante legal');
        data.representantes.forEach((r, i) => {
          const label = `Representante ${i + 1}`;
          if (!r.nome.trim()) errors.push(`${label}: nome é obrigatório`);
          if (!r.cpf.trim()) errors.push(`${label}: CPF é obrigatório`);
          if (!r.whatsapp.trim()) errors.push(`${label}: WhatsApp é obrigatório`);
          if (!r.email.trim()) errors.push(`${label}: e-mail é obrigatório`);
        });
        if (data.representantes.length > 0 && !data.representantes.some(r => r.is_signatario)) {
          errors.push('Indique pelo menos um representante como signatário do contrato');
        }
        break;
      }
      if (showConjuge && !data.conjuge.nome.trim()) errors.push('Nome do cônjuge é obrigatório');
      break;
    case 4:
      break;
    case 5:
      if (data.composicao.moradores.length === 0) errors.push('Informe pelo menos um morador');
      for (const m of data.composicao.moradores) {
        if (!m.tipo) errors.push('Tipo de morador é obrigatório');
      }
      {
        const t = data.composicao.moradores[0]?.tipo;
        if (t === 'filho' || t === 'terceiro') {
          for (const m of data.composicao.moradores) {
            if (!m.relacao?.trim()) errors.push('Informe a relação do morador');
            if (!m.nome?.trim()) errors.push('Informe o nome do morador');
            if (!m.whatsapp?.trim()) errors.push('Informe o WhatsApp do morador');
            if (!m.email?.trim()) errors.push('Informe o e-mail do morador');
          }
        }
        if (data.composicao.responsavel_retirada) {
          if (!data.composicao.retirada_nome?.trim()) errors.push('Informe o nome de quem vai retirar as chaves');
          if (!data.composicao.retirada_whatsapp?.trim()) errors.push('Informe o WhatsApp de quem vai retirar as chaves');
          if (!data.composicao.retirada_cpf?.trim()) errors.push('Informe o CPF de quem vai retirar as chaves');
        }
      }
      break;
    case 6:
      if (!data.garantia.tipo_garantia) errors.push('Garantia é obrigatória');
      if (data.garantia.tipo_garantia === 'Fiador') {
        const fs = data.garantia.fiadores;
        const hasRenda = fs.some(f => f.tipo_fiador === 'renda');
        const hasImovel = fs.some(f => f.tipo_fiador === 'imovel');
        if (!hasRenda) errors.push('É necessário adicionar um fiador com renda');
        if (!hasImovel) errors.push('É necessário adicionar um fiador com imóvel quitado');
        fs.forEach((f, i) => {
          const label = `Fiador ${i + 1}`;
          if (!f.tipo_fiador) errors.push(`${label}: selecione o tipo (renda ou imóvel)`);
          if (!f.nome.trim()) errors.push(`${label}: nome é obrigatório`);
          if (!f.cpf.trim()) errors.push(`${label}: CPF é obrigatório`);
          if (!f.whatsapp.trim()) errors.push(`${label}: telefone é obrigatório`);
          if (!f.email.trim()) errors.push(`${label}: e-mail é obrigatório`);
          if (f.tipo_fiador === 'renda' && !f.renda_mensal.trim()) {
            errors.push(`${label}: renda mensal é obrigatória`);
          }
          if (fiadorNeedsConjuge(f) && !f.conjuge.nome.trim()) {
            errors.push(`${label}: dados do cônjuge obrigatórios`);
          }
          const docsPendentes = f.documentos.filter(d => d.key !== 'renda_conjuge' && d.files.length === 0);
          if (f.tipo_fiador && docsPendentes.length > 0) {
            errors.push(`${label}: documentos pendentes (${docsPendentes.length})`);
          }
        });
      }
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
  const labels = getStepLabels(showConjuge, isPJ(data));

  // ── Progress calculation ──
  const skipConjuge = !showConjuge;
  const { totalPercent: progressPercent, stepStatuses } = calcFormProgress(data, INTERNAL_STEP_WEIGHTS, skipConjuge);

  // ── Auto-save draft ──
  const {
    draftStatus,
    lastSavedAt,
    isSaving,
    isRestoring,
    restoredData,
    restoredStep,
    scheduleSave,
    markAsSubmitted,
  } = useProposalDraft({
    codigoRobust: data.imovel.codigo || 'internal',
    enabled: true,
  });

  // Restore draft
  useEffect(() => {
    if (restoredData) {
      setData(prev => ({
        ...prev,
        ...restoredData,
        documentos: prev.documentos,
      }));
      if (restoredStep !== null && restoredStep > 0) {
        setStep(restoredStep);
        const newVisited = new Set<number>();
        for (let i = 0; i <= restoredStep; i++) newVisited.add(i);
        setVisited(newVisited);
        toast.info('Rascunho restaurado!', { description: 'Retomando de onde você parou.' });
      }
    }
  }, [restoredData, restoredStep]);

  // Auto-save on change
  useEffect(() => {
    if (!isRestoring) {
      scheduleSave(data, step, progressPercent);
    }
  }, [data, step, isRestoring, scheduleSave, progressPercent]);

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
      // PF sem cônjuge: pula etapa 3 (Cônjuge/Sócios). PJ sempre exige etapa 3 (Representantes).
      const next = step === 2 && !showConjuge && !isPJ(data) ? 4 : step + 1;
      setStep(next);
      setVisited((prev) => new Set(prev).add(next));
    }
  }

  function goPrev() {
    if (step > 0) {
      const prev = step === 4 && !showConjuge && !isPJ(data) ? 2 : step - 1;
      setStep(prev);
    }
  }

  function goToStep(s: number) {
    if (s === 3 && !showConjuge && !isPJ(data)) return;
    if (visited.has(s)) setStep(s);
  }

  function getStepStatus(s: number): 'done' | 'current' | 'pending' | 'skipped' {
    if (s === step) return 'current';
    if (s === 3 && !showConjuge && !isPJ(data)) return 'skipped';
    if (!visited.has(s)) return 'pending';
    const errs = validateStep(s, data);
    return errs.length === 0 ? 'done' : 'pending';
  }

  const { user } = useAuth();
  const { properties, isLoading: propertiesLoading, syncProperties } = usePropertiesLocacao();
  const [propertySearch, setPropertySearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  async function handleSubmit() {
    const pending = getPendingSteps(data);
    const critical = pending.filter(p => p.critical);
    if (critical.length > 0) {
      toast.error('Pendências críticas impedem o envio', { description: critical[0].errors[0] });
      setStep(critical[0].step);
      return;
    }
    if (pending.length > 0) {
      toast.error(`Pendências na etapa "${pending[0].label}"`, { description: pending[0].errors[0] });
      setStep(pending[0].step);
      return;
    }

    // Calculate score for the card description
    const renda = parseFloat(data.perfil_financeiro.renda_mensal.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const aluguel = parseFloat(data.imovel.valor_aluguel.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const percentualCalc = renda > 0 ? (aluguel / renda) * 100 : null;
    const { score, points } = calcScore(data, percentualCalc);

    const scoreLabel = score === 'forte' ? 'Forte' : score === 'media' ? 'Média' : 'Risco';
    const garantiaLabel = data.garantia.tipo_garantia || 'Não informado';
    const valorProposto = data.negociacao.valor_proposto || 'Não informado';
    const pj = isPJ(data);
    const signatario = pj ? data.representantes.find(r => r.is_signatario) : null;
    const clientName = pj
      ? (data.empresa.razao_social || data.empresa.nome_fantasia || 'Empresa não informada')
      : (data.dados_pessoais.nome || 'Não informado');
    const imovelCodigo = data.imovel.codigo || '';

    const LOCACAO_BOARD_ID = '3b619b46-85bf-487d-955b-e1255b1bf174';
    const CADASTRO_INICIADO_COLUMN_ID = '98579480-4d58-44f4-86dd-82c89e8f9f53';

    // Build card title
    const cardTitle = imovelCodigo
      ? `${clientName} — ${imovelCodigo}`
      : clientName;

    // Build enriched description with property details
    const bairro = selectedProperty?.bairro || 'Não informado';
    const cidade = selectedProperty?.cidade || 'Não informado';
    const condominio = selectedProperty?.condominio;
    const iptu = selectedProperty?.iptu;
    const seguroIncendio = selectedProperty?.seguro_incendio;

    // Build description with structured data
    const descriptionLines = pj ? [
      `**Tipo:** Pessoa Jurídica`,
      `**Razão Social:** ${data.empresa.razao_social || 'Não informado'}`,
      data.empresa.nome_fantasia ? `**Nome Fantasia:** ${data.empresa.nome_fantasia}` : '',
      `**CNPJ:** ${data.empresa.cnpj || 'Não informado'}`,
      `**Ramo:** ${data.empresa.ramo_atividade || 'Não informado'}`,
      `**Telefone:** ${data.empresa.telefone || 'Não informado'}`,
      `**E-mail:** ${data.empresa.email || 'Não informado'}`,
      `**Faturamento mensal:** ${data.empresa.faturamento_mensal || 'Não informado'}`,
      `**Regime tributário:** ${data.empresa.regime_tributario || 'Não informado'}`,
      '',
      `**Representantes:** ${data.representantes.length}`,
      signatario
        ? `**Signatário:** ${signatario.nome} — CPF ${signatario.cpf || 'N/A'} — ${signatario.whatsapp || 'sem WhatsApp'}`
        : `**Signatário:** ⚠️ não indicado`,
      '',
      `**Imóvel:** ${imovelCodigo || 'Não informado'}`,
      `**Endereço:** ${data.imovel.endereco || 'Não informado'}`,
      `**Bairro:** ${bairro}`,
      `**Cidade:** ${cidade}`,
      `**Valor Aluguel:** R$ ${aluguel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      condominio ? `**Condomínio:** R$ ${condominio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `**Condomínio:** Não informado`,
      iptu ? `**IPTU:** R$ ${iptu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `**IPTU:** Não informado`,
      seguroIncendio ? `**Seguro Incêndio:** R$ ${seguroIncendio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
      `**Valor Proposto:** ${valorProposto}`,
      '',
      `**Garantia:** ${garantiaLabel}`,
      `**Status:** Nova proposta`,
    ] : [
      `**Cliente:** ${clientName}`,
      `**CPF:** ${data.dados_pessoais.cpf || 'Não informado'}`,
      `**WhatsApp:** ${data.dados_pessoais.whatsapp || 'Não informado'}`,
      `**E-mail:** ${data.dados_pessoais.email || 'Não informado'}`,
      '',
      `**Imóvel:** ${imovelCodigo || 'Não informado'}`,
      `**Endereço:** ${data.imovel.endereco || 'Não informado'}`,
      `**Bairro:** ${bairro}`,
      `**Cidade:** ${cidade}`,
      `**Valor Aluguel:** R$ ${aluguel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      condominio ? `**Condomínio:** R$ ${condominio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `**Condomínio:** Não informado`,
      iptu ? `**IPTU:** R$ ${iptu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `**IPTU:** Não informado`,
      seguroIncendio ? `**Seguro Incêndio:** R$ ${seguroIncendio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
      `**Valor Proposto:** ${valorProposto}`,
      '',
      `**Renda Mensal:** R$ ${renda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `**Comprometimento:** ${percentualCalc !== null ? percentualCalc.toFixed(1) + '%' : 'N/A'}`,
      `**Garantia:** ${garantiaLabel}`,
      '',
      `**Score:** ${scoreLabel} (${points}/100)`,
      `**Status:** Nova proposta`,
    ];

    try {
      // Get max position in the target column
      const { data: existingCards } = await supabase
        .from('cards')
        .select('position')
        .eq('column_id', CADASTRO_INICIADO_COLUMN_ID)
        .eq('is_archived', false)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existingCards && existingCards.length > 0 ? existingCards[0].position + 1 : 0;

      const { error } = await supabase
        .from('cards')
        .insert({
          title: cardTitle,
          description: descriptionLines.filter(Boolean).join('\n'),
          board_id: LOCACAO_BOARD_ID,
          column_id: CADASTRO_INICIADO_COLUMN_ID,
          position: nextPosition,
          created_by: user?.id,
          address: data.imovel.endereco || null,
          robust_code: imovelCodigo || null,
          building_name: selectedProperty?.titulo || null,
          guarantee_type: mapGarantia(garantiaLabel),
          column_entered_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Proposta enviada e card criado com sucesso!');
      await markAsSubmitted();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Erro ao criar card:', err);
      toast.error('Proposta válida, mas houve erro ao criar o card', { description: err.message });
    }
  }

  function mapGarantia(label: string): 'fiador' | 'seguro_fianca' | 'caucao' | 'titulo_capitalizacao' | 'carta_fianca' | 'sem_garantia' | null {
    const map: Record<string, any> = {
      'Fiador': 'fiador',
      'Seguro Fiança': 'seguro_fianca',
      'Caução': 'caucao',
      'Título de Capitalização': 'titulo_capitalizacao',
      'Carta Fiança': 'carta_fianca',
      'Sem Garantia': 'sem_garantia',
    };
    return map[label] || null;
  }

  // ── Garantia step (Fiador estruturado) ──
  function renderGarantiaStep() {
    const fiadores = data.garantia.fiadores;
    const hasRenda = fiadores.some(f => f.tipo_fiador === 'renda');
    const hasImovel = fiadores.some(f => f.tipo_fiador === 'imovel');
    const rentValue = parseCurrency(data.imovel.valor_aluguel);

    const updateFiador = (index: number, patch: Partial<FiadorData>) => {
      update(p => {
        const fs = [...p.garantia.fiadores];
        const current = { ...fs[index], ...patch };
        const needsConj = fiadorNeedsConjuge(current);
        if (
          patch.tipo_fiador !== undefined ||
          patch.estado_civil !== undefined ||
          patch.regime_bens !== undefined ||
          patch.conjuge_participa !== undefined
        ) {
          current.documentos = buildFiadorDocs(current.tipo_fiador, needsConj);
          if (!needsConj) current.conjuge = { ...emptyFiadorConjuge };
          if (!fiadorIsCasado(current)) {
            current.regime_bens = '';
            current.conjuge_participa = '';
          }
        }
        fs[index] = current;
        return { ...p, garantia: { ...p.garantia, fiadores: fs } };
      });
    };
    const updateFiadorConjuge = (index: number, field: keyof FiadorConjugeData, value: string) => {
      update(p => {
        const fs = [...p.garantia.fiadores];
        fs[index] = { ...fs[index], conjuge: { ...fs[index].conjuge, [field]: value } };
        return { ...p, garantia: { ...p.garantia, fiadores: fs } };
      });
    };
    const addFiadorFile = (fiadorIdx: number, catIdx: number, file: UploadedFile) => {
      update(p => {
        const fs = [...p.garantia.fiadores];
        const docs = [...fs[fiadorIdx].documentos];
        docs[catIdx] = { ...docs[catIdx], files: [...docs[catIdx].files, file] };
        fs[fiadorIdx] = { ...fs[fiadorIdx], documentos: docs };
        return { ...p, garantia: { ...p.garantia, fiadores: fs } };
      });
    };
    const removeFiadorFile = (fiadorIdx: number, catIdx: number, fileId: string) => {
      update(p => {
        const fs = [...p.garantia.fiadores];
        const docs = [...fs[fiadorIdx].documentos];
        docs[catIdx] = { ...docs[catIdx], files: docs[catIdx].files.filter(f => f.id !== fileId) };
        fs[fiadorIdx] = { ...fs[fiadorIdx], documentos: docs };
        return { ...p, garantia: { ...p.garantia, fiadores: fs } };
      });
    };
    const addFiador = (tipo: FiadorTipo = '') =>
      update(p => ({ ...p, garantia: { ...p.garantia, fiadores: [...p.garantia.fiadores, makeEmptyFiador(tipo)] } }));
    const removeFiador = (i: number) =>
      update(p => ({ ...p, garantia: { ...p.garantia, fiadores: p.garantia.fiadores.filter((_, idx) => idx !== i) } }));

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
                onClick={() => update(p => ({
                  ...p,
                  garantia: {
                    ...p.garantia,
                    tipo_garantia: g,
                    fiadores: g === 'Fiador' && p.garantia.fiadores.length === 0
                      ? [makeEmptyFiador()]
                      : p.garantia.fiadores,
                  },
                }))}
              >
                {g}
              </Button>
            ))}
          </div>
        </div>

        {data.garantia.tipo_garantia === 'Fiador' && (
          <FiadorSection
            fiadores={fiadores}
            hasRenda={hasRenda}
            hasImovel={hasImovel}
            rentValue={rentValue}
            onUpdateFiador={updateFiador}
            onUpdateConjuge={updateFiadorConjuge}
            onAddFile={addFiadorFile}
            onRemoveFile={removeFiadorFile}
            onAddFiador={addFiador}
            onRemoveFiador={removeFiador}
          />
        )}

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
  }

  // ── Step Content ──
  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            {/* Property selector from CRM */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Selecionar imóvel do CRM <span className="text-destructive">*</span></Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => syncProperties.mutate()}
                  disabled={syncProperties.isPending}
                >
                  {syncProperties.isPending ? 'Sincronizando...' : '↻ Sincronizar'}
                </Button>
              </div>
              <Input
                value={propertySearch}
                onChange={(e) => setPropertySearch(e.target.value)}
                placeholder="Buscar por código, título, bairro..."
              />
              {propertiesLoading ? (
                <p className="text-sm text-muted-foreground">Carregando imóveis...</p>
              ) : (
                <div className="max-h-[250px] overflow-y-auto border rounded-md divide-y">
                  {properties
                    .filter(p => {
                      if (!propertySearch) return true;
                      const q = propertySearch.toLowerCase();
                      return (
                        String(p.codigo_robust).includes(q) ||
                        (p.titulo || '').toLowerCase().includes(q) ||
                        (p.bairro || '').toLowerCase().includes(q) ||
                        (p.cidade || '').toLowerCase().includes(q) ||
                        (p.logradouro || '').toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 30)
                    .map(p => {
                      const isSelected = data.imovel.codigo === String(p.codigo_robust);
                      return (
                        <div
                          key={p.id}
                          className={cn(
                            'flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                            isSelected && 'bg-accent/10 border-l-2 border-l-primary'
                          )}
                          onClick={() => {
                            const endereco = [p.logradouro, p.numero, p.bairro, p.cidade, p.estado].filter(Boolean).join(', ');
                            setSelectedProperty(p);
                            update(prev => ({
                              ...prev,
                              imovel: {
                                ...prev.imovel,
                                codigo: String(p.codigo_robust),
                                endereco,
                                valor_aluguel: p.valor_aluguel ? String(p.valor_aluguel) : '',
                              }
                            }));
                          }}
                        >
                          {p.foto_principal && (
                            <img src={p.foto_principal} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.titulo || `Imóvel ${p.codigo_robust}`}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[p.bairro, p.cidade].filter(Boolean).join(' — ')} • {p.tipo_imovel}
                            </p>
                            <p className="text-xs font-medium text-accent">
                              {p.valor_aluguel ? `R$ ${p.valor_aluguel.toLocaleString('pt-BR')}` : p.valor_venda ? `Venda R$ ${p.valor_venda.toLocaleString('pt-BR')}` : 'Valor não informado'}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">#{p.codigo_robust}</span>
                        </div>
                      );
                    })}
                  {properties.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum imóvel sincronizado. Clique em "Sincronizar" para importar do CRM.
                    </p>
                  )}
                </div>
              )}
              {data.imovel.codigo && (
                <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
                  <p><strong>Código:</strong> {data.imovel.codigo}</p>
                  <p><strong>Endereço:</strong> {data.imovel.endereco || 'N/A'}</p>
                  <p><strong>Valor Aluguel:</strong> {data.imovel.valor_aluguel ? `R$ ${data.imovel.valor_aluguel}` : 'N/A'}</p>
                </div>
              )}
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
                    onClick={() => update(p => {
                      if (p.imovel.tipo_pessoa === t) return p;
                      const isNowPJ = t === 'juridica';
                      return {
                        ...p,
                        imovel: { ...p.imovel, tipo_pessoa: t },
                        // Limpa dados PF se virou PJ
                        dados_pessoais: isNowPJ ? { ...emptyPerson } : p.dados_pessoais,
                        perfil_financeiro: isNowPJ
                          ? { estado_civil: '', fonte_renda: '', renda_mensal: '', regime_bens: '', conjuge_participa: '' }
                          : p.perfil_financeiro,
                        conjuge: isNowPJ ? { ...emptyPerson } : p.conjuge,
                        socios: isNowPJ ? [] : p.socios,
                        // Limpa dados PJ se virou PF
                        empresa: !isNowPJ ? { ...emptyEmpresa } : p.empresa,
                        representantes: !isNowPJ ? [] : p.representantes,
                        // Reinicia documentos com o template correto
                        documentos: isNowPJ
                          ? PJ_DOC_CATEGORIES.map(c => ({ ...c, files: [] }))
                          : INITIAL_DOC_CATEGORIES.map(c => ({ ...c, files: [] })),
                      };
                    })}
                  >
                    {t === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
      case 1:
        if (isPJ(data)) {
          return <EmpresaForm data={data.empresa} onChange={(d) => update(p => ({ ...p, empresa: d }))} />;
        }
        return (
          <PersonFields
            data={data.dados_pessoais}
            onChange={(d) => update(p => ({ ...p, dados_pessoais: d }))}
            labelPrefix="Proponente"
            isCnpj={data.imovel.tipo_pessoa === 'juridica'}
          />
        );
      case 2:
        if (isPJ(data)) {
          return (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                As informações financeiras da empresa já foram preenchidas na etapa anterior. Confira abaixo.
              </p>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Faturamento mensal</span><span className="font-medium">{data.empresa.faturamento_mensal || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Regime tributário</span><span className="font-medium">{data.empresa.regime_tributario || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tempo de atividade</span><span className="font-medium">{data.empresa.tempo_atividade || '—'}</span></div>
              </div>
              <p className="text-xs text-muted-foreground">
                Para alterar, volte à etapa "Dados da Empresa".
              </p>
            </div>
          );
        }
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
                    onClick={() => update(p => ({
                      ...p,
                      perfil_financeiro: {
                        ...p.perfil_financeiro,
                        estado_civil: s,
                        regime_bens: (s === 'Casado(a)' || s === 'União Estável') ? p.perfil_financeiro.regime_bens : '',
                        conjuge_participa: (s === 'Casado(a)' || s === 'União Estável') ? p.perfil_financeiro.conjuge_participa : '',
                      },
                    }))}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            {/* Regime de bens */}
            {isCasadoOuUniao(data) && (
              <div>
                <Label className="mb-3 block">Regime de bens <span className="text-destructive">*</span></Label>
                <div className="flex flex-wrap gap-2">
                  {REGIME_BENS_OPTIONS.map((r) => (
                    <Button
                      key={r}
                      type="button"
                      size="sm"
                      variant={data.perfil_financeiro.regime_bens === r ? 'default' : 'outline'}
                      onClick={() => update(p => ({
                        ...p,
                        perfil_financeiro: {
                          ...p.perfil_financeiro,
                          regime_bens: r,
                          conjuge_participa: r !== 'Separação total / absoluta de bens' ? '' : p.perfil_financeiro.conjuge_participa,
                        },
                      }))}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Pergunta participação do cônjuge - só para separação total */}
            {isCasadoOuUniao(data) && data.perfil_financeiro.regime_bens === 'Separação total / absoluta de bens' && (
              <div className="p-4 rounded-lg border bg-muted/50">
                <Label className="mb-3 block">O cônjuge/companheiro também participará do contrato? <span className="text-destructive">*</span></Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={data.perfil_financeiro.conjuge_participa === 'sim' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, conjuge_participa: 'sim' } }))}
                  >
                    Sim, vai participar
                  </Button>
                  <Button
                    type="button"
                    variant={data.perfil_financeiro.conjuge_participa === 'nao' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => update(p => ({ ...p, perfil_financeiro: { ...p.perfil_financeiro, conjuge_participa: 'nao' } }))}
                  >
                    Não, apenas eu
                  </Button>
                </div>
              </div>
            )}

            {/* Indicadores informativos */}
            {isCasadoOuUniao(data) && data.perfil_financeiro.regime_bens && data.perfil_financeiro.regime_bens !== 'Separação total / absoluta de bens' && (
              <p className="text-sm text-muted-foreground">
                ℹ️ Com o regime selecionado, a etapa de cônjuge/companheiro é obrigatória.
              </p>
            )}
            {showConjuge && data.perfil_financeiro.regime_bens === 'Separação total / absoluta de bens' && (
              <p className="text-sm text-muted-foreground">
                ℹ️ A etapa de cônjuge/companheiro será ativada.
              </p>
            )}

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
        if (isPJ(data)) {
          return (
            <RepresentantesForm
              representantes={data.representantes}
              onChange={(next) => update(p => ({ ...p, representantes: next }))}
            />
          );
        }
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
          <div className="space-y-6">
            {data.documentos.map((cat, catIdx) => {
              const status = cat.files.length === 0 ? 'pendente' : 'concluido';
              return (
                <div key={cat.key} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{cat.label}</h4>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          status === 'concluido' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        )}>
                          {status === 'concluido' ? `${cat.files.length} arquivo(s)` : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <HelpCircle className="h-3 w-3 shrink-0" />
                        {cat.help}
                      </p>
                    </div>
                  </div>

                  {/* File list */}
                  {cat.files.length > 0 && (
                    <div className="space-y-1">
                      {cat.files.map((file) => (
                        <div key={file.id} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1.5">
                          {file.type.startsWith('image/') ? (
                            <Image className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate flex-1">{file.name}</span>
                          <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => {
                              update(p => {
                                const docs = [...p.documentos];
                                docs[catIdx] = { ...docs[catIdx], files: docs[catIdx].files.filter(f => f.id !== file.id) };
                                return { ...p, documentos: docs };
                              });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload button */}
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-accent hover:underline">
                    <Upload className="h-4 w-4" />
                    Adicionar arquivo
                    <input
                      type="file"
                      accept={ACCEPTED_FILE_TYPES}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const fileList = e.target.files;
                        if (!fileList) return;
                        const newFiles: UploadedFile[] = [];
                        let rejected = 0;
                        Array.from(fileList).forEach((file) => {
                          if (!ACCEPTED_MIMES.includes(file.type)) { rejected++; return; }
                          if (file.size > MAX_FILE_SIZE) { rejected++; return; }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const uploaded: UploadedFile = {
                              id: crypto.randomUUID(),
                              name: file.name,
                              size: file.size,
                              type: file.type,
                              dataUrl: reader.result as string,
                            };
                            update(p => {
                              const docs = [...p.documentos];
                              docs[catIdx] = { ...docs[catIdx], files: [...docs[catIdx].files, uploaded] };
                              return { ...p, documentos: docs };
                            });
                          };
                          reader.readAsDataURL(file);
                        });
                        if (rejected > 0) {
                          toast.error(`${rejected} arquivo(s) rejeitado(s)`, { description: 'Aceitos: JPG, PNG, PDF até 10MB' });
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              );
            })}

            <div>
              <Label>Observações adicionais</Label>
              <Textarea
                value={data.documentos_observacao}
                onChange={(e) => update(p => ({ ...p, documentos_observacao: e.target.value }))}
                placeholder="Observações sobre documentos..."
                rows={3}
              />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            {/* "Você está alugando..." card selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Você está alugando…</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'eu_mesmo', icon: User, label: 'Para eu mesmo morar', desc: 'Você será o inquilino e morador' },
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
                        'flex flex-col items-center text-center p-4 rounded-lg border-2 transition-all',
                        isSelected ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/40'
                      )}
                    >
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-2', isSelected ? 'bg-accent/10' : 'bg-muted')}>
                        <Icon className={cn('h-5 w-5', isSelected ? 'text-accent' : 'text-muted-foreground')} />
                      </div>
                      <p className={cn('font-semibold text-sm', isSelected ? 'text-accent' : 'text-foreground')}>{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aviso ocupante autorizado */}
            {data.composicao.moradores[0]?.tipo && data.composicao.moradores[0].tipo !== 'eu_mesmo' && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex gap-3">
                <span className="text-xl">👉</span>
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  <strong>Importante:</strong> mesmo que outra pessoa vá morar no imóvel, o contrato será feito no <strong>nome do proponente</strong> (locatário). A pessoa que vai morar será registrada como <strong>ocupante autorizado</strong>.
                </p>
              </div>
            )}

            {/* Filho — 1 morador fixo */}
            {data.composicao.moradores[0]?.tipo === 'filho' && (
              <div className="border rounded-lg p-5 space-y-4 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-sm">Dados do(a) filho(a) que vai morar</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Qual a relação? <span className="text-destructive">*</span></Label>
                    <Input
                      value={data.composicao.moradores[0]?.relacao || ''}
                      onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[0] = { ...copy[0], relacao: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                      placeholder="Filho(a)"
                    />
                  </div>
                  <div>
                    <Label>Nome completo <span className="text-destructive">*</span></Label>
                    <Input
                      value={data.composicao.moradores[0]?.nome || ''}
                      onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[0] = { ...copy[0], nome: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                      placeholder="Nome do morador"
                    />
                  </div>
                  <div>
                    <Label>WhatsApp <span className="text-destructive">*</span></Label>
                    <Input
                      value={data.composicao.moradores[0]?.whatsapp || ''}
                      onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[0] = { ...copy[0], whatsapp: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label>E-mail <span className="text-destructive">*</span></Label>
                    <Input
                      type="email"
                      value={data.composicao.moradores[0]?.email || ''}
                      onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[0] = { ...copy[0], email: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Terceiro — lista com adicionar */}
            {data.composicao.moradores[0]?.tipo === 'terceiro' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm">Quem vai morar no imóvel?</h4>
                  <p className="text-xs text-muted-foreground">Adicione as pessoas que vão morar no imóvel.</p>
                </div>
                {data.composicao.moradores.map((m, idx) => (
                  <div key={idx} className="border rounded-lg p-5 space-y-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-accent" />
                        <span className="font-semibold text-sm">Morador {idx + 1}</span>
                      </div>
                      {idx > 0 && (
                        <button type="button" onClick={() => update(p => ({ ...p, composicao: { ...p.composicao, moradores: p.composicao.moradores.filter((_, i) => i !== idx) } }))} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Qual a relação? <span className="text-destructive">*</span></Label>
                        <Input
                          value={m.relacao || ''}
                          onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[idx] = { ...copy[idx], relacao: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                          placeholder="Filho(a), amigo(a), primo(a)..."
                        />
                      </div>
                      <div>
                        <Label>Nome completo <span className="text-destructive">*</span></Label>
                        <Input
                          value={m.nome || ''}
                          onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[idx] = { ...copy[idx], nome: e.target.value, tipo: 'terceiro' }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                          placeholder="Nome do morador"
                        />
                      </div>
                      <div>
                        <Label>WhatsApp <span className="text-destructive">*</span></Label>
                        <Input
                          value={m.whatsapp || ''}
                          onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[idx] = { ...copy[idx], whatsapp: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div>
                        <Label>E-mail <span className="text-destructive">*</span></Label>
                        <Input
                          type="email"
                          value={m.email || ''}
                          onChange={e => update(p => { const copy = [...p.composicao.moradores]; copy[idx] = { ...copy[idx], email: e.target.value }; return { ...p, composicao: { ...p.composicao, moradores: copy } }; })}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => update(p => ({ ...p, composicao: { ...p.composicao, moradores: [...p.composicao.moradores, { tipo: 'terceiro', nome: '', relacao: '', whatsapp: '', email: '' }] } }))} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar outro morador
                </Button>
              </div>
            )}

            {/* Outra pessoa retira chaves */}
            <div className="border-t pt-5 space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="chaves"
                  checked={!!data.composicao.responsavel_retirada}
                  onCheckedChange={(checked) => update(p => ({ ...p, composicao: { ...p.composicao, responsavel_retirada: checked ? 'terceiro' : '', retirada_nome: checked ? p.composicao.retirada_nome : '', retirada_whatsapp: checked ? p.composicao.retirada_whatsapp : '', retirada_cpf: checked ? p.composicao.retirada_cpf : '', retirada_email: checked ? p.composicao.retirada_email : '' } }))}
                />
                <Label htmlFor="chaves" className="cursor-pointer">Outra pessoa vai retirar as chaves?</Label>
              </div>
              {!!data.composicao.responsavel_retirada && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30 border">
                  <div>
                    <Label>Nome completo <span className="text-destructive">*</span></Label>
                    <Input value={data.composicao.retirada_nome || ''} onChange={e => update(p => ({ ...p, composicao: { ...p.composicao, retirada_nome: e.target.value } }))} placeholder="Nome" />
                  </div>
                  <div>
                    <Label>WhatsApp <span className="text-destructive">*</span></Label>
                    <Input value={data.composicao.retirada_whatsapp || ''} onChange={e => update(p => ({ ...p, composicao: { ...p.composicao, retirada_whatsapp: e.target.value } }))} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <Label>CPF <span className="text-destructive">*</span></Label>
                    <Input value={data.composicao.retirada_cpf || ''} onChange={e => update(p => ({ ...p, composicao: { ...p.composicao, retirada_cpf: e.target.value } }))} placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input type="email" value={data.composicao.retirada_email || ''} onChange={e => update(p => ({ ...p, composicao: { ...p.composicao, retirada_email: e.target.value } }))} placeholder="email@exemplo.com" />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 6:
        return renderGarantiaStep();
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
        return <ReviewStep data={data} showConjuge={showConjuge} percentual={percentualComprometimento} onGoToStep={(s) => { setStep(s); setVisited(prev => new Set(prev).add(s)); }} />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <img 
            src="/logo-rizzo.png" 
            alt="Rizzo Imobiliária" 
            className="h-8 w-auto object-contain"
          />
          <div className="w-px h-6 bg-border" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">Proposta de Locação</h1>
            <p className="text-xs text-muted-foreground">Etapa {step + 1} de {totalSteps} — {labels[step]}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              {progressPercent >= 85 ? 'Faltam poucos passos para finalizar! 🎉' :
               progressPercent >= 50 ? `Você já preencheu ${progressPercent}% da proposta` :
               progressPercent > 0 ? 'Continue preenchendo' : 'Preencha os dados para iniciar'}
            </span>
            <span className="font-bold text-accent">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2Icon className="h-3 w-3 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : lastSavedAt ? (
              <>
                <Cloud className="h-3 w-3 text-accent" />
                <span>Salvo automaticamente às {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : (
              <>
                <CloudOff className="h-3 w-3" />
                <span>Ainda não salvo</span>
              </>
            )}
          </div>
        </div>
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
                  status === 'current' && 'bg-accent text-accent-foreground',
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

// ── Score calculation ──
type ProposalScore = 'forte' | 'media' | 'risco';

function calcScore(data: ProposalFormData, percentual: number | null): { score: ProposalScore; points: number; reasons: string[] } {
  let points = 0;
  const reasons: string[] = [];

  // Renda vs aluguel (max 40 pts)
  if (percentual !== null && percentual > 0) {
    if (percentual <= 25) { points += 40; }
    else if (percentual <= 30) { points += 30; reasons.push('Comprometimento de renda entre 25-30%'); }
    else if (percentual <= 40) { points += 15; reasons.push('Comprometimento de renda acima de 30%'); }
    else { points += 0; reasons.push('Comprometimento de renda acima de 40% — risco alto'); }
  } else {
    reasons.push('Renda ou valor do aluguel não informados');
  }

  // Garantia (max 30 pts)
  const g = data.garantia.tipo_garantia;
  if (g === 'Seguro Fiança' || g === 'Caução') { points += 30; }
  else if (g === 'Fiador' || g === 'Título de Capitalização' || g === 'Carta Fiança') { points += 20; }
  else if (g === 'Sem Garantia') { points += 0; reasons.push('Sem garantia apresentada'); }
  else { reasons.push('Garantia não definida'); }

  // Documentação (max 30 pts)
  const totalDocs = data.documentos.length;
  const completeDocs = data.documentos.filter(c => c.files.length > 0).length;
  if (totalDocs > 0) {
    const docScore = Math.round((completeDocs / totalDocs) * 30);
    points += docScore;
    if (completeDocs < totalDocs) reasons.push(`${totalDocs - completeDocs} categoria(s) de documento pendente(s)`);
  }

  const score: ProposalScore = points >= 70 ? 'forte' : points >= 40 ? 'media' : 'risco';
  return { score, points, reasons };
}

// ── Pending steps checker ──
function getPendingSteps(data: ProposalFormData): { step: number; label: string; errors: string[]; critical: boolean }[] {
  const sc = needsConjuge(data);
  const pj = isPJ(data);
  const allLabels = getStepLabels(sc, pj);
  const pending: { step: number; label: string; errors: string[]; critical: boolean }[] = [];
  for (let i = 0; i < 8; i++) {
    // PF sem cônjuge: ignora etapa 3 (Cônjuge/Sócios). PJ sempre exige (Representantes).
    if (i === 3 && !sc && !pj) continue;
    const errs = validateStep(i, data);
    if (errs.length > 0) {
      // PJ: também marca etapa 3 (Representantes) como crítica
      const critical = [0, 1, 2, 6].includes(i) || (pj && i === 3);
      pending.push({ step: i, label: allLabels[i], errors: errs, critical });
    }
  }
  return pending;
}

// ── Review Step component ──
function ReviewStep({ data, showConjuge, percentual, onGoToStep }: {
  data: ProposalFormData;
  showConjuge: boolean;
  percentual: number | null;
  onGoToStep: (step: number) => void;
}) {
  const { score, points, reasons } = calcScore(data, percentual);
  const pendingSteps = getPendingSteps(data);
  const hasCritical = pendingSteps.some(p => p.critical);

  const rendaMensal = v(data.perfil_financeiro.renda_mensal);
  const valorAluguel = v(data.imovel.valor_aluguel);
  const garantiaLabel = v(data.garantia.tipo_garantia);
  const nomeProponente = v(data.dados_pessoais.nome);

  const resumoTexto = `Proponente ${nomeProponente !== 'Não informado' ? nomeProponente : '—'} com renda de ${rendaMensal !== 'Não informado' ? rendaMensal : '—'} pretende locar imóvel de ${valorAluguel !== 'Não informado' ? valorAluguel : '—'}${percentual !== null ? `, comprometendo ${percentual.toFixed(1)}% da renda` : ''}. Garantia escolhida: ${garantiaLabel}.`;

  const scoreConfig = {
    forte: { icon: ShieldCheck, color: 'bg-green-100 border-green-300 text-green-800', label: 'Proposta Forte', desc: 'Documentação e perfil financeiro adequados.' },
    media: { icon: Shield, color: 'bg-amber-100 border-amber-300 text-amber-800', label: 'Proposta Média', desc: 'Alguns pontos precisam de atenção.' },
    risco: { icon: ShieldAlert, color: 'bg-destructive/10 border-destructive/30 text-destructive', label: 'Proposta de Risco', desc: 'Pendências críticas identificadas.' },
  };

  const sc = scoreConfig[score];
  const ScoreIcon = sc.icon;

  return (
    <div className="space-y-6">
      {/* Score card */}
      <div className={cn('p-4 rounded-lg border flex items-start gap-4', sc.color)}>
        <ScoreIcon className="h-8 w-8 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold">{sc.label}</h3>
            <span className="text-sm font-medium opacity-75">{points}/100 pts</span>
          </div>
          <p className="text-sm">{sc.desc}</p>
          {reasons.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {reasons.map((r, i) => (
                <li key={i} className="text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Pending steps alert */}
      {pendingSteps.length > 0 && (
        <div className="p-4 rounded-lg border border-amber-300 bg-amber-50">
          <h4 className="font-semibold text-sm text-amber-900 mb-2">
            ⚠️ Algumas etapas precisam de atenção
          </h4>
          <div className="space-y-2">
            {pendingSteps.map((ps) => (
              <div key={ps.step} className="flex items-center justify-between bg-background rounded px-3 py-2 border">
                <div>
                  <span className="text-sm font-medium">{ps.label}</span>
                  {ps.critical && <span className="ml-2 text-xs text-destructive font-semibold">Crítico</span>}
                  <p className="text-xs text-muted-foreground">{ps.errors[0]}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onGoToStep(ps.step)}>
                  <ExternalLink className="h-3 w-3 mr-1" /> Completar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto summary */}
      <div className="p-4 rounded-lg bg-muted border">
        <h4 className="font-semibold text-sm mb-2">📝 Resumo automático</h4>
        <p className="text-sm">{resumoTexto}</p>
      </div>

      {/* Detailed review blocks */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ReviewBlock title="🏠 Imóvel" items={[
          ['Código', v(data.imovel.codigo)],
          ['Endereço', v(data.imovel.endereco)],
          ['Valor aluguel', v(data.imovel.valor_aluguel)],
          ['Tipo', data.imovel.tipo_pessoa === 'fisica' ? 'Pessoa Física' : data.imovel.tipo_pessoa === 'juridica' ? 'Pessoa Jurídica' : 'Não informado'],
        ]} onFix={() => onGoToStep(0)} />
        <ReviewBlock title="👤 Dados Pessoais" items={[
          ['Nome', v(data.dados_pessoais.nome)],
          ['CPF/CNPJ', v(data.dados_pessoais.cpf)],
          ['Profissão', v(data.dados_pessoais.profissao)],
          ['WhatsApp', v(data.dados_pessoais.whatsapp)],
          ['E-mail', v(data.dados_pessoais.email)],
        ]} onFix={() => onGoToStep(1)} />
        <ReviewBlock title="💰 Perfil Financeiro" items={[
          ['Estado civil', v(data.perfil_financeiro.estado_civil)],
          ...(isCasadoOuUniao(data) ? [['Regime de bens', v(data.perfil_financeiro.regime_bens)] as [string, string]] : []),
          ...(isCasadoOuUniao(data) && data.perfil_financeiro.regime_bens === 'Separação total / absoluta de bens'
            ? [['Cônjuge participa', data.perfil_financeiro.conjuge_participa === 'sim' ? 'Sim' : data.perfil_financeiro.conjuge_participa === 'nao' ? 'Não' : 'Não informado'] as [string, string]]
            : []),
          ['Fonte de renda', v(data.perfil_financeiro.fonte_renda)],
          ['Renda mensal', v(data.perfil_financeiro.renda_mensal)],
          ...(percentual !== null ? [['Comprometimento', `${percentual.toFixed(1)}%`] as [string, string]] : []),
        ]} onFix={() => onGoToStep(2)} />
        {showConjuge && (
          <ReviewBlock title="💍 Cônjuge" items={[
            ['Nome', v(data.conjuge.nome)],
            ['CPF', v(data.conjuge.cpf)],
          ]} onFix={() => onGoToStep(3)} />
        )}
        <ReviewBlock title="🏡 Composição" items={[
          ['Tipo de locação',
            data.composicao.moradores[0]?.tipo === 'eu_mesmo' ? 'Para o próprio locatário'
            : data.composicao.moradores[0]?.tipo === 'filho' ? 'Para um filho(a)'
            : data.composicao.moradores[0]?.tipo === 'terceiro' ? 'Para um conhecido'
            : 'Não informado'
          ],
          ...(data.composicao.moradores[0]?.tipo && data.composicao.moradores[0].tipo !== 'eu_mesmo'
            ? data.composicao.moradores.flatMap((m, i) => [
                [`Morador ${i+1} — Nome`, v(m.nome || '')],
                [`Morador ${i+1} — Relação`, v(m.relacao || '')],
                [`Morador ${i+1} — WhatsApp`, v(m.whatsapp || '')],
                [`Morador ${i+1} — E-mail`, v(m.email || '')],
              ] as [string, string][])
            : []),
          ['Retira chaves', data.composicao.responsavel_retirada ? 'Outra pessoa' : 'O próprio proponente'],
          ...(data.composicao.responsavel_retirada
            ? [
                ['Chave — Nome', v(data.composicao.retirada_nome || '')],
                ['Chave — WhatsApp', v(data.composicao.retirada_whatsapp || '')],
                ['Chave — CPF', v(data.composicao.retirada_cpf || '')],
                ...(data.composicao.retirada_email ? [['Chave — E-mail', data.composicao.retirada_email] as [string, string]] : []),
              ] as [string, string][]
            : []),
        ]} onFix={() => onGoToStep(5)} />
        <ReviewBlock title="🔒 Garantia" items={[
          ['Modalidade', v(data.garantia.tipo_garantia)],
          ...(data.garantia.tipo_garantia === 'Fiador'
            ? [
                ['Fiadores cadastrados', String(data.garantia.fiadores.length)] as [string, string],
                ['Possui fiador com renda', data.garantia.fiadores.some(f => f.tipo_fiador === 'renda') ? '✅ Sim' : '⚠️ Pendente'] as [string, string],
                ['Possui fiador com imóvel', data.garantia.fiadores.some(f => f.tipo_fiador === 'imovel') ? '✅ Sim' : '⚠️ Pendente'] as [string, string],
                ...data.garantia.fiadores.flatMap((f, i) => {
                  const tipoLabel = f.tipo_fiador === 'renda' ? 'Renda' : f.tipo_fiador === 'imovel' ? 'Imóvel' : 'Tipo não definido';
                  const docsTotal = f.documentos.filter(d => d.key !== 'renda_conjuge').length;
                  const docsOk = f.documentos.filter(d => d.key !== 'renda_conjuge' && d.files.length > 0).length;
                  return [
                    [`Fiador ${i + 1} — ${tipoLabel}`, v(f.nome)],
                    [`Fiador ${i + 1} — Documentos`, docsTotal === 0 ? 'Selecione o tipo' : `${docsOk}/${docsTotal} ${docsOk === docsTotal ? '✅' : '⚠️'}`],
                  ] as [string, string][];
                }),
              ]
            : []),
        ]} onFix={() => onGoToStep(6)} />
        <ReviewBlock title="📄 Documentos" items={
          data.documentos.map(cat => [cat.label, cat.files.length > 0 ? `${cat.files.length} arquivo(s) ✅` : 'Pendente ⚠️'] as [string, string])
        } onFix={() => onGoToStep(4)} />
        <ReviewBlock title="🤝 Negociação" items={[
          ['Valor proposto', v(data.negociacao.valor_proposto)],
          ['Aceitou valor', data.negociacao.aceitou_valor === 'sim' ? 'Sim' : data.negociacao.aceitou_valor === 'nao' ? 'Não' : 'Não informado'],
        ]} onFix={() => onGoToStep(7)} />
      </div>

      {/* Block message */}
      {hasCritical && (
        <div className="p-3 rounded-lg border border-destructive bg-destructive/5 text-destructive text-sm font-medium">
          🚫 Existem pendências críticas. Regularize antes de enviar.
        </div>
      )}
    </div>
  );
}

// ── Review block ──
function ReviewBlock({ title, items, onFix }: { title: string; items: [string, string][]; onFix?: () => void }) {
  const hasNotInformed = items.some(([, val]) => val === 'Não informado' || val.includes('Pendente'));
  return (
    <div className={cn('p-4 border rounded-lg', hasNotInformed && 'border-amber-300')}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">{title}</h4>
        {hasNotInformed && onFix && (
          <Button size="sm" variant="ghost" className="h-6 text-xs text-accent" onClick={onFix}>
            Completar
          </Button>
        )}
      </div>
      <dl className="space-y-1">
        {items.map(([label, value], i) => (
          <div key={i} className="flex justify-between text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={cn('font-medium', (value === 'Não informado' || value.includes('Pendente')) && 'text-destructive')}>
              {value || '—'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}