import { useState } from 'react';
import { useAdminCards } from '@/hooks/useAdminCards';
import { useAdminTaskTypes } from '@/hooks/useAdminTaskTypes';
import { useAuth } from '@/contexts/AuthContext';
import { AdminCard, AdminTaskCategory, AdminChecklistItem } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Check, 
  X, 
  Clock, 
  DollarSign, 
  FileText, 
  Wrench,
  ListChecks,
  Timer,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateAdminCardDialog } from './CreateAdminCardDialog';
import { AdminCardDetail } from './AdminCardDetail';

const categoryConfig: Record<AdminTaskCategory, { label: string; icon: React.ReactNode; color: string }> = {
  financeiro: { label: 'Financeiro', icon: <DollarSign className="h-4 w-4" />, color: 'bg-green-500' },
  cadastral: { label: 'Cadastral', icon: <FileText className="h-4 w-4" />, color: 'bg-blue-500' },
  operacional: { label: 'Operacional', icon: <Wrench className="h-4 w-4" />, color: 'bg-orange-500' },
};

export function AdminFlowBoard() {
  const { user } = useAuth();
  const { cards, cardsByStatus, isLoading, completeCard, cancelCard, updateChecklist } = useAdminCards(user?.id);
  const { taskTypes } = useAdminTaskTypes();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCard, setSelectedCard] = useState<AdminCard | null>(null);
  const [activeTab, setActiveTab] = useState<'em_andamento' | 'concluido' | 'cancelado'>('em_andamento');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleToggleChecklistItem = (card: AdminCard, itemIndex: number) => {
    const newItems = [...card.checklist_items];
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      is_completed: !newItems[itemIndex].is_completed,
      completed_at: !newItems[itemIndex].is_completed ? new Date().toISOString() : null,
    };
    updateChecklist.mutate({ id: card.id, checklist_items: newItems });
  };

  const getTimeElapsed = (startedAt: string, completedAt?: string | null) => {
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const minutes = differenceInMinutes(end, start);
    
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const renderCard = (card: AdminCard) => {
    const category = categoryConfig[card.category];
    const completedItems = card.checklist_items.filter(i => i.is_completed).length;
    const totalItems = card.checklist_items.length;
    const hasChecklist = totalItems > 0;
    const isAllCompleted = hasChecklist && completedItems === totalItems;

    return (
      <Card 
        key={card.id} 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setSelectedCard(card)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`${category.color} text-white text-xs`}>
                  {category.icon}
                  <span className="ml-1">{category.label}</span>
                </Badge>
              </div>
              <CardTitle className="text-sm font-medium break-words">
                {card.title}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {card.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {card.description}
            </p>
          )}

          {/* Timer */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Timer className="h-3 w-3" />
            <span>{getTimeElapsed(card.started_at, card.completed_at)}</span>
          </div>

          {/* Checklist progress */}
          {hasChecklist && (
            <div className="flex items-center gap-2 text-xs">
              <ListChecks className="h-3 w-3" />
              <div className="flex-1 bg-muted rounded-full h-1.5">
                <div 
                  className={`h-full rounded-full transition-all ${isAllCompleted ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${(completedItems / totalItems) * 100}%` }}
                />
              </div>
              <span className="text-muted-foreground">{completedItems}/{totalItems}</span>
            </div>
          )}

          {/* Action buttons for in-progress cards */}
          {card.status === 'em_andamento' && (
            <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-7"
                onClick={() => completeCard.mutate(card.id)}
                disabled={hasChecklist && !isAllCompleted}
              >
                <Check className="h-3 w-3 mr-1" />
                Concluir
              </Button>
            </div>
          )}

          {/* Status indicator for completed/cancelled */}
          {card.status === 'concluido' && (
            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              <span>Concluído {formatDistanceToNow(new Date(card.completed_at!), { addSuffix: true, locale: ptBR })}</span>
            </div>
          )}
          {card.status === 'cancelado' && (
            <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
              <XCircle className="h-3 w-3" />
              <span>Cancelado</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Minhas Tarefas</h2>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nova Tarefa
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-700">{cardsByStatus.em_andamento.length}</span>
            </div>
            <p className="text-sm text-yellow-600">Em Andamento</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-700">{cardsByStatus.concluido.length}</span>
            </div>
            <p className="text-sm text-green-600">Concluídos</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-700">{cardsByStatus.cancelado.length}</span>
            </div>
            <p className="text-sm text-red-600">Cancelados</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different statuses */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="em_andamento" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Em Andamento ({cardsByStatus.em_andamento.length})
          </TabsTrigger>
          <TabsTrigger value="concluido" className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Concluídos ({cardsByStatus.concluido.length})
          </TabsTrigger>
          <TabsTrigger value="cancelado" className="flex items-center gap-1">
            <XCircle className="h-4 w-4" />
            Cancelados ({cardsByStatus.cancelado.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="em_andamento">
          {cardsByStatus.em_andamento.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma tarefa em andamento</p>
              <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-1" />
                Criar Tarefa
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cardsByStatus.em_andamento.map(renderCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="concluido">
          {cardsByStatus.concluido.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma tarefa concluída</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cardsByStatus.concluido.map(renderCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelado">
          {cardsByStatus.cancelado.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma tarefa cancelada</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cardsByStatus.cancelado.map(renderCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      {showCreateDialog && (
        <CreateAdminCardDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          taskTypes={taskTypes}
        />
      )}

      {/* Detail dialog */}
      {selectedCard && (
        <AdminCardDetail
          card={selectedCard}
          open={!!selectedCard}
          onOpenChange={(open) => !open && setSelectedCard(null)}
          onComplete={() => {
            completeCard.mutate(selectedCard.id);
            setSelectedCard(null);
          }}
          onCancel={(reason) => {
            cancelCard.mutate({ id: selectedCard.id, reason });
            setSelectedCard(null);
          }}
          onToggleChecklistItem={(index) => handleToggleChecklistItem(selectedCard, index)}
        />
      )}
    </div>
  );
}
