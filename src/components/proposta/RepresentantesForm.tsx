import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Users, Plus, Trash2, UserCheck } from 'lucide-react';
import type { RepresentanteLegal } from '@/pages/PropostaLocacao';
import { emptyRepresentante } from '@/pages/PropostaLocacao';
import { ProfessionInput } from '@/components/proposta/ProfessionInput';
import { MaskedInput } from '@/components/proposta/MaskedInput';

interface RepresentantesFormProps {
  representantes: RepresentanteLegal[];
  onChange: (next: RepresentanteLegal[]) => void;
}

export function RepresentantesForm({ representantes, onChange }: RepresentantesFormProps) {
  const update = (i: number, patch: Partial<RepresentanteLegal>) => {
    const copy = [...representantes];
    copy[i] = { ...copy[i], ...patch };
    onChange(copy);
  };
  const add = () => onChange([...representantes, { ...emptyRepresentante }]);
  const remove = (i: number) => onChange(representantes.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6">
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center shrink-0">
          <UserCheck className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="font-bold text-foreground text-sm">Representantes legais e sócios</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Cadastre os representantes e sócios da empresa. É obrigatório indicar pelo menos um signatário do contrato.
          </p>
        </div>
      </div>

      {representantes.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">Nenhum representante cadastrado ainda.</p>
          <Button type="button" onClick={add} className="rounded-xl">
            <Plus className="h-4 w-4 mr-1.5" /> Adicionar representante
          </Button>
        </div>
      )}

      {representantes.map((r, i) => (
        <div key={i} className="bg-white rounded-2xl border p-6 sm:p-8 relative">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Representante {i + 1}</h3>
                <p className="text-xs text-muted-foreground">Dados pessoais do sócio/representante</p>
              </div>
            </div>
            {representantes.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium">Nome completo <span className="text-red-500">*</span></Label>
                <Input value={r.nome} onChange={e => update(i, { nome: e.target.value })} placeholder="Nome do representante" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm font-medium">CPF <span className="text-red-500">*</span></Label>
                <MaskedInput
                  kind="cpf"
                  value={r.cpf}
                  onValueChange={v => update(i, { cpf: v })}
                  placeholder="000.000.000-00"
                  className="mt-1.5"
                />
              </div>
              <ProfessionInput
                value={r.profissao}
                onChange={v => update(i, { profissao: v })}
              />
              <div>
                <Label className="text-sm font-medium">WhatsApp <span className="text-red-500">*</span></Label>
                <MaskedInput
                  kind="phone"
                  value={r.whatsapp}
                  onValueChange={v => update(i, { whatsapp: v })}
                  placeholder="(00) 00000-0000"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">E-mail <span className="text-red-500">*</span></Label>
                <Input type="email" value={r.email} onChange={e => update(i, { email: e.target.value })} placeholder="email@exemplo.com" className="mt-1.5" />
              </div>
            </div>

            {/* Endereço */}
            <div className="pt-4 border-t">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Endereço</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">CEP</Label>
                  <Input value={r.cep} onChange={e => update(i, { cep: e.target.value })} placeholder="00000-000" className="mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium">Logradouro</Label>
                  <Input value={r.logradouro} onChange={e => update(i, { logradouro: e.target.value })} placeholder="Rua, Avenida..." className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Número</Label>
                  <Input value={r.numero} onChange={e => update(i, { numero: e.target.value })} placeholder="Nº" className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Bairro</Label>
                  <Input value={r.bairro} onChange={e => update(i, { bairro: e.target.value })} placeholder="Bairro" className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Cidade / UF</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input value={r.cidade} onChange={e => update(i, { cidade: e.target.value })} placeholder="Cidade" className="flex-1" />
                    <Input value={r.uf} onChange={e => update(i, { uf: e.target.value.toUpperCase().slice(0, 2) })} placeholder="UF" className="w-16" maxLength={2} />
                  </div>
                </div>
              </div>
            </div>

            {/* Papéis */}
            <div className="pt-4 border-t">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Papel na empresa</p>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer hover:bg-muted/30 transition-colors">
                  <Checkbox checked={r.is_socio} onCheckedChange={v => update(i, { is_socio: v === true })} />
                  <span className="text-sm text-foreground">É sócio da empresa</span>
                </label>
                <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer hover:bg-muted/30 transition-colors">
                  <Checkbox checked={r.is_administrador} onCheckedChange={v => update(i, { is_administrador: v === true })} />
                  <span className="text-sm text-foreground">É administrador</span>
                </label>
                <label className={cn(
                  'flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors',
                  r.is_signatario ? 'border-accent bg-accent/5' : 'hover:bg-muted/30'
                )}>
                  <Checkbox checked={r.is_signatario} onCheckedChange={v => update(i, { is_signatario: v === true })} />
                  <span className="text-sm text-foreground">
                    Representante legal da empresa <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      ))}

      {representantes.length > 0 && (
        <Button type="button" variant="outline" onClick={add} className="w-full rounded-xl h-12">
          <Plus className="h-4 w-4 mr-1.5" /> Adicionar outro representante
        </Button>
      )}
    </div>
  );
}