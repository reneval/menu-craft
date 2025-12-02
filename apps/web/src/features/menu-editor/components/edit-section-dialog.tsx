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
import { useUpdateSection, useDeleteSection, type MenuSectionWithItems } from '@menucraft/api-client';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
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

interface EditSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  venueId: string;
  menuId: string;
  section: MenuSectionWithItems | null;
}

export function EditSectionDialog({
  open,
  onOpenChange,
  orgId,
  venueId,
  menuId,
  section,
}: EditSectionDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateSection = useUpdateSection(orgId, venueId, menuId, section?.id || '');
  const deleteSection = useDeleteSection(orgId, venueId, menuId);

  useEffect(() => {
    if (section) {
      setName(section.name);
      setDescription(section.description || '');
    }
  }, [section]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !section) return;

    updateSection.mutate(
      { name: name.trim(), description: description.trim() || null },
      {
        onSuccess: () => {
          toast({
            title: 'Section updated',
            description: `"${name}" has been updated.`,
            variant: 'success',
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: 'Failed to update section',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!section) return;

    deleteSection.mutate(section.id, {
      onSuccess: () => {
        toast({
          title: 'Section deleted',
          description: `"${section.name}" has been deleted.`,
          variant: 'success',
        });
        setDeleteDialogOpen(false);
        onOpenChange(false);
      },
      onError: (error) => {
        toast({
          title: 'Failed to delete section',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
            <DialogDescription>Update the section details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Section Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description (optional)</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
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
                <Button type="submit" disabled={!name.trim() || updateSection.isPending}>
                  {updateSection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            <AlertDialogTitle>Delete Section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{section?.name}" and all its items. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSection.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
