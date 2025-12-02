import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpdateMenu, useDeleteMenu, useVenue, type MenuWithSections } from '@menucraft/api-client';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Settings, Palette, Clock, Code } from 'lucide-react';
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
import type { ThemeConfig, MenuSchedule } from '@menucraft/shared-types';
import { ThemeEditor } from './theme-editor';
import { ScheduleList } from './schedule-list';
import { ScheduleFormDialog } from './schedule-form-dialog';
import { EmbedCodeGenerator } from '@/features/embed/components';

interface MenuSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  venueId: string;
  menu: MenuWithSections | null;
  onDeleted?: () => void;
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#3b82f6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  fontFamily: 'Inter',
  borderRadius: 8,
};

export function MenuSettingsDialog({
  open,
  onOpenChange,
  orgId,
  venueId,
  menu,
  onDeleted,
}: MenuSettingsDialogProps) {
  const [name, setName] = useState('');
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MenuSchedule | null>(null);

  const updateMenu = useUpdateMenu(orgId, venueId, menu?.id || '');
  const deleteMenu = useDeleteMenu(orgId, venueId);
  const { data: venue } = useVenue(orgId, venueId);

  useEffect(() => {
    if (menu) {
      setName(menu.name);
      setThemeConfig({ ...DEFAULT_THEME, ...(menu.themeConfig as ThemeConfig) });
    }
  }, [menu]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !menu) return;

    updateMenu.mutate(
      { name: name.trim(), themeConfig },
      {
        onSuccess: () => {
          toast({
            title: 'Menu updated',
            description: `"${name}" has been updated.`,
            variant: 'success',
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: 'Failed to update menu',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!menu) return;

    deleteMenu.mutate(menu.id, {
      onSuccess: () => {
        toast({
          title: 'Menu deleted',
          description: `"${menu.name}" has been deleted.`,
          variant: 'success',
        });
        setDeleteDialogOpen(false);
        onOpenChange(false);
        onDeleted?.();
      },
      onError: (error) => {
        toast({
          title: 'Failed to delete menu',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Menu Settings</DialogTitle>
            <DialogDescription>Update menu configuration and appearance.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="general" className="py-4">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="general">
                  <Settings className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="theme">
                  <Palette className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Theme</span>
                </TabsTrigger>
                <TabsTrigger value="schedule">
                  <Clock className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Schedule</span>
                </TabsTrigger>
                <TabsTrigger value="embed">
                  <Code className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Embed</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="menu-name">Menu Name</Label>
                  <Input
                    id="menu-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Current status:{' '}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        menu?.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {menu?.status}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use the Publish button in the editor to publish your menu.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Menu
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="theme">
                <ThemeEditor value={themeConfig} onChange={setThemeConfig} />
              </TabsContent>

              <TabsContent value="schedule">
                {menu && (
                  <ScheduleList
                    orgId={orgId}
                    venueId={venueId}
                    menuId={menu.id}
                    onAdd={() => {
                      setEditingSchedule(null);
                      setScheduleDialogOpen(true);
                    }}
                    onEdit={(schedule) => {
                      setEditingSchedule(schedule);
                      setScheduleDialogOpen(true);
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="embed">
                {venue && (
                  <EmbedCodeGenerator
                    venueSlug={venue.slug}
                    venueName={venue.name}
                  />
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || updateMenu.isPending}>
                {updateMenu.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{menu?.name}" and all its sections and items. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMenu.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMenu.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {menu && (
        <ScheduleFormDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          orgId={orgId}
          venueId={venueId}
          menuId={menu.id}
          schedule={editingSchedule}
        />
      )}
    </>
  );
}
