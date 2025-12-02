import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateVenue } from '@menucraft/api-client';
import { useCurrentOrg } from '@/store/organization';
import { Loader2, Store } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface VenueStepProps {
  onComplete: (venueId: string) => void;
}

export function VenueStep({ onComplete }: VenueStepProps) {
  const orgId = useCurrentOrg();
  const createVenue = useCreateVenue(orgId || '');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [timezone, setTimezone] = useState('');

  // Auto-detect timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(tz);
    } catch {
      setTimezone('UTC');
    }
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    const generatedSlug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setSlug(generatedSlug);
  }, [name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your venue.',
        variant: 'destructive',
      });
      return;
    }

    createVenue.mutate(
      { name: name.trim(), slug, timezone },
      {
        onSuccess: (data) => {
          toast({
            title: 'Venue created!',
            description: `${data.name} has been created successfully.`,
            variant: 'success',
          });
          onComplete(data.id);
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
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Store className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Create Your First Venue</CardTitle>
        <CardDescription>
          A venue represents a physical location like a restaurant, cafe, or food truck
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Venue Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Downtown Bistro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">menu.craft/m/</span>
              <Input
                id="slug"
                placeholder="downtown-bistro"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will be your public menu URL
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used for menu scheduling features
            </p>
          </div>
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              size="lg"
              disabled={createVenue.isPending || !name.trim()}
              className="min-w-[200px]"
            >
              {createVenue.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Venue'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
