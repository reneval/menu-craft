import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, UtensilsCrossed, Loader2, MapPin, Clock, QrCode, Pencil, ExternalLink, ScanLine, BarChart3, Globe } from 'lucide-react';
import { QRCodeDisplay } from '@/components/qr-code';
import { useVenue, useMenus, useQrCodes, useCreateQrCode } from '@menucraft/api-client';
import { useCurrentOrg, useOrganizationStore } from '@/store/organization';
import { useEffect, useState } from 'react';
import { EditVenueDialog } from '@/features/venues/components/edit-venue-dialog';
import { CustomDomains } from '@/features/venues/components/custom-domains';
import { toast } from '@/components/ui/use-toast';

export const Route = createFileRoute('/_dashboard/venues/$venueId')({
  component: VenueDetailPage,
});

function VenueDetailPage() {
  const { venueId } = Route.useParams();
  const navigate = useNavigate();
  const orgId = useCurrentOrg();
  const setCurrentVenueId = useOrganizationStore((s) => s.setCurrentVenueId);

  const { data: venue, isLoading: venueLoading } = useVenue(orgId || '', venueId);
  const { data: menus, isLoading: menusLoading } = useMenus(orgId || '', venueId);
  const { data: qrCodes } = useQrCodes(orgId || '');
  const createQrCode = useCreateQrCode(orgId || '');

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Find QR code for this venue
  const venueQrCode = qrCodes?.find((qr) => qr.targetType === 'venue' && qr.targetId === venueId);

  // Set this venue as the current venue
  useEffect(() => {
    if (venueId) {
      setCurrentVenueId(venueId);
    }
  }, [venueId, setCurrentVenueId]);

  const publishedMenus = menus?.filter((m) => m.status === 'published') || [];
  const menuUrl = venue ? `${window.location.origin}/m/${venue.slug}` : '';

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(menuUrl);
    toast({
      title: 'Link copied',
      description: 'Menu link copied to clipboard.',
      variant: 'success',
    });
  };

  if (venueLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Venue not found</p>
        <Button variant="outline" asChild>
          <Link to="/venues">Back to Venues</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/venues">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{venue.name}</h2>
            <p className="text-muted-foreground">{venue.slug}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Venue
        </Button>
      </div>

      {/* Venue Info */}
      <Card>
        <CardHeader>
          <CardTitle>Venue Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venue.address && (venue.address as Record<string, string>).street && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    {(venue.address as Record<string, string>).street}
                  </p>
                  {(venue.address as Record<string, string>).city && (
                    <p className="text-sm text-muted-foreground">
                      {(venue.address as Record<string, string>).city}
                      {(venue.address as Record<string, string>).state && `, ${(venue.address as Record<string, string>).state}`}
                      {(venue.address as Record<string, string>).postalCode && ` ${(venue.address as Record<string, string>).postalCode}`}
                    </p>
                  )}
                </div>
              </div>
            )}
            {venue.timezone && (
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Timezone</p>
                  <p className="text-sm text-muted-foreground">{venue.timezone}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Menus Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Menus</h3>
            <p className="text-sm text-muted-foreground">
              {menus?.length || 0} menu{menus?.length !== 1 ? 's' : ''} at this venue
            </p>
          </div>
          <Button onClick={() => navigate({ to: '/menus/new' })}>
            <Plus className="mr-2 h-4 w-4" />
            Create Menu
          </Button>
        </div>

        {menusLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : menus && menus.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {menus.map((menu) => (
              <Card key={menu.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{menu.name}</CardTitle>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        menu.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {menu.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link to="/menus/$menuId" params={{ menuId: menu.id }}>
                        View
                      </Link>
                    </Button>
                    <Button size="sm" className="flex-1" asChild>
                      <Link to="/menus/$menuId/editor" params={{ menuId: menu.id }}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No menus yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first menu to get started
              </p>
              <Button className="mt-4" onClick={() => navigate({ to: '/menus/new' })}>
                <Plus className="mr-2 h-4 w-4" />
                Create Menu
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Codes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code & Menu Link
              </CardTitle>
              <CardDescription>Share your menu with customers</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/qr-codes">
                <BarChart3 className="mr-2 h-4 w-4" />
                Manage All QR Codes
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {publishedMenus.length > 0 ? (
            <div className="space-y-4">
              {/* Menu Link */}
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                <code className="flex-1 text-sm">{menuUrl}</code>
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  Copy
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={menuUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              {/* Tracked QR Code with Stats */}
              {venueQrCode ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border bg-primary/5 p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <ScanLine className="h-4 w-4 text-primary" />
                      <span className="font-medium">{venueQrCode.scanCount} scans</span>
                      {venueQrCode.lastScannedAt && (
                        <span className="text-muted-foreground">
                          · Last scan {new Date(venueQrCode.lastScannedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-center py-4">
                    <QRCodeDisplay
                      value={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/public/qr/${venueQrCode.code}`}
                      size={180}
                      title="Scan to view menu (tracked)"
                      downloadFileName={`${venue.slug}-qr-code`}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-4">
                    <QRCodeDisplay
                      value={menuUrl}
                      size={180}
                      title="Scan to view menu"
                      downloadFileName={`${venue.slug}-qr-code`}
                    />
                  </div>
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Create a tracked QR code to count scans
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        createQrCode.mutate(
                          { targetType: 'venue', targetId: venueId },
                          {
                            onSuccess: () => toast({ title: 'QR code created', variant: 'success' }),
                            onError: () => toast({ title: 'Failed to create QR code', variant: 'destructive' }),
                          }
                        )
                      }
                      disabled={createQrCode.isPending}
                    >
                      {createQrCode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Plus className="mr-2 h-4 w-4" />
                      Create Tracked QR Code
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <QrCode className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 font-medium">No published menus</p>
              <p className="text-sm text-muted-foreground">
                Publish a menu to generate a QR code for customers to scan.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Domains Section */}
      <CustomDomains orgId={orgId || ''} venueId={venueId} />

      {/* Edit Venue Dialog */}
      <EditVenueDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        orgId={orgId || ''}
        venue={venue}
        onDeleted={() => navigate({ to: '/venues' })}
      />
    </div>
  );
}
