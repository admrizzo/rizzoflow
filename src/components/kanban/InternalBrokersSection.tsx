import { useMemo, useState } from 'react';
import { UserCheck, Handshake, Plus, X, User } from 'lucide-react';
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Select,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
const initials = (name?: string | null) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

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

  const renderBrokerChip = (
    field: 'capturing_broker_id' | 'service_broker_id',
    label: string,
    value: string | null,
  ) => {
    const profile = value ? options.find(o => o.user_id === value) : null;
    
    const trigger = (
      <button 
        type="button"
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg border transition-all duration-200 w-full text-left",
          profile 
            ? "bg-white border-slate-200 shadow-sm" 
            : "bg-muted/30 border-dashed border-slate-300 hover:bg-muted/50 cursor-pointer",
          canEdit && profile && "hover:border-slate-300 hover:shadow-md cursor-pointer",
          !canEdit && !profile && "opacity-50 cursor-default focus:outline-none"
        )}
      >
        <div className="flex-shrink-0">
          {profile ? (
            <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-9 w-9 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50/50">
              <Plus className="h-4 w-4" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-semibold truncate",
            profile ? "text-slate-900" : "text-muted-foreground"
          )}>
            {profile ? profile.full_name : `Definir ${label.toLowerCase()}`}
          </p>
          <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-tight">
            {label}
          </p>
        </div>
        
        {canEdit && profile && (
          <div 
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onChange(field, null);
            }}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </button>
    );

    if (!canEdit) return trigger;

    return (
      <Select
        value={value ?? NONE}
        onValueChange={(v) => onChange(field, v === NONE ? null : v)}
      >
        <SelectPrimitive.Trigger asChild>
          {trigger}
        </SelectPrimitive.Trigger>
        <SelectContent className="max-h-60">
          <SelectItem value={NONE} className="text-muted-foreground italic">
            <div className="flex items-center gap-2">
              <X className="h-3 w-3" />
              <span>Remover responsável</span>
            </div>
          </SelectItem>
          {options.map((o) => (
            <SelectItem key={o.user_id} value={o.user_id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {initials(o.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span>{o.full_name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <UserCheck className="h-3.5 w-3.5 text-muted-foreground/70" />
          <h3 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
            Responsáveis internos
          </h3>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {renderBrokerChip('capturing_broker_id', 'Captador', capturingBrokerId)}
        {renderBrokerChip('service_broker_id', 'Responsável pela proposta', serviceBrokerId)}
      </div>
    </div>
  );
}
