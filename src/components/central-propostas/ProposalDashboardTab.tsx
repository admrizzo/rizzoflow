import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText, Clock, TrendingUp, BarChart3, AlertTriangle,
  Users, Eye, ChevronRight
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  allLinks: any[];
}

type Period = 'today' | '7days' | '30days' | 'all';

export function ProposalDashboardTab({ allLinks }: Props) {
  const [period, setPeriod] = useState<Period>('all');

  const filteredLinks = useMemo(() => {
    if (period === 'all') return allLinks;
    const now = new Date();
    const cutoff = new Date();
    if (period === 'today') cutoff.setHours(0, 0, 0, 0);
    else if (period === '7days') cutoff.setDate(now.getDate() - 7);
    else if (period === '30days') cutoff.setDate(now.getDate() - 30);
    return allLinks.filter((l: any) => new Date(l.created_at) >= cutoff);
  }, [allLinks, period]);

  const stats = useMemo(() => {
    const total = filteredLinks.length;
    const naoAcessado = filteredLinks.filter((l: any) => l.status === 'nao_acessado').length;
    const emPreenchimento = filteredLinks.filter((l: any) => l.status === 'em_preenchimento').length;
    const enviadas = filteredLinks.filter((l: any) => l.status === 'enviada').length;
    const taxaConversao = total > 0 ? ((enviadas / total) * 100).toFixed(1) : '0';
    const taxaAbandono = total > 0 ? ((naoAcessado / total) * 100).toFixed(1) : '0';

    // Tempo médio até envio (para enviadas que foram acessadas)
    const enviadasComAcesso = filteredLinks.filter(
      (l: any) => l.status === 'enviada' && l.accessed_at
    );
    let tempoMedioEnvio = 0;
    if (enviadasComAcesso.length > 0) {
      const totalHoras = enviadasComAcesso.reduce((acc: number, l: any) => {
        const acesso = new Date(l.accessed_at).getTime();
        const criacao = new Date(l.created_at).getTime();
        return acc + (acesso - criacao) / (1000 * 60 * 60);
      }, 0);
      tempoMedioEnvio = Math.round(totalHoras / enviadasComAcesso.length);
    }

    // Por corretor
    const porCorretor: Record<string, { total: number; enviadas: number }> = {};
    filteredLinks.forEach((l: any) => {
      const nome = l.broker_name || 'Sem corretor';
      if (!porCorretor[nome]) porCorretor[nome] = { total: 0, enviadas: 0 };
      porCorretor[nome].total++;
      if (l.status === 'enviada') porCorretor[nome].enviadas++;
    });
    const corretores = Object.entries(porCorretor)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.total - a.total);

    return {
      total, naoAcessado, emPreenchimento, enviadas,
      taxaConversao, taxaAbandono, tempoMedioEnvio, corretores,
    };
  }, [filteredLinks]);

  const periodLabel: Record<Period, string> = {
    today: 'Hoje',
    '7days': 'Últimos 7 dias',
    '30days': 'Último mês',
    all: 'Todo o período',
  };

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Gestão à Vista</h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7days">Últimos 7 dias</SelectItem>
            <SelectItem value="30days">Último mês</SelectItem>
            <SelectItem value="all">Todo o período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total geradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Eye className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold text-muted-foreground">{stats.naoAcessado}</p>
            <p className="text-xs text-muted-foreground">Não acessadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold text-amber-600">{stats.emPreenchimento}</p>
            <p className="text-xs text-muted-foreground">Em preenchimento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{stats.enviadas}</p>
            <p className="text-xs text-muted-foreground">Enviadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <BarChart3 className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-primary">{stats.taxaConversao}%</p>
            <p className="text-xs text-muted-foreground">Conversão</p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">Taxa de Abandono</p>
            <p className="text-3xl font-bold text-destructive">{stats.taxaAbandono}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">Tempo Médio até Acesso</p>
            <p className="text-3xl font-bold">{stats.tempoMedioEnvio}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">Período</p>
            <p className="text-lg font-semibold text-primary">{periodLabel[period]}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gargalos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Gargalos do Processo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 text-center hover:bg-muted/30 cursor-pointer transition-colors">
              <p className="text-2xl font-bold text-muted-foreground">{stats.naoAcessado}</p>
              <p className="text-xs text-muted-foreground">Propostas não acessadas</p>
              <p className="text-xs text-destructive mt-1">{stats.taxaAbandono}% de abandono</p>
            </div>
            <div className="border rounded-lg p-4 text-center hover:bg-muted/30 cursor-pointer transition-colors">
              <p className="text-2xl font-bold text-amber-600">{stats.emPreenchimento}</p>
              <p className="text-xs text-muted-foreground">Paradas em preenchimento</p>
            </div>
            <div className="border rounded-lg p-4 text-center hover:bg-muted/30 cursor-pointer transition-colors">
              <p className="text-2xl font-bold text-green-600">{stats.enviadas}</p>
              <p className="text-xs text-muted-foreground">Converteram em proposta</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volume por corretor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Volume por Corretor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.corretores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado disponível.</p>
          ) : (
            <div className="space-y-3">
              {stats.corretores.slice(0, 10).map(c => (
                <div key={c.nome} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{c.total} geradas</span>
                      <span className="text-green-600">{c.enviadas} enviadas</span>
                      <span>{c.total > 0 ? ((c.enviadas / c.total) * 100).toFixed(0) : 0}% conversão</span>
                    </div>
                  </div>
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${stats.total > 0 ? (c.total / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}