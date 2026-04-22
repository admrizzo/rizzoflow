import { useState } from 'react';
import { useProposalResponsibles } from '@/hooks/useProposalResponsibles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Check, X, UserCircle } from 'lucide-react';

export function ProposalResponsiblesManager() {
  const { responsibles, createResponsible, updateResponsible, deleteResponsible } = useProposalResponsibles();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      createResponsible.mutate(newName.trim(), {
        onSuccess: () => setNewName(''),
      });
    }
  };

  const handleEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      updateResponsible.mutate(
        { id: editingId, name: editName.trim() },
        { onSuccess: () => setEditingId(null) }
      );
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este responsável?')) {
      deleteResponsible.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="h-5 w-5" />
          Responsáveis por Propostas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="new-responsible" className="sr-only">
              Nome do responsável
            </Label>
            <Input
              id="new-responsible"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do responsável"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <Button onClick={handleCreate} disabled={!newName.trim() || createResponsible.isPending}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {responsibles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum responsável cadastrado
            </p>
          ) : (
            responsibles.map((responsible) => (
              <div
                key={responsible.id}
                className="flex items-center gap-2 p-2 rounded-lg border bg-background"
              >
                {editingId === responsible.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{responsible.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(responsible.id, responsible.name)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(responsible.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
