import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfiles } from '@/hooks/useProfiles';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MentionTextarea({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  className,
}: MentionTextareaProps) {
  const { profiles } = useProfiles();
  const isMobile = useIsMobile();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const normalize = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return profiles.slice(0, 8);
    const norm = normalize(searchTerm);
    return profiles
      .filter(p => normalize(p.full_name).includes(norm))
      .slice(0, 8);
  }, [profiles, searchTerm]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    // Check if we should show @mention suggestions
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex >= 0) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Show suggestions if @ is at start or preceded by whitespace, and no space in the search
      const charBeforeAt = lastAtIndex > 0 ? newValue[lastAtIndex - 1] : ' ';
      if ((charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) && !textAfterAt.includes(' ')) {
        setMentionStart(lastAtIndex);
        setSearchTerm(textAfterAt);
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }
    }
    
    setShowSuggestions(false);
    setMentionStart(null);
  }, [onChange]);

  const insertMention = useCallback((profileName: string) => {
    if (mentionStart === null) return;
    
    const before = value.slice(0, mentionStart);
    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const after = value.slice(cursorPos);
    const newValue = `${before}@${profileName} ${after}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(null);
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + profileName.length + 2; // @name + space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [mentionStart, value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showSuggestions && filteredProfiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredProfiles.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredProfiles[selectedIndex].full_name);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }
    
    // On mobile/tablet, Enter inserts newline (default behavior); on desktop, Enter submits
    if (e.key === 'Enter' && !showSuggestions) {
      if (!isMobile && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
      // On mobile: let Enter insert newline naturally
    }
  }, [showSuggestions, filteredProfiles, selectedIndex, insertMention, onSubmit, isMobile]);

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getInitials = (name: string) =>
    name.split(' ').map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        className={cn("resize-none text-sm", className)}
      />
      
      {showSuggestions && filteredProfiles.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto"
          style={{ zIndex: 9999 }}
        >
          {filteredProfiles.map((profile, index) => (
            <button
              key={profile.user_id}
              type="button"
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left",
                index === selectedIndex && "bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(profile.full_name);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                <AvatarFallback className="text-[9px] bg-primary/10">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <span>{profile.full_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Parse @mentions from comment text and return the user_ids of mentioned users.
 * Matches full profile names after @ by checking against known profiles.
 */
export function extractMentionedUserIds(
  text: string,
  profiles: Array<{ user_id: string; full_name: string }>
): string[] {
  const mentioned: string[] = [];
  
  // Sort profiles by name length descending to match longest names first
  const sorted = [...profiles].sort((a, b) => b.full_name.length - a.full_name.length);
  
  for (const profile of sorted) {
    const pattern = `@${profile.full_name}`;
    if (text.toLowerCase().includes(pattern.toLowerCase()) && !mentioned.includes(profile.user_id)) {
      mentioned.push(profile.user_id);
    }
  }
  
  return mentioned;
}

/**
 * Render comment text with highlighted @mentions.
 * Matches full profile names after @ by checking against known profiles.
 */
export function renderMentionText(text: string, profiles: Array<{ user_id: string; full_name: string }>) {
  const parts: Array<{ type: 'text' | 'mention'; content: string }> = [];
  
  // Sort profiles by name length descending to match longest names first
  const sorted = [...profiles].sort((a, b) => b.full_name.length - a.full_name.length);
  
  // Build a list of mention positions
  const mentions: Array<{ start: number; end: number; name: string }> = [];
  
  for (const profile of sorted) {
    const searchLower = text.toLowerCase();
    const patternLower = `@${profile.full_name.toLowerCase()}`;
    let idx = 0;
    while ((idx = searchLower.indexOf(patternLower, idx)) !== -1) {
      // Check it doesn't overlap with an already found mention
      const end = idx + patternLower.length;
      const overlaps = mentions.some(m => idx < m.end && end > m.start);
      if (!overlaps) {
        mentions.push({ start: idx, end, name: profile.full_name });
      }
      idx = end;
    }
  }
  
  if (mentions.length === 0) {
    return [{ type: 'text' as const, content: text }];
  }
  
  // Sort by position
  mentions.sort((a, b) => a.start - b.start);
  
  let lastIndex = 0;
  for (const m of mentions) {
    if (m.start > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, m.start) });
    }
    parts.push({ type: 'mention', content: `@${m.name}` });
    lastIndex = m.end;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
  
  return parts;
}
