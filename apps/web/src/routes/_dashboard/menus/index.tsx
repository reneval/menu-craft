import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, UtensilsCrossed, Loader2, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useVenues, useMenus } from '@menucraft/api-client';
import { useCurrentOrg, useCurrentVenue, useSetCurrentVenue } from '@/store/organization';
import { useEffect } from 'react';

export const Route = createFileRoute('/_dashboard/menus/')({
  component: MenusPage,
});

function MenusPage() {
  const orgId = useCurrentOrg();
  const venueId = useCurrentVenue();
  const setCurrentVenue = useSetCurrentVenue();

  const { data: venues, isLoading: venuesLoading } = useVenues(orgId || '');
  const { data: menus, isLoading: menusLoading } = useMenus(orgId || '', venueId || '');

  // Auto-select first venue if none selected
  useEffect(() => {
    if (!venueId && venues && venues.length > 0 && venues[0]) {
      setCurrentVenue(venues[0].id);
    }
  }, [venueId, venues, setCurrentVenue]);

  if (venuesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If no venues exist, show prompt to create one first
  if (!venues || venues.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Menus</h2>
          <p className="text-muted-foreground">Create and manage your restaurant menus</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Create a venue first</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You need to create a venue before you can add menus.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/venues/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Venue
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentVenue = venues.find((v) => v.id === venueId);
  const menuList = menus || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Menus</h2>
          <p className="text-muted-foreground">
            {currentVenue ? `Menus for ${currentVenue.name}` : 'Select a venue'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {venues.length > 1 && (
            <Select value={venueId || ''} onValueChange={setCurrentVenue}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button asChild>
            <Link to="/menus/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Menu
            </Link>
          </Button>
        </div>
      </div>

      {menusLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <div className="flex items-center gap-2 pt-1">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : menuList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No menus yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first menu to get started.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/menus/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Menu
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {menuList.map((menu) => (
            <Card key={menu.id}>
              <CardHeader>
                <CardTitle>{menu.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      menu.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                  />
                  {menu.status}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button variant="outline" asChild className="flex-1">
                  <Link to="/menus/$menuId" params={{ menuId: menu.id }}>Settings</Link>
                </Button>
                <Button variant="default" asChild className="flex-1">
                  <Link to="/menus/$menuId/editor" params={{ menuId: menu.id }}>Edit</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
