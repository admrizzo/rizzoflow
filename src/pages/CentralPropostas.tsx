import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  FileText, Search, ArrowLeft, AlertTriangle, Clock, Users,
  CheckCircle2, XCircle, Filter, BarChart3, Home, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PROPOSTAS_BOARD_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// Column colors for visual pipeline
const COLUMN_COLORS: Record<string, string> = {
  'Nova proposta': 'bg-blue-500',
  'Em preenchimento': 'bg-amber-500',
  'Aguardando documentos': 'bg-red-500',
  'Em análise': 'bg-violet-500',
  'Aguardando proprietário': 'bg-orange-500',
  'Aprovada': 'bg-green-500',
  'Reprovada': 'bg-red-700',
  'Convertida em contrato': 'bg-emerald-600',
};

function parseDescription(desc: string | null) {
  if (!desc) return {};
  const fields: Record<string, string> = {};
  desc.split('\n').forEach(line => {
    const match = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (match) fields[match[1].trim()] = match[2].trim();
  });
  return fields;
}

function extractScore(fields: Record<string, string>): string {
  return fields['Score'] || 'N/A';
}

function extractGarantia(fields: Record<string, string>): string {
  return fields['Garantia'] || 'N/A';
}

function extractValor(fields: Record<string, string>): string {
  return fields['Valor Aluguel'] || 'N/A';
}

function scoreBadgeColor(score: string): string {
  if (score.includes('Forte')) return 'bg-green-100 text-green-800 border-green-300';
  if (score.includes('Média')) return 'bg-amber-100 text-amber-800 border-amber-300';
  if (score.includes('Risco')) return 'bg-red-100 text-red-800 border-red-300';
  return 'bg-muted text-muted-foreground';
}

