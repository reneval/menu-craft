import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Save, Eye, Loader2, GripVertical, Pencil, FileDown, Languages, Upload, ExternalLink } from 'lucide-react';
import { useMenu, useReorderSections, usePublishMenu, useVenue, type MenuSectionWithItems, type MenuItemWithOptions } from '@menucraft/api-client';
import { useCurrentOrg, useCurrentVenue } from '@/store/organization';
import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SectionFormDialog } from '@/features/menu-editor/components/section-form-dialog';
import { ItemFormDialog } from '@/features/menu-editor/components/item-form-dialog';
import { EditSectionDialog } from '@/features/menu-editor/components/edit-section-dialog';
import { EditItemDialog } from '@/features/menu-editor/components/edit-item-dialog';
import { ExportPDFDialog } from '@/features/menu-editor/components/export-pdf-dialog';
import { TranslationsDialog } from '@/features/menu-editor/components/translations-dialog';
import { ImportDialog } from '@/features/menu-editor/components/import-dialog';
import { toast } from '@/components/ui/use-toast';

export const Route = createFileRoute('/_dashboard/menus/$menuId/editor')({
  component: MenuEditorPage,
});

interface SortableItemProps {
  id: string;
  item: MenuItemWithOptions;
  onEdit: (item: MenuItemWithOptions) => void;
}

