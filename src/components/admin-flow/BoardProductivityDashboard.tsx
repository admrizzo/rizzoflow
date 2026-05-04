import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useBoardProductivityReport } from '@/hooks/useBoardProductivityReport';
import { useInteractionRanking } from '@/hooks/useInteractionRanking';
import { useBoards } from '@/hooks/useBoards';
import { InteractionRankingCard } from './InteractionRankingCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Users, FileText, CheckCircle, Clock, TrendingUp, MessageSquare, ArrowLeftRight, Trophy, CheckSquare, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const ITEMS_PER_PAGE = 10;

type RankingSortField = 'total_interactions' | 'checklist_completions' | 'comments_count' | 'card_moves';

export function BoardProductivityDashboard() {
  const [selectedBoardId, setSelectedBoardId] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('3');
  const [comparePeriod, setComparePeriod] = useState<string>('3');
  const [compareUser1, setCompareUser1] = useState<string>('');
  const [compareUser2, setCompareUser2] = useState<string>('');
  const [rankingSortField, setRankingSortField] = useState<RankingSortField>('total_interactions');
  const [rankingSearchTerm, setRankingSearchTerm] = useState<string>('');
  const [rankingPage, setRankingPage] = useState<number>(1);
  const [chartShowAll, setChartShowAll] = useState<boolean>(false);
  
  const { boards } = useBoards();
  
  const startDate = useMemo(() => {
    const months = parseInt(selectedPeriod);
    return startOfMonth(subMonths(new Date(), months - 1));
  }, [selectedPeriod]);

  const endDate = useMemo(() => endOfMonth(new Date()), []);

  const { data: reportData = [], isLoading } = useBoardProductivityReport({
    boardId: selectedBoardId === 'all' ? undefined : selectedBoardId,
    startDate,
  });

  const { data: interactionData = [], isLoading: interactionLoading } = useInteractionRanking({
    boardId: selectedBoardId === 'all' ? undefined : selectedBoardId,
    startDate,
    endDate,
  });

  // Filter by user if selected
  const filteredReportData = useMemo(() => {
    if (selectedUserId === 'all') return reportData;
    return reportData.filter(row => row.user_id === selectedUserId);
  }, [reportData, selectedUserId]);

  // Get unique users from report data for the filter
  const usersInReport = useMemo(() => {
    const uniqueUsers = new Map<string, string>();
    reportData.forEach(row => {
      if (!uniqueUsers.has(row.user_id)) {
        uniqueUsers.set(row.user_id, row.user_name);
      }
    });
    return Array.from(uniqueUsers.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [reportData]);

  // Aggregate data by user
  const userStats = useMemo(() => {
    const stats = new Map<string, {
      user_name: string;
      cards_created: number;
      cards_completed: number;
      cards_in_progress: number;
      total_hours: number;
      completed_count: number;
    }>();

    filteredReportData.forEach(row => {
      const existing = stats.get(row.user_id) || {
        user_name: row.user_name,
        cards_created: 0,
        cards_completed: 0,
        cards_in_progress: 0,
        total_hours: 0,
        completed_count: 0,
      };

      existing.cards_created += row.cards_created;
      existing.cards_completed += row.cards_completed;
      existing.cards_in_progress += row.cards_in_progress;
      if (row.avg_completion_hours) {
        existing.total_hours += row.avg_completion_hours * row.cards_completed;
        existing.completed_count += row.cards_completed;
      }

      stats.set(row.user_id, existing);
    });

    return Array.from(stats.entries()).map(([user_id, data]) => ({
      user_id,
      ...data,
      avg_completion_hours: data.completed_count > 0 
        ? Math.round(data.total_hours / data.completed_count * 10) / 10 
        : null,
    }));
  }, [filteredReportData]);

  // Aggregate data by board
  const boardStats = useMemo(() => {
    const stats = new Map<string, {
      board_name: string;
      cards_created: number;
      cards_completed: number;
    }>();

    filteredReportData.forEach(row => {
      const existing = stats.get(row.board_id) || {
        board_name: row.board_name.replace(/^Fluxo (de )?/i, ''),
        cards_created: 0,
        cards_completed: 0,
      };

      existing.cards_created += row.cards_created;
      existing.cards_completed += row.cards_completed;

      stats.set(row.board_id, existing);
    });

    return Array.from(stats.entries()).map(([board_id, data]) => ({
      board_id,
      ...data,
    }));
  }, [filteredReportData]);

  // Summary stats
  const summary = useMemo(() => {
    return {
      totalCreated: userStats.reduce((sum, u) => sum + u.cards_created, 0),
      totalCompleted: userStats.reduce((sum, u) => sum + u.cards_completed, 0),
      totalInProgress: userStats.reduce((sum, u) => sum + u.cards_in_progress, 0),
      avgHours: userStats.filter(u => u.avg_completion_hours).length > 0
        ? Math.round(
            userStats.reduce((sum, u) => sum + (u.avg_completion_hours || 0), 0) / 
            userStats.filter(u => u.avg_completion_hours).length * 10
          ) / 10
        : null,
    };
  }, [userStats]);

  // Chart data for users
  const userChartData = useMemo(() => {
    return userStats
      .sort((a, b) => b.cards_created - a.cards_created)
      .slice(0, 10)
      .map(u => ({
        name: u.user_name.split(' ')[0],
        Criados: u.cards_created,
        Concluídos: u.cards_completed,
        'Em Andamento': u.cards_in_progress,
      }));
  }, [userStats]);

  // Get comparison data for two users
  const comparisonData = useMemo(() => {
    if (!compareUser1 || !compareUser2) return null;
    
    const user1Stats = userStats.find(u => u.user_id === compareUser1);
    const user2Stats = userStats.find(u => u.user_id === compareUser2);
    const user1Interactions = interactionData.find(u => u.user_id === compareUser1);
    const user2Interactions = interactionData.find(u => u.user_id === compareUser2);
    
    if (!user1Stats || !user2Stats) return null;
    
    return {
      user1: {
        ...user1Stats,
        checklist_completions: user1Interactions?.checklist_completions || 0,
        comments_count: user1Interactions?.comments_count || 0,
        card_moves: user1Interactions?.card_moves || 0,
        total_interactions: user1Interactions?.total_interactions || 0,
      },
      user2: {
        ...user2Stats,
        checklist_completions: user2Interactions?.checklist_completions || 0,
        comments_count: user2Interactions?.comments_count || 0,
        card_moves: user2Interactions?.card_moves || 0,
        total_interactions: user2Interactions?.total_interactions || 0,
      },
    };
  }, [compareUser1, compareUser2, userStats, interactionData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
       {/* Filters Bar */}
       <Card className="border-none shadow-sm bg-muted/30">
         <CardContent className="p-3 flex flex-wrap items-center gap-4">
           <div className="flex items-center gap-2">
             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fluxo</span>
             <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
               <SelectTrigger className="w-[180px] h-8 text-xs bg-background border-muted-foreground/20">
                 <SelectValue placeholder="Todos os fluxos" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos os fluxos</SelectItem>
                 {boards.map(board => (
                   <SelectItem key={board.id} value={board.id}>
                     {board.name.replace(/^Fluxo (de )?/i, '')}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
           
           <div className="flex items-center gap-2">
             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colaborador</span>
             <Select value={selectedUserId} onValueChange={setSelectedUserId}>
               <SelectTrigger className="w-[180px] h-8 text-xs bg-background border-muted-foreground/20">
                 <SelectValue placeholder="Todos os colaboradores" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos os colaboradores</SelectItem>
                 {usersInReport.map(user => (
                   <SelectItem key={user.id} value={user.id}>
                     {user.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
           
           <div className="flex items-center gap-2">
             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Período</span>
             <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
               <SelectTrigger className="w-[140px] h-8 text-xs bg-background border-muted-foreground/20">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="1">Último mês</SelectItem>
                 <SelectItem value="3">Últimos 3 meses</SelectItem>
                 <SelectItem value="6">Últimos 6 meses</SelectItem>
                 <SelectItem value="12">Último ano</SelectItem>
               </SelectContent>
             </Select>
           </div>
         </CardContent>
       </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalCreated}</p>
                <p className="text-sm text-muted-foreground">Cards Criados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalCompleted}</p>
                <p className="text-sm text-muted-foreground">Cards Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalInProgress}</p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {summary.avgHours ? `${summary.avgHours}h` : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex gap-2 flex-wrap">
           <TabsList className="bg-muted p-1 h-10">
             <TabsTrigger 
               value="overview" 
               className="px-4 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
             >
               Resumo
             </TabsTrigger>
             <TabsTrigger 
               value="compare" 
               className="px-4 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
             >
               Comparativo
             </TabsTrigger>
             <TabsTrigger 
               value="ranking" 
               className="px-4 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
             >
               Interações
             </TabsTrigger>
           </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* New Gamified Ranking - Main Feature */}
          <InteractionRankingCard 
            data={interactionData} 
            isLoading={interactionLoading} 
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                   <Users className="h-5 w-5" />
                   Produtividade por Colaborador
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={userChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Criados" fill="#3b82f6" />
                      <Bar dataKey="Concluídos" fill="#22c55e" />
                      <Bar dataKey="Em Andamento" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Sem dados para o período selecionado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Board Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Fluxo</CardTitle>
              </CardHeader>
              <CardContent>
                {boardStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={boardStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ board_name, percent }) => 
                          `${board_name} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="cards_created"
                      >
                        {boardStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Cards Criados']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Sem dados para o período selecionado
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
               <CardTitle className="text-lg">Detalhamento por Colaborador</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Colaborador</TableHead>
                    <TableHead className="text-center">Cards Criados</TableHead>
                    <TableHead className="text-center">Concluídos</TableHead>
                    <TableHead className="text-center">Em Andamento</TableHead>
                    <TableHead className="text-center">Tempo Médio</TableHead>
                    <TableHead className="text-center">Taxa de Conclusão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStats.length === 0 ? (
                    <TableRow>
                       <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                         Nenhum dado encontrado para o período selecionado.
                       </TableCell>
                    </TableRow>
                  ) : (
                    userStats
                      .sort((a, b) => b.cards_created - a.cards_created)
                      .map(user => {
                        const completionRate = user.cards_created > 0 
                          ? Math.round((user.cards_completed / user.cards_created) * 100)
                          : 0;
                        
                        return (
                          <TableRow key={user.user_id}>
                            <TableCell className="font-medium">{user.user_name}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{user.cards_created}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-green-100 text-green-800">{user.cards_completed}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-amber-100 text-amber-800">{user.cards_in_progress}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {user.avg_completion_hours ? `${user.avg_completion_hours}h` : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                className={
                                  completionRate >= 80 
                                    ? 'bg-green-100 text-green-800' 
                                    : completionRate >= 50 
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-red-100 text-red-800'
                                }
                              >
                                {completionRate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                 <ArrowLeftRight className="h-5 w-5" />
                 Comparativo entre Colaboradores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User and Period Selection */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                   <span className="text-sm font-medium text-blue-600">Colaborador 1:</span>
                  <Select value={compareUser1} onValueChange={setCompareUser1}>
                    <SelectTrigger className="w-[200px] border-blue-200">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {usersInReport.map(user => (
                        <SelectItem key={user.id} value={user.id} disabled={user.id === compareUser2}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center">
                  <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-sm font-medium text-green-600">Colaborador 2:</span>
                  <Select value={compareUser2} onValueChange={setCompareUser2}>
                    <SelectTrigger className="w-[200px] border-green-200">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {usersInReport.map(user => (
                        <SelectItem key={user.id} value={user.id} disabled={user.id === compareUser1}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-auto flex items-center gap-2 border-l pl-4">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Período:</span>
                  <Select value={comparePeriod} onValueChange={setComparePeriod}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Último mês</SelectItem>
                      <SelectItem value="3">Últimos 3 meses</SelectItem>
                      <SelectItem value="6">Últimos 6 meses</SelectItem>
                      <SelectItem value="12">Último ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Comparison Cards */}
              {comparisonData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User 1 */}
                  <div className="border-2 border-blue-200 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-lg text-blue-600 text-center">
                      {comparisonData.user1.user_name}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-700">{comparisonData.user1.cards_created}</p>
                        <p className="text-xs text-blue-600">Cards Criados</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-700">{comparisonData.user1.cards_completed}</p>
                        <p className="text-xs text-green-600">Concluídos</p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-amber-700">{comparisonData.user1.cards_in_progress}</p>
                        <p className="text-xs text-amber-600">Em Andamento</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-purple-700">
                          {comparisonData.user1.avg_completion_hours ? `${comparisonData.user1.avg_completion_hours}h` : '-'}
                        </p>
                        <p className="text-xs text-purple-600">Tempo Médio</p>
                      </div>
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Interações</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1"><CheckSquare className="h-4 w-4" /> Checklists marcados</span>
                        <Badge variant="secondary">{comparisonData.user1.checklist_completions}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Comentários</span>
                        <Badge variant="secondary">{comparisonData.user1.comments_count}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1"><ArrowLeftRight className="h-4 w-4" /> Movimentações</span>
                        <Badge variant="secondary">{comparisonData.user1.card_moves}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm font-medium pt-2 border-t">
                        <span>Total de Interações</span>
                        <Badge className="bg-blue-100 text-blue-800">{comparisonData.user1.total_interactions}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* User 2 */}
                  <div className="border-2 border-green-200 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-lg text-green-600 text-center">
                      {comparisonData.user2.user_name}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-700">{comparisonData.user2.cards_created}</p>
                        <p className="text-xs text-blue-600">Cards Criados</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-700">{comparisonData.user2.cards_completed}</p>
                        <p className="text-xs text-green-600">Concluídos</p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-amber-700">{comparisonData.user2.cards_in_progress}</p>
                        <p className="text-xs text-amber-600">Em Andamento</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-purple-700">
                          {comparisonData.user2.avg_completion_hours ? `${comparisonData.user2.avg_completion_hours}h` : '-'}
                        </p>
                        <p className="text-xs text-purple-600">Tempo Médio</p>
                      </div>
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Interações</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1"><CheckSquare className="h-4 w-4" /> Checklists marcados</span>
                        <Badge variant="secondary">{comparisonData.user2.checklist_completions}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Comentários</span>
                        <Badge variant="secondary">{comparisonData.user2.comments_count}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1"><ArrowLeftRight className="h-4 w-4" /> Movimentações</span>
                        <Badge variant="secondary">{comparisonData.user2.card_moves}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm font-medium pt-2 border-t">
                        <span>Total de Interações</span>
                        <Badge className="bg-green-100 text-green-800">{comparisonData.user2.total_interactions}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                 <div className="text-center py-12 bg-muted/10 border border-dashed rounded-lg">
                   <p className="text-muted-foreground font-medium">Selecione dois colaboradores para comparar suas métricas lado a lado</p>
                   <p className="text-xs text-muted-foreground/60 mt-1">Use os filtros acima para escolher os perfis.</p>
                 </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ranking Tab */}
        <TabsContent value="ranking" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
               Interações de Produtividade
               <Badge variant="secondary" className="ml-2 bg-muted-foreground/10 text-muted-foreground border-none">
                 {interactionData.length} colaboradores
               </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                   placeholder="Buscar colaborador..."
                    value={rankingSearchTerm}
                    onChange={(e) => {
                      setRankingSearchTerm(e.target.value);
                      setRankingPage(1);
                    }}
                    className="pl-8 w-[200px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {interactionLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : interactionData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma interação encontrada para o período selecionado
                </div>
              ) : (() => {
                // Filter and sort data
                const filteredData = [...interactionData]
                  .filter(user => 
                    rankingSearchTerm === '' || 
                    user.user_name.toLowerCase().includes(rankingSearchTerm.toLowerCase())
                  )
                  .sort((a, b) => b[rankingSortField] - a[rankingSortField]);
                
                const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
                const paginatedData = filteredData.slice(
                  (rankingPage - 1) * ITEMS_PER_PAGE,
                  rankingPage * ITEMS_PER_PAGE
                );
                
                // Get max value for visual bars
                const maxValue = Math.max(...interactionData.map(u => u[rankingSortField])) || 1;
                
                return (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 text-center">#</TableHead>
                           <TableHead>Colaborador</TableHead>
                          <TableHead 
                            className={`text-center cursor-pointer hover:bg-muted/50 transition-colors ${rankingSortField === 'checklist_completions' ? 'bg-blue-50' : ''}`}
                            onClick={() => { setRankingSortField('checklist_completions'); setRankingPage(1); }}
                          >
                            <span className="flex items-center justify-center gap-1">
                              <CheckSquare className="h-4 w-4 text-blue-500" />
                              <span className="hidden sm:inline">Checklists</span>
                              {rankingSortField === 'checklist_completions' && <span className="text-blue-500">▼</span>}
                            </span>
                          </TableHead>
                          <TableHead 
                            className={`text-center cursor-pointer hover:bg-muted/50 transition-colors ${rankingSortField === 'comments_count' ? 'bg-green-50' : ''}`}
                            onClick={() => { setRankingSortField('comments_count'); setRankingPage(1); }}
                          >
                            <span className="flex items-center justify-center gap-1">
                              <MessageSquare className="h-4 w-4 text-green-500" />
                              <span className="hidden sm:inline">Comentários</span>
                              {rankingSortField === 'comments_count' && <span className="text-green-500">▼</span>}
                            </span>
                          </TableHead>
                          <TableHead 
                            className={`text-center cursor-pointer hover:bg-muted/50 transition-colors ${rankingSortField === 'card_moves' ? 'bg-amber-50' : ''}`}
                            onClick={() => { setRankingSortField('card_moves'); setRankingPage(1); }}
                          >
                            <span className="flex items-center justify-center gap-1">
                              <ArrowLeftRight className="h-4 w-4 text-amber-500" />
                              <span className="hidden sm:inline">Movimentações</span>
                              {rankingSortField === 'card_moves' && <span className="text-amber-500">▼</span>}
                            </span>
                          </TableHead>
                          <TableHead 
                            className={`text-center cursor-pointer hover:bg-muted/50 transition-colors ${rankingSortField === 'total_interactions' ? 'bg-purple-50' : ''}`}
                            onClick={() => { setRankingSortField('total_interactions'); setRankingPage(1); }}
                          >
                            <span className="flex items-center justify-center gap-1">
                              Total
                              {rankingSortField === 'total_interactions' && <span className="text-purple-500">▼</span>}
                            </span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Nenhum funcionário encontrado com "{rankingSearchTerm}"
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedData.map((user, pageIndex) => {
                            const globalIndex = (rankingPage - 1) * ITEMS_PER_PAGE + pageIndex;
                            const barWidth = (user[rankingSortField] / maxValue) * 100;
                            
                            return (
                              <TableRow key={user.user_id} className="hover:bg-muted/30">
                                <TableCell className="text-center">
                                  {globalIndex === 0 ? (
                                    <span className="text-xl">🥇</span>
                                  ) : globalIndex === 1 ? (
                                    <span className="text-xl">🥈</span>
                                  ) : globalIndex === 2 ? (
                                    <span className="text-xl">🥉</span>
                                  ) : (
                                    <span className="text-muted-foreground font-medium text-sm">{globalIndex + 1}º</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex flex-col">
                                    <span>{user.user_name}</span>
                                    {/* Mini progress bar */}
                                    <div className="w-full bg-muted h-1.5 rounded-full mt-1 overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{ 
                                          width: `${barWidth}%`,
                                          backgroundColor: rankingSortField === 'checklist_completions' ? '#3b82f6' 
                                            : rankingSortField === 'comments_count' ? '#22c55e'
                                            : rankingSortField === 'card_moves' ? '#f59e0b'
                                            : '#8b5cf6'
                                        }}
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant="secondary" 
                                    className={rankingSortField === 'checklist_completions' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-xs'}
                                  >
                                    {user.checklist_completions}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant="secondary"
                                    className={rankingSortField === 'comments_count' ? 'bg-green-100 text-green-700 font-bold' : 'text-xs'}
                                  >
                                    {user.comments_count}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant="secondary"
                                    className={rankingSortField === 'card_moves' ? 'bg-amber-100 text-amber-700 font-bold' : 'text-xs'}
                                  >
                                    {user.card_moves}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    className={rankingSortField === 'total_interactions' 
                                      ? 'bg-purple-600 text-white font-bold' 
                                      : 'bg-purple-100 text-purple-700 font-medium'
                                    }
                                  >
                                    {user.total_interactions}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t mt-4">
                        <span className="text-sm text-muted-foreground">
                          Mostrando {(rankingPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(rankingPage * ITEMS_PER_PAGE, filteredData.length)} de {filteredData.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRankingPage(p => Math.max(1, p - 1))}
                            disabled={rankingPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                          </Button>
                          <span className="text-sm font-medium px-2">
                            Página {rankingPage} de {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRankingPage(p => Math.min(totalPages, p + 1))}
                            disabled={rankingPage === totalPages}
                          >
                            Próxima
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
