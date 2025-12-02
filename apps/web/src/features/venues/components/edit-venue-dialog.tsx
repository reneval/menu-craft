import { useState, useEffect } from 'react';
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
import { useUpdateVenue, useDeleteVenue } from '@menucraft/api-client';
import type { Venue } from '@menucraft/shared-types';
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

interface EditVenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  venue: Venue | null;
  onDeleted?: () => void;
}

export function EditVenueDialog({
  open,
  onOpenChange,
  orgId,
  venue,
  onDeleted,
}: EditVenueDialogProps) {
  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [timezone, setTimezone] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateVenue = useUpdateVenue(orgId, venue?.id || '');
  const deleteVenue = useDeleteVenue(orgId);

  useEffect(() => {
    if (venue) {
      setName(venue.name);
      const addr = venue.address as Record<string, string> | null;
      setStreet(addr?.street || '');
      setCity(addr?.city || '');
      setState(addr?.state || '');
      setPostalCode(addr?.postalCode || '');
      setTimezone(venue.timezone || 'America/New_York');
    }
  }, [venue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !venue) return;

    updateVenue.mutate(
      {
        name: name.trim(),
        address: {
          street: street.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
        },
        timezone: timezone || 'America/New_York',
      },
      {
        onSuccess: () => {
          toast({
            title: 'Venue updated',
            description: `"${name}" has been updated.`,
            variant: 'success',
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: 'Failed to update venue',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!venue) return;

    deleteVenue.mutate(venue.id, {
      onSuccess: () => {
        toast({
          title: 'Venue deleted',
          description: `"${venue.name}" has been deleted.`,
          variant: 'success',
        });
        setDeleteDialogOpen(false);
        onOpenChange(false);
        onDeleted?.();
      },
      onError: (error) => {
        toast({
          title: 'Failed to delete venue',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
            <DialogDescription>Update the venue details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-venue-name">Venue Name</Label>
                <Input
                  id="edit-venue-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-venue-street">Street Address</Label>
                <Input
                  id="edit-venue-street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-venue-city">City</Label>
                  <Input
                    id="edit-venue-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-venue-state">State</Label>
                  <Input
                    id="edit-venue-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-venue-postal">Postal Code</Label>
                  <Input
                    id="edit-venue-postal"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-venue-timezone">Timezone</Label>
                  <Input
                    id="edit-venue-timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="America/New_York"
                  />
                </div>
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
                <Button type="submit" disabled={!name.trim() || updateVenue.isPending}>
                  {updateVenue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            <AlertDialogTitle>Delete Venue?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{venue?.name}" and all its menus. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteVenue.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteVenue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
