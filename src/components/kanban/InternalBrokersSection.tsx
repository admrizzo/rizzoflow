import { useMemo } from 'react';
import { UserCheck, Handshake } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useBrokers } from '@/hooks/useBrokers';
import { useProfiles } from '@/hooks/useProfiles';

interface Props {
  capturingBrokerId: string | null;
  serviceBrokerId: string | null;
  canEdit: boolean;
  onChange: (
    field: 'capturing_broker_id' | 'service_broker_id',
    value: string | null,
  ) => void;
}

const NONE = '__none__';

export function InternalBrokersSection({
  capturingBrokerId,
  serviceBrokerId,
  canEdit,
  onChange,
}: Props) {
  const { brokers } = useBrokers();
  const { profiles } = useProfiles();

  // Lista de candidatos: corretores + qualquer usuário interno (admin, gestor,
  // administrativo). Preferimos brokers, mas permitimos pessoas internas
  // assumirem o papel quando não houver corretor.
  const options = useMemo(() => {
    const map = new Map<string, { user_id: string; full_name: string }>();
    brokers.forEach((b) => {
      map.set(b.user_id, { user_id: b.user_id, full_name: b.full_name });
    });
    profiles.forEach((p) => {
      if (!map.has(p.user_id)) {
        map.set(p.user_id, { user_id: p.user_id, full_name: p.full_name });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.full_name.localeCompare(b.full_name, 'pt-BR'),
    );
  }, [brokers, profiles]);

  const renderField = (
    field: 'capturing_broker_id' | 'service_broker_id',
    label: string,
    value: string | null,
    Icon: typeof UserCheck,
  ) => {
    if (!canEdit) {
      const name =
        options.find((o) => o.user_id === value)?.full_name ?? '— não definido —';
      return (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </Label>
          </div>
          <p className="text-sm text-foreground">{name}</p>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </Label>
        </div>
        <Select
          value={value ?? NONE}
          onValueChange={(v) => onChange(field, v === NONE ? null : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— não definido —</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.user_id} value={o.user_id}>
                {o.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <div className="bg-muted/30 p-4 rounded-lg border border-muted space-y-3">
      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Responsáveis internos
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {renderField(
          'capturing_broker_id',
          'Corretor Captador',
          capturingBrokerId,
          Handshake,
        )}
        {renderField(
          'service_broker_id',
          'Corretor de Atendimento',
          serviceBrokerId,
          UserCheck,
        )}
      </div>
    </div>
  );
}
