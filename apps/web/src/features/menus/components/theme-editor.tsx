import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { THEME_PRESETS, FONT_OPTIONS, type ThemeConfig, type MenuLayout } from '@menucraft/shared-types';
import { cn } from '@/lib/utils';
import { LayoutList, LayoutGrid, List } from 'lucide-react';

interface ThemeEditorProps {
  value: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#3b82f6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  fontFamily: 'Inter',
  borderRadius: 8,
  layout: 'list',
  showImages: true,
  showDescriptions: true,
  showPrices: true,
  showTags: true,
};

const LAYOUT_OPTIONS: { id: MenuLayout; label: string; icon: typeof LayoutList }[] = [
  { id: 'list', label: 'List', icon: LayoutList },
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
  { id: 'compact', label: 'Compact', icon: List },
];

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-md border">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-1 h-12 w-12 cursor-pointer border-0"
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 font-mono text-xs uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}

export function ThemeEditor({ value, onChange }: ThemeEditorProps) {
  const theme = { ...DEFAULT_THEME, ...value };

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    onChange({ ...theme, ...updates });
  };

  const applyPreset = (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onChange(preset.config);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preset Selection */}
      <div className="space-y-3">
        <Label>Theme Presets</Label>
        <div className="grid grid-cols-2 gap-2">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary',
                theme.primaryColor === preset.config.primaryColor &&
                  theme.backgroundColor === preset.config.backgroundColor &&
                  'border-primary ring-1 ring-primary'
              )}
            >
              <div
                className="h-8 w-8 rounded-md border"
                style={{
                  backgroundColor: preset.config.backgroundColor,
                  borderColor: preset.config.primaryColor,
                }}
              >
                <div
                  className="m-1 h-6 w-6 rounded"
                  style={{ backgroundColor: preset.config.primaryColor }}
                />
              </div>
              <span className="text-sm font-medium">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="space-y-3">
        <Label>Custom Colors</Label>
        <div className="grid grid-cols-3 gap-3">
          <ColorPicker
            label="Primary"
            value={theme.primaryColor}
            onChange={(primaryColor) => updateTheme({ primaryColor })}
          />
          <ColorPicker
            label="Background"
            value={theme.backgroundColor}
            onChange={(backgroundColor) => updateTheme({ backgroundColor })}
          />
          <ColorPicker
            label="Text"
            value={theme.textColor}
            onChange={(textColor) => updateTheme({ textColor })}
          />
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-3">
        <Label>Typography</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Font Family</Label>
            <Select value={theme.fontFamily} onValueChange={(fontFamily) => updateTheme({ fontFamily })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Border Radius</Label>
            <Select
              value={String(theme.borderRadius)}
              onValueChange={(value) => updateTheme({ borderRadius: Number(value) })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None (0px)</SelectItem>
                <SelectItem value="4">Small (4px)</SelectItem>
                <SelectItem value="8">Medium (8px)</SelectItem>
                <SelectItem value="12">Large (12px)</SelectItem>
                <SelectItem value="16">XL (16px)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Layout Options */}
      <div className="space-y-3">
        <Label>Layout Style</Label>
        <div className="grid grid-cols-3 gap-2">
          {LAYOUT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = (theme.layout || 'list') === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => updateTheme({ layout: option.id })}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border p-3 transition-all hover:border-primary',
                  isSelected && 'border-primary ring-1 ring-primary'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Display Options */}
      <div className="space-y-3">
        <Label>Display Options</Label>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-images"
              checked={theme.showImages !== false}
              onCheckedChange={(checked) => updateTheme({ showImages: checked === true })}
            />
            <Label htmlFor="show-images" className="text-sm font-normal cursor-pointer">
              Show item images
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-descriptions"
              checked={theme.showDescriptions !== false}
              onCheckedChange={(checked) => updateTheme({ showDescriptions: checked === true })}
            />
            <Label htmlFor="show-descriptions" className="text-sm font-normal cursor-pointer">
              Show descriptions
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-prices"
              checked={theme.showPrices !== false}
              onCheckedChange={(checked) => updateTheme({ showPrices: checked === true })}
            />
            <Label htmlFor="show-prices" className="text-sm font-normal cursor-pointer">
              Show prices
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-tags"
              checked={theme.showTags !== false}
              onCheckedChange={(checked) => updateTheme({ showTags: checked === true })}
            />
            <Label htmlFor="show-tags" className="text-sm font-normal cursor-pointer">
              Show dietary tags & badges
            </Label>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-3">
        <Label>Preview</Label>
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: theme.backgroundColor,
            fontFamily: theme.fontFamily,
            borderRadius: theme.borderRadius,
          }}
        >
          <h3
            className="text-lg font-bold"
            style={{ color: theme.textColor }}
          >
            Sample Menu Item
          </h3>
          {theme.showDescriptions !== false && (
            <p
              className="mt-1 text-sm opacity-70"
              style={{ color: theme.textColor }}
            >
              A delicious description of this menu item.
            </p>
          )}
          <div className="mt-3 flex items-center justify-between">
            {theme.showTags !== false && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{
                  backgroundColor: theme.primaryColor,
                  borderRadius: theme.borderRadius / 2,
                }}
              >
                Vegetarian
              </span>
            )}
            {theme.showPrices !== false && (
              <span
                className="font-bold"
                style={{ color: theme.primaryColor }}
              >
                $12.99
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(DEFAULT_THEME)}
        className="w-full"
      >
        Reset to Default
      </Button>
    </div>
  );
}
