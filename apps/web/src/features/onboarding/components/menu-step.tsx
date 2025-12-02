import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateMenu } from '@menucraft/api-client';
import { useCurrentOrg, useOrganizationStore } from '@/store/organization';
import { Loader2, UtensilsCrossed } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface MenuStepProps {
  venueId: string | null;
  onComplete: (menuId: string) => void;
  onSkip: () => void;
}

export function MenuStep({ venueId, onComplete, onSkip }: MenuStepProps) {
  const orgId = useCurrentOrg();
  const setCurrentVenueId = useOrganizationStore((state) => state.setCurrentVenueId);
  const createMenu = useCreateMenu(orgId || '', venueId || '');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  // Auto-generate slug from name
  useEffect(() => {
    const generatedSlug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setSlug(generatedSlug);
  }, [name]);

  // Set current venue when component mounts
  useEffect(() => {
    if (venueId) {
      setCurrentVenueId(venueId);
    }
  }, [venueId, setCurrentVenueId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your menu.',
        variant: 'destructive',
      });
      return;
    }

    createMenu.mutate(
      { name: name.trim(), slug },
      {
        onSuccess: (data) => {
          toast({
            title: 'Menu created!',
            description: `${data.name} has been created successfully.`,
            variant: 'success',
          });
          onComplete(data.id);
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

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <UtensilsCrossed className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Create Your First Menu</CardTitle>
        <CardDescription>
          Each venue can have multiple menus (e.g., Lunch, Dinner, Drinks)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Menu Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Main Menu, Lunch Special, Drinks"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              placeholder="main-menu"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            />
          </div>
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onSkip}
              className="min-w-[150px]"
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={createMenu.isPending || !name.trim()}
              className="min-w-[200px]"
            >
              {createMenu.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Menu'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
