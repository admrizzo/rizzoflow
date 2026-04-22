import { useState } from 'react';
import { useAdminProductivityReport } from '@/hooks/useAdminProductivityReport';
import { useAuth } from '@/contexts/AuthContext';
import { AdminTaskCategory } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Calendar,
  DollarSign,
  FileText,
  Wrench,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const categoryConfig: Record<AdminTaskCategory, { label: string; icon: React.ReactNode; color: string }> = {
  financeiro: { label: 'Financeiro', icon: <DollarSign className="h-4 w-4" />, color: 'bg-green-500 text-white' },
  cadastral: { label: 'Cadastral', icon: <FileText className="h-4 w-4" />, color: 'bg-blue-500 text-white' },
  operacional: { label: 'Operacional', icon: <Wrench className="h-4 w-4" />, color: 'bg-orange-500 text-white' },
};

export function AdminProductivityDashboard() {
  const { isAdmin } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  const startDate = startOfMonth(selectedMonth);
  const endDate = endOfMonth(selectedMonth);
  
  const { byUser, byCategory, byMonth, isLoading } = useAdminProductivityReport(startDate, endDate);

  const handlePreviousMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const handleNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));

  if (!isAdmin) {
    return (
      <Card className="m-4">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Apenas administradores podem ver este relatório.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate totals
  const totalCompleted = byUser.reduce((acc, u) => acc + u.total_completed, 0);
  const totalInProgress = byUser.reduce((acc, u) => acc + u.total_in_progress, 0);
  const totalCancelled = byUser.reduce((acc, u) => acc + u.total_cancelled, 0);
  const totalCount = byUser.reduce((acc, u) => acc + u.total_count, 0);
  const completionRate = totalCount > 0 ? ((totalCompleted / totalCount) * 100).toFixed(1) : 0;

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Relatório de Produtividade</h2>
          <p className="text-white/70">Acompanhe o desempenho da equipe</p>
        </div>
        
        {/* Month selector */}
        <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
          <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="text-white hover:bg-white/20">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-white font-medium px-2 min-w-32 text-center">
            {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="text-white hover:bg-white/20">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total de Tarefas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCompleted}</p>
                <p className="text-sm text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalInProgress}</p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completionRate}%</p>
                <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Por Funcionário
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            Por Categoria
          </TabsTrigger>
        </TabsList>

        {/* By User */}
        <TabsContent value="users">
          {byUser.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Nenhuma tarefa registrada neste período.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {byUser
                .sort((a, b) => b.total_completed - a.total_completed)
                .map((user, index) => {
                  const userCompletionRate = user.total_count > 0 
                    ? ((user.total_completed / user.total_count) * 100).toFixed(1) 
                    : 0;

                  return (
                    <Card key={user.user_id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            <CardTitle className="text-lg">{user.user_name}</CardTitle>
                          </div>
                          <Badge variant="outline" className="text-lg px-3">
                            {user.total_completed} concluídas
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-semibold">{user.total_count}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Concluídas</p>
                            <p className="font-semibold text-green-600">{user.total_completed}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Em Andamento</p>
                            <p className="font-semibold text-yellow-600">{user.total_in_progress}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Canceladas</p>
                            <p className="font-semibold text-red-600">{user.total_cancelled}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Taxa</p>
                            <p className="font-semibold">{userCompletionRate}%</p>
                          </div>
                        </div>

                        {/* Category breakdown */}
                        <div className="flex gap-2 mt-3">
                          {(Object.keys(categoryConfig) as AdminTaskCategory[]).map((cat) => {
                            const catData = user.categories[cat];
                            if (!catData) return null;
                            const config = categoryConfig[cat];
                            return (
                              <Badge key={cat} className={config.color}>
                                {config.icon}
                                <span className="ml-1">{catData.completed_count}</span>
                              </Badge>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* By Category */}
        <TabsContent value="categories">
          {byCategory.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Nenhuma tarefa registrada neste período.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {byCategory.map((cat) => {
                const config = categoryConfig[cat.category];
                const catCompletionRate = cat.total_count > 0 
                  ? ((cat.total_completed / cat.total_count) * 100).toFixed(1) 
                  : 0;

                return (
                  <Card key={cat.category}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Badge className={config.color}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-bold text-xl">{cat.total_count}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Concluídas</span>
                          <span className="font-semibold text-green-600">{cat.total_completed}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Em Andamento</span>
                          <span className="font-semibold text-yellow-600">{cat.total_in_progress}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Canceladas</span>
                          <span className="font-semibold text-red-600">{cat.total_cancelled}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Taxa de Conclusão</span>
                            <span className="font-bold text-lg">{catCompletionRate}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
