import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ItemOption {
  optionGroup: string;
  name: string;
  priceModifier: number;
}

interface OptionGroup {
  name: string;
  options: { name: string; priceModifier: number }[];
}

interface ItemOptionsEditorProps {
  value: ItemOption[];
  onChange: (options: ItemOption[]) => void;
}

export function ItemOptionsEditor({ value, onChange }: ItemOptionsEditorProps) {
  const [newGroupName, setNewGroupName] = useState('');

  // Group options by optionGroup
  const groups: OptionGroup[] = [];
  const groupMap = new Map<string, { name: string; priceModifier: number }[]>();

  value.forEach((opt) => {
    if (!groupMap.has(opt.optionGroup)) {
      groupMap.set(opt.optionGroup, []);
    }
    groupMap.get(opt.optionGroup)!.push({
      name: opt.name,
      priceModifier: opt.priceModifier,
    });
  });

  groupMap.forEach((options, name) => {
    groups.push({ name, options });
  });

  const flattenGroups = (groups: OptionGroup[]): ItemOption[] => {
    return groups.flatMap((group) =>
      group.options.map((opt) => ({
        optionGroup: group.name,
        name: opt.name,
        priceModifier: opt.priceModifier,
      }))
    );
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroups = [...groups, { name: newGroupName.trim(), options: [] }];
    onChange(flattenGroups(newGroups));
    setNewGroupName('');
  };

  const removeGroup = (groupIndex: number) => {
    const newGroups = groups.filter((_, i) => i !== groupIndex);
    onChange(flattenGroups(newGroups));
  };

  const updateGroupName = (groupIndex: number, newName: string) => {
    const newGroups = groups.map((group, i) =>
      i === groupIndex ? { ...group, name: newName } : group
    );
    onChange(flattenGroups(newGroups));
  };

  const addOption = (groupIndex: number) => {
    const newGroups = groups.map((group, i) =>
      i === groupIndex
        ? { ...group, options: [...group.options, { name: '', priceModifier: 0 }] }
        : group
    );
    onChange(flattenGroups(newGroups));
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const newGroups = groups.map((group, i) =>
      i === groupIndex
        ? { ...group, options: group.options.filter((_, oi) => oi !== optionIndex) }
        : group
    );
    onChange(flattenGroups(newGroups));
  };

  const updateOption = (
    groupIndex: number,
    optionIndex: number,
    field: 'name' | 'priceModifier',
    value: string | number
  ) => {
    const newGroups = groups.map((group, i) =>
      i === groupIndex
        ? {
            ...group,
            options: group.options.map((opt, oi) =>
              oi === optionIndex ? { ...opt, [field]: value } : opt
            ),
          }
        : group
    );
    onChange(flattenGroups(newGroups));
  };

  return (
    <div className="space-y-4">
      <Label>Options & Modifiers</Label>
      <p className="text-xs text-muted-foreground">
        Add option groups like "Size", "Add-ons", or "Cooking preference" with choices.
      </p>

      {groups.length === 0 && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No options added yet. Add a group to get started.
        </div>
      )}

      {groups.map((group, groupIndex) => (
        <div
          key={groupIndex}
          className="rounded-lg border bg-muted/30 p-3 space-y-3"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
            <Input
              value={group.name}
              onChange={(e) => updateGroupName(groupIndex, e.target.value)}
              placeholder="Group name (e.g., Size)"
              className="flex-1 font-medium"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeGroup(groupIndex)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 pl-6">
            {group.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-2">
                <Input
                  value={option.name}
                  onChange={(e) =>
                    updateOption(groupIndex, optionIndex, 'name', e.target.value)
                  }
                  placeholder="Option name"
                  className="flex-1"
                />
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    +$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    value={option.priceModifier / 100 || ''}
                    onChange={(e) =>
                      updateOption(
                        groupIndex,
                        optionIndex,
                        'priceModifier',
                        Math.round(parseFloat(e.target.value || '0') * 100)
                      )
                    }
                    placeholder="0.00"
                    className="pl-6 text-right"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(groupIndex, optionIndex)}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addOption(groupIndex)}
              className="text-xs"
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Option
            </Button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New group name (e.g., Size, Toppings)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addGroup();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={addGroup}
          disabled={!newGroupName.trim()}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Group
        </Button>
      </div>
    </div>
  );
}
