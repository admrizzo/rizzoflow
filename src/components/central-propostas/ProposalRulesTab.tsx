import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Save, Shield, AlertTriangle, Bell, Pencil, Check, X, Zap } from 'lucide-react';
import { toast } from 'sonner';

const RULE_TYPES = [
  { value: 'validation', label: 'Validação', icon: Shield, description: 'Trava de avanço entre etapas' },
  { value: 'notification', label: 'Notificação', icon: Bell, description: 'Enviar alerta quando condição acontecer' },
  { value: 'status_change', label: 'Mudança de Status', icon: AlertTriangle, description: 'Alterar status automaticamente' },
  { value: 'conditional', label: 'Condicional', icon: Zap, description: 'Exibir/ocultar campos baseado em condição' },
];

const TRIGGER_OPTIONS = [
  { value: 'stage_complete', label: 'Ao finalizar etapa' },
  { value: 'field_change', label: 'Ao alterar campo' },
  { value: 'status_change', label: 'Ao mudar status' },
  { value: 'form_submit', label: 'Ao enviar formulário' },
  { value: 'time_elapsed', label: 'Após tempo decorrido' },
];

const ACTION_OPTIONS = [
  { value: 'block_advance', label: 'Bloquear avanço' },
  { value: 'send_notification', label: 'Enviar notificação' },
  { value: 'change_status', label: 'Alterar status' },
  { value: 'show_field', label: 'Exibir campo' },
  { value: 'hide_field', label: 'Ocultar campo' },
  { value: 'require_field', label: 'Tornar campo obrigatório' },
];

export function ProposalRulesTab() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [newRule, setNewRule] = useState({ name: '', description: '', rule_type: 'validation', trigger: 'stage_complete', action: 'block_advance' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['proposal-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_rules')
        .select('*')
        .order('position');
      if (error) throw error;
      return data;
    },
  });

  const createRule = useMutation({
    mutationFn: async () => {
      const maxPos = rules.length > 0 ? Math.max(...rules.map((r: any) => r.position)) + 1 : 0;
      const { error } = await supabase
        .from('proposal_rules')
        .insert({
          name: newRule.name,
          description: newRule.description || null,
          rule_type: newRule.rule_type,
          position: maxPos,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-rules'] });
      setAdding(false);
      setNewRule({ name: '', description: '', rule_type: 'validation', trigger: 'stage_complete', action: 'block_advance' });
      toast.success('Regra criada');
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('proposal_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-rules'] });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('proposal_rules')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-rules'] });
      setEditingId(null);
      toast.success('Regra atualizada');
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proposal_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-rules'] });
      toast.success('Regra removida');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Regras do Processo</h3>
          <p className="text-sm text-muted-foreground">Configure validações, notificações, condicionais e automações do fluxo.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" /> Nova Regra
        </Button>
      </div>

      <div className="flex gap-4 text-sm">
        <Badge variant="outline">{rules.length} regras</Badge>
        <Badge variant="outline" className="text-green-700 border-green-300">
          {rules.filter((r: any) => r.is_active).length} ativas
        </Badge>
        {RULE_TYPES.map(t => {
          const count = rules.filter((r: any) => r.rule_type === t.value).length;
          if (count === 0) return null;
          return <Badge key={t.value} variant="outline" className="text-xs">{t.label}: {count}</Badge>;
        })}
      </div>

      {rules.length === 0 && !adding && (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma regra configurada.</p>
          <p className="text-xs mt-1">Crie regras para controlar o fluxo de propostas.</p>
        </div>
      )}

      <div className="space-y-2">
        {rules.map((rule: any) => {
          const ruleType = RULE_TYPES.find(t => t.value === rule.rule_type);
          const Icon = ruleType?.icon || Shield;
          const isEditing = editingId === rule.id;
          const triggerLabel = TRIGGER_OPTIONS.find(t => t.value === (rule.condition_config as any)?.trigger)?.label;
          const actionLabel = ACTION_OPTIONS.find(a => a.value === (rule.action_config as any)?.action)?.label;

          if (isEditing) {
            return (
              <Card key={rule.id} className="border-primary/40">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nome da regra</Label>
                      <Input
                        value={editData.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <Select value={editData.rule_type || 'validation'} onValueChange={(v) => setEditData({ ...editData, rule_type: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Quando dispara (trigger)</Label>
                      <Select value={editData.trigger || 'stage_complete'} onValueChange={(v) => setEditData({ ...editData, trigger: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TRIGGER_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Ação executada</Label>
                      <Select value={editData.action || 'block_advance'} onValueChange={(v) => setEditData({ ...editData, action: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACTION_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Descrição</Label>
                    <Textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateRule.mutate({
                      id: rule.id,
                      updates: {
                        name: editData.name,
                        description: editData.description || null,
                        rule_type: editData.rule_type,
                        condition_config: { trigger: editData.trigger },
                        action_config: { action: editData.action },
                      }
                    })}>
                      <Check className="h-4 w-4 mr-1" /> Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4 mr-1" /> Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{rule.name}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                    <Badge variant="outline" className="text-xs">{ruleType?.label || rule.rule_type}</Badge>
                    {triggerLabel && <Badge variant="secondary" className="text-[10px]">Trigger: {triggerLabel}</Badge>}
                    {actionLabel && <Badge variant="secondary" className="text-[10px]">Ação: {actionLabel}</Badge>}
                    {rule.description && <span>{rule.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(v) => toggleRule.mutate({ id: rule.id, is_active: v })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingId(rule.id);
                      setEditData({
                        name: rule.name,
                        description: rule.description || '',
                        rule_type: rule.rule_type,
                        trigger: (rule.condition_config as any)?.trigger || 'stage_complete',
                        action: (rule.action_config as any)?.action || 'block_advance',
                      });
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteTarget({ id: rule.id, name: rule.name })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {adding && (
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome da regra</Label>
                  <Input
                    placeholder="Ex: Exigir documento antes de enviar"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    className="h-8"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={newRule.rule_type}
                    onValueChange={(v) => setNewRule({ ...newRule, rule_type: v })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quando dispara (trigger)</Label>
                  <Select value={newRule.trigger} onValueChange={(v) => setNewRule({ ...newRule, trigger: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIGGER_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Ação executada</Label>
                  <Select value={newRule.action} onValueChange={(v) => setNewRule({ ...newRule, action: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  placeholder="Descreva quando e como esta regra deve ser aplicada"
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (!newRule.name.trim()) return;
                    createRule.mutate();
                  }}
                  disabled={!newRule.name.trim()}
                >
                  <Save className="h-4 w-4 mr-1" /> Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover regra "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta regra será permanentemente removida do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteRule.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}