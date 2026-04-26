import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyQueue, type QueueItem } from '@/hooks/useMyQueue';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardDetailDialog } from '@/components/kanban/CardDetailDialog';
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

  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [openCardBoardId, setOpenCardBoardId] = useState<string | null>(null);

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
                      setOpenCardBoardId(it.board_id);
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
                          setOpenCardBoardId(it.board_id);
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

      {openCardId && openCardBoardId && (
        <CardDetailDialog
          cardId={openCardId}
          boardId={openCardBoardId}
          open={!!openCardId}
          onOpenChange={(open) => {
            if (!open) {
              setOpenCardId(null);
              setOpenCardBoardId(null);
            }
          }}
        />
      )}
    </div>
  );
}
