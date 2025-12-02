import { useEffect } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, UtensilsCrossed, FileText, Package, Plus, Loader2, ArrowRight } from 'lucide-react';
import { useVenues, useMenus } from '@menucraft/api-client';
import { useCurrentOrg, useCurrentVenue } from '@/store/organization';
import { useHasCompletedOnboarding } from '@/store/onboarding';

export const Route = createFileRoute('/_dashboard/')({
  component: DashboardPage,
});

function DashboardPage() {
  const orgId = useCurrentOrg();
  const venueId = useCurrentVenue();
  const navigate = useNavigate();
  const hasCompletedOnboarding = useHasCompletedOnboarding();

  const { data: venues, isLoading: venuesLoading } = useVenues(orgId || '');
  const { data: menus, isLoading: menusLoading } = useMenus(orgId || '', venueId || '');

  // Redirect to onboarding if no venues and not completed
  useEffect(() => {
    if (!venuesLoading && venues?.length === 0 && !hasCompletedOnboarding) {
      navigate({ to: '/onboarding' });
    }
  }, [venues, venuesLoading, hasCompletedOnboarding, navigate]);

  const totalVenues = venues?.length || 0;
  const totalMenus = menus?.length || 0;
  const publishedMenus = menus?.filter((m) => m.status === 'published').length || 0;

  const isLoading = venuesLoading || menusLoading;

  const stats = [
    { name: 'Total Venues', value: totalVenues.toString(), icon: Store },
    { name: 'Total Menus', value: totalMenus.toString(), icon: UtensilsCrossed },
    { name: 'Published', value: publishedMenus.toString(), icon: FileText },
    { name: 'Draft', value: (totalMenus - publishedMenus).toString(), icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your restaurants.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Recent Venues */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link to="/venues/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New Venue
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link to="/menus/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New Menu
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link to="/venues">
                <Store className="mr-2 h-4 w-4" />
                Manage Venues
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Venues</CardTitle>
              <CardDescription>Your latest venues</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/venues">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {venuesLoading ? (
              <div className="flex h-20 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : venues && venues.length > 0 ? (
              <div className="space-y-3">
                {venues.slice(0, 3).map((venue) => (
                  <Link
                    key={venue.id}
                    to="/venues/$venueId"
                    params={{ venueId: venue.id }}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <Store className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{venue.name}</p>
                        <p className="text-xs text-muted-foreground">{venue.slug}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Store className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No venues yet</p>
                <Button className="mt-4" size="sm" asChild>
                  <Link to="/venues/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Venue
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Menus */}
      {venueId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Menus</CardTitle>
              <CardDescription>Latest menus for the selected venue</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/menus">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {menusLoading ? (
              <div className="flex h-20 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : menus && menus.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {menus.slice(0, 6).map((menu) => (
                  <Link
                    key={menu.id}
                    to="/menus/$menuId"
                    params={{ menuId: menu.id }}
                    className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{menu.name}</p>
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
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <UtensilsCrossed className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No menus yet</p>
                <Button className="mt-4" size="sm" asChild>
                  <Link to="/menus/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Menu
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
