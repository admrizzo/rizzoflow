import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  GripVertical, Plus, Pencil, Trash2, Save, X, Check
} from 'lucide-react';
import { toast } from 'sonner';

export function ProposalStagesTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [adding, setAdding] = useState(false);

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['proposal-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_stages')
        .select('*')
        .order('position');
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('proposal_stages')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-stages'] });
      toast.success('Etapa atualizada');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const maxPos = stages.length > 0 ? Math.max(...stages.map((s: any) => s.position)) + 1 : 0;
      const { error } = await supabase
        .from('proposal_stages')
        .insert({ name, slug: `${slug}-${Date.now()}`, position: maxPos });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-stages'] });
      setNewStageName('');
      setAdding(false);
      toast.success('Etapa criada');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proposal_stages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-stages'] });
      toast.success('Etapa removida');
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
          <h3 className="font-semibold">Etapas da Proposta</h3>
          <p className="text-sm text-muted-foreground">Configure as etapas do formulário de proposta.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" /> Nova Etapa
        </Button>
      </div>

      <div className="space-y-2">
        {stages.map((stage: any) => (
          <Card key={stage.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center p-0">
                {stage.position + 1}
              </Badge>

              {editingId === stage.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      updateMutation.mutate({ id: stage.id, updates: { name: editName } });
                      setEditingId(null);
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  <span className="font-medium">{stage.name}</span>
                  {stage.is_required && (
                    <Badge variant="secondary" className="text-xs">Obrigatória</Badge>
                  )}
                  {!stage.is_active && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Inativa</Badge>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Obrigatória</Label>
                <Switch
                  checked={stage.is_required}
                  onCheckedChange={(v) =>
                    updateMutation.mutate({ id: stage.id, updates: { is_required: v } })
                  }
                />
                <Label className="text-xs text-muted-foreground ml-2">Ativa</Label>
                <Switch
                  checked={stage.is_active}
                  onCheckedChange={(v) =>
                    updateMutation.mutate({ id: stage.id, updates: { is_active: v } })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingId(stage.id);
                    setEditName(stage.name);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => {
                    if (confirm('Remover esta etapa?')) deleteMutation.mutate(stage.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {adding && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex-1 flex items-center gap-2">
                <Input
                  placeholder="Nome da nova etapa"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="h-8"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => newStageName.trim() && createMutation.mutate(newStageName.trim())}
                  disabled={!newStageName.trim()}
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