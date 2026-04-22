import { useState } from 'react';
import { AdminCard, AdminTaskCategory } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  DollarSign, 
  FileText, 
  Wrench, 
  Timer, 
  Check, 
  X,
  ListChecks,
  CheckCircle2,
  XCircle,
  Calendar
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminCardDetailProps {
  card: AdminCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onCancel: (reason: string) => void;
  onToggleChecklistItem: (index: number) => void;
}

const categoryConfig: Record<AdminTaskCategory, { label: string; icon: React.ReactNode; color: string }> = {
  financeiro: { label: 'Financeiro', icon: <DollarSign className="h-4 w-4" />, color: 'bg-green-500' },
  cadastral: { label: 'Cadastral', icon: <FileText className="h-4 w-4" />, color: 'bg-blue-500' },
  operacional: { label: 'Operacional', icon: <Wrench className="h-4 w-4" />, color: 'bg-orange-500' },
};

export function AdminCardDetail({ 
  card, 
  open, 
  onOpenChange, 
  onComplete, 
  onCancel, 
  onToggleChecklistItem 
}: AdminCardDetailProps) {
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const category = categoryConfig[card.category];
  const completedItems = card.checklist_items.filter(i => i.is_completed).length;
  const totalItems = card.checklist_items.length;
  const hasChecklist = totalItems > 0;
  const isAllCompleted = hasChecklist && completedItems === totalItems;

  const getTimeElapsed = () => {
    const start = new Date(card.started_at);
    const end = card.completed_at ? new Date(card.completed_at) : new Date();
    const minutes = differenceInMinutes(end, start);
    
    if (minutes < 60) return `${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const handleCancel = () => {
    if (cancelReason.trim()) {
      onCancel(cancelReason.trim());
      setShowCancelForm(false);
      setCancelReason('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className={`${category.color} text-white`}>
              {category.icon}
              <span className="ml-1">{category.label}</span>
            </Badge>
            {card.status === 'concluido' && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Concluído
              </Badge>
            )}
            {card.status === 'cancelado' && (
              <Badge variant="outline" className="text-red-600 border-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                Cancelado
              </Badge>
            )}
          </div>
          <DialogTitle className="text-lg break-words">{card.title}</DialogTitle>
          {card.description && (
            <DialogDescription className="text-sm">
              {card.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Time info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Iniciado: {format(new Date(card.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Timer className="h-4 w-4" />
              <span>Tempo: {getTimeElapsed()}</span>
            </div>
          </div>

          {card.completed_at && (
            <div className="text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4 inline mr-1" />
              Concluído em {format(new Date(card.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          )}

          {card.cancelled_at && (
            <div className="space-y-1">
              <div className="text-sm text-red-600">
                <XCircle className="h-4 w-4 inline mr-1" />
                Cancelado em {format(new Date(card.cancelled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
              {card.cancel_reason && (
                <p className="text-sm text-muted-foreground bg-red-50 p-2 rounded">
                  Motivo: {card.cancel_reason}
                </p>
              )}
            </div>
          )}

          {/* Checklist */}
          {hasChecklist && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Checklist
                </Label>
                <span className="text-xs text-muted-foreground">
                  {completedItems}/{totalItems} concluídos
                </span>
              </div>
              
              <div className="flex-1 bg-muted rounded-full h-2 mb-2">
                <div 
                  className={`h-full rounded-full transition-all ${isAllCompleted ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${(completedItems / totalItems) * 100}%` }}
                />
              </div>

              <div className="space-y-1">
                {card.checklist_items.map((item, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-3 p-2 rounded ${item.is_completed ? 'bg-green-50' : 'bg-muted'}`}
                  >
                    <Checkbox
                      checked={item.is_completed}
                      onCheckedChange={() => onToggleChecklistItem(index)}
                      disabled={card.status !== 'em_andamento'}
                    />
                    <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {card.notes && (
            <div className="space-y-1">
              <Label>Observações</Label>
              <p className="text-sm bg-muted p-2 rounded">{card.notes}</p>
            </div>
          )}

          {/* Cancel form */}
          {showCancelForm && (
            <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
              <Label>Motivo do cancelamento *</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Descreva por que está cancelando..."
                rows={2}
              />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowCancelForm(false);
                    setCancelReason('');
                  }}
                >
                  Voltar
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleCancel}
                  disabled={!cancelReason.trim()}
                >
                  Confirmar Cancelamento
                </Button>
              </div>
            </div>
          )}
        </div>

        {card.status === 'em_andamento' && !showCancelForm && (
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCancelForm(true)}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar Tarefa
            </Button>
            <Button 
              onClick={onComplete}
              disabled={hasChecklist && !isAllCompleted}
            >
              <Check className="h-4 w-4 mr-1" />
              Concluir
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
