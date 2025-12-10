import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useUpdateVenue, useDeleteVenue } from '@menucraft/api-client';
import type { Venue } from '@menucraft/shared-types';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Phone, Globe, Clock } from 'lucide-react';

type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

type OpeningHours = {
  [key: string]: DayHours;
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const DEFAULT_HOURS: DayHours = { open: '09:00', close: '22:00', closed: false };
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
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});
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
      setPhone(venue.phone || '');
      setWebsite(venue.website || '');
      // Load opening hours or initialize with defaults
      const hours = venue.openingHours as OpeningHours | null;
      if (hours && Object.keys(hours).length > 0) {
        setOpeningHours(hours);
      } else {
        // Initialize with default hours for all days
        const defaultHours: OpeningHours = {};
        DAYS.forEach(day => {
          defaultHours[day] = { ...DEFAULT_HOURS };
        });
        setOpeningHours(defaultHours);
      }
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
        phone: phone.trim() || null,
        website: website.trim() || null,
        openingHours: Object.keys(openingHours).length > 0 ? openingHours : null,
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

              {/* Contact Information */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-venue-phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </Label>
                    <Input
                      id="edit-venue-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 123 4567"
                      type="tel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-venue-website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </Label>
                    <Input
                      id="edit-venue-website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      type="url"
                    />
                  </div>
                </div>
              </div>

              {/* Opening Hours */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Opening Hours
                </h4>
                <div className="space-y-2">
                  {DAYS.map((day) => {
                    const dayHours = openingHours[day] || DEFAULT_HOURS;
                    return (
                      <div key={day} className="flex items-center gap-3">
                        <span className="w-10 text-sm font-medium">{DAY_LABELS[day]}</span>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${day}-closed`}
                            checked={!dayHours.closed}
                            onCheckedChange={(checked) => {
                              setOpeningHours(prev => ({
                                ...prev,
                                [day]: { ...dayHours, closed: !checked }
                              }));
                            }}
                          />
                          <Label htmlFor={`${day}-closed`} className="text-xs text-gray-500 w-12">
                            Open
                          </Label>
                        </div>
                        <Input
                          type="time"
                          value={dayHours.open}
                          onChange={(e) => {
                            setOpeningHours(prev => ({
                              ...prev,
                              [day]: { ...dayHours, open: e.target.value }
                            }));
                          }}
                          disabled={dayHours.closed}
                          className="w-28 h-8 text-sm"
                        />
                        <span className="text-gray-400">-</span>
                        <Input
                          type="time"
                          value={dayHours.close}
                          onChange={(e) => {
                            setOpeningHours(prev => ({
                              ...prev,
                              [day]: { ...dayHours, close: e.target.value }
                            }));
                          }}
                          disabled={dayHours.closed}
                          className="w-28 h-8 text-sm"
                        />
                        {dayHours.closed && (
                          <span className="text-xs text-gray-400 ml-2">Closed</span>
                        )}
                      </div>
                    );
                  })}
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
