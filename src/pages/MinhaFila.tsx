import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyQueue, type QueueItem } from '@/hooks/useMyQueue';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardDetailDialog } from '@/components/kanban/CardDetailDialog';
import type { CardWithRelations } from '@/types/database';
import { perfMark, perfMeasure } from '@/lib/perfMark';
import {
  ArrowLeft,
  Inbox,
  Search,
  AlertTriangle,
  CalendarClock,
  CalendarOff,
  UserX,
  ListChecks,
  Hourglass,
  Loader2,
  ChevronRight,
  FileWarning,
  UserCheck,
  CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNowStrict, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FilterKey =
  | 'all'
  | 'overdue'
  | 'today'
  | 'no_due_date'
  | 'no_responsible'
  | 'mine'
  | 'waiting_client'
  | 'pending_docs';

interface FilterDef {
  key: FilterKey;
  label: string;
  icon: typeof Inbox;
}

const FILTERS: FilterDef[] = [
  { key: 'all', label: 'Todos', icon: Inbox },
  { key: 'overdue', label: 'Atrasados', icon: AlertTriangle },
  { key: 'today', label: 'Hoje', icon: CalendarClock },
  { key: 'no_due_date', label: 'Sem prazo', icon: CalendarOff },
  { key: 'no_responsible', label: 'Sem responsável', icon: UserX },
  { key: 'mine', label: 'Atribuídos a mim', icon: UserCheck },
  { key: 'waiting_client', label: 'Aguardando cliente', icon: Hourglass },
  { key: 'pending_docs', label: 'Documentos pendentes', icon: FileWarning },
];

function StatusPill({ item }: { item: QueueItem }) {
  if (item.is_overdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-semibold px-2 py-0.5">
        <AlertTriangle className="h-3 w-3" />
        Atrasado
      </span>
    );
  }
  if (item.is_due_today) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.5">
        <CalendarClock className="h-3 w-3" />
        Hoje
      </span>
    );
  }
  if (item.has_no_due_date) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground text-[11px] font-medium px-2 py-0.5">
        <CalendarOff className="h-3 w-3" />
        Sem prazo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2 py-0.5">
      <CircleDot className="h-3 w-3" />
      Em dia
    </span>
  );
}

function StuckTime({ enteredAt }: { enteredAt: string | null }) {
  if (!enteredAt) return <span className="text-muted-foreground/70">sem data da etapa</span>;
  const date = new Date(enteredAt);
  const hours = differenceInHours(new Date(), date);
  const days = differenceInDays(new Date(), date);
  if (hours < 24) return <span>há {hours <= 0 ? '1' : hours}h</span>;
  return <span>há {days} {days === 1 ? 'dia' : 'dias'}</span>;
}

