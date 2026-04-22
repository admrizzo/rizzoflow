import { useState } from 'react';
import { useColumns } from '@/hooks/useColumns';
import { useAuth } from '@/contexts/AuthContext';
import { Department } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface AddColumnButtonProps {
  boardId: string;
}

export function AddColumnButton({ boardId }: AddColumnButtonProps) {
  const { createColumn } = useColumns(boardId);
  const { isEditor } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<Department | ''>('');
  const [color, setColor] = useState('#f97316');

  if (!isEditor) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createColumn.mutate(
      { 
        name: name.trim(), 
        department: department || undefined,
        color,
        board_id: boardId,
      },
      {
        onSuccess: () => {
          setName('');
          setDepartment('');
          setColor('#f97316');
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="flex-shrink-0 w-72 h-10 justify-start bg-white/30 hover:bg-white/50 text-white backdrop-blur-sm rounded-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar outra lista
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova Lista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Lista</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Em Análise"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Departamento Responsável</Label>
              <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="juridico">Jurídico</SelectItem>
                  <SelectItem value="vistoriadores">Vistoriadores</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createColumn.isPending}>
              Criar Lista
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