export default function CentralPropostas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGarantia, setFilterGarantia] = useState<string>('all');
  const [filterScore, setFilterScore] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Fetch columns
  const { data: columns = [] } = useQuery({
    queryKey: ['propostas-columns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', PROPOSTAS_BOARD_ID)
        .order('position');
      if (error) throw error;
      return data;
    },
  });

  // Fetch cards with profiles
  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['propostas-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*, column:columns(*)')
        .eq('board_id', PROPOSTAS_BOARD_ID)
        .eq('is_archived', false)
        .order('position');
      if (error) throw error;

      // Fetch creator profiles
      const userIds = [...new Set(data.map(c => c.created_by).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => { acc[p.user_id] = p; return acc; }, {} as Record<string, any>);
        }
      }

      return data.map(card => ({
        ...card,
        created_by_profile: card.created_by ? profilesMap[card.created_by] : null,
        parsed: parseDescription(card.description),
      }));
    },
  });

  // Fetch activity log for selected card
  const { data: activityLog = [] } = useQuery({
    queryKey: ['propostas-activity', selectedCardId],
    queryFn: async () => {
      if (!selectedCardId) return [];
      const { data, error } = await supabase
        .from('card_activity_log')
        .select('*, from_col:columns!card_activity_log_from_column_id_fkey(name), to_col:columns!card_activity_log_to_column_id_fkey(name)')
        .eq('card_id', selectedCardId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set(data.map(a => a.user_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
        if (profiles) profilesMap = profiles.reduce((acc, p) => { acc[p.user_id] = p; return acc; }, {} as Record<string, any>);
      }

      return data.map(a => ({
        ...a,
        user_profile: a.user_id ? profilesMap[a.user_id] : null,
      }));
    },
    enabled: !!selectedCardId,
  });

  // Filtered cards
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!card.title.toLowerCase().includes(q) && !(card.description || '').toLowerCase().includes(q)) return false;
      }
      if (filterStatus !== 'all') {
        const colName = (card.column as any)?.name;
        if (colName !== filterStatus) return false;
      }
      if (filterGarantia !== 'all') {
        if (extractGarantia(card.parsed) !== filterGarantia) return false;
      }
      if (filterScore !== 'all') {
        const score = extractScore(card.parsed);
        if (!score.includes(filterScore)) return false;
      }
      return true;
    });
  }, [cards, searchQuery, filterStatus, filterGarantia, filterScore]);

  // Stats
  const stats = useMemo(() => {
    const total = cards.length;
    const byCol = (name: string) => cards.filter(c => (c.column as any)?.name === name).length;
    return {
      total,
      em_analise: byCol('Em análise'),
      pendentes: byCol('Aguardando documentos') + byCol('Aguardando proprietário') + byCol('Em preenchimento'),
      aprovadas: byCol('Aprovada') + byCol('Convertida em contrato'),
      reprovadas: byCol('Reprovada'),
    };
  }, [cards]);

  // Alerts
  const alerts = useMemo(() => {
    const now = new Date();
    const result: { type: string; message: string; cardId: string }[] = [];
    cards.forEach(card => {
      const colName = (card.column as any)?.name;
      // Stalled > 3 days
      if (card.column_entered_at) {
        const entered = new Date(card.column_entered_at);
        const diffHours = (now.getTime() - entered.getTime()) / (1000 * 60 * 60);
        if (diffHours > 72 && !['Aprovada', 'Reprovada', 'Convertida em contrato'].includes(colName)) {
          result.push({ type: 'parada', message: `"${card.title}" está há ${Math.floor(diffHours / 24)} dias em "${colName}"`, cardId: card.id });
        }
      }
      // Docs pending
      if (colName === 'Aguardando documentos') {
        result.push({ type: 'documento', message: `"${card.title}" aguarda documentos`, cardId: card.id });
      }
      // Waiting for client/owner
      if (colName === 'Aguardando proprietário') {
        result.push({ type: 'resposta', message: `"${card.title}" aguarda resposta do proprietário`, cardId: card.id });
      }
    });
    return result;
  }, [cards]);

  const selectedCard = cards.find(c => c.id === selectedCardId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Central de Propostas</h1>
          </div>
          <Button onClick={() => navigate('/proposta-locacao')} className="bg-primary">
            + Nova Proposta
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-violet-600">{stats.em_analise}</p>
              <p className="text-sm text-muted-foreground">Em análise</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.pendentes}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.aprovadas}</p>
              <p className="text-sm text-muted-foreground">Aprovadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.reprovadas}</p>
              <p className="text-sm text-muted-foreground">Reprovadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" /> Alertas ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {alerts.slice(0, 5).map((alert, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-amber-900">{alert.message}</span>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedCardId(alert.cardId)}>
                    <Eye className="h-3 w-3 mr-1" /> Ver
                  </Button>
                </div>
              ))}
              {alerts.length > 5 && <p className="text-xs text-amber-700">e mais {alerts.length - 5} alertas...</p>}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar proposta..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {columns.map(col => (
                <SelectItem key={col.id} value={col.name}>{col.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterGarantia} onValueChange={setFilterGarantia}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Garantia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas garantias</SelectItem>
              <SelectItem value="Seguro Fiança">Seguro Fiança</SelectItem>
              <SelectItem value="Caução">Caução</SelectItem>
              <SelectItem value="Fiador">Fiador</SelectItem>
              <SelectItem value="Título de Capitalização">Título Cap.</SelectItem>
              <SelectItem value="Sem Garantia">Sem Garantia</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterScore} onValueChange={setFilterScore}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Score" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos scores</SelectItem>
              <SelectItem value="Forte">Forte</SelectItem>
              <SelectItem value="Média">Média</SelectItem>
              <SelectItem value="Risco">Risco</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Kanban Pipeline */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-4 min-w-max">
              {columns.map(col => {
                const colCards = filteredCards.filter(c => c.column_id === col.id);
                const colorClass = COLUMN_COLORS[col.name] || 'bg-muted';
                return (
                  <div key={col.id} className="w-[280px] flex-shrink-0">
                    <div className="mb-2 flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', colorClass)} />
                      <span className="text-sm font-semibold">{col.name}</span>
                      <Badge variant="secondary" className="text-xs">{colCards.length}</Badge>
                    </div>
                    <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-lg p-2">
                      {colCards.map(card => {
                        const score = extractScore(card.parsed);
                        const garantia = extractGarantia(card.parsed);
                        const valor = extractValor(card.parsed);
                        const corretor = card.created_by_profile?.full_name || 'N/A';
                        return (
                          <Card
                            key={card.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedCardId(card.id)}
                          >
                            <CardContent className="p-3 space-y-2">
                              <p className="font-medium text-sm truncate">{card.title}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Home className="h-3 w-3" />
                                <span>{card.robust_code || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{valor}</span>
                                <Badge variant="outline" className={cn('text-[10px] px-1.5', scoreBadgeColor(score))}>
                                  {score}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{garantia}</span>
                                <span className="truncate max-w-[80px]">{corretor}</span>
                              </div>
                              {/* Time in stage */}
                              {card.column_entered_at && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {(() => {
                                    const h = Math.floor((Date.now() - new Date(card.column_entered_at).getTime()) / 3600000);
                                    return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
                                  })()}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                      {colCards.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">Nenhuma proposta</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Card Detail Dialog */}
      <Dialog open={!!selectedCardId} onOpenChange={(open) => !open && setSelectedCardId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedCard && (() => {
            const f = selectedCard.parsed;
            const colName = (selectedCard.column as any)?.name || 'N/A';
            const colorClass = COLUMN_COLORS[colName] || 'bg-muted';
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {selectedCard.title}
                  </DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-2 mb-4">
                  <div className={cn('w-3 h-3 rounded-full', colorClass)} />
                  <Badge variant="outline">{colName}</Badge>
                  <Badge variant="outline" className={scoreBadgeColor(extractScore(f))}>
                    {extractScore(f)}
                  </Badge>
                </div>

                <Separator />

                {/* All parsed fields */}
                <div className="grid grid-cols-2 gap-3 py-4">
                  {Object.entries(f).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-xs font-medium text-muted-foreground">{key}</p>
                      <p className="text-sm">{val}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Corretor</p>
                    <p className="text-sm">{selectedCard.created_by_profile?.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Criado em</p>
                    <p className="text-sm">{new Date(selectedCard.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <Separator />

                {/* Activity History */}
                <div className="py-4">
                  <h3 className="text-sm font-semibold mb-3">Histórico de Ações</h3>
                  {activityLog.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {activityLog.map((log: any) => (
                        <div key={log.id} className="flex items-start gap-2 text-sm">
                          <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div>
                            <span className="font-medium">{log.user_profile?.full_name || 'Sistema'}</span>
                            {' moveu de '}
                            <span className="font-medium">{log.from_col?.name || '?'}</span>
                            {' para '}
                            <span className="font-medium">{log.to_col?.name || '?'}</span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}