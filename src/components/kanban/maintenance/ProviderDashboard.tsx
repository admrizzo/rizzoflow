import { useMemo, useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProviderRegistry } from '@/hooks/useProviderRegistry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Clock, DollarSign, Wrench, AlertTriangle, CheckCircle, Timer, TrendingUp, ChevronDown, ChevronUp, Download, Loader2, Filter, BarChart3, FileText, ExternalLink, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProviderReport } from '@/hooks/useMaintenanceProviders';
import html2canvas from 'html2canvas';

interface ProviderDashboardProps {
  boardId: string;
  onOpenCard?: (cardId: string) => void;
}

interface ProviderSummary {
  name: string;
  totalJobs: number;
  openJobs: number;
  completedJobs: number;
  paidJobs: number;
  pendingPayment: number;
  totalBudgetValue: number;
  totalPaymentValue: number;
  pendingPaymentValue: number;
  avgBudgetDays: number | null;
  avgExecutionDays: number | null;
  avgPaymentDays: number | null;
  reimbursementPending: number;
  slug: string | null;
  cards: {
    id: string;
    title: string;
    superlogica_id: string | null;
    address: string | null;
    budget_status: string;
    budget_value: number | null;
    payment_status: string;
    is_selected: boolean;
    service_completed_at: string | null;
    created_at: string;
  }[];
}

