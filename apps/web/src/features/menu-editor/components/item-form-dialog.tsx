import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateItem } from '@menucraft/api-client';
import type { DietaryTag, Allergen, ItemBadge } from '@menucraft/shared-types';
import { ITEM_BADGES } from '@menucraft/shared-types';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { DIETARY_TAGS, ALLERGENS } from '../constants/dietary-options';
import { TagSelector } from './tag-selector';
import { ImageUpload } from '@/components/image-upload';
import { ItemOptionsEditor, type ItemOption } from './item-options-editor';

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  venueId: string;
  menuId: string;
  sectionId: string;
  sectionName: string;
}

export function ItemFormDialog({
  open,
  onOpenChange,
  orgId,
  venueId,
  menuId,
  sectionId,
  sectionName,
}: ItemFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [badges, setBadges] = useState<ItemBadge[]>([]);
  const [options, setOptions] = useState<ItemOption[]>([]);

  const createItem = useCreateItem(orgId, venueId, menuId, sectionId);

  const toggleDietaryTag = (tag: DietaryTag) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleAllergen = (allergen: Allergen) => {
    setAllergens((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]
    );
  };

  const toggleBadge = (badge: ItemBadge) => {
    setBadges((prev) =>
      prev.includes(badge) ? prev.filter((b) => b !== badge) : [...prev, badge]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    const priceAmount = price ? Math.round(parseFloat(price) * 100) : undefined;

    // Filter out empty options
    const validOptions = options.filter((opt) => opt.name.trim() && opt.optionGroup.trim());

    createItem.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        priceType: 'fixed',
        priceAmount,
        imageUrl: imageUrl || undefined,
        dietaryTags,
        allergens,
        badges,
        isAvailable: true,
        options: validOptions.length > 0 ? validOptions : undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Item created',
            description: `"${name}" has been added to ${sectionName}.`,
            variant: 'success',
          });
          setName('');
          setDescription('');
          setPrice('');
          setImageUrl(null);
          setDietaryTags([]);
          setAllergens([]);
          setBadges([]);
          setOptions([]);
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: 'Failed to create item',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Item to {sectionName}</DialogTitle>
          <DialogDescription>
            Add a new menu item with details, dietary info, and allergens.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                placeholder="e.g., Caesar Salad, Grilled Salmon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-description">Description (optional)</Label>
              <Textarea
                id="item-description"
                placeholder="A brief description of this item"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Price (optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="item-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Image (optional)</Label>
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                disabled={createItem.isPending}
              />
            </div>

            <TagSelector
              label="Dietary Tags"
              options={DIETARY_TAGS}
              selected={dietaryTags}
              onToggle={toggleDietaryTag}
              variant="primary"
            />

            <TagSelector
              label="Contains Allergens"
              options={ALLERGENS}
              selected={allergens}
              onToggle={toggleAllergen}
              variant="warning"
            />

            <TagSelector
              label="Item Badges"
              options={ITEM_BADGES}
              selected={badges}
              onToggle={toggleBadge}
              variant="badge"
            />

            <ItemOptionsEditor value={options} onChange={setOptions} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createItem.isPending}>
              {createItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