function SortableItem({ id, item, onEdit }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 rounded-lg border bg-background p-3 hover:border-primary/50"
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1 cursor-pointer" onClick={() => onEdit(item)}>
        <div className="flex items-center gap-2">
          <p className="font-medium">{item.name}</p>
          {!item.isAvailable && (
            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">
              Unavailable
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
        )}
      </div>
      {item.priceAmount !== null && item.priceAmount !== undefined && (
        <span className="text-sm font-medium">${(item.priceAmount / 100).toFixed(2)}</span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100"
        onClick={() => onEdit(item)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface SortableSectionProps {
  section: MenuSectionWithItems;
  onAddItem: (sectionId: string) => void;
  onEditSection: (section: MenuSectionWithItems) => void;
  onEditItem: (sectionId: string, item: MenuItemWithOptions) => void;
}

function SortableSection({ section, onAddItem, onEditSection, onEditItem }: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardHeader className="group flex flex-row items-center gap-2 space-y-0 pb-2">
        <button {...attributes} {...listeners} className="cursor-grab touch-none">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <CardTitle className="flex-1 text-lg">{section.name}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100"
          onClick={() => onEditSection(section)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {section.items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No items in this section
          </p>
        ) : (
          <SortableContext
            items={section.items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {section.items.map((item) => (
              <SortableItem
                key={item.id}
                id={item.id}
                item={item}
                onEdit={(i) => onEditItem(section.id, i)}
              />
            ))}
          </SortableContext>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onAddItem(section.id)}
        >
          <Plus className="mr-2 h-3 w-3" />
          Add Item
        </Button>
      </CardContent>
    </Card>
  );
}

function MenuEditorPage() {
  const { menuId } = Route.useParams();
  const orgId = useCurrentOrg();
  const venueId = useCurrentVenue();

  const { data: menu, isLoading } = useMenu(orgId || '', venueId || '', menuId);
  const { data: venue } = useVenue(orgId || '', venueId || '');
  const reorderSections = useReorderSections(orgId || '', venueId || '', menuId);
  const publishMenu = usePublishMenu(orgId || '', venueId || '');

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Edit dialogs state
  const [editSectionDialogOpen, setEditSectionDialogOpen] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [sectionToEdit, setSectionToEdit] = useState<MenuSectionWithItems | null>(null);
  const [itemToEdit, setItemToEdit] = useState<MenuItemWithOptions | null>(null);
  const [itemToEditSectionId, setItemToEditSectionId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [translationsDialogOpen, setTranslationsDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddItem = useCallback((sectionId: string) => {
    setSelectedSectionId(sectionId);
    setItemDialogOpen(true);
  }, []);

  const handleEditSection = useCallback((section: MenuSectionWithItems) => {
    setSectionToEdit(section);
    setEditSectionDialogOpen(true);
  }, []);

  const handleEditItem = useCallback((sectionId: string, item: MenuItemWithOptions) => {
    setItemToEditSectionId(sectionId);
    setItemToEdit(item);
    setEditItemDialogOpen(true);
  }, []);

  const handlePublish = useCallback(() => {
    publishMenu.mutate(menuId, {
      onSuccess: () => {
        toast({
          title: 'Menu published',
          description: 'Your menu is now live.',
          variant: 'success',
        });
      },
      onError: (error) => {
        toast({
          title: 'Failed to publish',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  }, [menuId, publishMenu]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id || !menu?.sections) return;

      // Check if we're reordering sections
      const sectionIds = menu.sections.map((s) => s.id);
      if (sectionIds.includes(active.id as string) && sectionIds.includes(over.id as string)) {
        const oldIndex = sectionIds.indexOf(active.id as string);
        const newIndex = sectionIds.indexOf(over.id as string);
        const newOrder = arrayMove(sectionIds, oldIndex, newIndex);
        reorderSections.mutate({ sectionIds: newOrder });
      }
    },
    [menu?.sections, reorderSections]
  );

  const selectedSection = menu?.sections?.find((s) => s.id === selectedSectionId);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sections = menu?.sections || [];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-card p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/menus/$menuId" params={{ menuId }}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="font-semibold">{menu?.name || 'Menu Editor'}</h2>
            <p className="text-sm text-muted-foreground">
              {sections.length} sections, {sections.reduce((acc, s) => acc + s.items.length, 0)} items
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={() => setTranslationsDialogOpen(true)}>
            <Languages className="mr-2 h-4 w-4" />
            Translations
          </Button>
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (venue?.slug && menu?.slug) {
                window.open(`/m/${venue.slug}?menu=${menu.slug}`, '_blank');
              }
            }}
            disabled={!venue?.slug || !menu?.slug}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={handlePublish} disabled={publishMenu.isPending}>
            {publishMenu.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Publish
          </Button>
        </div>
      </div>

      {/* Editor Canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {sections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    onAddItem={handleAddItem}
                    onEditSection={handleEditSection}
                    onEditItem={handleEditItem}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {sections.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6">
                <p className="text-lg font-medium">No sections yet</p>
                <p className="text-sm text-muted-foreground">
                  Add a section to start building your menu
                </p>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => setSectionDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l bg-card p-4">
          <h3 className="font-semibold">Properties</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Drag to reorder sections and items
          </p>
        </div>
      </div>

      {/* Dialogs */}
      <SectionFormDialog
        open={sectionDialogOpen}
        onOpenChange={setSectionDialogOpen}
        orgId={orgId || ''}
        venueId={venueId || ''}
        menuId={menuId}
      />

      {selectedSection && (
        <ItemFormDialog
          open={itemDialogOpen}
          onOpenChange={setItemDialogOpen}
          orgId={orgId || ''}
          venueId={venueId || ''}
          menuId={menuId}
          sectionId={selectedSection.id}
          sectionName={selectedSection.name}
        />
      )}

      <EditSectionDialog
        open={editSectionDialogOpen}
        onOpenChange={setEditSectionDialogOpen}
        orgId={orgId || ''}
        venueId={venueId || ''}
        menuId={menuId}
        section={sectionToEdit}
      />

      {itemToEditSectionId && (
        <EditItemDialog
          open={editItemDialogOpen}
          onOpenChange={setEditItemDialogOpen}
          orgId={orgId || ''}
          venueId={venueId || ''}
          menuId={menuId}
          sectionId={itemToEditSectionId}
          item={itemToEdit}
        />
      )}

      {menu && (
        <ExportPDFDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          menu={menu}
          venueName={venue?.name || 'Restaurant'}
        />
      )}

      {menu && (
        <TranslationsDialog
          open={translationsDialogOpen}
          onOpenChange={setTranslationsDialogOpen}
          orgId={orgId || ''}
          venueId={venueId || ''}
          menu={menu}
        />
      )}

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        orgId={orgId || ''}
        venueId={venueId || ''}
        menuId={menuId}
      />
    </div>
  );
}