export function ProviderDashboard({ boardId, onOpenCard }: ProviderDashboardProps) {
  const { providers: registeredProviders } = useProviderRegistry();

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ['provider-dashboard', boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_providers')
        .select(`
          *,
          cards!inner(id, title, superlogica_id, address, board_id, is_archived)
        `)
        .eq('cards.board_id', boardId)
        .eq('cards.is_archived', false)
        .order('provider_name');

      if (error) throw error;
      return data as any[];
    },
  });

  const providers = useMemo(() => {
    const grouped: Record<string, ProviderSummary> = {};

    rawData.forEach((item: any) => {
      const name = item.provider_name;
      if (!grouped[name]) {
        grouped[name] = {
          name,
          totalJobs: 0,
          openJobs: 0,
          completedJobs: 0,
          paidJobs: 0,
          pendingPayment: 0,
          totalBudgetValue: 0,
          totalPaymentValue: 0,
          pendingPaymentValue: 0,
          avgBudgetDays: null,
          avgExecutionDays: null,
          avgPaymentDays: null,
          reimbursementPending: 0,
          slug: null,
          cards: [],
        };
      }

      const g = grouped[name];
      g.totalJobs++;

      if (item.is_selected) {
        if (item.payment_status === 'pago') {
          g.paidJobs++;
          g.totalPaymentValue += item.payment_value || item.budget_value || 0;
        } else if (item.service_completed_at) {
          g.completedJobs++;
          g.pendingPayment++;
          g.pendingPaymentValue += item.payment_value || item.budget_value || 0;
        } else {
          g.openJobs++;
        }
      } else {
        if (item.budget_status === 'enviado' || item.budget_status === 'pendente') {
          g.openJobs++;
        }
      }

      if (item.budget_value) {
        g.totalBudgetValue += item.budget_value;
      }

      if (item.reimbursement_status === 'pendente' || (item.payment_responsible === 'imobiliaria' && item.payment_status === 'pago' && !item.reimbursement_status)) {
        g.reimbursementPending++;
      }

      if (item.budget_sent_at && item.budget_received_at) {
        const days = (new Date(item.budget_received_at).getTime() - new Date(item.budget_sent_at).getTime()) / (1000 * 60 * 60 * 24);
        g.avgBudgetDays = g.avgBudgetDays ? (g.avgBudgetDays + days) / 2 : days;
      }

      if (item.is_selected && item.budget_received_at && item.service_completed_at) {
        const days = (new Date(item.service_completed_at).getTime() - new Date(item.budget_received_at).getTime()) / (1000 * 60 * 60 * 24);
        g.avgExecutionDays = g.avgExecutionDays ? (g.avgExecutionDays + days) / 2 : days;
      }

      if (item.service_completed_at && item.paid_at) {
        const days = (new Date(item.paid_at).getTime() - new Date(item.service_completed_at).getTime()) / (1000 * 60 * 60 * 24);
        g.avgPaymentDays = g.avgPaymentDays ? (g.avgPaymentDays + days) / 2 : days;
      }

      g.cards.push({
        id: item.cards.id,
        title: item.cards.title,
        superlogica_id: item.cards.superlogica_id,
        address: item.cards.address,
        budget_status: item.budget_status,
        budget_value: item.budget_value,
        payment_status: item.payment_status,
        is_selected: item.is_selected,
        service_completed_at: item.service_completed_at,
        created_at: item.created_at,
      });
    });

    // Add registered providers that have no active services & attach public_token
    registeredProviders.forEach(rp => {
      const nameKey = rp.name;
      if (!grouped[nameKey]) {
        grouped[nameKey] = {
          name: nameKey,
          totalJobs: 0,
          openJobs: 0,
          completedJobs: 0,
          paidJobs: 0,
          pendingPayment: 0,
          totalBudgetValue: 0,
          totalPaymentValue: 0,
          pendingPaymentValue: 0,
          avgBudgetDays: null,
          avgExecutionDays: null,
          avgPaymentDays: null,
          reimbursementPending: 0,
          slug: rp.slug || null,
          cards: [],
        };
      } else {
        grouped[nameKey].slug = rp.slug || null;
      }
    });

    // Sort: providers with open jobs first, then by name
    return Object.values(grouped).sort((a, b) => {
      if (b.openJobs !== a.openJobs) return b.openJobs - a.openJobs;
      if (b.totalJobs !== a.totalJobs) return b.totalJobs - a.totalJobs;
      return a.name.localeCompare(b.name);
    });
  }, [rawData, registeredProviders]);

  const totalOpen = providers.reduce((sum, p) => sum + p.openJobs, 0);
  const totalPendingPayment = providers.reduce((sum, p) => sum + p.pendingPayment, 0);
  const totalPendingPaymentValue = providers.reduce((sum, p) => sum + p.pendingPaymentValue, 0);
  const totalReimbursementPending = providers.reduce((sum, p) => sum + p.reimbursementPending, 0);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Painel dos Prestadores</h2>
        <Badge variant="secondary" className="text-xs">
          {providers.length} prestador{providers.length !== 1 ? 'es' : ''}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">Em Aberto</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">{totalOpen}</p>
            <p className="text-[10px] text-orange-600">demandas ativas</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Aguardando Pgto</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">{totalPendingPayment}</p>
            <p className="text-[10px] text-amber-600">serviços concluídos</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Valor Pendente</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {totalPendingPaymentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-[10px] text-blue-600">a pagar</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-700">Reembolso Pendente</span>
            </div>
            <p className="text-2xl font-bold text-red-900">{totalReimbursementPending}</p>
            <p className="text-[10px] text-red-600">sem definição</p>
          </CardContent>
        </Card>
      </div>

      {/* Provider List */}
      {providers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum prestador cadastrado.</p>
            <p className="text-xs mt-1">Cadastre prestadores na área de Administração.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <ProviderCard key={provider.name} provider={provider} onOpenCard={onOpenCard} />
          ))}
        </div>
      )}
    </div>
  );
}

const budgetStatusLabels: Record<string, string> = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  recebido: 'Recebido',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

const paymentStatusLabels: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
};

type StatusFilter = 'all' | 'pagamento_pendente' | 'pagamento_pago' | 'servico_pendente';

const statusFilterLabels: Record<StatusFilter, string> = {
  all: 'Todos',
  pagamento_pendente: 'Pagamento pendente',
  pagamento_pago: 'Pagamento recebido',
  servico_pendente: 'Serviço não finalizado',
};

