import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useForceRefresh } from '@/hooks/useForceRefresh';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function ForceRefreshButton() {
  const { triggerForceRefresh, isAdmin } = useForceRefresh();
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  const handleTrigger = async () => {
    try {
      await triggerForceRefresh.mutateAsync();
      toast.success('Atualização forçada enviada para todos os usuários!');
      setOpen(false);
    } catch (error) {
      console.error('Erro ao forçar atualização:', error);
      toast.error('Erro ao forçar atualização');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Forçar Atualização
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Forçar atualização para todos?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso exibirá um aviso de atualização obrigatória para todos os
            usuários que estiverem logados no sistema. Eles precisarão recarregar
            a página para continuar usando o sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleTrigger}
            disabled={triggerForceRefresh.isPending}
            className="gap-2"
          >
            {triggerForceRefresh.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