function ChecklistProgress({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  const complete = done === total;
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <ListChecks className={cn('h-3.5 w-3.5', complete ? 'text-emerald-600' : 'text-muted-foreground')} />
      <span className={cn(complete && 'text-emerald-700 font-semibold')}>
        {done}/{total}
      </span>
      <div className="h-1 w-12 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full', complete ? 'bg-emerald-500' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MinhaFila() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isGestor, isCorretor, isAdministrativo } = usePermissions();
  const { data: items = [], isLoading } = useMyQueue();

  // Medição em dev: mount -> primeira lista pronta.
  useEffect(() => {
    perfMark('minha-fila:mount');
  }, []);
  useEffect(() => {
    if (!isLoading) perfMeasure('minha-fila:ready', 'minha-fila:mount');
  }, [isLoading]);

  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  // Persistimos o card aberto na URL (?card=ID) para que:
  // - trocar de aba/janela e voltar não feche o modal,
  // - recarregar a página mantenha o card aberto,
  // - links possam ser compartilhados apontando direto para o card.
  const [searchParams, setSearchParams] = useSearchParams();
  const openCardId = searchParams.get('card');

  const setOpenCardId = (id: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set('card', id);
        else next.delete('card');
        return next;
      },
      { replace: true },
    );
  };

  // Card "leve" feito a partir do item da fila — usado para abrir o modal IMEDIATAMENTE,
  // sem esperar a query pesada de relações. Cobre os campos básicos exibidos no header
  // do CardDetailDialog (título, número, board_id, column_id, responsável, prazo).
  const queueItemForOpen = useMemo<QueueItem | undefined>(
    () => items.find((it) => it.id === openCardId),
    [items, openCardId],
  );

  // Carrega o card completo (com relações) em paralelo. Quando chega, substitui o "leve".
  const { data: openCardFull } = useQuery({
    queryKey: ['card-detail-from-queue', openCardId],
    enabled: !!openCardId,
    queryFn: async (): Promise<CardWithRelations | null> => {
      perfMark('card-open:fetch:start');
      const { data, error } = await supabase
        .from('cards')
        .select(`
          *,
          column:columns(*),
          card_labels(label:labels(*)),
          card_members(user_id, assigned_at),
          checklists(*, items:checklist_items(*))
        `)
        .eq('id', openCardId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const labels = (data.card_labels ?? []).map((cl: any) => cl.label).filter(Boolean);
      perfMeasure('card-open:fetch', 'card-open:fetch:start');
      return { ...(data as any), labels } as CardWithRelations;
    },
  });

  // Card mínimo "otimista" — abre o modal na hora.
  const openCardOptimistic = useMemo<CardWithRelations | null>(() => {
    if (!openCardId) return null;
    if (openCardFull) return openCardFull;
    if (!queueItemForOpen) return null;
    // Construímos um CardWithRelations com os campos essenciais. Os demais entram como
    // null/[] e serão preenchidos quando `openCardFull` chegar (≈300-500ms).
    return {
      id: queueItemForOpen.id,
      card_number: queueItemForOpen.card_number,
      title: queueItemForOpen.title,
      board_id: queueItemForOpen.board_id,
      column_id: queueItemForOpen.column_id,
      next_action: queueItemForOpen.next_action,
      next_action_due_date: queueItemForOpen.next_action_due_date,
      responsible_user_id: queueItemForOpen.responsible_user_id,
      created_by: queueItemForOpen.created_by,
      column_entered_at: queueItemForOpen.column_entered_at,
      // Defaults seguros para um CardWithRelations mínimo
      robust_code: null,
      building_name: null,
      superlogica_id: null,
      address: null,
      description: null,
      proposal_responsible: null,
      negotiation_details: null,
      guarantee_type: null,
      contract_type: null,
      position: 0,
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_archived: false,
      archived_at: null,
      archived_by: null,
      archive_reason: null,
      document_deadline: null,
      deadline_met: false,
      deadline_met_at: null,
      deadline_met_by: null,
      deadline_dispensed: false,
      deadline_dispensed_at: null,
      deadline_dispensed_by: null,
      deadline_edited_at: null,
      deadline_edited_by: null,
      vacancy_deadline_met: false,
      vacancy_deadline_met_at: null,
      vacancy_deadline_met_by: null,
      last_reviewed_at: null,
      last_reviewed_by: null,
      card_type: null,
      last_moved_by: null,
      last_moved_at: null,
      labels: [],
      checklists: [],
    } as CardWithRelations;
  }, [openCardId, queueItemForOpen, openCardFull]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: items.length,
      overdue: 0,
      today: 0,
      no_due_date: 0,
      no_responsible: 0,
      mine: 0,
      waiting_client: 0,
      pending_docs: 0,
    };
    items.forEach((it) => {
      if (it.is_overdue) c.overdue++;
      if (it.is_due_today) c.today++;
      if (it.has_no_due_date) c.no_due_date++;
      if (it.has_no_responsible) c.no_responsible++;
      if (user?.id && it.responsible_user_id === user.id) c.mine++;
      if (it.is_waiting_client) c.waiting_client++;
      if (it.checklist_open_doc_items > 0) c.pending_docs++;
    });
    return c;
  }, [items, user?.id]);

  const filteredItems = useMemo(() => {
    let list = items;
    switch (activeFilter) {
      case 'overdue': list = list.filter((it) => it.is_overdue); break;
      case 'today': list = list.filter((it) => it.is_due_today); break;
      case 'no_due_date': list = list.filter((it) => it.has_no_due_date); break;
      case 'no_responsible': list = list.filter((it) => it.has_no_responsible); break;
      case 'mine': list = list.filter((it) => user?.id && it.responsible_user_id === user.id); break;
      case 'waiting_client': list = list.filter((it) => it.is_waiting_client); break;
      case 'pending_docs': list = list.filter((it) => it.checklist_open_doc_items > 0); break;
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((it) =>
        [it.title, it.next_action, it.board_name, it.column_name, it.responsible_name, String(it.card_number)]
          .filter(Boolean)
          .some((field) => (field as string).toLowerCase().includes(q)),
      );
    }
    return list;
  }, [items, activeFilter, search, user?.id]);

  const scopeLabel = isAdmin
    ? 'Todos os processos'
    : isGestor || isAdministrativo
      ? 'Processos dos seus fluxos'
      : isCorretor
        ? 'Seus processos'
        : 'Processos acessíveis';

  return (
    <div className="min-h-screen bg-background">
      {/* Header da página */}
      <header className="sticky top-0 z-20 bg-card border-b">
        <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2 min-w-0">
            <Inbox className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold truncate">Minha Fila</h1>
            <Badge variant="secondary" className="text-[10px] hidden md:inline-flex">
              {scopeLabel}
            </Badge>
          </div>
          <div className="ml-auto relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, ação, fluxo…"
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-5">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const count = counts[f.key];
            const active = activeFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-foreground hover:bg-muted border-border',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] font-semibold',
                    active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lista */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {filteredItems.length} {filteredItems.length === 1 ? 'processo' : 'processos'}
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Ordenado por urgência
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Carregando fila…
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">Nada por aqui</p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeFilter === 'all'
                  ? 'Você não tem processos visíveis no seu escopo.'
                  : 'Nenhum processo corresponde a este filtro.'}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[calc(100vh-240px)]">
              <ul className="divide-y">
                {filteredItems.map((it) => (
                  <li
                    key={it.id}
                    className="px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer group"
                    onClick={() => {
                      setOpenCardId(it.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Núcleo da linha */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono text-muted-foreground">#{it.card_number}</span>
                          <h3 className="text-sm font-semibold text-foreground truncate">{it.title}</h3>
                          <StatusPill item={it} />
                          {it.is_waiting_client && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-medium px-2 py-0.5">
                              <Hourglass className="h-3 w-3" />
                              Aguardando cliente
                            </span>
                          )}
                          {it.checklist_open_doc_items > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 text-[11px] font-medium px-2 py-0.5">
                              <FileWarning className="h-3 w-3" />
                              Doc. pendente
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {it.board_name && (
                            <span className="font-medium text-foreground/70">{it.board_name}</span>
                          )}
                          {it.column_name && (
                            <>
                              <ChevronRight className="h-3 w-3" />
                              <span>{it.column_name}</span>
                            </>
                          )}
                          <span className="text-muted-foreground/50">•</span>
                          <Hourglass className="h-3 w-3" />
                          <StuckTime enteredAt={it.column_entered_at} />
                        </div>

                        <div className="mt-1.5 text-sm text-foreground/90">
                          <span className="text-muted-foreground text-xs mr-1">Próxima ação:</span>
                          {it.next_action || <span className="italic text-muted-foreground">não definida</span>}
                        </div>

                        <div className="mt-1.5 flex items-center gap-3 text-xs flex-wrap">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <UserCheck className="h-3.5 w-3.5" />
                            {it.responsible_name || (
                              <span className="italic text-muted-foreground/80">sem responsável</span>
                            )}
                          </span>
                          {it.next_action_due_date && (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1',
                                it.is_overdue && 'text-rose-700 font-semibold',
                                it.is_due_today && !it.is_overdue && 'text-amber-700 font-semibold',
                                !it.is_overdue && !it.is_due_today && 'text-muted-foreground',
                              )}
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                              {format(new Date(it.next_action_due_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                              {(it.is_overdue || it.is_due_today) && (
                                <span className="text-[10px] uppercase tracking-wide">
                                  {it.is_overdue
                                    ? `(${formatDistanceToNowStrict(new Date(it.next_action_due_date + 'T00:00:00'), { locale: ptBR })} atrás)`
                                    : '(hoje)'}
                                </span>
                              )}
                            </span>
                          )}
                          <ChecklistProgress done={it.checklist_done} total={it.checklist_total} />
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenCardId(it.id);
                        }}
                      >
                        Abrir
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </main>

      {openCardId && (
        <CardDetailDialog
          card={openCardOptimistic}
          open={!!openCardId && !!openCardOptimistic}
          onOpenChange={(open) => {
            if (!open) {
              setOpenCardId(null);
            }
          }}
        />
      )}
    </div>
  );
}
