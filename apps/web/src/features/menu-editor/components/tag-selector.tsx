import { Label } from '@/components/ui/label';

interface TagSelectorProps<T extends string> {
  label: string;
  options: readonly { readonly id: T; readonly label: string; readonly color?: string }[];
  selected: T[];
  onToggle: (tag: T) => void;
  variant?: 'primary' | 'warning' | 'badge';
}

export function TagSelector<T extends string>({
  label,
  options,
  selected,
  onToggle,
  variant = 'primary',
}: TagSelectorProps<T>) {
  const getButtonClasses = (isSelected: boolean, color?: string) => {
    const baseClasses = 'rounded-full px-3 py-1 text-xs transition-colors';

    if (isSelected) {
      if (variant === 'badge' && color) {
        return `${baseClasses} ${color} ring-2 ring-offset-1 ring-current`;
      }
      return variant === 'warning'
        ? `${baseClasses} bg-orange-500 text-white`
        : `${baseClasses} bg-primary text-primary-foreground`;
    }

    if (variant === 'badge' && color) {
      return `${baseClasses} ${color} opacity-50 hover:opacity-75`;
    }

    return `${baseClasses} bg-muted hover:bg-muted/80`;
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            className={getButtonClasses(selected.includes(option.id), option.color)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