function ProviderCard({ provider, onOpenCard }: { provider: ProviderSummary; onOpenCard?: (cardId: string) => void }) {
  const [showReport, setShowReport] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const total = provider.openJobs + provider.completedJobs + provider.paidJobs;
  const completionPct = total > 0 ? ((provider.completedJobs + provider.paidJobs) / total) * 100 : 0;

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (periodFilter) {
      case 'this_month':
        return { startDate: startOfMonth(now).toISOString(), endDate: endOfMonth(now).toISOString() };
      case 'last_month': {
        const last = subMonths(now, 1);
        return { startDate: startOfMonth(last).toISOString(), endDate: endOfMonth(last).toISOString() };
      }
      case 'last_3_months':
        return { startDate: subMonths(now, 3).toISOString(), endDate: now.toISOString() };
      case 'last_6_months':
        return { startDate: subMonths(now, 6).toISOString(), endDate: now.toISOString() };
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [periodFilter]);

  const { data: reportData = [], isLoading: reportLoading } = useProviderReport(
    showReport ? provider.name : undefined,
    startDate,
    endDate,
  );

  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return reportData;
    return reportData.filter((r: any) => {
      switch (statusFilter) {
        case 'pagamento_pendente':
          return r.is_selected && r.payment_status === 'pendente';
        case 'pagamento_pago':
          return r.payment_status === 'pago';
        case 'servico_pendente':
          return r.is_selected && !r.service_completed_at;
        default:
          return true;
      }
    });
  }, [reportData, statusFilter]);

  const reportSummary = useMemo(() => {
    const approved = reportData.filter((r: any) => r.is_selected);
    const paid = reportData.filter((r: any) => r.payment_status === 'pago');
    const pending = approved.filter((r: any) => r.payment_status === 'pendente');

    const totalApproved = approved.reduce((sum: number, r: any) => sum + (r.budget_value || 0), 0);
    const totalPaid = paid.reduce((sum: number, r: any) => sum + (r.payment_value || r.budget_value || 0), 0);
    const totalPending = pending.reduce((sum: number, r: any) => sum + (r.budget_value || 0), 0);

    const budgetTimes: number[] = [];
    reportData.forEach((r: any) => {
      if (r.budget_sent_at && r.budget_received_at) {
        const diff = (new Date(r.budget_received_at).getTime() - new Date(r.budget_sent_at).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) budgetTimes.push(diff);
      }
    });
    const execTimes: number[] = [];
    approved.forEach((r: any) => {
      const start = r.budget_received_at || r.budget_sent_at || r.created_at;
      if (start && r.service_completed_at) {
        const diff = (new Date(r.service_completed_at).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) execTimes.push(diff);
      }
    });
    const payTimes: number[] = [];
    paid.forEach((r: any) => {
      if (r.service_completed_at && r.paid_at) {
        const diff = (new Date(r.paid_at).getTime() - new Date(r.service_completed_at).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) payTimes.push(diff);
      }
    });

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return {
      totalServices: reportData.length,
      approvedServices: approved.length,
      totalApproved,
      totalPaid,
      totalPending,
      avgBudgetDays: avg(budgetTimes),
      avgExecDays: avg(execTimes),
      avgPayDays: avg(payTimes),
    };
  }, [reportData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), 'dd/MM/yy', { locale: ptBR });
  };

  const handleExport = useCallback(async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const clone = reportRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.zIndex = '-1';
      clone.style.width = '800px';
      clone.style.overflow = 'visible';
      clone.style.maxHeight = 'none';
      clone.style.height = 'auto';
      clone.style.padding = '24px';
      clone.style.backgroundColor = '#ffffff';
      clone.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      clone.querySelectorAll('*').forEach((el) => {
        (el as HTMLElement).style.overflow = 'visible';
        (el as HTMLElement).style.maxHeight = 'none';
      });
      document.body.appendChild(clone);
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(clone, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, width: 848, windowWidth: 848 });
      document.body.removeChild(clone);
      const link = document.createElement('a');
      link.download = `relatorio-${provider.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsExporting(false);
    }
  }, [provider.name]);

  return (
    <Card className={cn(
      "transition-all",
      provider.openJobs > 3 && "border-orange-300 shadow-orange-100",
      provider.pendingPayment > 0 && "border-amber-300"
    )}>
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <CardTitle className="text-sm font-semibold leading-tight">{provider.name}</CardTitle>
            {provider.slug && (
              <PortalLinkButton slug={provider.slug} providerName={provider.name} />
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {provider.openJobs > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-700 border-orange-200">
                {provider.openJobs} aberto{provider.openJobs !== 1 ? 's' : ''}
              </Badge>
            )}
            {provider.pendingPayment > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                {provider.pendingPayment} pgto
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {provider.totalJobs === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">Nenhum serviço ativo no momento.</p>
        ) : (
          <>
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{provider.openJobs} em andamento</span>
            <span>{provider.paidJobs} concluído{provider.paidJobs !== 1 ? 's' : ''}</span>
          </div>
          <Progress value={completionPct} className="h-1.5" />
        </div>

        {/* Quick metrics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-1">
              <Timer className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Orçamento</span>
            </div>
            <p className="text-xs font-semibold">
              {provider.avgBudgetDays !== null ? `${Math.round(provider.avgBudgetDays)}d` : '—'}
            </p>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-1">
              <Wrench className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Execução</span>
            </div>
            <p className="text-xs font-semibold">
              {provider.avgExecutionDays !== null ? `${Math.round(provider.avgExecutionDays)}d` : '—'}
            </p>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Pagamento</span>
            </div>
            <p className="text-xs font-semibold">
              {provider.avgPaymentDays !== null ? `${Math.round(provider.avgPaymentDays)}d` : '—'}
            </p>
          </div>
        </div>

        {/* Financial summary */}
        {(provider.totalBudgetValue > 0 || provider.pendingPaymentValue > 0) && (
          <>
            <Separator />
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Valor total orçado:</span>
              <span className="font-medium">
                {provider.totalBudgetValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            {provider.pendingPaymentValue > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-amber-600">Pendente de pagamento:</span>
                <span className="font-medium text-amber-700">
                  {provider.pendingPaymentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            )}
          </>
        )}

        {/* Active cards list */}
        {provider.cards.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Demandas ({provider.cards.length})
              </p>
              <ScrollArea className={cn(provider.cards.length > 3 && "h-[100px]")}>
                <div className="space-y-1">
                  {provider.cards.map((card, i) => (
                    <button
                      key={`${card.id}-${i}`}
                      className="w-full flex items-center gap-2 text-[11px] py-1 px-1 rounded hover:bg-muted/80 transition-colors text-left"
                      onClick={() => onOpenCard?.(card.id)}
                    >
                      {card.is_selected && card.service_completed_at ? (
                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                      ) : card.is_selected ? (
                        <Wrench className="h-3 w-3 text-blue-500 shrink-0" />
                      ) : (
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate text-muted-foreground">
                        {card.superlogica_id && <span className="font-mono text-[10px] mr-1">{card.superlogica_id}</span>}
                        {card.address || card.title}
                      </span>
                      {card.budget_value && (
                        <span className="shrink-0 text-[10px] font-medium ml-auto">
                          {card.budget_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
        </>
        )}

        {/* Report toggle */}
        <Separator />
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setShowReport(!showReport)}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Relatório Completo
          {showReport ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
        </Button>

        {/* Inline Report */}
        {showReport && (
          <div className="space-y-3 pt-1">
            {/* Filters */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1">Período</Label>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="h-7 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="this_month">Este mês</SelectItem>
                    <SelectItem value="last_month">Mês passado</SelectItem>
                    <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
                    <SelectItem value="last_6_months">Últimos 6 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                  <Filter className="h-2.5 w-2.5" /> Status
                </Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="h-7 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusFilterLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div ref={reportRef} className="space-y-3 bg-background">
              {/* Report header for export */}
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="text-xs font-bold">{provider.name}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {periodFilter === 'all' ? 'Todos os períodos' :
                     periodFilter === 'this_month' ? format(new Date(), 'MMMM yyyy', { locale: ptBR }) :
                     periodFilter === 'last_month' ? format(subMonths(new Date(), 1), 'MMMM yyyy', { locale: ptBR }) :
                     periodFilter === 'last_3_months' ? 'Últimos 3 meses' : 'Últimos 6 meses'}
                    {statusFilter !== 'all' && ` · ${statusFilterLabels[statusFilter]}`}
                  </p>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>

              {/* Summary metrics */}
              <div className="grid grid-cols-4 gap-1.5">
                <div className="border rounded p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Serviços</p>
                  <p className="text-sm font-bold">{reportSummary.totalServices}</p>
                </div>
                <div className="border rounded p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Aprovado</p>
                  <p className="text-[11px] font-bold text-blue-600">{formatCurrency(reportSummary.totalApproved)}</p>
                </div>
                <div className="border rounded p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Pago</p>
                  <p className="text-[11px] font-bold text-green-600">{formatCurrency(reportSummary.totalPaid)}</p>
                </div>
                <div className="border rounded p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">A Receber</p>
                  <p className="text-[11px] font-bold text-amber-600">{formatCurrency(reportSummary.totalPending)}</p>
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="border rounded p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Orçamento</p>
                  <p className="text-xs font-bold">{reportSummary.avgBudgetDays !== null ? `${reportSummary.avgBudgetDays.toFixed(1)}d` : '—'}</p>
                </div>
                <div className="border rounded p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Execução</p>
                  <p className="text-xs font-bold">{reportSummary.avgExecDays !== null ? `${reportSummary.avgExecDays.toFixed(1)}d` : '—'}</p>
                </div>
                <div className="border rounded p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Pagamento</p>
                  <p className="text-xs font-bold">{reportSummary.avgPayDays !== null ? `${reportSummary.avgPayDays.toFixed(1)}d` : '—'}</p>
                </div>
              </div>

              {/* History table */}
              <div className="border rounded overflow-hidden">
                <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30 border-b">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Histórico
                  </span>
                  <span className="text-[9px] text-muted-foreground">{filteredData.length} registro{filteredData.length !== 1 ? 's' : ''}</span>
                </div>

                {reportLoading ? (
                  <p className="text-xs text-muted-foreground p-4 text-center">Carregando...</p>
                ) : filteredData.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 text-center italic">Nenhum registro.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] px-2">Serviço</TableHead>
                          <TableHead className="text-[10px] px-2">Valor</TableHead>
                          <TableHead className="text-[10px] px-2">Orç.</TableHead>
                          <TableHead className="text-[10px] px-2">Pgto</TableHead>
                          <TableHead className="text-[10px] px-2">Conclusão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((row: any) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-[10px] px-2 py-1.5">
                              <p className="font-medium truncate max-w-[120px]">{row.cards?.title || '—'}</p>
                              {row.cards?.address && (
                                <p className="text-[9px] text-muted-foreground truncate max-w-[120px]">{row.cards.address}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-[10px] px-2 py-1.5 font-medium whitespace-nowrap">
                              {row.budget_value ? formatCurrency(row.budget_value) : '—'}
                            </TableCell>
                            <TableCell className="px-2 py-1.5">
                              <Badge variant="secondary" className={cn(
                                "text-[9px] px-1 py-0",
                                row.budget_status === 'aprovado' && 'bg-green-100 text-green-700',
                                (row.budget_status === 'enviado' || row.budget_status === 'pendente') && 'bg-amber-100 text-amber-700',
                              )}>
                                {budgetStatusLabels[row.budget_status] || row.budget_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-2 py-1.5">
                              <Badge variant="secondary" className={cn(
                                "text-[9px] px-1 py-0",
                                row.payment_status === 'pago' && 'bg-green-100 text-green-700',
                                row.payment_status === 'pendente' && row.is_selected && 'bg-amber-100 text-amber-700',
                              )}>
                                {paymentStatusLabels[row.payment_status] || row.payment_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[10px] px-2 py-1.5 whitespace-nowrap">
                              {row.service_completed_at ? (
                                <span className="text-green-700">{formatDate(row.service_completed_at)}</span>
                              ) : row.is_selected ? (
                                <span className="text-amber-600 italic">Pendente</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>

            {/* Export */}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-[11px] gap-1.5"
              onClick={handleExport}
              disabled={isExporting || filteredData.length === 0}
            >
              {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              {isExporting ? 'Gerando...' : 'Exportar PNG'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PortalLinkButton({ slug, providerName }: { slug: string; providerName: string }) {
  const { toast } = useToast();
  const portalUrl = `${window.location.origin}/prestador/${slug}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(portalUrl);
    toast({ title: 'Link copiado!', description: `Portal de ${providerName}` });
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(portalUrl, '_blank');
  };

  return (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleCopy} title="Copiar link do portal">
        <Copy className="h-3 w-3 text-muted-foreground" />
      </Button>
      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleOpen} title="Abrir portal do prestador">
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  );
}
