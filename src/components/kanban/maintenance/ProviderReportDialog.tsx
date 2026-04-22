import { useState, useMemo, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, Search, FileText, Loader2, Filter } from 'lucide-react';
import { useProviderReport, useProviderNames } from '@/hooks/useMaintenanceProviders';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';

const paymentStatusLabels: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
};

const budgetStatusLabels: Record<string, string> = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  recebido: 'Recebido',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

type StatusFilter = 'all' | 'pagamento_pendente' | 'pagamento_pago' | 'servico_pendente';

const statusFilterLabels: Record<StatusFilter, string> = {
  all: 'Todos',
  pagamento_pendente: 'Pagamento pendente',
  pagamento_pago: 'Pagamento recebido',
  servico_pendente: 'Serviço não finalizado',
};

const getCardCode = (row: any): string => {
  const num = row.cards?.card_number;
  const sup = row.cards?.superlogica_id;
  if (sup) return sup;
  if (num) return String(num);
  return '';
};

interface ProviderReportDialogProps {
  trigger?: React.ReactNode;
}

export function ProviderReportDialog({ trigger }: ProviderReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [textSearch, setTextSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: providerNames = [] } = useProviderNames();

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

  const { data: reportData = [], isLoading } = useProviderReport(
    selectedProvider || undefined,
    startDate,
    endDate,
  );

  // Apply status + text filters
  const filteredData = useMemo(() => {
    let data = reportData;
    
    // Status filter
    if (statusFilter !== 'all') {
      data = data.filter((r: any) => {
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
    }

    // Text search (by code, title, address)
    if (textSearch.trim()) {
      const search = textSearch.toLowerCase();
      data = data.filter((r: any) => {
        const code = getCardCode(r).toLowerCase();
        const title = (r.cards?.title || '').toLowerCase();
        const address = (r.cards?.address || '').toLowerCase();
        return code.includes(search) || title.includes(search) || address.includes(search);
      });
    }

    return data;
  }, [reportData, statusFilter, textSearch]);

  const filteredNames = useMemo(() => {
    if (!searchInput.trim()) return providerNames;
    return providerNames.filter(name =>
      name.toLowerCase().includes(searchInput.toLowerCase())
    );
  }, [providerNames, searchInput]);

  const summary = useMemo(() => {
    const approved = reportData.filter((r: any) => r.is_selected);
    const paid = reportData.filter((r: any) => r.payment_status === 'pago');
    const pending = approved.filter((r: any) => r.payment_status === 'pendente');

    const totalApproved = approved.reduce((sum: number, r: any) => sum + (r.budget_value || 0), 0);
    const totalPaid = paid.reduce((sum: number, r: any) => sum + (r.payment_value || r.budget_value || 0), 0);
    const totalPending = pending.reduce((sum: number, r: any) => sum + (r.budget_value || 0), 0);

    // Avg days: budget_sent → budget_received
    const budgetTimes: number[] = [];
    reportData.forEach((r: any) => {
      if (r.budget_sent_at && r.budget_received_at) {
        const diff = (new Date(r.budget_received_at).getTime() - new Date(r.budget_sent_at).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) budgetTimes.push(diff);
      }
    });

    // Avg days: budget_received → service_completed
    const execTimes: number[] = [];
    approved.forEach((r: any) => {
      const start = r.budget_received_at || r.budget_sent_at || r.created_at;
      if (start && r.service_completed_at) {
        const diff = (new Date(r.service_completed_at).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) execTimes.push(diff);
      }
    });

    // Avg days: service_completed → paid
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), 'dd/MM/yy', { locale: ptBR });
  };

  const handleSelectProvider = (name: string) => {
    setSelectedProvider(name);
    setSearchInput(name);
    setShowDropdown(false);
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
      clone.style.margin = '0 auto';
      clone.style.overflow = 'visible';
      clone.style.maxHeight = 'none';
      clone.style.height = 'auto';
      clone.style.padding = '32px';
      clone.style.backgroundColor = '#ffffff';
      clone.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      clone.style.boxSizing = 'border-box';

      // Remove any overflow/height constraints from all children
      const allChildren = clone.querySelectorAll('*');
      allChildren.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.overflow = 'visible';
        htmlEl.style.maxHeight = 'none';
      });

      document.body.appendChild(clone);

      // Wait a tick for layout
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: 848,
        windowWidth: 848,
        scrollY: 0,
        scrollX: 0,
      });

      document.body.removeChild(clone);

      const link = document.createElement('a');
      link.download = `relatorio-${selectedProvider.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsExporting(false);
    }
  }, [selectedProvider]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            Relatório de Prestadores
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório de Prestadores
          </DialogTitle>
        </DialogHeader>

        {/* Search & Filters */}
        <div className="grid grid-cols-3 gap-3">
          {/* Provider search */}
          <div className="relative">
            <Label className="text-xs text-muted-foreground mb-1">Prestador</Label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                className="pl-8 text-sm"
                placeholder="Buscar prestador..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowDropdown(true);
                  if (!e.target.value.trim()) setSelectedProvider('');
                }}
                onFocus={() => setShowDropdown(true)}
              />
            </div>
            {showDropdown && !selectedProvider && filteredNames.length > 0 && (
              <div className="absolute z-50 w-full border rounded-md mt-1 max-h-40 overflow-y-auto bg-background shadow-lg">
                {filteredNames.map(name => (
                  <button
                    key={name}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                    onClick={() => handleSelectProvider(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {selectedProvider && (
              <Button variant="ghost" size="sm" className="h-6 text-xs mt-1 text-muted-foreground" onClick={() => { setSelectedProvider(''); setSearchInput(''); }}>
                Limpar seleção
              </Button>
            )}
          </div>

          {/* Period filter */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1">Período</Label>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="text-sm">
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

          {/* Status filter */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Filtrar por status
            </Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="text-sm">
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

        {/* Text search for code/title */}
        {selectedProvider && (
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              className="pl-8 text-sm"
              placeholder="Buscar por código, título ou endereço..."
              value={textSearch}
              onChange={(e) => setTextSearch(e.target.value)}
            />
          </div>
        )}

        {/* Report content */}
        {selectedProvider && (
          <>
            <div ref={reportRef} className="space-y-3 bg-background p-1">
              {/* Report header (visible in export) */}
              <div className="flex items-center justify-between border-b pb-3 mb-1">
                <div>
                  <h2 className="text-base font-bold">Relatório — {selectedProvider}</h2>
                  <p className="text-xs text-muted-foreground">
                    {periodFilter === 'all' ? 'Todos os períodos' :
                     periodFilter === 'this_month' ? `Este mês (${format(new Date(), 'MMMM yyyy', { locale: ptBR })})` :
                     periodFilter === 'last_month' ? `Mês passado (${format(subMonths(new Date(), 1), 'MMMM yyyy', { locale: ptBR })})` :
                     periodFilter === 'last_3_months' ? 'Últimos 3 meses' :
                     'Últimos 6 meses'}
                    {statusFilter !== 'all' && ` · ${statusFilterLabels[statusFilter]}`}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-2">
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Serviços</p>
                  <p className="text-lg font-bold">{summary.totalServices}</p>
                  <p className="text-[10px] text-muted-foreground">{summary.approvedServices} aprovados</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Aprovado</p>
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(summary.totalApproved)}</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Pago</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">A Receber</p>
                  <p className="text-sm font-bold text-amber-600">{formatCurrency(summary.totalPending)}</p>
                </div>
              </div>

              {/* Timing Metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tempo Médio Orçamento</p>
                  <p className="text-sm font-bold">{summary.avgBudgetDays !== null ? `${summary.avgBudgetDays.toFixed(1)} dias` : '—'}</p>
                  <p className="text-[10px] text-muted-foreground">envio → recebimento</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tempo Médio Execução</p>
                  <p className="text-sm font-bold">{summary.avgExecDays !== null ? `${summary.avgExecDays.toFixed(1)} dias` : '—'}</p>
                  <p className="text-[10px] text-muted-foreground">aprovação → conclusão</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tempo Médio Pagamento</p>
                  <p className="text-sm font-bold">{summary.avgPayDays !== null ? `${summary.avgPayDays.toFixed(1)} dias` : '—'}</p>
                  <p className="text-[10px] text-muted-foreground">conclusão → pagamento</p>
                </div>
              </div>

              {/* Services History Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Histórico de Serviços
                    {statusFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {statusFilterLabels[statusFilter]}
                      </Badge>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{filteredData.length} registro{filteredData.length !== 1 ? 's' : ''}</span>
                </div>

                {isLoading ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">Carregando...</p>
                ) : filteredData.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center italic">Nenhum registro encontrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Cód.</TableHead>
                        <TableHead className="text-xs">Serviço</TableHead>
                        <TableHead className="text-xs">Valor</TableHead>
                        <TableHead className="text-xs">Orçamento</TableHead>
                        <TableHead className="text-xs">Pagamento</TableHead>
                        <TableHead className="text-xs">Dt. Orçamento</TableHead>
                        <TableHead className="text-xs">Dt. Conclusão</TableHead>
                        <TableHead className="text-xs">Dt. Pagamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs font-mono font-medium text-muted-foreground whitespace-nowrap">
                            {getCardCode(row) || '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>
                              <p className="font-medium truncate max-w-[160px]">{row.cards?.title || '—'}</p>
                              {row.cards?.address && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{row.cards.address}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium whitespace-nowrap">
                            {row.budget_value ? formatCurrency(row.budget_value) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn(
                              "text-[10px]",
                              row.budget_status === 'aprovado' && 'bg-green-100 text-green-700',
                              row.budget_status === 'recusado' && 'bg-red-100 text-red-700',
                              (row.budget_status === 'enviado' || row.budget_status === 'pendente') && 'bg-amber-100 text-amber-700',
                            )}>
                              {budgetStatusLabels[row.budget_status] || row.budget_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn(
                              "text-[10px]",
                              row.payment_status === 'pago' && 'bg-green-100 text-green-700',
                              row.payment_status === 'pendente' && row.is_selected && 'bg-amber-100 text-amber-700',
                            )}>
                              {paymentStatusLabels[row.payment_status] || row.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(row.budget_sent_at || row.created_at)}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {row.service_completed_at ? (
                              <span className="text-green-700">{formatDate(row.service_completed_at)}</span>
                            ) : row.is_selected ? (
                              <span className="text-amber-600 italic">Pendente</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {row.paid_at ? (
                              <span className="text-green-700">{formatDate(row.paid_at)}</span>
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
                )}
              </div>
            </div>

            {/* Export button */}
            <Button onClick={handleExport} disabled={isExporting || filteredData.length === 0} className="w-full gap-2">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isExporting ? 'Gerando...' : 'Exportar Relatório'}
            </Button>
          </>
        )}

        {!selectedProvider && (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Selecione um prestador para ver o relatório</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
