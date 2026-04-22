import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Wrench, MapPin, DollarSign, Clock, CheckCircle, AlertTriangle, Loader2, FileText, Search, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoImg from '@/assets/logo-ia-naimobiliaria.png';

interface ProviderService {
  id: string;
  service_category: string | null;
  budget_status: string;
  budget_value: number | null;
  agreed_value: number | null;
  is_selected: boolean;
  payment_status: string;
  payment_value: number | null;
  paid_at: string | null;
  service_completed_at: string | null;
  budget_sent_at: string | null;
  budget_received_at: string | null;
  completion_deadline: string | null;
  budget_deadline: string | null;
  notes: string | null;
  created_at: string;
  card_id: string;
  card_title: string;
  card_address: string;
  card_description: string;
  card_code: string;
  column_id: string | null;
}

interface ColumnInfo {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface PortalData {
  provider: { name: string; specialty: string | null };
  columns: ColumnInfo[];
  services: ProviderService[];
}

const budgetStatusLabels: Record<string, string> = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  recebido: 'Recebido',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

const budgetStatusColors: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  recebido: 'bg-indigo-100 text-indigo-700',
  aprovado: 'bg-green-100 text-green-700',
  recusado: 'bg-red-100 text-red-700',
};

const paymentStatusLabels: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
};

