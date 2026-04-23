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
import { Plus, Trash2, Save, Shield, AlertTriangle, Bell } from 'lucide-react';
import { toast } from 'sonner';

const RULE_TYPES = [
  { value: 'validation', label: 'Validação', icon: Shield, description: 'Trava de avanço entre etapas' },
  { value: 'notification', label: 'Notificação', icon: Bell, description: 'Enviar alerta quando condição acontecer' },
  { value: 'status_change', label: 'Mudança de Status', icon: AlertTriangle, description: 'Alterar status automaticamente' },
];

export function ProposalRulesTab() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', description: '', rule_type: 'validation' });

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
      setNewRule({ name: '', description: '', rule_type: 'validation' });
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
          <h3 className="font-semibold">Regras do Processo</h3>
          <p className="text-sm text-muted-foreground">Configure validações, notificações e mudanças automáticas de status.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" /> Nova Regra
        </Button>
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
          return (
            <Card key={rule.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{rule.name}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">{ruleType?.label || rule.rule_type}</Badge>
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
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      if (confirm('Remover esta regra?')) deleteRule.mutate(rule.id);
                    }}
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
                  onClick={() => newRule.name.trim() && createRule.mutate()}
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
    </div>
  );
}