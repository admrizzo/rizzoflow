import { useState } from 'react';
import { useProviderRegistry, RegisteredProvider } from '@/hooks/useProviderRegistry';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Pencil, X, Check, UserX, UserCheck, Phone, Link, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ProviderRegistryManager() {
  const { providers, isLoading, addProvider, updateProvider } = useProviderRegistry(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const filtered = providers
    .filter(p => showInactive || p.is_active)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const startEdit = (p: RegisteredProvider) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPhone(p.phone || '');
    setEditSpecialty(p.specialty || '');
    setEditNotes(p.notes || '');
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateProvider.mutate({
      id: editingId,
      name: editName.trim(),
      phone: editPhone.trim() || null,
      specialty: editSpecialty.trim() || null,
      notes: editNotes.trim() || null,
    }, {
      onSuccess: () => setEditingId(null),
    });
  };

  const toggleActive = (p: RegisteredProvider) => {
    updateProvider.mutate({ id: p.id, is_active: !p.is_active });
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addProvider.mutate({
      name: newName.trim(),
      phone: newPhone.trim() || undefined,
      specialty: newSpecialty.trim() || undefined,
      created_by: user?.id,
    }, {
      onSuccess: () => {
        setNewName('');
        setNewPhone('');
        setNewSpecialty('');
        setShowAdd(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gerencie o cadastro de prestadores de serviço disponíveis para o fluxo de manutenção.
      </p>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar prestador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
          className="h-9 text-xs whitespace-nowrap"
        >
          {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
        </Button>
        <Button size="sm" onClick={() => setShowAdd(true)} className="h-9 gap-1">
          <Plus className="h-3.5 w-3.5" />
          Novo
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <Label className="text-xs">Novo prestador</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Nome do prestador"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
              <Input
                placeholder="O que faz (ex: Eletricista)"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Telefone / WhatsApp"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim()} className="h-7 text-xs">
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewName(''); setNewPhone(''); setNewSpecialty(''); }} className="h-7 text-xs">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="h-[380px] pr-2">
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum prestador encontrado.
            </p>
          ) : (
            filtered.map((p) => (
              <Card key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-3">
                  {editingId === p.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Nome"
                          autoFocus
                        />
                        <Input
                          value={editSpecialty}
                          onChange={(e) => setEditSpecialty(e.target.value)}
                          placeholder="O que faz"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="Telefone"
                          className="h-8 text-sm"
                        />
                      </div>
                      <Input
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Observações"
                        className="h-8 text-sm"
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={saveEdit} className="h-7 text-xs gap-1">
                          <Check className="h-3 w-3" />
                          Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs gap-1">
                          <X className="h-3 w-3" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">{p.name}</span>
                        {p.specialty && (
                          <Badge variant="outline" className="text-[10px] font-normal">{p.specialty}</Badge>
                        )}
                        {p.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {p.phone}
                          </span>
                        )}
                        {!p.is_active && (
                          <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                        )}
                        {p.notes && (
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={p.notes}>
                            {p.notes}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const url = `${window.location.origin}/prestador/${p.slug}`;
                            navigator.clipboard.writeText(url);
                            toast({ title: 'Link copiado!', description: `Link do portal de ${p.name} copiado para a área de transferência.` });
                          }}
                          className="h-7 w-7 p-0"
                          title="Copiar link do portal"
                        >
                          <Link className="h-3.5 w-3.5 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(p)}
                          className="h-7 w-7 p-0"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(p)}
                          className="h-7 w-7 p-0"
                          title={p.is_active ? 'Desativar' : 'Reativar'}
                        >
                          {p.is_active ? (
                            <UserX className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5 text-green-600" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}