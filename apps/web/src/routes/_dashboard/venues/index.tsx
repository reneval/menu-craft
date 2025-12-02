import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MapPin, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useVenues } from '@menucraft/api-client';
import { useCurrentOrg } from '@/store/organization';

export const Route = createFileRoute('/_dashboard/venues/')({
  component: VenuesPage,
});

function VenuesPage() {
  const orgId = useCurrentOrg();
  const { data: venues, isLoading, error } = useVenues(orgId || '');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Venues</h2>
            <p className="text-muted-foreground">Manage your restaurant locations</p>
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive">Failed to load venues</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const venueList = venues || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Venues</h2>
          <p className="text-muted-foreground">Manage your restaurant locations</p>
        </div>
        <Button asChild>
          <Link to="/venues/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Venue
          </Link>
        </Button>
      </div>

      {venueList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No venues yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Get started by creating your first venue.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/venues/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Venue
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {venueList.map((venue) => (
            <Card key={venue.id}>
              <CardHeader>
                <CardTitle>{venue.name}</CardTitle>
                <CardDescription>{venue.address?.city || venue.slug}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/venues/$venueId" params={{ venueId: venue.id }}>Manage</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
