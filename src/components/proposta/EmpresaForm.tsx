import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Building, DollarSign, MapPin } from 'lucide-react';
import type { EmpresaData } from '@/pages/PropostaLocacao';
import { REGIME_TRIBUTARIO_OPTIONS } from '@/pages/PropostaLocacao';
import { AddressFields } from '@/components/proposta/AddressFields';

interface EmpresaFormProps {
  data: EmpresaData;
  onChange: (data: EmpresaData) => void;
}

export function EmpresaForm({ data, onChange }: EmpresaFormProps) {
  const set = (key: keyof EmpresaData, val: string) => onChange({ ...data, [key]: val });

  return (
    <div className="space-y-6">
      {/* Banner PJ */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center shrink-0">
          <Building className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="font-bold text-foreground text-sm">Você está preenchendo uma proposta como Pessoa Jurídica</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Os dados desta etapa são exclusivos da empresa. Os representantes legais e sócios serão cadastrados na próxima etapa.
          </p>
        </div>
      </div>

      {/* Identificação da empresa */}
      <div className="bg-white rounded-2xl border p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
            <Building className="h-5 w-5 text-accent" />
          </div>
          <h3 className="font-bold text-foreground text-lg">Identificação da Empresa</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-sm font-medium">Razão Social <span className="text-red-500">*</span></Label>
              <Input value={data.razao_social} onChange={e => set('razao_social', e.target.value)} placeholder="Nome registrado da empresa" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm font-medium">Nome Fantasia</Label>
              <Input value={data.nome_fantasia} onChange={e => set('nome_fantasia', e.target.value)} placeholder="Nome comercial" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm font-medium">CNPJ <span className="text-red-500">*</span></Label>
              <Input value={data.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm font-medium">Data de abertura</Label>
              <Input type="date" value={data.data_abertura} onChange={e => set('data_abertura', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm font-medium">Ramo de atividade <span className="text-red-500">*</span></Label>
              <Input value={data.ramo_atividade} onChange={e => set('ramo_atividade', e.target.value)} placeholder="Ex: Comércio, Tecnologia, Serviços" className="mt-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Telefone <span className="text-red-500">*</span></Label>
              <Input value={data.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 0000-0000" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm font-medium">E-mail corporativo <span className="text-red-500">*</span></Label>
              <Input type="email" value={data.email} onChange={e => set('email', e.target.value)} placeholder="contato@empresa.com" className="mt-1.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Endereço da empresa */}
      <div className="bg-white rounded-2xl border p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
            <MapPin className="h-5 w-5 text-accent" />
          </div>
          <h3 className="font-bold text-foreground text-lg">Endereço da Empresa</h3>
        </div>

        <div className="space-y-4">
          <AddressFields
            value={{
              cep: data.cep,
              logradouro: data.logradouro,
              numero: data.numero,
              complemento: data.complemento,
              bairro: data.bairro,
              cidade: data.cidade,
              uf: data.uf,
            }}
            onChange={(patch) => onChange({ ...data, ...patch })}
          />
        </div>
      </div>

      {/* Capacidade financeira */}
      <div className="bg-white rounded-2xl border p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
            <DollarSign className="h-5 w-5 text-accent" />
          </div>
          <h3 className="font-bold text-foreground text-lg">Capacidade Financeira</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Faturamento médio mensal <span className="text-red-500">*</span></Label>
            <CurrencyInput
              value={data.faturamento_mensal}
              onValueChange={v => set('faturamento_mensal', v)}
              placeholder="0,00"
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1.5">Faturamento médio considerando os últimos 12 meses.</p>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Regime tributário <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REGIME_TRIBUTARIO_OPTIONS.map(r => (
                <button key={r} type="button"
                  onClick={() => set('regime_tributario', r)}
                  className={cn(
                    'p-3 rounded-xl border text-sm font-medium text-center transition-all',
                    data.regime_tributario === r
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-border hover:border-muted-foreground/40'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Tempo de atividade da empresa</Label>
            <Input value={data.tempo_atividade} onChange={e => set('tempo_atividade', e.target.value)} placeholder="Ex: 5 anos, 18 meses" className="mt-1.5" />
          </div>
        </div>
      </div>
    </div>
  );
}