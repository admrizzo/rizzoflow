import * as React from "react";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { parseDateInput } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerInputProps {
  value?: Date | null;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled = false,
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // Sync input value with external value
  React.useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Auto-format: add slashes as user types
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 2) {
      val = digits;
    } else if (digits.length <= 4) {
      val = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      val = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
    
    setInputValue(val);
  };

  const commitInputValue = () => {
    if (!inputValue) return;
    if (inputValue.length === 10) {
      const parsed = parseDateInput(inputValue);
      if (parsed && isValid(parsed)) {
        setInputValue(format(parsed, "dd/MM/yyyy"));
        onChange(parsed);
        return;
      }
    }

    // Reset to previous valid value
    if (value && isValid(value)) {
      setInputValue(format(value, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
  };

  const handleInputBlur = () => {
    commitInputValue();
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    // Atualiza o input imediatamente para evitar atraso visual até
    // o re-render do componente pai vir com o novo `value`.
    if (date && isValid(date)) {
      setInputValue(format(date, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
    onChange(date);
    setOpen(false);
  };

  return (
    <div className={cn("flex gap-1", className)}>
      <Input
        type="text"
        placeholder="dd/mm/aaaa"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitInputValue();
          }
        }}
        disabled={disabled}
        className="flex-1 h-9 text-sm"
        maxLength={10}
      />
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[80] pointer-events-auto" align="end">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleCalendarSelect}
            locale={ptBR}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
