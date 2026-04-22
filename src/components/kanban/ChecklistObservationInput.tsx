import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface ChecklistObservationInputProps {
  value: string | null;
  isEditor: boolean;
  placeholder?: string;
  className?: string;
  onSave: (nextValue: string | null) => void;
}

/**
 * Avoids mutating the backend on every keystroke (which can cause the textarea to reset
 * due to query invalidations). Saves only on blur.
 */
export function ChecklistObservationInput({
  value,
  isEditor,
  placeholder,
  className,
  onSave,
}: ChecklistObservationInputProps) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) setLocalValue(value ?? "");
  }, [value]);

  const commit = () => {
    const normalized = localValue.trim() ? localValue : "";
    const next = normalized ? normalized : null;
    const prev = value ?? null;
    if (next !== prev) onSave(next);
  };

  return (
    <Textarea
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={() => { isFocusedRef.current = true; }}
      onBlur={() => {
        isFocusedRef.current = false;
        if (!isEditor) return;
        commit();
      }}
      placeholder={placeholder}
      className={className}
      disabled={!isEditor}
    />
  );
}
