import { useForceRefresh } from '@/hooks/useForceRefresh';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw } from 'lucide-react';

export function ForceRefreshPrompt() {
  const { showRefreshPrompt, refreshPage } = useForceRefresh();

  const handleRefresh = () => {
    // Use setTimeout to ensure the click event completes before reload
    window.setTimeout(() => {
      window.location.reload();
    }, 0);
  };

  if (!showRefreshPrompt) return null;

  return (
    <AlertDialog open={showRefreshPrompt} onOpenChange={() => {}}>
      <AlertDialogContent className="max-w-md" onEscapeKeyDown={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-lg">
              Nova versão disponível
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Uma atualização importante foi lançada. Por favor, atualize a página
            para garantir o funcionamento correto do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <button
            type="button"
            onClick={handleRefresh}
            className="w-full gap-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar agora
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
