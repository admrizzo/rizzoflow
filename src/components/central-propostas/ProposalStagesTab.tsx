import { useState, useMemo } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  GripVertical, Plus, Pencil, Trash2, Save, X, Check, ChevronUp, ChevronDown, FileText, Users
} from 'lucide-react';
import { toast } from 'sonner';

export function ProposalStagesTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [newStageDescription, setNewStageDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

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

  const { data: fields = [] } = useQuery({
    queryKey: ['proposal-stage-fields'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_stage_fields')
        .select('id, stage_id')
        .order('position');
      if (error) throw error;
      return data;
    },
  });

  const fieldCountByStage = useMemo(() => {
    const map: Record<string, number> = {};
    fields.forEach((f: any) => {
      map[f.stage_id] = (map[f.stage_id] || 0) + 1;
    });
    return map;
  }, [fields]);

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

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newPosition }: { id: string; newPosition: number }) => {
      const sorted = [...stages].sort((a: any, b: any) => a.position - b.position);
      const currentIndex = sorted.findIndex((s: any) => s.id === id);
      if (currentIndex === -1) return;
      const moved = sorted.splice(currentIndex, 1)[0];
      sorted.splice(newPosition, 0, moved);
      for (let i = 0; i < sorted.length; i++) {
        if ((sorted[i] as any).position !== i) {
          await supabase.from('proposal_stages').update({ position: i }).eq('id', (sorted[i] as any).id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-stages'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const maxPos = stages.length > 0 ? Math.max(...stages.map((s: any) => s.position)) + 1 : 0;
      const { error } = await supabase
        .from('proposal_stages')
        .insert({ name, slug: `${slug}-${Date.now()}`, position: maxPos, description: newStageDescription || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-stages'] });
      setNewStageName('');
      setNewStageDescription('');
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
          <h3 className="font-semibold text-lg">Etapas da Proposta</h3>
          <p className="text-sm text-muted-foreground">Configure a ordem, visibilidade e obrigatoriedade de cada etapa do formulário.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" /> Nova Etapa
        </Button>
      </div>

      {/* Summary bar */}
      <div className="flex gap-4 text-sm">
        <Badge variant="outline" className="gap-1">
          <FileText className="h-3 w-3" /> {stages.length} etapas
        </Badge>
        <Badge variant="outline" className="gap-1 text-green-700 border-green-300">
          {stages.filter((s: any) => s.is_active).length} ativas
        </Badge>
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          {stages.filter((s: any) => !s.is_active).length} inativas
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" /> {fields.length} campos total
        </Badge>
      </div>

      <div className="space-y-2">
        {stages.map((stage: any, idx: number) => (
          <Card key={stage.id} className={!stage.is_active ? 'opacity-60' : ''}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost" size="icon" className="h-5 w-5"
                  disabled={idx === 0}
                  onClick={() => reorderMutation.mutate({ id: stage.id, newPosition: idx - 1 })}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-5 w-5"
                  disabled={idx === stages.length - 1}
                  onClick={() => reorderMutation.mutate({ id: stage.id, newPosition: idx + 1 })}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              <Badge variant="outline" className="text-xs w-7 h-7 flex items-center justify-center p-0 font-bold">
                {stage.position + 1}
              </Badge>

              {editingId === stage.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                      placeholder="Nome da etapa"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        updateMutation.mutate({ id: stage.id, updates: { name: editName, description: editDescription || null } });
                        setEditingId(null);
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Descrição (opcional)"
                  />
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stage.name}</span>
                    {stage.is_required && (
                      <Badge variant="secondary" className="text-xs">Obrigatória</Badge>
                    )}
                    {!stage.is_active && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Inativa</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {fieldCountByStage[stage.id] || 0} campos
                    </Badge>
                  </div>
                  {stage.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col items-center gap-0.5">
                  <Label className="text-[10px] text-muted-foreground">Obrigatória</Label>
                  <Switch
                    checked={stage.is_required}
                    onCheckedChange={(v) =>
                      updateMutation.mutate({ id: stage.id, updates: { is_required: v } })
                    }
                  />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Label className="text-[10px] text-muted-foreground">Ativa</Label>
                  <Switch
                    checked={stage.is_active}
                    onCheckedChange={(v) =>
                      updateMutation.mutate({ id: stage.id, updates: { is_active: v } })
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingId(stage.id);
                    setEditName(stage.name);
                    setEditDescription(stage.description || '');
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => setDeleteTarget({ id: stage.id, name: stage.name })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {adding && (
          <Card className="border-dashed border-primary/40">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome da etapa</Label>
                  <Input
                    placeholder="Ex: Documentos Complementares"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    className="h-8"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs">Descrição (opcional)</Label>
                  <Input
                    placeholder="Breve descrição da etapa"
                    value={newStageDescription}
                    onChange={(e) => setNewStageDescription(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => newStageName.trim() && createMutation.mutate(newStageName.trim())}
                  disabled={!newStageName.trim()}
                >
                  <Save className="h-4 w-4 mr-1" /> Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewStageName(''); setNewStageDescription(''); }}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover etapa "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os campos associados a esta etapa também serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
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