import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText, ArrowLeft, Home, Clock, Copy, Settings2,
  TrendingUp, Users, BarChart3, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProposalCmsPanel } from '@/components/proposal-cms/ProposalCmsPanel';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  nao_acessado: { label: 'Não acessado', color: 'bg-muted text-muted-foreground' },
  em_preenchimento: { label: 'Em preenchimento', color: 'bg-amber-100 text-amber-800' },
  enviada: { label: 'Enviada', color: 'bg-green-100 text-green-800' },
};

function formatCurrency(v: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CentralPropostas() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const canEditPage = isAdmin || user?.email === 'adm@rizzoimobiliaria.com';
  const [cmsOpen, setCmsOpen] = useState(false);

  const { data: allLinks = [] } = useQuery({
    queryKey: ['proposal-links-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_links')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: canEditPage,
  });

  // Analytics
  const stats = useMemo(() => {
    const total = allLinks.length;
    const naoAcessado = allLinks.filter((l: any) => l.status === 'nao_acessado').length;
    const emPreenchimento = allLinks.filter((l: any) => l.status === 'em_preenchimento').length;
    const enviadas = allLinks.filter((l: any) => l.status === 'enviada').length;
    const taxaConversao = total > 0 ? ((enviadas / total) * 100).toFixed(1) : '0';

    // Volume por corretor
    const porCorretor: Record<string, { total: number; enviadas: number }> = {};
    allLinks.forEach((l: any) => {
      const nome = l.broker_name || 'Sem corretor';
      if (!porCorretor[nome]) porCorretor[nome] = { total: 0, enviadas: 0 };
      porCorretor[nome].total++;
      if (l.status === 'enviada') porCorretor[nome].enviadas++;
    });

    const corretores = Object.entries(porCorretor)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.total - a.total);

    // Gargalos
    const taxaAbandono = total > 0 ? ((naoAcessado / total) * 100).toFixed(1) : '0';

    return { total, naoAcessado, emPreenchimento, enviadas, taxaConversao, corretores, taxaAbandono };
  }, [allLinks]);

  // Block non-admin users (after all hooks)
  if (!authLoading && !canEditPage) {
    return <Navigate to="/dashboard" replace />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {canEditPage && (
        <div className="fixed right-4 top-4 z-50 md:right-6 md:top-5">
          <Button
            size="lg"
            onClick={() => setCmsOpen(true)}
            className="h-11 border border-border px-4 shadow-lg"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Editar Página
          </Button>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-card px-6 py-4 pr-40 md:pr-56">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Central de Propostas</h1>
              <p className="text-xs text-muted-foreground">Painel administrativo — visão gerencial</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total geradas</p>
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
              <p className="text-xs text-muted-foreground">Taxa de conversão</p>
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
              <div className="border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{stats.naoAcessado}</p>
                <p className="text-xs text-muted-foreground">Propostas não acessadas</p>
                <p className="text-xs text-destructive mt-1">{stats.taxaAbandono}% de abandono</p>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.emPreenchimento}</p>
                <p className="text-xs text-muted-foreground">Paradas em preenchimento</p>
              </div>
              <div className="border rounded-lg p-4 text-center">
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

        {/* Histórico recente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Últimas Propostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allLinks.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhuma proposta gerada ainda.</p>
                <p className="text-xs text-muted-foreground">As propostas são geradas pelo corretor dentro do fluxo de Locação.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allLinks.slice(0, 30).map((link: any) => {
                  const statusInfo = STATUS_LABELS[link.status] || STATUS_LABELS.nao_acessado;
                  const linkUrl = `${window.location.origin}/proposta/${link.codigo_robust}`;
                  return (
                    <div key={link.id} className="flex items-center gap-3 border rounded-lg px-4 py-3 hover:bg-muted/30 transition-colors">
                      <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          Cód. {link.codigo_robust} — {link.property_name || 'Imóvel'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {link.broker_name} · {new Date(link.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('text-xs', statusInfo.color)}>
                        {statusInfo.label}
                      </Badge>
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
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CMS Panel */}
      <ProposalCmsPanel open={cmsOpen} onOpenChange={setCmsOpen} />
    </div>
  );
}