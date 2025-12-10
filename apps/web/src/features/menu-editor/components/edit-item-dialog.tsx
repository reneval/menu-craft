import { useState, useEffect } from 'react';
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
  useUpdateItem,
  useDeleteItem,
  type MenuItemWithOptions,
  useGenerateDescription,
  useSuggestPrice,
  useSuggestTags,
  useAIStatus,
} from '@menucraft/api-client';
import type { DietaryTag, Allergen, ItemBadge } from '@menucraft/shared-types';
import { ITEM_BADGES } from '@menucraft/shared-types';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DIETARY_TAGS, ALLERGENS } from '../constants/dietary-options';
import { TagSelector } from './tag-selector';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from '@/components/image-upload';
import { ItemOptionsEditor, type ItemOption } from './item-options-editor';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  venueId: string;
  menuId: string;
  sectionId: string;
  item: MenuItemWithOptions | null;
}

export function EditItemDialog({
  open,
  onOpenChange,
  orgId,
  venueId,
  menuId,
  sectionId,
  item,
}: EditItemDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [badges, setBadges] = useState<ItemBadge[]>([]);
  const [options, setOptions] = useState<ItemOption[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateItem = useUpdateItem(orgId, venueId, menuId, sectionId, item?.id || '');
  const deleteItem = useDeleteItem(orgId, venueId, menuId, sectionId);
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
      },
      {
        onSuccess: (data) => {
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

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || '');
      setPrice(item.priceAmount ? (item.priceAmount / 100).toFixed(2) : '');
      setImageUrl(item.imageUrl || null);
      setIsAvailable(item.isAvailable);
      setDietaryTags((item.dietaryTags as DietaryTag[]) || []);
      setAllergens((item.allergens as Allergen[]) || []);
      setBadges((item.badges as ItemBadge[]) || []);
      setOptions(
        (item.options || []).map((opt) => ({
          optionGroup: opt.optionGroup,
          name: opt.name,
          priceModifier: opt.priceModifier,
        }))
      );
    }
  }, [item]);

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

    if (!name.trim() || !item) return;

    const priceAmount = price ? Math.round(parseFloat(price) * 100) : null;

    // Filter out empty options
    const validOptions = options.filter((opt) => opt.name.trim() && opt.optionGroup.trim());

    updateItem.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        priceAmount,
        imageUrl,
        isAvailable,
        dietaryTags,
        allergens,
        badges,
        options: validOptions,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Item updated',
            description: `"${name}" has been updated.`,
            variant: 'success',
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: 'Failed to update item',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!item) return;

    deleteItem.mutate(item.id, {
      onSuccess: () => {
        toast({
          title: 'Item deleted',
          description: `"${item.name}" has been deleted.`,
          variant: 'success',
        });
        setDeleteDialogOpen(false);
        onOpenChange(false);
      },
      onError: (error) => {
        toast({
          title: 'Failed to delete item',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <TooltipProvider>
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>Update the item details.</DialogDescription>
            </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-item-name">Item Name</Label>
                <Input
                  id="edit-item-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-item-description">Description (optional)</Label>
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
                          <span className="ml-1 text-xs">{description ? 'Improve' : 'Generate'}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {description ? 'Improve description with AI' : 'Generate description with AI'}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Textarea
                  id="edit-item-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-item-price">Price</Label>
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
                    id="edit-item-price"
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
                <Label>Image</Label>
                <ImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  disabled={updateItem.isPending}
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

              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-item-available"
                  checked={isAvailable}
                  onCheckedChange={(checked) => setIsAvailable(checked === true)}
                />
                <Label htmlFor="edit-item-available" className="font-normal cursor-pointer">
                  Available for ordering
                </Label>
              </div>
            </div>
            <DialogFooter className="flex-row justify-between sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!name.trim() || updateItem.isPending}>
                  {updateItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{item?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteItem.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    </TooltipProvider>
  );
}
