import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useCreateVenue } from '@menucraft/api-client';
import { useCurrentOrg, useOrganizationStore } from '@/store/organization';
import { toast } from '@/components/ui/use-toast';

export const Route = createFileRoute('/_dashboard/venues/new')({
  component: NewVenuePage,
});

interface VenueFormData {
  name: string;
  slug: string;
  timezone: string;
}

function NewVenuePage() {
  const navigate = useNavigate();
  const orgId = useCurrentOrg();
  const setCurrentVenue = useOrganizationStore((state) => state.setCurrentVenueId);
  const createVenue = useCreateVenue(orgId || '');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VenueFormData>({
    defaultValues: {
      name: '',
      slug: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const name = watch('name');

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const slug = newName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setValue('slug', slug);
  };

  const onSubmit = (data: VenueFormData) => {
    createVenue.mutate(
      {
        name: data.name,
        slug: data.slug || undefined,
        timezone: data.timezone,
      },
      {
        onSuccess: (venue) => {
          toast({
            title: 'Venue created',
            description: `"${data.name}" has been created successfully.`,
            variant: 'success',
          });
          setCurrentVenue(venue.id);
          navigate({ to: '/venues/$venueId', params: { venueId: venue.id } });
        },
        onError: (error) => {
          toast({
            title: 'Failed to create venue',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/venues">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Venue</h2>
          <p className="text-muted-foreground">Add a new restaurant location</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Venue Details</CardTitle>
          <CardDescription>Enter the basic information for your venue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Venue Name</Label>
              <Input
                id="name"
                placeholder="My Restaurant"
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
                placeholder="my-restaurant"
                {...register('slug', {
                  pattern: {
                    value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                    message: 'Slug must be lowercase with hyphens only',
                  },
                })}
              />
              <p className="text-xs text-muted-foreground">
                This will be used in your menu URL
              </p>
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                placeholder="America/New_York"
                {...register('timezone')}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link to="/venues">Cancel</Link>
              </Button>
              <Button type="submit" disabled={createVenue.isPending}>
                {createVenue.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Venue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
