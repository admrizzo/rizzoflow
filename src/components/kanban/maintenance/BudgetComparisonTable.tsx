import { MaintenanceProvider } from '@/hooks/useMaintenanceProviders';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Phone, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const budgetStatusLabels: Record<string, string> = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  recebido: 'Recebido',
  aprovado: 'Aprovado',
};

const budgetStatusColors: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  recebido: 'bg-yellow-100 text-yellow-700',
  aprovado: 'bg-green-100 text-green-700',
};

interface BudgetComparisonTableProps {
  providers: MaintenanceProvider[];
  cheapestBudget: number | null;
  onSelect: (provider: MaintenanceProvider) => void;
  onExpandProvider: (id: string) => void;
  canEdit: boolean;
  formatCurrency: (value: number | null) => string;
}

export function BudgetComparisonTable({ providers, cheapestBudget, onSelect, onExpandProvider, canEdit, formatCurrency }: BudgetComparisonTableProps) {
  if (providers.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Comparativo de Orçamentos</span>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] h-8 py-1">Prestador</TableHead>
              <TableHead className="text-[11px] h-8 py-1 text-right">Valor</TableHead>
              <TableHead className="text-[11px] h-8 py-1">Status</TableHead>
              {canEdit && <TableHead className="text-[11px] h-8 py-1 w-20"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((p) => {
              const isCheapest = p.budget_value !== null && p.budget_value === cheapestBudget && providers.filter(x => x.budget_value === cheapestBudget).length === 1;
              return (
                <TableRow
                  key={p.id}
                  className={cn("cursor-pointer hover:bg-muted/50", p.is_selected && "bg-green-50/50")}
                  onClick={() => onExpandProvider(p.id)}
                >
                  <TableCell className="text-xs py-1.5">
                    <div className="flex items-center gap-1.5">
                      {p.is_selected && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />}
                      <span className="truncate">{p.provider_name}</span>
                      {p.provider_phone && (
                        <a
                          href={`https://wa.me/55${p.provider_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-green-600"
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs py-1.5 text-right font-medium">
                    <div className="flex items-center justify-end gap-1">
                      {isCheapest && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                      <span className={cn(isCheapest && "text-amber-600 font-semibold")}>
                        {formatCurrency(p.budget_value)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", budgetStatusColors[p.budget_status])}>
                      {budgetStatusLabels[p.budget_status] || p.budget_status}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="py-1.5">
                      {!p.is_selected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(p);
                          }}
                        >
                          Aprovar
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
