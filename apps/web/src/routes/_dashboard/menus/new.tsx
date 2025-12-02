import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useCreateMenu, useVenues } from '@menucraft/api-client';
import { useCurrentOrg, useCurrentVenue, useSetCurrentVenue } from '@/store/organization';
import { toast } from '@/components/ui/use-toast';
import { useEffect } from 'react';

export const Route = createFileRoute('/_dashboard/menus/new')({
  component: NewMenuPage,
});

interface MenuFormData {
  venueId: string;
  name: string;
  slug: string;
}

function NewMenuPage() {
  const navigate = useNavigate();
  const orgId = useCurrentOrg();
  const venueId = useCurrentVenue();
  const setCurrentVenue = useSetCurrentVenue();

  const { data: venues, isLoading: venuesLoading } = useVenues(orgId || '');
  const createMenu = useCreateMenu(orgId || '', venueId || '');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MenuFormData>({
    defaultValues: {
      venueId: venueId || '',
      name: '',
      slug: '',
    },
  });

  // Auto-select first venue if none selected
  useEffect(() => {
    if (!venueId && venues && venues.length > 0 && venues[0]) {
      setValue('venueId', venues[0].id);
      setCurrentVenue(venues[0].id);
    }
  }, [venueId, venues, setValue, setCurrentVenue]);

  const selectedVenueId = watch('venueId');

  // Update current venue when selection changes
  useEffect(() => {
    if (selectedVenueId && selectedVenueId !== venueId) {
      setCurrentVenue(selectedVenueId);
    }
  }, [selectedVenueId, venueId, setCurrentVenue]);

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const slug = newName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setValue('slug', slug);
  };

  const onSubmit = (data: MenuFormData) => {
    createMenu.mutate(
      {
        name: data.name,
        slug: data.slug || undefined,
      },
      {
        onSuccess: (menu) => {
          toast({
            title: 'Menu created',
            description: `"${data.name}" has been created. Start adding sections and items.`,
            variant: 'success',
          });
          navigate({ to: '/menus/$menuId/editor', params: { menuId: menu.id } });
        },
        onError: (error) => {
          toast({
            title: 'Failed to create menu',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (venuesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!venues || venues.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/menus">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Create Menu</h2>
            <p className="text-muted-foreground">Create a new menu for your venue</p>
          </div>
        </div>
        <Card className="max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">Create a venue first</p>
            <p className="text-sm text-muted-foreground">
              You need to create a venue before adding menus.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/venues/new">Create Venue</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/menus">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Menu</h2>
          <p className="text-muted-foreground">Create a new menu for your venue</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Menu Details</CardTitle>
          <CardDescription>Enter the basic information for your menu</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <select
                id="venue"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...register('venueId', { required: 'Venue is required' })}
              >
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
              {errors.venueId && (
                <p className="text-sm text-destructive">{errors.venueId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Menu Name</Label>
              <Input
                id="name"
                placeholder="Dinner Menu"
                {...register('name', { required: 'Name is required' })}
                onChange={(e) => {
                  register('name').onChange(e);
                  handleNameChange(e);
                }}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                placeholder="dinner-menu"
                {...register('slug', {
                  pattern: {
                    value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                    message: 'Slug must be lowercase with hyphens only',
                  },
                })}
              />
              <p className="text-xs text-muted-foreground">
                This will be used in your public menu URL
              </p>
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link to="/menus">Cancel</Link>
              </Button>
              <Button type="submit" disabled={createMenu.isPending}>
                {createMenu.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Menu
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
