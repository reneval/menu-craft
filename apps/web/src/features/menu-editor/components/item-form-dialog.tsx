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
import {
  useCreateItem,
  useGenerateDescription,
  useSuggestPrice,
  useSuggestTags,
  useAIStatus,
} from '@menucraft/api-client';
import type { DietaryTag, Allergen, ItemBadge } from '@menucraft/shared-types';
import { ITEM_BADGES } from '@menucraft/shared-types';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Sparkles } from 'lucide-react';
import { DIETARY_TAGS, ALLERGENS } from '../constants/dietary-options';
import { TagSelector } from './tag-selector';
import { ImageUpload } from '@/components/image-upload';
import { ItemOptionsEditor, type ItemOption } from './item-options-editor';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

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
  const { data: aiStatus } = useAIStatus(orgId);
  const generateDescription = useGenerateDescription(orgId);
  const suggestPrice = useSuggestPrice(orgId);
  const suggestTags = useSuggestTags(orgId);

  const isAIAvailable = aiStatus?.available ?? false;

  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      toast({
        title: 'Enter item name first',
        description: 'Please enter an item name before generating a description.',
        variant: 'destructive',
      });
      return;
    }

    generateDescription.mutate(
      {
        itemName: name.trim(),
        category: sectionName,
        existingDescription: description.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setDescription(data.description);
          toast({
            title: 'Description generated',
            description: 'AI-generated description has been applied.',
            variant: 'success',
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to generate description',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleSuggestPrice = async () => {
    if (!name.trim()) {
      toast({
        title: 'Enter item name first',
        description: 'Please enter an item name before suggesting a price.',
        variant: 'destructive',
      });
      return;
    }

    suggestPrice.mutate(
      {
        itemName: name.trim(),
        category: sectionName,
      },
      {
        onSuccess: (data) => {
          // Use mid price as default suggestion
          setPrice((data.mid / 100).toFixed(2));
          toast({
            title: 'Price suggested',
            description: `Suggested: $${(data.low / 100).toFixed(2)} - $${(data.high / 100).toFixed(2)}. Using mid-range.`,
            variant: 'success',
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to suggest price',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleSuggestTags = async () => {
    if (!name.trim()) {
      toast({
        title: 'Enter item name first',
        description: 'Please enter an item name before suggesting tags.',
        variant: 'destructive',
      });
      return;
    }

    suggestTags.mutate(
      {
        itemName: name.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setDietaryTags(data.dietaryTags as DietaryTag[]);
          setAllergens(data.allergens as Allergen[]);
          toast({
            title: 'Tags suggested',
            description: `Added ${data.dietaryTags.length} dietary tags and ${data.allergens.length} allergens.`,
            variant: 'success',
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to suggest tags',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

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
    <TooltipProvider>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="item-description">Description (optional)</Label>
                {isAIAvailable && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                        onClick={handleGenerateDescription}
                        disabled={generateDescription.isPending}
                      >
                        {generateDescription.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        <span className="ml-1 text-xs">Generate</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {description ? 'Improve description with AI' : 'Generate description with AI'}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <Textarea
                id="item-description"
                placeholder="A brief description of this item"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="item-price">Price (optional)</Label>
                {isAIAvailable && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                        onClick={handleSuggestPrice}
                        disabled={suggestPrice.isPending}
                      >
                        {suggestPrice.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        <span className="ml-1 text-xs">Suggest</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Suggest price with AI</TooltipContent>
                  </Tooltip>
                )}
              </div>
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

            {isAIAvailable && (
              <div className="flex justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                      onClick={handleSuggestTags}
                      disabled={suggestTags.isPending}
                    >
                      {suggestTags.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span className="ml-1 text-xs">Suggest Tags & Allergens</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>AI will suggest dietary tags and allergens</TooltipContent>
                </Tooltip>
              </div>
            )}

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
    </TooltipProvider>
  );
}
