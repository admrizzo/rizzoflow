import { useState, useEffect } from 'react';
import { useBoards } from '@/hooks/useBoards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Board } from '@/types/database';

const PRESET_COLORS = [
  // Vibrantes
  '#f97316', '#ef4444', '#dc2626', '#f43f5e', '#ec4899', '#d946ef',
  '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4',
  '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b',
  // Escuros
  '#1e3a5f', '#1e40af', '#4338ca', '#6d28d9', '#7e22ce', '#a21caf',
  '#be185d', '#9f1239', '#991b1b', '#9a3412', '#b45309', '#a16207',
  '#4d7c0f', '#166534', '#047857', '#0f766e', '#0e7490', '#0369a1',
  '#1e3a8a', '#312e81', '#581c87', '#701a75', '#831843', '#7f1d1d',
  // Neutros/Tons
  '#0f172a', '#1f2937', '#374151', '#4b5563', '#64748b', '#78716c',
  '#57534e', '#44403c', '#292524', '#713f12', '#422006', '#1c1917',
  // Pastel/Suaves
  '#fca5a5', '#fdba74', '#fde047', '#bef264', '#86efac', '#6ee7b7',
  '#5eead4', '#67e8f9', '#7dd3fc', '#93c5fd', '#a5b4fc', '#c4b5fd',
  '#d8b4fe', '#f0abfc', '#f5d0fe', '#fbcfe8', '#fda4af', '#fecaca',
];

interface BoardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board?: Board | null;
}

export function BoardFormDialog({ open, onOpenChange, board }: BoardFormDialogProps) {
  const { createBoard, updateBoard } = useBoards();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!board;

  useEffect(() => {
    if (board) {
      setName(board.name);
      setDescription(board.description || '');
      setColor(board.color);
    } else {
      setName('');
      setDescription('');
      setColor(PRESET_COLORS[0]);
    }
  }, [board, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && board) {
        await updateBoard.mutateAsync({
          id: board.id,
          name: name.trim(),
          description: description.trim() || null,
          color,
        });
      } else {
        await createBoard.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Fluxo' : 'Novo Fluxo'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Altere as informações do fluxo de trabalho.'
              : 'Crie um novo fluxo de trabalho para organizar seus processos.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Fluxo *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Fluxo de Rescisão"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva brevemente o propósito deste fluxo..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === presetColor 
                      ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
