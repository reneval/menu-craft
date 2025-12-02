import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Languages, Check, X } from 'lucide-react';
import {
  useTranslations,
  useSaveTranslations,
  useUpdateLanguageSettings,
  useDeleteTranslationLanguage,
  COMMON_LANGUAGES,
  getLanguageName,
  getLanguageNativeName,
  type MenuWithSections,
  type SaveTranslationInput,
} from '@menucraft/api-client';
import { toast } from '@/components/ui/use-toast';

interface TranslationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  venueId: string;
  menu: MenuWithSections;
}

interface TranslationState {
  [entityId: string]: {
    name?: string;
    description?: string;
  };
}

export function TranslationsDialog({
  open,
  onOpenChange,
  orgId,
  venueId,
  menu,
}: TranslationsDialogProps) {
  const { data, isLoading } = useTranslations(orgId, venueId, menu.id);
  const saveTranslations = useSaveTranslations(orgId, venueId, menu.id);
  const updateSettings = useUpdateLanguageSettings(orgId, venueId, menu.id);
  const deleteLanguage = useDeleteTranslationLanguage(orgId, venueId, menu.id);

  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [localTranslations, setLocalTranslations] = useState<TranslationState>({});
  const [isDirty, setIsDirty] = useState(false);
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [newLanguageCode, setNewLanguageCode] = useState('');

  const defaultLanguage = (menu as any).defaultLanguage || 'en';
  const enabledLanguages: string[] = (menu as any).enabledLanguages || ['en'];

  // Set initial selected language
  useEffect(() => {
    if (open && enabledLanguages.length > 0 && !selectedLanguage) {
      const nonDefaultLang = enabledLanguages.find((l) => l !== defaultLanguage);
      setSelectedLanguage(nonDefaultLang || null);
    }
  }, [open, enabledLanguages, defaultLanguage, selectedLanguage]);

  // Load translations when language changes
  useEffect(() => {
    if (data && selectedLanguage) {
      const langTranslations = data.translations[selectedLanguage] || {};
      const state: TranslationState = {};
      Object.entries(langTranslations).forEach(([entityId, entry]) => {
        state[entityId] = entry.translations;
      });
      setLocalTranslations(state);
      setIsDirty(false);
    }
  }, [data, selectedLanguage]);

  // Get all entities from the menu
  const entities = useMemo(() => {
    const result: { id: string; type: 'menu' | 'menu_section' | 'menu_item'; name: string; description?: string; parentName?: string }[] = [];

    result.push({
      id: menu.id,
      type: 'menu',
      name: menu.name,
    });

    menu.sections?.forEach((section) => {
      result.push({
        id: section.id,
        type: 'menu_section',
        name: section.name,
        description: section.description || undefined,
      });

      section.items?.forEach((item) => {
        result.push({
          id: item.id,
          type: 'menu_item',
          name: item.name,
          description: item.description || undefined,
          parentName: section.name,
        });
      });
    });

    return result;
  }, [menu]);

  const handleTranslationChange = (entityId: string, field: 'name' | 'description', value: string) => {
    setLocalTranslations((prev) => ({
      ...prev,
      [entityId]: {
        ...prev[entityId],
        [field]: value,
      },
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!selectedLanguage) return;

    const translations: SaveTranslationInput[] = [];

    entities.forEach((entity) => {
      const localTrans = localTranslations[entity.id];
      if (localTrans && (localTrans.name || localTrans.description)) {
        translations.push({
          entityType: entity.type,
          entityId: entity.id,
          content: {
            name: localTrans.name || undefined,
            description: localTrans.description || undefined,
          },
        });
      }
    });

    try {
      await saveTranslations.mutateAsync({
        languageCode: selectedLanguage,
        translations,
      });
      toast({
        title: 'Translations saved',
        description: `${getLanguageName(selectedLanguage)} translations updated.`,
        variant: 'success',
      });
      setIsDirty(false);
    } catch (error: any) {
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddLanguage = async () => {
    if (!newLanguageCode) return;

    try {
      const newEnabledLanguages = [...enabledLanguages, newLanguageCode];
      await updateSettings.mutateAsync({
        enabledLanguages: newEnabledLanguages,
      });
      setSelectedLanguage(newLanguageCode);
      setShowAddLanguage(false);
      setNewLanguageCode('');
      toast({
        title: 'Language added',
        description: `${getLanguageName(newLanguageCode)} has been added.`,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to add language',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveLanguage = async (langCode: string) => {
    if (langCode === defaultLanguage) {
      toast({
        title: 'Cannot remove',
        description: 'Cannot remove the default language.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newEnabledLanguages = enabledLanguages.filter((l) => l !== langCode);
      await updateSettings.mutateAsync({
        enabledLanguages: newEnabledLanguages,
      });
      await deleteLanguage.mutateAsync(langCode);
      if (selectedLanguage === langCode) {
        setSelectedLanguage(newEnabledLanguages.find((l) => l !== defaultLanguage) || null);
      }
      toast({
        title: 'Language removed',
        description: `${getLanguageName(langCode)} has been removed.`,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to remove',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const availableLanguages = COMMON_LANGUAGES.filter(
    (lang) => !enabledLanguages.includes(lang.code)
  );

  const nonDefaultLanguages = enabledLanguages.filter((l) => l !== defaultLanguage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Translations
          </DialogTitle>
          <DialogDescription>
            Translate your menu into multiple languages. The default language ({getLanguageName(defaultLanguage)}) content comes from your menu items.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Language Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-sm">
                {getLanguageNativeName(defaultLanguage)} (default)
              </Badge>
              {nonDefaultLanguages.map((lang) => (
                <Badge
                  key={lang}
                  variant={selectedLanguage === lang ? 'default' : 'outline'}
                  className="cursor-pointer text-sm group"
                  onClick={() => setSelectedLanguage(lang)}
                >
                  {getLanguageNativeName(lang)}
                  <button
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveLanguage(lang);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {showAddLanguage ? (
                <div className="flex items-center gap-1">
                  <Select value={newLanguageCode} onValueChange={setNewLanguageCode}>
                    <SelectTrigger className="w-40 h-7 text-sm">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.nativeName} ({lang.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={handleAddLanguage}
                    disabled={!newLanguageCode || updateSettings.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      setShowAddLanguage(false);
                      setNewLanguageCode('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6"
                  onClick={() => setShowAddLanguage(true)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Language
                </Button>
              )}
            </div>

            {/* Translation Editor */}
            {selectedLanguage ? (
              <div className="h-[400px] overflow-y-auto pr-4">
                <div className="space-y-6">
                  {entities.map((entity) => (
                    <div key={entity.id} className="space-y-2 border-b pb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {entity.type.replace('menu_', '')}
                        </Badge>
                        {entity.parentName && (
                          <span className="text-xs text-muted-foreground">
                            in {entity.parentName}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Original ({getLanguageName(defaultLanguage)})
                          </Label>
                          <p className="font-medium">{entity.name}</p>
                          {entity.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {entity.description}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">
                              Name ({getLanguageName(selectedLanguage)})
                            </Label>
                            <Input
                              value={localTranslations[entity.id]?.name || ''}
                              onChange={(e) =>
                                handleTranslationChange(entity.id, 'name', e.target.value)
                              }
                              placeholder={entity.name}
                            />
                          </div>
                          {entity.description !== undefined && (
                            <div>
                              <Label className="text-xs">
                                Description ({getLanguageName(selectedLanguage)})
                              </Label>
                              <Textarea
                                value={localTranslations[entity.id]?.description || ''}
                                onChange={(e) =>
                                  handleTranslationChange(entity.id, 'description', e.target.value)
                                }
                                placeholder={entity.description || 'Description...'}
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <Languages className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium">No translation language selected</p>
                <p className="text-sm text-muted-foreground">
                  Add a language above to start translating your menu
                </p>
              </div>
            )}

            {/* Save Button */}
            {selectedLanguage && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || saveTranslations.isPending}
                >
                  {saveTranslations.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Translations
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