export default function ProviderPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const lastUpdated = useRef<Date | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!token) return;
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/provider-portal?slug=${token}`
      );
      const json = await res.json();
      if (!res.ok) {
        if (!isRefresh) setError(json.error || 'Erro ao carregar dados');
      } else {
        setData(json);
        lastUpdated.current = new Date();
      }
    } catch {
      if (!isRefresh) setError('Erro de conexão. Tente novamente.');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!token || error) return;
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [token, error, fetchData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const summary = useMemo(() => {
    if (!data) return null;
    const services = data.services;
    const active = services.filter(s => s.is_selected);
    const completed = active.filter(s => s.service_completed_at);
    const paid = services.filter(s => s.payment_status === 'pago');
    const pendingPayment = active.filter(s => s.service_completed_at && s.payment_status === 'pendente');
    const totalPending = pendingPayment.reduce((sum, s) => sum + (s.agreed_value || s.budget_value || 0), 0);
    const totalPaid = paid.reduce((sum, s) => sum + (s.payment_value || s.agreed_value || s.budget_value || 0), 0);
    return { total: services.length, active: active.length, completed: completed.length, paid: paid.length, pendingPayment: pendingPayment.length, totalPending, totalPaid };
  }, [data]);

  // Group services by card, then by column, applying search filter
  const columnGroups = useMemo(() => {
    if (!data) return [];
    const { columns, services } = data;

    // Filter by search text
    let filtered = searchText.trim()
      ? services.filter(s => {
          const q = searchText.toLowerCase();
          return (
            s.card_code?.toLowerCase().includes(q) ||
            s.card_title?.toLowerCase().includes(q) ||
            s.card_address?.toLowerCase().includes(q)
          );
        })
      : services;

    // Filter by selected column
    if (selectedColumnId) {
      filtered = filtered.filter(s => s.column_id === selectedColumnId);
    }

    const cardMap: Record<string, { card_title: string; card_address: string; card_description: string; card_code: string; column_id: string | null; services: ProviderService[] }> = {};
    filtered.forEach(s => {
      if (!cardMap[s.card_id]) {
        cardMap[s.card_id] = { card_title: s.card_title, card_address: s.card_address, card_description: s.card_description, card_code: s.card_code, column_id: s.column_id, services: [] };
      }
      cardMap[s.card_id].services.push(s);
    });

    const colMap: Record<string, { column: ColumnInfo; cards: (typeof cardMap)[string][] }> = {};
    columns.forEach(col => { colMap[col.id] = { column: col, cards: [] }; });
    Object.values(cardMap).forEach(card => {
      if (card.column_id && colMap[card.column_id]) colMap[card.column_id].cards.push(card);
    });

    return Object.values(colMap).filter(g => g.cards.length > 0).sort((a, b) => a.column.position - b.column.position);
  }, [data, searchText, selectedColumnId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Acesso Indisponível</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const totalFiltered = columnGroups.reduce((sum, g) => sum + g.cards.length, 0);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header - compact for mobile */}
      <header className="bg-background border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoImg} alt="ia.naimobiliária" className="h-7 shrink-0" />
            <Separator orientation="vertical" className="h-5" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">{data.provider.name}</h1>
              {data.provider.specialty && (
                <p className="text-[10px] text-muted-foreground truncate">{data.provider.specialty}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            Portal
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 py-4 space-y-4">
        {/* Summary - 2x2 grid on mobile */}
        {summary && (
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <CardContent className="p-2.5 text-center">
                <Wrench className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
                <p className="text-xl font-bold">{summary.active}</p>
                <p className="text-[10px] text-muted-foreground">Ativos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2.5 text-center">
                <CheckCircle className="h-3.5 w-3.5 text-green-600 mx-auto mb-0.5" />
                <p className="text-xl font-bold">{summary.completed}</p>
                <p className="text-[10px] text-muted-foreground">Concluídos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2.5 text-center">
                <Clock className="h-3.5 w-3.5 text-amber-600 mx-auto mb-0.5" />
                <p className="text-base font-bold text-amber-700">{formatCurrency(summary.totalPending)}</p>
                <p className="text-[10px] text-muted-foreground">A Receber</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2.5 text-center">
                <DollarSign className="h-3.5 w-3.5 text-green-600 mx-auto mb-0.5" />
                <p className="text-base font-bold text-green-700">{formatCurrency(summary.totalPaid)}</p>
                <p className="text-[10px] text-muted-foreground">Recebido</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 text-sm h-9"
              placeholder="Buscar por código, endereço ou título..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          {/* Column filter chips */}
          {data.columns.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedColumnId(null)}
                className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  !selectedColumnId
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                }`}
              >
                Todos
              </button>
              {data.columns
                .sort((a, b) => a.position - b.position)
                .map(col => {
                  const count = data.services.filter(s => s.column_id === col.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={col.id}
                      onClick={() => setSelectedColumnId(selectedColumnId === col.id ? null : col.id)}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        selectedColumnId === col.id
                          ? 'text-white border-transparent'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                      }`}
                      style={selectedColumnId === col.id ? { backgroundColor: col.color || '#6b7280' } : undefined}
                    >
                      {col.name} ({count})
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Services - stacked columns for mobile */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Serviços {searchText.trim() ? `(${totalFiltered} encontrados)` : `(${data.services.length})`}
          </h2>

          {columnGroups.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{searchText.trim() ? 'Nenhum resultado encontrado.' : 'Nenhum serviço ativo no momento.'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {columnGroups.map(({ column, cards }) => (
                <div key={column.id}>
                  {/* Column header */}
                  <div
                    className="rounded-t-lg px-3 py-1.5 flex items-center justify-between"
                    style={{ backgroundColor: column.color || '#6b7280' }}
                  >
                    <span className="text-xs font-semibold text-white drop-shadow-sm truncate">
                      {column.name}
                    </span>
                    <Badge className="bg-white/20 text-white text-[10px] border-0">
                      {cards.length}
                    </Badge>
                  </div>

                  {/* Cards stacked vertically */}
                  <div className="bg-muted/40 rounded-b-lg p-2 space-y-2">
                    {cards.map((card, idx) => (
                      <PortalCard key={idx} card={card} formatCurrency={formatCurrency} formatDate={formatDate} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t bg-background mt-6">
        <div className="max-w-3xl mx-auto px-3 py-3 text-center">
          <p className="text-[10px] text-muted-foreground">
            Portal de acompanhamento — ia.naimobiliária
          </p>
        </div>
      </footer>
    </div>
  );
}

function PortalCard({ card, formatCurrency, formatDate }: {
  card: { card_title: string; card_address: string; card_description: string; card_code: string; services: ProviderService[] };
  formatCurrency: (v: number) => string;
  formatDate: (d: string | null) => string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-3 space-y-2">
        {/* Code badge + title */}
        <div className="flex items-start gap-2">
          {card.card_code && (
            <Badge variant="secondary" className="shrink-0 text-xs font-bold px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20">
              <Hash className="h-3 w-3 mr-0.5" />
              {card.card_code}
            </Badge>
          )}
          <h3 className="text-xs font-semibold text-foreground leading-tight break-words">{card.card_title}</h3>
        </div>

        {card.card_address && (
          <div className="flex items-start gap-1 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="break-words">{card.card_address}</span>
          </div>
        )}

        {card.card_description && (
          <p className="text-[10px] text-muted-foreground bg-muted/50 rounded p-1.5 leading-relaxed break-words">
            {card.card_description}
          </p>
        )}

        {card.services.map(service => (
          <ServiceLine key={service.id} service={service} formatCurrency={formatCurrency} formatDate={formatDate} />
        ))}
      </CardContent>
    </Card>
  );
}

function ServiceLine({ service, formatCurrency, formatDate }: {
  service: ProviderService;
  formatCurrency: (v: number) => string;
  formatDate: (d: string | null) => string;
}) {
  const value = service.agreed_value || service.budget_value;
  const isPaid = service.payment_status === 'pago';

  return (
    <div className={`rounded border p-2 space-y-1.5 ${isPaid ? 'border-green-200 bg-green-50/50' : 'border-border'}`}>
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {service.service_category && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0">{service.service_category}</Badge>
          )}
          <Badge className={`text-[9px] px-1 py-0 ${budgetStatusColors[service.budget_status] || 'bg-gray-100 text-gray-700'}`}>
            {budgetStatusLabels[service.budget_status] || service.budget_status}
          </Badge>
          {service.is_selected && (
            <Badge className="text-[9px] px-1 py-0 bg-green-100 text-green-700">Aprovado</Badge>
          )}
        </div>
        {value ? (
          <span className="text-[11px] font-bold shrink-0">{formatCurrency(value)}</span>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-[9px] text-muted-foreground flex-wrap gap-1">
        <div className="flex gap-2 flex-wrap">
          {service.completion_deadline && <span>Prazo: {formatDate(service.completion_deadline)}</span>}
          {service.service_completed_at && <span>Concluído: {formatDate(service.service_completed_at)}</span>}
        </div>
        <Badge
          variant="outline"
          className={`text-[9px] px-1 py-0 ${isPaid ? 'bg-green-100 text-green-700 border-green-300' : ''}`}
        >
          {paymentStatusLabels[service.payment_status] || service.payment_status}
        </Badge>
      </div>

      {service.notes && (
        <p className="text-[9px] text-muted-foreground italic border-l-2 border-primary/30 pl-1.5 break-words">
          {service.notes}
        </p>
      )}
    </div>
  );
}
