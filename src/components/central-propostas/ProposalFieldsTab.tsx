import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Trash2, Save } from 'lucide-react';
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
];

export function ProposalFieldsTab() {
  const queryClient = useQueryClient();
  const [addingToStage, setAddingToStage] = useState<string | null>(null);
  const [newField, setNewField] = useState({ field_name: '', field_label: '', field_type: 'text', is_required: false, placeholder: '' });

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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Campos por Etapa</h3>
        <p className="text-sm text-muted-foreground">Configure os campos de cada etapa do formulário.</p>
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
                  {!stage.is_active && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Inativa</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pl-2">
                  {stageFields.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">Nenhum campo configurado.</p>
                  )}
                  {stageFields.map((field: any) => (
                    <div key={field.id} className="flex items-center gap-3 border rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{field.field_label}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{FIELD_TYPES.find(t => t.value === field.field_type)?.label || field.field_type}</span>
                          {field.is_required && <span className="text-destructive">obrigatório</span>}
                          {field.placeholder && <span>"{field.placeholder}"</span>}
                        </div>
                      </div>
                      <Switch
                        checked={field.is_active}
                        onCheckedChange={(v) => toggleField.mutate({ id: field.id, is_active: v })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => {
                          if (confirm('Remover este campo?')) deleteField.mutate(field.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}

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
    </div>
  );
}