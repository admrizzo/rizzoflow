import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { AlertTriangle } from 'lucide-react';

interface DoubleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  onConfirm: () => void;
  isDestructive?: boolean;
}

export function DoubleConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'EXCLUIR',
  onConfirm,
  isDestructive = true,
}: DoubleConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const isConfirmed = inputValue.toUpperCase() === confirmText.toUpperCase();

  // Reset input when dialog closes
  useEffect(() => {
    if (!open) {
      setInputValue('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>{description}</p>
            <div className="space-y-2 pt-2">
              <Label htmlFor="confirm-input" className="text-foreground font-medium">
                Digite <span className="font-bold text-destructive">{confirmText}</span> para confirmar:
              </Label>
              <Input
                id="confirm-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={confirmText}
                className="font-mono"
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            disabled={!isConfirmed}
            onClick={handleConfirm}
          >
            Confirmar Exclusão
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
