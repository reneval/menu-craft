import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MenuWithSections } from '@menucraft/api-client';

interface MenuPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: MenuWithSections | null;
  venueName?: string;
}

export function MenuPreviewDialog({
  open,
  onOpenChange,
  menu,
  venueName,
}: MenuPreviewDialogProps) {
  if (!menu) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 border-b bg-card/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <DialogTitle className="text-left">
            <span className="text-lg font-bold">{venueName || 'Menu Preview'}</span>
            <span className="ml-2 text-sm font-normal text-muted-foreground">{menu.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="space-y-8">
            {menu.sections?.map((section) => (
              <section key={section.id}>
                <h2 className="mb-4 text-lg font-semibold">{section.name}</h2>
                {section.description && (
                  <p className="mb-4 text-sm text-muted-foreground">{section.description}</p>
                )}
                <div className="space-y-4">
                  {section.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between rounded-lg border bg-card p-4"
                    >
                      <div className="flex-1 pr-4">
                        <h3 className="font-medium">{item.name}</h3>
                        {item.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                        )}
                        {item.dietaryTags && item.dietaryTags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.dietaryTags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.allergens && item.allergens.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.allergens.map((allergen) => (
                              <span
                                key={allergen}
                                className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800"
                              >
                                {allergen}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.options && item.options.length > 0 && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {item.options.map((option) => (
                              <div key={option.id} className="flex items-center gap-2">
                                <span>{option.name}</span>
                                {option.priceModifier !== 0 && (
                                  <span className="text-xs">
                                    {option.priceModifier > 0 ? '+' : ''}$
                                    {(option.priceModifier / 100).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {item.priceAmount !== null && item.priceAmount !== undefined && (
                        <span className="font-medium">${(item.priceAmount / 100).toFixed(2)}</span>
                      )}
                    </div>
                  ))}
                  {(!section.items || section.items.length === 0) && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No items in this section
                    </p>
                  )}
                </div>
              </section>
            ))}

            {(!menu.sections || menu.sections.length === 0) && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">This menu has no sections yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t py-4 text-center text-sm text-muted-foreground">
          <p>Powered by MenuCraft</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
