import { useState } from 'react';
import { CardTemplate } from '@/hooks/useCardTemplates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  File, 
  Home, 
  Key, 
  Building,
  CheckSquare,
  ArrowRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: CardTemplate[];
  onSelect: (template: CardTemplate, cardName: string) => void;
  isLoading?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  'file': <File className="h-6 w-6" />,
  'home': <Home className="h-6 w-6" />,
  'key': <Key className="h-6 w-6" />,
  'building': <Building className="h-6 w-6" />,
};

export function CardTemplateSelector({
  open,
  onOpenChange,
  templates,
  onSelect,
  isLoading,
}: CardTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate | null>(null);
  const [cardName, setCardName] = useState('');
  const [step, setStep] = useState<'select' | 'name'>('select');

  const handleTemplateClick = (template: CardTemplate) => {
    setSelectedTemplate(template);
    setStep('name');
    setCardName('');
  };

  const handleConfirm = () => {
    if (selectedTemplate && cardName.trim()) {
      onSelect(selectedTemplate, cardName.trim());
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setCardName('');
    setStep('select');
    onOpenChange(false);
  };

  const handleBack = () => {
    setStep('select');
    setSelectedTemplate(null);
    setCardName('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' ? 'Escolha um modelo de card' : 'Nomeie o card'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' 
              ? 'Selecione o tipo de demanda que você deseja criar'
              : `Modelo: ${selectedTemplate?.name}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className={cn(
                  "flex flex-col items-start gap-3 p-4 rounded-lg border-2 transition-all text-left",
                  "hover:border-primary hover:bg-primary/5",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                )}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-lg bg-muted">
                    {iconMap[template.icon] || <File className="h-6 w-6" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{template.name}</h3>
                  </div>
                </div>
                
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                )}

                {/* Labels */}
                {template.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.labels.map(label => (
                      <Badge 
                        key={label.id} 
                        style={{ backgroundColor: label.color }}
                        className="text-white text-xs"
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Checklists preview */}
                {template.checklists.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckSquare className="h-3 w-3" />
                    <span>{template.checklists.length} checklist(s)</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Selected template info */}
            {selectedTemplate && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 rounded-lg bg-background">
                  {iconMap[selectedTemplate.icon] || <File className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-medium">{selectedTemplate.name}</p>
                  {selectedTemplate.labels.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {selectedTemplate.labels.map(label => (
                        <Badge 
                          key={label.id} 
                          style={{ backgroundColor: label.color }}
                          className="text-white text-xs"
                        >
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Name input */}
            <div className="space-y-2">
              <Label htmlFor="card-name">Nome de identificação do card *</Label>
              <Input
                id="card-name"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Ex: Apartamento 301 - Ed. Central"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && cardName.trim()) {
                    handleConfirm();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Este nome será usado para identificar o card no quadro
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={handleBack}>
                Voltar
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={!cardName.trim() || isLoading}
              >
                Criar Card
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
