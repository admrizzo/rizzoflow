import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Users, Trash2, Plus, MapPin, AlertCircle, Check, ShieldCheck, Wallet, Home,
  HelpCircle, Upload, FileText, Image as ImageIcon, X, UserPlus, Heart,
} from 'lucide-react';
import type {
  FiadorData, FiadorTipo, FiadorConjugeData, UploadedFile,
} from '@/pages/PropostaLocacao';
import { ProfessionInput } from '@/components/proposta/ProfessionInput';
import { MaskedInput } from '@/components/proposta/MaskedInput';
import { RendaInfoBlock } from '@/components/proposta/RendaInfoBlock';
import { IncomeTypeInput } from '@/components/proposta/IncomeTypeInput';
import { AddressFields } from '@/components/proposta/AddressFields';
import { getFiadorRequirementStates, type FiadorRequirementState } from '@/lib/proposalMasks';

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

const REGIME_BENS_OPTIONS = [
  'Comunhão parcial de bens',
  'Comunhão universal de bens',
  'Separação total / absoluta de bens',
  'Participação final nos aquestos',
  'Não sei informar',
];

function fiadorIsCasado(f: FiadorData): boolean {
  return f.estado_civil === 'Casado(a)' || f.estado_civil === 'União Estável';
}
function fiadorNeedsConjuge(f: FiadorData): boolean {
  if (!fiadorIsCasado(f)) return false;
  if (!f.regime_bens) return false;
  if (f.regime_bens === 'Separação total / absoluta de bens') return f.conjuge_participa === 'sim';
  return true;
}

function isFiadorComplete(f: FiadorData): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!f.tipo_fiador) missing.push('Tipo de fiador');
  if (!f.nome.trim()) missing.push('Nome');
  if (!f.cpf.trim()) missing.push('CPF');
  if (!f.profissao.trim()) missing.push('Profissão');
  if (!f.whatsapp.trim()) missing.push('WhatsApp');
  if (!f.email.trim()) missing.push('E-mail');
  if (!f.estado_civil) missing.push('Estado civil');
  if ((f.tipo_fiador === 'renda' || f.tipo_fiador === 'ambos') && !f.renda_mensal.trim()) missing.push('Renda mensal');
  if (fiadorIsCasado(f) && !f.regime_bens) missing.push('Regime de bens');
  if (fiadorNeedsConjuge(f)) {
    if (!f.conjuge.nome.trim()) missing.push('Nome do cônjuge');
    if (!f.conjuge.cpf.trim()) missing.push('CPF do cônjuge');
  }
  // Documentos obrigatórios (todos exceto renda_conjuge que é opcional)
  for (const cat of f.documentos) {
    if (cat.key === 'renda_conjuge') continue;
    if (cat.files.length === 0) missing.push(`Documento: ${cat.label}`);
  }
  return { complete: missing.length === 0, missing };
}

interface FiadorSectionProps {
  fiadores: FiadorData[];
  rentValue: number;
  onUpdateFiador: (index: number, patch: Partial<FiadorData>) => void;
  onUpdateConjuge: (index: number, field: keyof FiadorConjugeData, value: string) => void;
  onAddFile: (fiadorIdx: number, catIdx: number, file: UploadedFile) => void;
  onRemoveFile: (fiadorIdx: number, catIdx: number, fileId: string) => void;
  onAddFiador: (tipo?: FiadorTipo) => void;
  onRemoveFiador: (index: number) => void;
}

