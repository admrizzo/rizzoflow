import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowRightCircle, FileCheck, MessageSquare, MapPin } from 'lucide-react';

interface CloneToCaptacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardTitle: string;
  onConfirm: (archiveOriginal: boolean) => void;
  isPending: boolean;
}

export function CloneToCaptacaoDialog({
  open,
  onOpenChange,
  cardTitle,
  onConfirm,
  isPending,
}: CloneToCaptacaoDialogProps) {
  const [archiveOriginal, setArchiveOriginal] = useState(true);

  const handleConfirm = () => {
    onConfirm(archiveOriginal);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowRightCircle className="h-5 w-5 text-primary" />
            Enviar para Captação
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            <p className="mb-4">
              O card <strong>"{cardTitle}"</strong> será clonado para o Fluxo de Captação.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              <p className="font-medium text-foreground mb-2">Dados que serão transferidos:</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Endereço do imóvel</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileCheck className="h-4 w-4" />
                <span>ID Superlógica</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileCheck className="h-4 w-4" />
                <span>Detalhes da negociação</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>Histórico de comentários</span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="archive-original"
              checked={archiveOriginal}
              onCheckedChange={(checked) => setArchiveOriginal(checked === true)}
            />
            <Label 
              htmlFor="archive-original" 
              className="text-sm font-normal cursor-pointer"
            >
              Arquivar card original no Fluxo de Rescisão
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-primary"
          >
            {isPending ? 'Clonando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
