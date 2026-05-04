import { useState } from 'react';
import { Column, Department } from '@/types/database';
import { useColumns } from '@/hooks/useColumns';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ColumnHeaderProps {
  column: Column;
  cardCount: number;
}

const departmentLabels: Record<Department, string> = {
  comercial: 'comercial',
  juridico: 'jurídico',
  vistoriadores: 'vistoriadores',
  administrativo: 'administrativo',
};

export function ColumnHeader({ column, cardCount }: ColumnHeaderProps) {
  const { updateColumn, deleteColumn } = useColumns(column.board_id || undefined);
  const { isEditor, isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [editDepartment, setEditDepartment] = useState<Department | ''>(column.department || '');
  const [editColor, setEditColor] = useState(column.color);

  const handleSave = () => {
    updateColumn.mutate({
      id: column.id,
      name: editName,
      department: editDepartment || null,
      color: editColor,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir esta coluna? Os cards serão desassociados.')) {
      deleteColumn.mutate(column.id);
    }
  };

   return (
     <TooltipProvider>
       <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100/40 bg-slate-50/20">
         <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-[11px] text-slate-700 uppercase tracking-tight whitespace-normal break-words leading-tight flex-1">
                {column.name}
              </h3>
             <Tooltip>
               <TooltipTrigger asChild>
                 <span className="inline-flex items-center justify-center text-[10px] font-black text-slate-400 bg-white border border-slate-100 rounded-md px-1.5 h-[18px] min-w-[20px] shadow-xs cursor-help">
                   {cardCount}
                 </span>
               </TooltipTrigger>
               <TooltipContent>
                 <p>Ordem de entrada e urgências: de cima para baixo</p>
               </TooltipContent>
             </Tooltip>
           </div>
         </div>

        {isEditor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar coluna
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                   <DropdownMenuItem 
                     onClick={handleDelete}
                     className="text-destructive focus:text-destructive"
                   >
                     <Trash2 className="h-4 w-4 mr-2" />
                     Excluir coluna
                   </DropdownMenuItem>
                 </>
               )}
             </DropdownMenuContent>
           </DropdownMenu>
         )}
       </div>
 
       <Dialog open={isEditing} onOpenChange={setIsEditing}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Editar Coluna</DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Nome da Coluna</Label>
               <Input
                 value={editName}
                 onChange={(e) => setEditName(e.target.value)}
                 placeholder="Nome da coluna"
               />
             </div>
             <div className="space-y-2">
               <Label>Departamento Responsável</Label>
               <Select value={editDepartment} onValueChange={(v) => setEditDepartment(v as Department)}>
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
             <div className="space-y-2">
               <Label>Cor</Label>
               <div className="flex gap-2">
                 {['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#eab308'].map((color) => (
                   <button
                     key={color}
                     onClick={() => setEditColor(color)}
                     className={`w-8 h-8 rounded-full border-2 ${
                       editColor === color ? 'border-foreground' : 'border-transparent'
                     }`}
                     style={{ backgroundColor: color }}
                   />
                 ))}
               </div>
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsEditing(false)}>
               Cancelar
             </Button>
             <Button onClick={handleSave}>Salvar</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </TooltipProvider>
   );
 }
