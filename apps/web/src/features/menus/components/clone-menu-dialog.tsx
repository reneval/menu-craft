import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVenues, useCloneMenuToVenue } from '@menucraft/api-client';
import { Loader2, Copy, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface CloneMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  venueId: string;
  menuId: string;
  menuName: string;
  onCloned?: (targetVenueName: string, newMenuId: string) => void;
}

export function CloneMenuDialog({
  open,
  onOpenChange,
  orgId,
  venueId,
  menuId,
  menuName,
  onCloned,
}: CloneMenuDialogProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const { data: allVenues, isLoading: venuesLoading } = useVenues(orgId);
  const cloneMenu = useCloneMenuToVenue(orgId, venueId);

  // Filter out the current venue from the list
  const otherVenues = allVenues?.filter((v) => v.id !== venueId) || [];

  const handleClone = () => {
    if (!selectedVenueId) return;

    cloneMenu.mutate(
      { menuId, targetVenueId: selectedVenueId },
      {
        onSuccess: (data) => {
          toast({
            title: 'Menu cloned successfully',
            description: `"${menuName}" has been cloned to ${data.targetVenue.name}`,
            variant: 'success',
          });
          onOpenChange(false);
          setSelectedVenueId('');
          onCloned?.(data.targetVenue.name, data.menu.id);
        },
        onError: (error) => {
          toast({
            title: 'Failed to clone menu',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const selectedVenue = otherVenues.find((v) => v.id === selectedVenueId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Clone Menu to Another Venue
          </DialogTitle>
          <DialogDescription>
            Create a copy of "{menuName}" in a different venue. The cloned menu
            will be created as a draft.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {venuesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : otherVenues.length === 0 ? (
            <div className="rounded-lg bg-muted p-4 text-center">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No other venues available. Create another venue first to clone
                this menu.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="target-venue">Target Venue</Label>
                <Select
                  value={selectedVenueId}
                  onValueChange={setSelectedVenueId}
                >
                  <SelectTrigger id="target-venue">
                    <SelectValue placeholder="Select a venue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {otherVenues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {venue.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedVenue && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Copy className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{menuName}</p>
                        <p className="text-xs text-muted-foreground">
                          Current venue
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                        <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {selectedVenue.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Target venue
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                <div className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">What will be cloned:</p>
                    <ul className="mt-1 list-inside list-disc text-blue-600 dark:text-blue-400">
                      <li>All sections and items</li>
                      <li>Item options and pricing</li>
                      <li>Theme configuration</li>
                      <li>Language settings</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleClone}
            disabled={!selectedVenueId || cloneMenu.isPending}
          >
            {cloneMenu.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cloning...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Clone Menu
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
