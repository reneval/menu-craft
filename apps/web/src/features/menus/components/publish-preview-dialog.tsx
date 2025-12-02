import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  usePublishPreview,
  usePublishMenu,
  type DetailedChanges,
  type SectionChange,
  type ItemChange,
} from '@menucraft/api-client';
import {
  Loader2,
  CheckCircle2,
  Plus,
  Minus,
  Edit3,
  AlertCircle,
  Rocket,
  FileText,
  Package,
  Clock,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PublishPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  venueId: string;
  menuId: string;
  menuName: string;
  onPublished?: () => void;
}

export function PublishPreviewDialog({
  open,
  onOpenChange,
  orgId,
  venueId,
  menuId,
  menuName,
  onPublished,
}: PublishPreviewDialogProps) {
  const { data: preview, isLoading, error } = usePublishPreview(orgId, venueId, menuId, open);
  const publishMenu = usePublishMenu(orgId, venueId);

  const handlePublish = () => {
    publishMenu.mutate(menuId, {
      onSuccess: () => {
        onOpenChange(false);
        onPublished?.();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Publish "{menuName}"
          </DialogTitle>
          <DialogDescription>
            Review changes before making your menu live
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load preview</span>
            </div>
          ) : preview ? (
            <PreviewContent preview={preview} />
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isLoading || publishMenu.isPending}
          >
            {publishMenu.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Publish Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

interface PreviewContentProps {
  preview: {
    isFirstPublish: boolean;
    lastPublishedAt: string | null;
    lastPublishedVersion?: number;
    detailedChanges?: DetailedChanges;
    summary: {
      totalSections: number;
      totalItems: number;
      hasChanges: boolean;
    };
  };
}

function PreviewContent({ preview }: PreviewContentProps) {
  const { isFirstPublish, lastPublishedAt, detailedChanges, summary } = preview;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{summary.totalSections}</p>
            <p className="text-xs text-muted-foreground">Sections</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{summary.totalItems}</p>
            <p className="text-xs text-muted-foreground">Items</p>
          </div>
        </div>
      </div>

      {/* First Publish Message */}
      {isFirstPublish && (
        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">First publish!</span>
          </div>
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            This is the first time this menu will go live.
          </p>
        </div>
      )}

      {/* Last Published Info */}
      {!isFirstPublish && lastPublishedAt && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Last published {formatDistanceToNow(new Date(lastPublishedAt), { addSuffix: true })}
          </span>
        </div>
      )}

      {/* Detailed Changes View */}
      {detailedChanges && !isFirstPublish && (
        <DetailedChangesView changes={detailedChanges} hasChanges={summary.hasChanges} />
      )}

      {/* First publish sections list */}
      {isFirstPublish && detailedChanges && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 font-medium">Content to publish</h4>
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {detailedChanges.sections.added.map((section) => (
                <div key={section.id} className="rounded-md bg-green-50 p-2 dark:bg-green-950/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                    <Plus className="h-3 w-3" />
                    {section.name}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {section.items.length} items
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function DetailedChangesView({ changes, hasChanges }: { changes: DetailedChanges; hasChanges: boolean }) {
  if (!hasChanges) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm">No changes detected</span>
        </div>
      </div>
    );
  }

  const { sections, summary, menuChanges } = changes;

  return (
    <div className="space-y-4">
      {/* Quick Summary */}
      <div className="flex flex-wrap gap-2">
        {summary.sectionsAdded > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
            <Plus className="mr-1 h-3 w-3" />
            {summary.sectionsAdded} section{summary.sectionsAdded !== 1 ? 's' : ''} added
          </Badge>
        )}
        {summary.sectionsRemoved > 0 && (
          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
            <Minus className="mr-1 h-3 w-3" />
            {summary.sectionsRemoved} section{summary.sectionsRemoved !== 1 ? 's' : ''} removed
          </Badge>
        )}
        {summary.itemsAdded > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
            <Plus className="mr-1 h-3 w-3" />
            {summary.itemsAdded} item{summary.itemsAdded !== 1 ? 's' : ''} added
          </Badge>
        )}
        {summary.itemsRemoved > 0 && (
          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
            <Minus className="mr-1 h-3 w-3" />
            {summary.itemsRemoved} item{summary.itemsRemoved !== 1 ? 's' : ''} removed
          </Badge>
        )}
        {summary.itemsModified > 0 && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Edit3 className="mr-1 h-3 w-3" />
            {summary.itemsModified} item{summary.itemsModified !== 1 ? 's' : ''} modified
          </Badge>
        )}
      </div>

      {/* Menu Property Changes */}
      {Object.keys(menuChanges).length > 0 && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 font-medium">Menu Settings Changed</h4>
          <div className="space-y-2">
            {Object.entries(menuChanges).map(([key, change]) => {
              const { from, to } = change as { from: unknown; to: unknown };
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <Edit3 className="h-3 w-3 text-blue-500" />
                  <span className="font-medium capitalize">{key}:</span>
                  <span className="text-muted-foreground line-through">{String(from)}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{String(to)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Diff */}
      <div className="rounded-lg border">
        <div className="border-b p-3">
          <h4 className="font-medium">Changes</h4>
        </div>
        <ScrollArea className="max-h-80">
          <div className="p-3 space-y-2">
            {/* Added Sections */}
            {sections.added.map((section) => (
              <SectionDiffItem key={section.id} section={section} type="added" />
            ))}

            {/* Modified Sections */}
            {sections.modified.map((section) => (
              <SectionDiffItem key={section.id} section={section} type="modified" />
            ))}

            {/* Removed Sections */}
            {sections.removed.map((section) => (
              <SectionDiffItem key={section.id} section={section} type="removed" />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function SectionDiffItem({ section, type }: { section: SectionChange; type: 'added' | 'modified' | 'removed' }) {
  const [isOpen, setIsOpen] = useState(type === 'modified');

  const getBgColor = () => {
    switch (type) {
      case 'added':
        return 'bg-green-50 dark:bg-green-950/30';
      case 'removed':
        return 'bg-red-50 dark:bg-red-950/30';
      case 'modified':
        return 'bg-blue-50 dark:bg-blue-950/30';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'modified':
        return <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'added':
        return 'text-green-700 dark:text-green-300';
      case 'removed':
        return 'text-red-700 dark:text-red-300 line-through';
      case 'modified':
        return 'text-blue-700 dark:text-blue-300';
    }
  };

  const hasItems = section.items.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn('rounded-md', getBgColor())}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors">
            {hasItems ? (
              isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
            {getIcon()}
            <span className={cn('font-medium text-sm', getTextColor())}>{section.name}</span>
            {section.changes?.name && (
              <span className="text-xs text-muted-foreground ml-1">
                (renamed from "{section.changes.name.from}")
              </span>
            )}
            {hasItems && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {section.items.length} item{section.items.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {hasItems && (
            <div className="px-2 pb-2 space-y-1">
              {section.items.map((item) => (
                <ItemDiffRow key={item.id} item={item} sectionType={type} />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ItemDiffRow({ item, sectionType }: { item: ItemChange; sectionType: 'added' | 'modified' | 'removed' }) {
  const itemType = item._type || sectionType;

  const getBgColor = () => {
    switch (itemType) {
      case 'added':
        return 'bg-green-100/50 dark:bg-green-900/20';
      case 'removed':
        return 'bg-red-100/50 dark:bg-red-900/20';
      case 'modified':
        return 'bg-blue-100/50 dark:bg-blue-900/20';
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (itemType) {
      case 'added':
        return <Plus className="h-3 w-3 text-green-600 dark:text-green-400" />;
      case 'removed':
        return <Minus className="h-3 w-3 text-red-600 dark:text-red-400" />;
      case 'modified':
        return <Edit3 className="h-3 w-3 text-blue-600 dark:text-blue-400" />;
      default:
        return null;
    }
  };

  const getTextColor = () => {
    switch (itemType) {
      case 'added':
        return 'text-green-700 dark:text-green-300';
      case 'removed':
        return 'text-red-700 dark:text-red-300 line-through';
      case 'modified':
        return 'text-blue-700 dark:text-blue-300';
      default:
        return '';
    }
  };

  return (
    <div className={cn('rounded px-3 py-2 ml-6', getBgColor())}>
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className={cn('text-sm', getTextColor())}>{item.name}</span>
        {item.changes?.name && (
          <span className="text-xs text-muted-foreground">
            (was: {item.changes.name.from})
          </span>
        )}
      </div>

      {/* Show detailed changes */}
      {item.changes && Object.keys(item.changes).length > 0 && (
        <div className="mt-1 ml-5 space-y-0.5">
          {item.changes.priceAmount && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span className="line-through">
                {formatPrice(item.changes.priceAmount.from)}
              </span>
              <ArrowRight className="h-3 w-3" />
              <span className="text-foreground">
                {formatPrice(item.changes.priceAmount.to)}
              </span>
            </div>
          )}
          {item.changes.description && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>Description updated</span>
            </div>
          )}
          {item.changes.isAvailable && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {item.changes.isAvailable.to ? (
                <>
                  <Eye className="h-3 w-3" />
                  <span className="text-green-600 dark:text-green-400">Now available</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" />
                  <span className="text-red-600 dark:text-red-400">Now unavailable</span>
                </>
              )}
            </div>
          )}
          {item.changes.dietaryTags && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Dietary tags updated</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatPrice(cents: number | null): string {
  if (cents === null) return 'N/A';
  return `$${(cents / 100).toFixed(2)}`;
}
