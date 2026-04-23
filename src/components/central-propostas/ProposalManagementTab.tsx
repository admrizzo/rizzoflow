import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, ExternalLink, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  nao_acessado: { label: 'Não acessado', color: 'bg-muted text-muted-foreground' },
  em_preenchimento: { label: 'Em preenchimento', color: 'bg-amber-100 text-amber-800' },
  enviada: { label: 'Enviada', color: 'bg-green-100 text-green-800' },
};

interface Props {
  allLinks: any[];
}

export function ProposalManagementTab({ allLinks }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = allLinks.filter((l: any) => {
    const matchSearch =
      !search ||
      String(l.codigo_robust).includes(search) ||
      (l.property_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.broker_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, imóvel ou corretor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="nao_acessado">Não acessado</SelectItem>
            <SelectItem value="em_preenchimento">Em preenchimento</SelectItem>
            <SelectItem value="enviada">Enviada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Corretor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma proposta encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.slice(0, 50).map((link: any) => {
                    const statusInfo = STATUS_LABELS[link.status] || STATUS_LABELS.nao_acessado;
                    const linkUrl = `${window.location.origin}/proposta/${link.codigo_robust}`;
                    return (
                      <TableRow key={link.id}>
                        <TableCell className="font-mono text-sm">{link.codigo_robust}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{link.property_name || '—'}</TableCell>
                        <TableCell>{link.broker_name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', statusInfo.color)}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(link.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {timeSince(link.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                navigator.clipboard.writeText(linkUrl);
                                toast.success('Link copiado!');
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(linkUrl, '_blank')}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-right">
        Mostrando {Math.min(filtered.length, 50)} de {filtered.length} propostas
      </p>
    </div>
  );
}