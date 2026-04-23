import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { Plus, Trash2, Save, Pencil, Check, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'cpf', label: 'CPF' },
  { value: 'select', label: 'Seleção' },
  { value: 'date', label: 'Data' },
  { value: 'upload', label: 'Upload' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'currency', label: 'Moeda (R$)' },
];

export function ProposalFieldsTab() {
  const queryClient = useQueryClient();
  const [addingToStage, setAddingToStage] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [newField, setNewField] = useState({ field_name: '', field_label: '', field_type: 'text', is_required: false, placeholder: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const { data: stages = [] } = useQuery({
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
        .select('*')
        .order('position');
      if (error) throw error;
      return data;
    },
  });

  const createField = useMutation({
    mutationFn: async (stageId: string) => {
      const stageFields = fields.filter((f: any) => f.stage_id === stageId);
      const maxPos = stageFields.length > 0 ? Math.max(...stageFields.map((f: any) => f.position)) + 1 : 0;
      const { error } = await supabase
        .from('proposal_stage_fields')
        .insert({
          stage_id: stageId,
          field_name: newField.field_name || newField.field_label.toLowerCase().replace(/\s+/g, '_'),
          field_label: newField.field_label,
          field_type: newField.field_type,
          is_required: newField.is_required,
          placeholder: newField.placeholder || null,
          position: maxPos,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-stage-fields'] });
      setAddingToStage(null);
      setNewField({ field_name: '', field_label: '', field_type: 'text', is_required: false, placeholder: '' });
      toast.success('Campo criado');
    },
  });

  const updateField = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('proposal_stage_fields')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-stage-fields'] });
      setEditingField(null);
      toast.success('Campo atualizado');
    },
  });

  const toggleField = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('proposal_stage_fields')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-stage-fields'] });
    },
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proposal_stage_fields')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-stage-fields'] });
      toast.success('Campo removido');
    },
  });

  const totalFields = fields.length;
  const activeFields = fields.filter((f: any) => f.is_active).length;
  const requiredFields = fields.filter((f: any) => f.is_required).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg">Campos por Etapa</h3>
        <p className="text-sm text-muted-foreground">Configure os campos que aparecem no formulário do cliente em cada etapa.</p>
      </div>

      <div className="flex gap-4 text-sm">
        <Badge variant="outline">{totalFields} campos total</Badge>
        <Badge variant="outline" className="text-green-700 border-green-300">{activeFields} ativos</Badge>
        <Badge variant="outline" className="text-amber-700 border-amber-300">{requiredFields} obrigatórios</Badge>
      </div>

      <Accordion type="multiple" defaultValue={stages.map((s: any) => s.id)}>
        {stages.map((stage: any) => {
          const stageFields = fields.filter((f: any) => f.stage_id === stage.id);
          return (
            <AccordionItem key={stage.id} value={stage.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stage.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {stageFields.length} campos
                  </Badge>
                  <Badge variant="outline" className="text-xs text-green-700">
                    {stageFields.filter((f: any) => f.is_active).length} ativos
                  </Badge>
                  {!stage.is_active && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Inativa</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pl-2">
                  {stageFields.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">Nenhum campo configurado para esta etapa.</p>
                  )}
                  {stageFields.map((field: any) => {
                    const isEditing = editingField === field.id;
                    return isEditing ? (
                      <Card key={field.id} className="border-primary/40">
                        <CardContent className="p-3 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Nome do campo</Label>
                              <Input
                                value={editData.field_label || ''}
                                onChange={(e) => setEditData({ ...editData, field_label: e.target.value })}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Tipo</Label>
                              <Select
                                value={editData.field_type || 'text'}
                                onValueChange={(v) => setEditData({ ...editData, field_type: v })}
                              >
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {FIELD_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Placeholder</Label>
                              <Input
                                value={editData.placeholder || ''}
                                onChange={(e) => setEditData({ ...editData, placeholder: e.target.value })}
                                className="h-8"
                                placeholder="Texto de exemplo"
                              />
                            </div>
                            <div className="flex items-end gap-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={editData.is_required || false}
                                  onCheckedChange={(v) => setEditData({ ...editData, is_required: v })}
                                />
                                <Label className="text-xs">Obrigatório</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={editData.is_active !== false}
                                  onCheckedChange={(v) => setEditData({ ...editData, is_active: v })}
                                />
                                <Label className="text-xs">Visível</Label>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateField.mutate({
                                id: field.id,
                                updates: {
                                  field_label: editData.field_label,
                                  field_type: editData.field_type,
                                  placeholder: editData.placeholder || null,
                                  is_required: editData.is_required,
                                  is_active: editData.is_active,
                                }
                              })}
                            >
                              <Check className="h-4 w-4 mr-1" /> Salvar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                              <X className="h-4 w-4 mr-1" /> Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div key={field.id} className={`flex items-center gap-3 border rounded-lg px-3 py-2 ${!field.is_active ? 'opacity-50' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium flex items-center gap-2">
                            {field.field_label}
                            {!field.is_active && <EyeOff className="h-3 w-3 text-muted-foreground" />}
                          </p>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] h-4">{FIELD_TYPES.find(t => t.value === field.field_type)?.label || field.field_type}</Badge>
                            {field.is_required && <span className="text-destructive font-medium">obrigatório</span>}
                            {field.placeholder && <span className="italic">"{field.placeholder}"</span>}
                          </div>
                        </div>
                        <Switch
                          checked={field.is_active}
                          onCheckedChange={(v) => toggleField.mutate({ id: field.id, is_active: v })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingField(field.id);
                            setEditData({
                              field_label: field.field_label,
                              field_type: field.field_type,
                              placeholder: field.placeholder || '',
                              is_required: field.is_required,
                              is_active: field.is_active,
                            });
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteTarget({ id: field.id, label: field.field_label })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}

                  {addingToStage === stage.id ? (
                    <Card className="border-dashed">
                      <CardContent className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Nome do campo</Label>
                            <Input
                              placeholder="Ex: Nome completo"
                              value={newField.field_label}
                              onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Tipo</Label>
                            <Select
                              value={newField.field_type}
                              onValueChange={(v) => setNewField({ ...newField, field_type: v })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map(t => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Placeholder</Label>
                            <Input
                              placeholder="Texto de exemplo"
                              value={newField.placeholder}
                              onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                              className="h-8"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={newField.is_required}
                                onCheckedChange={(v) => setNewField({ ...newField, is_required: v })}
                              />
                              <Label className="text-xs">Obrigatório</Label>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => newField.field_label.trim() && createField.mutate(stage.id)}
                            disabled={!newField.field_label.trim()}
                          >
                            <Save className="h-4 w-4 mr-1" /> Salvar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAddingToStage(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed"
                      onClick={() => setAddingToStage(stage.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Adicionar campo
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover campo "{deleteTarget?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Este campo será removido do formulário. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteField.mutate(deleteTarget.id);
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