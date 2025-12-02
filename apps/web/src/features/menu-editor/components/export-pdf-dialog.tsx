import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileDown, Loader2 } from 'lucide-react';
import type { MenuWithSections } from '@menucraft/api-client';
import { generateMenuPDF } from '../utils/pdf-generator';
import { toast } from '@/components/ui/use-toast';

interface ExportPDFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: MenuWithSections;
  venueName: string;
}

export function ExportPDFDialog({
  open,
  onOpenChange,
  menu,
  venueName,
}: ExportPDFDialogProps) {
  const [showPrices, setShowPrices] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [showDietaryTags, setShowDietaryTags] = useState(true);
  const [layout, setLayout] = useState<'single' | 'two-column'>('single');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    setIsGenerating(true);

    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));

      generateMenuPDF(menu, {
        venueName,
        showPrices,
        showDescriptions,
        showDietaryTags,
        layout,
      });

      toast({
        title: 'PDF Generated',
        description: 'Your menu PDF has been downloaded.',
        variant: 'success',
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Failed to generate PDF',
        description: 'An error occurred while generating the PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const totalItems = menu.sections.reduce(
    (acc, section) => acc + section.items.filter((i) => i.isAvailable).length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Menu as PDF
          </DialogTitle>
          <DialogDescription>
            Generate a printable PDF version of your menu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview Info */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm font-medium">{menu.name}</p>
            <p className="text-xs text-muted-foreground">
              {menu.sections.length} section{menu.sections.length !== 1 ? 's' : ''} •{' '}
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Layout Option */}
          <div className="space-y-2">
            <Label>Layout</Label>
            <Select value={layout} onValueChange={(v) => setLayout(v as 'single' | 'two-column')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Column</SelectItem>
                <SelectItem value="two-column">Two Columns</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {layout === 'single'
                ? 'Best for menus with detailed descriptions'
                : 'Fits more items per page, good for extensive menus'}
            </p>
          </div>

          {/* Content Options */}
          <div className="space-y-3">
            <Label>Content to Include</Label>

            <div className="flex items-center gap-2">
              <Checkbox
                id="show-prices"
                checked={showPrices}
                onCheckedChange={(checked) => setShowPrices(checked === true)}
              />
              <Label htmlFor="show-prices" className="font-normal cursor-pointer">
                Show prices
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="show-descriptions"
                checked={showDescriptions}
                onCheckedChange={(checked) => setShowDescriptions(checked === true)}
              />
              <Label htmlFor="show-descriptions" className="font-normal cursor-pointer">
                Show item descriptions
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="show-dietary"
                checked={showDietaryTags}
                onCheckedChange={(checked) => setShowDietaryTags(checked === true)}
              />
              <Label htmlFor="show-dietary" className="font-normal cursor-pointer">
                Show dietary tags & legend
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