export function FiadorSection({
  fiadores, rentValue,
  onUpdateFiador, onUpdateConjuge, onAddFile, onRemoveFile, onAddFiador, onRemoveFiador,
}: FiadorSectionProps) {
  const rendaMin = rentValue > 0 ? rentValue * 3 : 0;
  const requirementStates = getFiadorRequirementStates(fiadores);
  const rendaState = requirementStates.renda.state;
  const imovelState = requirementStates.imovel.state;
  const hasRenda = requirementStates.hasIncomeGuarantor;
  const hasImovel = requirementStates.hasPropertyGuarantor;
  const stateClasses = (state: FiadorRequirementState) => state === 'cumprido'
    ? 'bg-accent text-accent-foreground border-accent'
    : state === 'em_preenchimento'
      ? 'bg-warning text-warning-foreground border-warning'
      : 'bg-muted text-muted-foreground border-border';
  const stateTextClasses = (state: FiadorRequirementState) => state === 'pendente'
    ? 'text-muted-foreground'
    : 'text-foreground';
  const stateIcon = (state: FiadorRequirementState, fallback: string) => {
    if (state === 'cumprido') return <Check className="h-3 w-3" strokeWidth={3} />;
    if (state === 'em_preenchimento') return <AlertCircle className="h-3 w-3" strokeWidth={2.5} />;
    return <span className="text-[10px] font-bold">{fallback}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Regra principal — banner estrutural */}
      <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-accent" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground text-base">Regra para fiança Rizzo</h3>
            <p className="text-sm text-muted-foreground mt-1">Para esta modalidade, são necessários:</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2.5 text-sm">
                <span className={cn(
                  'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5',
                  stateClasses(rendaState),
                )}>
                  {stateIcon(rendaState, '1')}
                </span>
                <span className={cn(stateTextClasses(rendaState))}>
                  <strong className="text-foreground">1 fiador com renda comprovada</strong> superior a 3x o valor do aluguel
                  {rendaMin > 0 && (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Renda mínima: <strong>R$ {rendaMin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </span>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-sm">
                <span className={cn(
                  'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5',
                  stateClasses(imovelState),
                )}>
                  {stateIcon(imovelState, '2')}
                </span>
                <span className={cn(stateTextClasses(imovelState))}>
                  <strong className="text-foreground">1 fiador com imóvel quitado</strong> na região de Goiânia
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Header da lista */}
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-foreground" strokeWidth={2} />
        <div>
          <h3 className="font-bold text-foreground text-lg">Fiadores</h3>
          <p className="text-sm text-muted-foreground">Adicione os fiadores conforme a regra acima. Cada fiador é um bloco independente.</p>
        </div>
      </div>

      {/* Cards de fiadores */}
      {fiadores.map((fiador, idx) => {
        const { complete, missing } = isFiadorComplete(fiador);
        const tipoLabel = fiador.tipo_fiador === 'renda'
          ? 'Renda'
          : fiador.tipo_fiador === 'imovel'
            ? 'Imóvel'
            : fiador.tipo_fiador === 'ambos'
              ? 'Renda + Imóvel'
              : '—';
        const TipoIcon = fiador.tipo_fiador === 'renda'
          ? Wallet
          : fiador.tipo_fiador === 'imovel'
            ? Home
            : fiador.tipo_fiador === 'ambos'
              ? ShieldCheck
              : UserPlus;

        return (
          <div
            key={idx}
            className={cn(
              'bg-card rounded-2xl border-2 overflow-hidden transition-colors',
              complete ? 'border-accent/30' : 'border-border',
            )}
          >
            {/* Cabeçalho do bloco */}
            <div className={cn(
              'flex items-center justify-between gap-3 px-5 py-4 border-b',
              complete ? 'bg-accent/5' : 'bg-muted/30',
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  complete ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground',
                )}>
                  <TipoIcon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Fiador {idx + 1} — {tipoLabel}</h4>
                  <p className="text-xs text-muted-foreground">
                    {complete
                      ? 'Bloco completo ✓'
                      : `${missing.length} pendência${missing.length === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
              <Button type="button" size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => onRemoveFiador(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              {/* Tipo de fiador */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Tipo de fiador <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([
                    { key: 'renda', icon: Wallet, title: 'Fiador com renda', desc: 'Comprova renda superior a 3x o aluguel' },
                    { key: 'imovel', icon: Home, title: 'Fiador com imóvel', desc: 'Possui imóvel quitado em Goiânia' },
                    { key: 'ambos', icon: ShieldCheck, title: 'Renda e imóvel', desc: 'Mesmo fiador comprova renda e possui imóvel' },
                  ] as const).map((opt) => {
                    const Icon = opt.icon;
                    const selected = fiador.tipo_fiador === opt.key;
                    return (
                      <button key={opt.key} type="button"
                        onClick={() => onUpdateFiador(idx, { tipo_fiador: opt.key })}
                        className={cn(
                          'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                          selected ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/40',
                        )}
                      >
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                          selected ? 'bg-accent/10' : 'bg-muted',
                        )}>
                          <Icon className={cn('h-4 w-4', selected ? 'text-accent' : 'text-muted-foreground')} strokeWidth={2} />
                        </div>
                        <div>
                          <p className={cn('font-bold text-sm', selected ? 'text-accent' : 'text-foreground')}>{opt.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dados pessoais do fiador */}
              {fiador.tipo_fiador && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <UserPlus className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                      <h5 className="font-bold text-foreground text-sm">Dados do fiador</h5>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Nome completo <span className="text-destructive">*</span></Label>
                      <Input value={fiador.nome} onChange={e => onUpdateFiador(idx, { nome: e.target.value })} placeholder="Nome completo" className="mt-1.5 h-11" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">CPF <span className="text-destructive">*</span></Label>
                        <MaskedInput
                          kind="cpf"
                          value={fiador.cpf}
                          onValueChange={v => onUpdateFiador(idx, { cpf: v })}
                          placeholder="000.000.000-00"
                          className="mt-1.5 h-11"
                        />
                      </div>
                      <ProfessionInput
                        value={fiador.profissao}
                        onChange={v => onUpdateFiador(idx, { profissao: v })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Telefone / WhatsApp <span className="text-destructive">*</span></Label>
                        <MaskedInput
                          kind="phone"
                          value={fiador.whatsapp}
                          onValueChange={v => onUpdateFiador(idx, { whatsapp: v })}
                          placeholder="(00) 00000-0000"
                          className="mt-1.5 h-11"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">E-mail <span className="text-destructive">*</span></Label>
                        <Input value={fiador.email} onChange={e => onUpdateFiador(idx, { email: e.target.value })} placeholder="email@exemplo.com" className="mt-1.5 h-11" />
                      </div>
                    </div>
                    {fiador.tipo_fiador === 'renda' && (
                      <div>
                        <Label className="text-sm font-medium">
                          Renda mensal <span className="text-destructive">*</span>
                          {rendaMin > 0 && (
                            <span className="text-xs text-muted-foreground font-normal ml-1">
                              (mínimo R$ {rendaMin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                            </span>
                          )}
                        </Label>
                        <CurrencyInput
                          value={fiador.renda_mensal}
                          onValueChange={v => onUpdateFiador(idx, { renda_mensal: v })}
                          placeholder="0,00"
                          className="mt-1.5 h-11"
                        />
                        <RendaInfoBlock />
                        <div className="mt-3">
                          <IncomeTypeInput
                            value={fiador.tipo_renda || ''}
                            onChange={v => onUpdateFiador(idx, { tipo_renda: v })}
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium">Estado civil <span className="text-destructive">*</span></Label>
                      <Select value={fiador.estado_civil} onValueChange={v => onUpdateFiador(idx, { estado_civil: v })}>
                        <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {CIVIL_STATUS.map(s => <SelectItem key={s.label} value={s.label}>{s.icon} {s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Regime de bens (se casado/união estável) */}
                  {fiadorIsCasado(fiador) && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                        <h5 className="font-bold text-foreground text-sm">Regime de bens e cônjuge</h5>
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Regime de bens <span className="text-destructive">*</span></Label>
                        <div className="space-y-2">
                          {REGIME_BENS_OPTIONS.map(r => (
                            <button key={r} type="button"
                              onClick={() => onUpdateFiador(idx, { regime_bens: r })}
                              className={cn(
                                'w-full flex items-center gap-2 p-3 rounded-xl border text-sm font-medium text-left transition-all',
                                fiador.regime_bens === r
                                  ? 'border-accent bg-accent/5'
                                  : 'border-border hover:border-muted-foreground/40',
                              )}
                            >
                              {fiador.regime_bens === r && <span className="text-xs text-accent">●</span>}
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pergunta participação - apenas separação total */}
                      {fiador.regime_bens === 'Separação total / absoluta de bens' && (
                        <div>
                          <Label className="text-sm font-medium mb-2 block">O cônjuge participará do contrato? <span className="text-destructive">*</span></Label>
                          <div className="grid grid-cols-2 gap-3">
                            {(['sim', 'nao'] as const).map(v => (
                              <button key={v} type="button"
                                onClick={() => onUpdateFiador(idx, { conjuge_participa: v })}
                                className={cn(
                                  'p-3 rounded-xl border-2 text-sm font-bold transition-all',
                                  fiador.conjuge_participa === v
                                    ? 'border-accent bg-accent/5 text-accent'
                                    : 'border-border text-foreground hover:border-muted-foreground/40',
                                )}
                              >
                                {v === 'sim' ? 'Sim, participa' : 'Não participa'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dados do cônjuge */}
                      {fiadorNeedsConjuge(fiador) && (
                        <div className="bg-muted/30 rounded-xl p-4 space-y-4 border">
                          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Dados do cônjuge</p>
                          <div>
                            <Label className="text-sm font-medium">Nome completo <span className="text-destructive">*</span></Label>
                            <Input value={fiador.conjuge.nome} onChange={e => onUpdateConjuge(idx, 'nome', e.target.value)} placeholder="Nome do cônjuge" className="mt-1.5 h-11" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">CPF <span className="text-destructive">*</span></Label>
                              <MaskedInput
                                kind="cpf"
                                value={fiador.conjuge.cpf}
                                onValueChange={v => onUpdateConjuge(idx, 'cpf', v)}
                                placeholder="000.000.000-00"
                                className="mt-1.5 h-11"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Documento de identidade</Label>
                              <Input value={fiador.conjuge.documento_identidade} onChange={e => onUpdateConjuge(idx, 'documento_identidade', e.target.value)} placeholder="RG ou CNH" className="mt-1.5 h-11" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Telefone / WhatsApp</Label>
                              <MaskedInput
                                kind="phone"
                                value={fiador.conjuge.whatsapp}
                                onValueChange={v => onUpdateConjuge(idx, 'whatsapp', v)}
                                placeholder="(00) 00000-0000"
                                className="mt-1.5 h-11"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">E-mail</Label>
                              <Input value={fiador.conjuge.email} onChange={e => onUpdateConjuge(idx, 'email', e.target.value)} placeholder="email@exemplo.com" className="mt-1.5 h-11" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Endereço do fiador */}
                  <div className="pt-4 border-t space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                      <h5 className="font-bold text-foreground text-sm">Endereço do fiador</h5>
                    </div>
                    <AddressFields
                      markRequired
                      value={{
                        cep: fiador.cep,
                        logradouro: fiador.logradouro,
                        numero: fiador.numero,
                        complemento: fiador.complemento,
                        bairro: fiador.bairro,
                        cidade: fiador.cidade,
                        uf: fiador.uf,
                      }}
                      onChange={(patch) => onUpdateFiador(idx, patch)}
                    />
                  </div>

                  {/* Documentos por fiador */}
                  {fiador.documentos.length > 0 && (
                    <div className="pt-4 border-t space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                        <h5 className="font-bold text-foreground text-sm">
                          Documentos do fiador {fiador.tipo_fiador === 'renda' ? 'com renda' : fiador.tipo_fiador === 'imovel' ? 'com imóvel' : 'com renda e imóvel'}
                        </h5>
                      </div>
                      <p className="text-xs text-muted-foreground">Todos os documentos abaixo (exceto opcionais) são obrigatórios para análise da fiança.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {fiador.documentos.map((cat, catIdx) => {
                          const optional = cat.key === 'renda_conjuge';
                          const done = cat.files.length > 0;
                          return (
                            <div key={cat.key} className={cn(
                              'rounded-xl border p-4 space-y-3 transition-colors',
                              done ? 'border-accent/30 bg-accent/5' : 'border-border bg-background',
                            )}>
                              <div>
                                <div className="flex items-start gap-1.5">
                                  <p className="font-semibold text-sm text-foreground leading-tight">
                                    {cat.label} {!optional && <span className="text-destructive">*</span>}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5">
                                  <HelpCircle className="h-3 w-3 shrink-0 mt-0.5" /> {cat.help}
                                </p>
                              </div>
                              {cat.files.length > 0 && (
                                <div className="space-y-1.5">
                                  {cat.files.map(file => (
                                    <div key={file.id} className="flex items-center gap-2 text-xs bg-background rounded-lg px-2.5 py-1.5 border">
                                      {file.type.startsWith('image/')
                                        ? <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        : <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                      <span className="truncate flex-1 text-foreground">{file.name}</span>
                                      {file.persisted ? (
                                        <span className="text-[10px] font-semibold text-green-700 bg-green-100 rounded-full px-1.5 py-0.5 shrink-0">
                                          já enviado
                                        </span>
                                      ) : (
                                        <button onClick={() => onRemoveFile(idx, catIdx, file.id)} className="text-destructive/70 hover:text-destructive p-0.5">
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <label className="flex flex-col items-center justify-center gap-1 cursor-pointer text-xs text-accent font-medium hover:bg-accent/5 border-2 border-dashed border-accent/30 rounded-lg py-3 transition-colors">
                                <Upload className="h-4 w-4" />
                                <span>Arraste ou <span className="underline">clique para enviar</span></span>
                                <span className="text-[10px] text-muted-foreground">JPG, PNG ou PDF • Máx. 10MB</span>
                                <input type="file" accept={ACCEPTED_FILE_TYPES} multiple className="hidden" onChange={e => {
                                  const fileList = e.target.files;
                                  if (!fileList) return;
                                  let rejected = 0;
                                  Array.from(fileList).forEach(file => {
                                    if (!ACCEPTED_MIMES.includes(file.type)) { rejected++; return; }
                                    if (file.size > MAX_FILE_SIZE) { rejected++; return; }
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      const uploaded: UploadedFile = {
                                        id: crypto.randomUUID(), name: file.name, size: file.size,
                                        type: file.type, dataUrl: reader.result as string,
                                      };
                                      onAddFile(idx, catIdx, uploaded);
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
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Botões inteligentes — só aparecem se o requisito está pendente */}
      {(rendaState === 'pendente' || imovelState === 'pendente') && (
        <div className={cn('grid gap-3', rendaState === 'pendente' && imovelState === 'pendente' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
          {rendaState === 'pendente' && (
            <Button type="button" variant="outline" className="rounded-xl h-auto py-3 flex flex-col gap-1" onClick={() => onAddFiador('renda')}>
              <span className="flex items-center gap-2 font-bold text-sm"><Wallet className="h-4 w-4 text-accent" strokeWidth={2} /> Adicionar fiador com renda</span>
              <span className="text-xs text-muted-foreground font-normal">Renda &gt; 3x o aluguel</span>
            </Button>
          )}
          {imovelState === 'pendente' && (
            <Button type="button" variant="outline" className="rounded-xl h-auto py-3 flex flex-col gap-1" onClick={() => onAddFiador('imovel')}>
              <span className="flex items-center gap-2 font-bold text-sm"><Home className="h-4 w-4 text-accent" strokeWidth={2} /> Adicionar fiador com imóvel</span>
              <span className="text-xs text-muted-foreground font-normal">Imóvel quitado em Goiânia</span>
            </Button>
          )}
        </div>
      )}

      {/* Status visual dos requisitos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={cn(
          'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm',
          rendaState === 'cumprido' ? 'border-accent/30 bg-accent/5' : rendaState === 'em_preenchimento' ? 'border-warning/30 bg-warning/5' : 'border-border bg-muted/30',
        )}>
          {rendaState === 'cumprido' ? <Check className="h-4 w-4 text-accent shrink-0" strokeWidth={3} /> : <AlertCircle className={cn('h-4 w-4 shrink-0', rendaState === 'em_preenchimento' ? 'text-warning' : 'text-muted-foreground')} strokeWidth={2} />}
          <span className="font-semibold text-foreground">
            {rendaState === 'cumprido' ? 'Fiador com renda cadastrado' : rendaState === 'em_preenchimento' ? 'Fiador com renda em preenchimento' : 'Fiador com renda pendente'}
          </span>
        </div>
        <div className={cn(
          'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm',
          imovelState === 'cumprido' ? 'border-accent/30 bg-accent/5' : imovelState === 'em_preenchimento' ? 'border-warning/30 bg-warning/5' : 'border-border bg-muted/30',
        )}>
          {imovelState === 'cumprido' ? <Check className="h-4 w-4 text-accent shrink-0" strokeWidth={3} /> : <AlertCircle className={cn('h-4 w-4 shrink-0', imovelState === 'em_preenchimento' ? 'text-warning' : 'text-muted-foreground')} strokeWidth={2} />}
          <span className="font-semibold text-foreground">
            {imovelState === 'cumprido' ? 'Fiador com imóvel cadastrado' : imovelState === 'em_preenchimento' ? 'Fiador com imóvel em preenchimento' : 'Fiador com imóvel pendente'}
          </span>
        </div>
      </div>

      {/* Status visual: cumprido (verde) ou em preenchimento (âmbar) */}
      {false && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hasRenda && (
            <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
              <Check className="h-4 w-4 text-accent shrink-0" strokeWidth={3} />
              <span className="font-semibold text-foreground">Fiador com renda cadastrado</span>
            </div>
          )}
          {!hasRenda && rendaInProgress && (
            <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 text-warning shrink-0" strokeWidth={2} />
              <span className="font-semibold text-foreground">Fiador com renda em preenchimento</span>
            </div>
          )}
          {hasImovel && (
            <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
              <Check className="h-4 w-4 text-accent shrink-0" strokeWidth={3} />
              <span className="font-semibold text-foreground">Fiador com imóvel cadastrado</span>
            </div>
          )}
          {!hasImovel && imovelInProgress && (
            <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 text-warning shrink-0" strokeWidth={2} />
              <span className="font-semibold text-foreground">Fiador com imóvel em preenchimento</span>
            </div>
          )}
        </div>
      )}

      {/* Resumo quando ambos requisitos estão completos */}
      {hasRenda && hasImovel && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">Requisitos principais de fiador preenchidos</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Você já cadastrou ao menos um fiador com renda e um com imóvel. Caso queira incluir um fiador adicional, use a opção abaixo.
            </p>
          </div>
        </div>
      )}

      {/* Caso excepcional — sempre disponível, com destaque reduzido */}
      <Button type="button" variant="ghost" className="w-full rounded-xl text-sm text-muted-foreground hover:text-foreground" onClick={() => onAddFiador('')}>
        <Plus className="h-4 w-4 mr-1" /> Adicionar outro fiador
      </Button>
    </div>
  );
}