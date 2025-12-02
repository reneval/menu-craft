import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateSection } from '@menucraft/api-client';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface SectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  venueId: string;
  menuId: string;
}

export function SectionFormDialog({
  open,
  onOpenChange,
  orgId,
  venueId,
  menuId,
}: SectionFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createSection = useCreateSection(orgId, venueId, menuId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    createSection.mutate(
      { name: name.trim(), description: description.trim() || undefined, isVisible: true },
      {
        onSuccess: () => {
          toast({
            title: 'Section created',
            description: `"${name}" has been added to your menu.`,
            variant: 'success',
          });
          setName('');
          setDescription('');
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: 'Failed to create section',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Section</DialogTitle>
          <DialogDescription>
            Create a new section to organize your menu items.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Section Name</Label>
              <Input
                id="name"
                placeholder="e.g., Appetizers, Main Courses, Desserts"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="A brief description of this section"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createSection.isPending}>
              {createSection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Section
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
