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
  GripVertical, Plus, Pencil, Trash2, Save, X, Check, ChevronUp, ChevronDown, FileText, Users, HelpCircle, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export function ProposalStagesTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [newStageDescription, setNewStageDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [expandedFaqStage, setExpandedFaqStage] = useState<string | null>(null);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editFaqQuestion, setEditFaqQuestion] = useState('');
  const [editFaqAnswer, setEditFaqAnswer] = useState('');
  const [addingFaqStageId, setAddingFaqStageId] = useState<string | null>(null);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [deleteFaqTarget, setDeleteFaqTarget] = useState<{ id: string; question: string } | null>(null);

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

  const { data: faqs = [] } = useQuery({
    queryKey: ['proposal-stage-faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_stage_faqs')
        .select('*')
        .order('position');
      if (error) throw error;
      return data;
    },
  });

  const faqsByStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    faqs.forEach((f: any) => {
      if (!map[f.stage_id]) map[f.stage_id] = [];
      map[f.stage_id].push(f);
    });
    return map;
  }, [faqs]);

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

  const createFaqMutation = useMutation({
    mutationFn: async ({ stageId, question, answer }: { stageId: string; question: string; answer: string }) => {
      const stageFaqs = faqsByStage[stageId] || [];
      const maxPos = stageFaqs.length > 0 ? Math.max(...stageFaqs.map((f: any) => f.position)) + 1 : 0;
      const { error } = await supabase
        .from('proposal_stage_faqs')
        .insert({ stage_id: stageId, question, answer, position: maxPos });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-stage-faqs'] });
      setAddingFaqStageId(null);
      setNewFaqQuestion('');
      setNewFaqAnswer('');
      toast.success('FAQ adicionada');
    },
  });

  const updateFaqMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('proposal_stage_faqs')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-stage-faqs'] });
      setEditingFaqId(null);
      toast.success('FAQ atualizada');
    },
  });

  const deleteFaqMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proposal_stage_faqs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-stage-faqs'] });
      toast.success('FAQ removida');
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
        {stages.map((stage: any, idx: number) => {
          const stageFaqs = faqsByStage[stage.id] || [];
          const isExpanded = expandedFaqStage === stage.id;
          return (
            <Card key={stage.id} className={!stage.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4 space-y-0">
                <div className="flex items-center gap-3">
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
                        <Badge
                          variant="outline"
                          className="text-xs gap-1 cursor-pointer hover:bg-accent"
                          onClick={() => setExpandedFaqStage(isExpanded ? null : stage.id)}
                        >
                          <HelpCircle className="h-3 w-3" />
                          {stageFaqs.length} FAQs
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
                </div>

                {/* FAQ section */}
                {isExpanded && (
                  <div className="mt-3 ml-16 border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium flex items-center gap-1.5">
                        <HelpCircle className="h-4 w-4 text-primary" />
                        FAQs — {stage.name}
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => { setAddingFaqStageId(stage.id); setNewFaqQuestion(''); setNewFaqAnswer(''); }}
                        disabled={addingFaqStageId === stage.id}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar FAQ
                      </Button>
                    </div>

                    {stageFaqs.length === 0 && addingFaqStageId !== stage.id && (
                      <p className="text-xs text-muted-foreground italic">Nenhuma FAQ cadastrada para esta etapa.</p>
                    )}

                    {stageFaqs.map((faq: any) => (
                      <div key={faq.id} className="border rounded-md p-3 space-y-1.5 bg-muted/30">
                        {editingFaqId === faq.id ? (
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Pergunta</Label>
                              <Input
                                value={editFaqQuestion}
                                onChange={(e) => setEditFaqQuestion(e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Resposta</Label>
                              <Textarea
                                value={editFaqAnswer}
                                onChange={(e) => setEditFaqAnswer(e.target.value)}
                                className="text-sm min-h-[60px]"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                disabled={!editFaqQuestion.trim() || !editFaqAnswer.trim()}
                                onClick={() => updateFaqMutation.mutate({ id: faq.id, updates: { question: editFaqQuestion.trim(), answer: editFaqAnswer.trim() } })}
                              >
                                <Check className="h-3 w-3 mr-1" /> Salvar
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingFaqId(null)}>
                                Cancelar
                              </Button>
                              <div className="flex items-center gap-1 ml-auto">
                                <Label className="text-[10px] text-muted-foreground">Ativa</Label>
                                <Switch
                                  checked={faq.is_active}
                                  onCheckedChange={(v) => updateFaqMutation.mutate({ id: faq.id, updates: { is_active: v } })}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{faq.question}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{faq.answer}</p>
                              {!faq.is_active && (
                                <Badge variant="outline" className="text-[10px] mt-1 text-muted-foreground">Inativa</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => {
                                  setEditingFaqId(faq.id);
                                  setEditFaqQuestion(faq.question);
                                  setEditFaqAnswer(faq.answer);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                onClick={() => setDeleteFaqTarget({ id: faq.id, question: faq.question })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {addingFaqStageId === stage.id && (
                      <div className="border border-dashed border-primary/40 rounded-md p-3 space-y-2">
                        <div>
                          <Label className="text-xs">Pergunta</Label>
                          <Input
                            value={newFaqQuestion}
                            onChange={(e) => setNewFaqQuestion(e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Ex: Quais documentos são necessários?"
                            autoFocus
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Resposta</Label>
                          <Textarea
                            value={newFaqAnswer}
                            onChange={(e) => setNewFaqAnswer(e.target.value)}
                            className="text-sm min-h-[60px]"
                            placeholder="Resposta detalhada..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={!newFaqQuestion.trim() || !newFaqAnswer.trim()}
                            onClick={() => createFaqMutation.mutate({ stageId: stage.id, question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() })}
                          >
                            <Save className="h-3 w-3 mr-1" /> Salvar FAQ
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingFaqStageId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

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

      {/* Delete FAQ confirmation */}
      <AlertDialog open={!!deleteFaqTarget} onOpenChange={(open) => !open && setDeleteFaqTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteFaqTarget?.question}" — Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteFaqTarget) deleteFaqMutation.mutate(deleteFaqTarget.id);
                setDeleteFaqTarget(null);
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