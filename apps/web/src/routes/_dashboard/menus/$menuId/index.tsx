import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Eye, Settings, Loader2, FileText, Package, ExternalLink, Copy, Download, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMenu, useVenue, useDuplicateMenu } from '@menucraft/api-client';
import { useCurrentOrg, useCurrentVenue } from '@/store/organization';
import { useState } from 'react';
import { MenuSettingsDialog } from '@/features/menus/components/menu-settings-dialog';
import { MenuPreviewDialog } from '@/features/menus/components/menu-preview-dialog';
import { PublishPreviewDialog } from '@/features/menus/components/publish-preview-dialog';
import { CloneMenuDialog } from '@/features/menus/components/clone-menu-dialog';
import { ActivityLogCard } from '@/features/menus/components/activity-log-card';
import { toast } from '@/components/ui/use-toast';
import { downloadMenuPDF } from '@/components/menu-pdf';
import { ItemPopularityCard } from '@/features/analytics/components';

export const Route = createFileRoute('/_dashboard/menus/$menuId/')({
  component: MenuDetailPage,
});

function MenuDetailPage() {
  const { menuId } = Route.useParams();
  const navigate = useNavigate();
  const orgId = useCurrentOrg();
  const venueId = useCurrentVenue();

  const { data: menu, isLoading: menuLoading } = useMenu(orgId || '', venueId || '', menuId);
  const { data: venue } = useVenue(orgId || '', venueId || '');
  const duplicateMenu = useDuplicateMenu(orgId || '', venueId || '');

  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!menu || !venue) return;

    setIsGeneratingPDF(true);
    try {
      await downloadMenuPDF({
        venueName: venue.name,
        menuName: menu.name,
        sections: menu.sections || [],
        filename: `${venue.slug}-${menu.slug}-menu`,
      });
      toast({
        title: 'PDF downloaded',
        description: 'Your menu PDF has been downloaded.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Failed to generate PDF',
        description: 'There was an error generating your menu PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePublished = () => {
    toast({
      title: 'Menu published',
      description: 'Your menu is now live.',
      variant: 'success',
    });
  };

  const handleDuplicate = () => {
    duplicateMenu.mutate(menuId, {
      onSuccess: (newMenu) => {
        toast({
          title: 'Menu duplicated',
          description: `Created "${newMenu.name}"`,
          variant: 'success',
        });
        navigate({ to: '/menus/$menuId', params: { menuId: newMenu.id } });
      },
      onError: (error) => {
        toast({
          title: 'Failed to duplicate',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  if (menuLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Content skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-14" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Menu not found</p>
        <Button variant="outline" asChild>
          <Link to="/menus">Back to Menus</Link>
        </Button>
      </div>
    );
  }

  const totalItems = menu.sections?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0;
  const publicUrl = venue ? `${window.location.origin}/m/${venue.slug}` : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/menus">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{menu.name}</h2>
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
            <p className="text-muted-foreground">{venue?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewDialogOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
            {isGeneratingPDF ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            PDF
          </Button>
          <Button variant="outline" onClick={handleDuplicate} disabled={duplicateMenu.isPending}>
            {duplicateMenu.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Duplicate
          </Button>
          <Button variant="outline" onClick={() => setCloneDialogOpen(true)}>
            <Building2 className="mr-2 h-4 w-4" />
            Clone to Venue
          </Button>
          <Button variant="outline" asChild>
            <Link to="/menus/$menuId/editor" params={{ menuId }}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button onClick={() => setPublishDialogOpen(true)}>
            Publish
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sections</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menu.sections?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{menu.status}</div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Content Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Content</CardTitle>
          <CardDescription>Overview of sections and items</CardDescription>
        </CardHeader>
        <CardContent>
          {menu.sections && menu.sections.length > 0 ? (
            <div className="space-y-4">
              {menu.sections.map((section) => (
                <div key={section.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{section.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {section.items?.length || 0} items
                    </span>
                  </div>
                  {section.items && section.items.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {section.items.slice(0, 5).map((item) => (
                        <span
                          key={item.id}
                          className="rounded bg-muted px-2 py-1 text-xs"
                        >
                          {item.name}
                        </span>
                      ))}
                      {section.items.length > 5 && (
                        <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                          +{section.items.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No sections yet</p>
              <Button className="mt-4" variant="outline" asChild>
                <Link to="/menus/$menuId/editor" params={{ menuId }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Start Building Menu
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Popularity - only show for published menus */}
      {menu.status === 'published' && orgId && venueId && (
        <ItemPopularityCard orgId={orgId} venueId={venueId} menuId={menuId} />
      )}

      {/* Settings & Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Menu Settings</CardTitle>
            <CardDescription>Configure menu name and options</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Open Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public Link</CardTitle>
            <CardDescription>Share your menu with customers</CardDescription>
          </CardHeader>
          <CardContent>
            {menu.status === 'published' && publicUrl ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-sm">
                  {publicUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(publicUrl);
                    toast({
                      title: 'Link copied',
                      description: 'Menu link copied to clipboard.',
                      variant: 'success',
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Publish your menu to get a public link.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Log */}
      {orgId && venueId && (
        <ActivityLogCard orgId={orgId} venueId={venueId} menuId={menuId} />
      )}

      {/* Dialogs */}
      <MenuSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        orgId={orgId || ''}
        venueId={venueId || ''}
        menu={menu}
        onDeleted={() => navigate({ to: '/menus' })}
      />

      <MenuPreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        menu={menu}
        venueName={venue?.name}
      />

      {orgId && venueId && (
        <PublishPreviewDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          orgId={orgId}
          venueId={venueId}
          menuId={menuId}
          menuName={menu.name}
          onPublished={handlePublished}
        />
      )}

      {orgId && venueId && (
        <CloneMenuDialog
          open={cloneDialogOpen}
          onOpenChange={setCloneDialogOpen}
          orgId={orgId}
          venueId={venueId}
          menuId={menuId}
          menuName={menu.name}
          onCloned={(targetVenueName, newMenuId) => {
            toast({
              title: 'Menu cloned',
              description: `Navigate to ${targetVenueName} to view the cloned menu.`,
              variant: 'success',
            });
          }}
        />
      )}
    </div>
  );
}
