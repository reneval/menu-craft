import { useState, useRef, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Camera,
  ImageIcon,
  X,
  Sparkles,
} from 'lucide-react';
import {
  useImportTemplate,
  useImportCsv,
  useImportPhotoPreview,
  useImportFromPhoto,
  parseCsv,
  type CsvRow,
  type PhotoImportPreviewResult,
} from '@menucraft/api-client';
import { toast } from '@/components/ui/use-toast';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  venueId: string;
  menuId: string;
}

export function ImportDialog({
  open,
  onOpenChange,
  orgId,
  venueId,
  menuId,
}: ImportDialogProps) {
  const [activeTab, setActiveTab] = useState<'csv' | 'photo'>('csv');

  const handleClose = (open: boolean) => {
    if (!open) {
      setActiveTab('csv');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Menu Items
          </DialogTitle>
          <DialogDescription>
            Import menu items from a CSV file or photo of a menu
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'csv' | 'photo')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              From CSV
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              From Photo
              <Badge variant="secondary" className="ml-1 text-xs">AI</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="mt-4">
            <CsvImportTab
              orgId={orgId}
              venueId={venueId}
              menuId={menuId}
              onClose={() => handleClose(false)}
            />
          </TabsContent>

          <TabsContent value="photo" className="mt-4">
            <PhotoImportTab
              orgId={orgId}
              venueId={venueId}
              menuId={menuId}
              onClose={() => handleClose(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// CSV Import Tab Component
function CsvImportTab({
  orgId,
  venueId,
  menuId,
  onClose,
}: {
  orgId: string;
  venueId: string;
  menuId: string;
  onClose: () => void;
}) {
  const { data: templateData } = useImportTemplate(orgId, venueId, menuId, true);
  const importCsv = useImportCsv(orgId, venueId, menuId);

  const [csvText, setCsvText] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [parsedRows, setParsedRows] = useState<CsvRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (text: string) => {
    setCsvText(text);
    setParseError(null);
    setParsedRows(null);

    if (!text.trim()) return;

    try {
      const rows = parseCsv(text);
      setParsedRows(rows);
    } catch (error: unknown) {
      setParseError(error instanceof Error ? error.message : 'Parse error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      handleTextChange(text);
    };
    reader.readAsText(file);

    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    if (!templateData?.template) return;

    const blob = new Blob([templateData.template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!parsedRows || parsedRows.length === 0) return;

    try {
      const result = await importCsv.mutateAsync({
        rows: parsedRows,
        mode,
      });

      toast({
        title: 'Import successful',
        description: result.message,
        variant: 'success',
      });

      setCsvText('');
      setParsedRows(null);
      setParseError(null);
      onClose();
    } catch (error: unknown) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Import failed',
        variant: 'destructive',
      });
    }
  };

  const groupedPreview = useMemo(() => {
    if (!parsedRows) return null;

    const sections = new Map<string, CsvRow[]>();
    parsedRows.forEach((row) => {
      if (!sections.has(row.section)) {
        sections.set(row.section, []);
      }
      sections.get(row.section)!.push(row);
    });

    return sections;
  }, [parsedRows]);

  return (
    <div className="space-y-6">
      {/* Actions row */}
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload CSV
        </Button>
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* CSV Input */}
      <div className="space-y-2">
        <Label>CSV Data</Label>
        <Textarea
          value={csvText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Paste your CSV data here, or upload a file above...

Example:
section,name,description,price
Appetizers,Spring Rolls,Crispy vegetable rolls,8.99
Appetizers,Chicken Wings,Spicy buffalo wings,12.99
Main Course,Grilled Salmon,Fresh Atlantic salmon,24.99"
          rows={8}
          className="font-mono text-sm"
        />
      </div>

      {/* Parse Error */}
      {parseError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{parseError}</span>
        </div>
      )}

      {/* Preview */}
      {parsedRows && groupedPreview && (
        <ImportPreview rows={parsedRows} sectionCount={groupedPreview.size} />
      )}

      {/* Import Mode */}
      {parsedRows && (
        <ImportModeSelector mode={mode} onModeChange={setMode} />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={!parsedRows || parsedRows.length === 0 || importCsv.isPending}
        >
          {importCsv.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Import {parsedRows?.length || 0} Items
        </Button>
      </div>

      {/* Column Reference */}
      {templateData?.columns && (
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-2">CSV Columns</p>
          <div className="flex flex-wrap gap-2">
            {templateData.columns.map((col) => (
              <Badge
                key={col.name}
                variant={col.required ? 'default' : 'secondary'}
                className="text-xs"
              >
                {col.name}
                {col.required && '*'}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * Required columns
          </p>
        </div>
      )}
    </div>
  );
}

// Photo Import Tab Component
function PhotoImportTab({
  orgId,
  venueId,
  menuId,
  onClose,
}: {
  orgId: string;
  venueId: string;
  menuId: string;
  onClose: () => void;
}) {
  const previewMutation = useImportPhotoPreview(orgId, venueId, menuId);
  const importMutation = useImportFromPhoto(orgId, venueId, menuId);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<PhotoImportPreviewResult | null>(null);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a JPEG, PNG, WebP, or GIF image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setPreviewResult(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    e.target.value = '';
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setPreviewResult(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    try {
      const result = await previewMutation.mutateAsync(selectedFile);
      setPreviewResult(result);
    } catch (error: unknown) {
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to analyze image',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      const result = await importMutation.mutateAsync({
        file: selectedFile,
        mode,
      });

      toast({
        title: 'Import successful',
        description: result.message,
        variant: 'success',
      });

      handleClearFile();
      onClose();
    } catch (error: unknown) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-primary/10 p-4">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium">Upload a photo of your menu</p>
              <p className="text-sm text-muted-foreground mt-1">
                JPEG, PNG, WebP, or GIF up to 10MB
              </p>
            </div>
            <Button variant="outline" className="mt-2">
              <Upload className="mr-2 h-4 w-4" />
              Select Image
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative">
            <div className="rounded-lg border overflow-hidden bg-muted">
              <img
                src={previewUrl!}
                alt="Menu preview"
                className="w-full max-h-64 object-contain"
              />
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleClearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Analyze Button */}
          {!previewResult && (
            <Button
              onClick={handleAnalyze}
              disabled={previewMutation.isPending}
              className="w-full"
            >
              {previewMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing menu...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze with AI
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Analysis Error */}
      {previewMutation.isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">
            {previewMutation.error instanceof Error
              ? previewMutation.error.message
              : 'Failed to analyze image'}
          </span>
        </div>
      )}

      {/* Preview Results */}
      {previewResult && (
        <>
          {/* Confidence Indicator */}
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-4 w-4 ${
              previewResult.confidence === 'high'
                ? 'text-green-600'
                : previewResult.confidence === 'medium'
                ? 'text-yellow-600'
                : 'text-red-600'
            }`} />
            <span className="font-medium">
              Found {previewResult.totalItems} items in {previewResult.totalSections} sections
            </span>
            <Badge variant={
              previewResult.confidence === 'high'
                ? 'default'
                : previewResult.confidence === 'medium'
                ? 'secondary'
                : 'destructive'
            }>
              {previewResult.confidence} confidence
            </Badge>
          </div>

          {/* Warnings */}
          {previewResult.warnings && previewResult.warnings.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500 bg-yellow-50 p-3 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Notes from analysis:</p>
                <ul className="list-disc list-inside mt-1">
                  {previewResult.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Items Preview */}
          <ImportPreview
            rows={previewResult.rows}
            sectionCount={previewResult.totalSections}
          />

          {/* Import Mode */}
          <ImportModeSelector mode={mode} onModeChange={setMode} />

          {/* Import Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClearFile}>
              Choose Different Image
            </Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Import {previewResult.totalItems} Items
            </Button>
          </div>
        </>
      )}

      {/* Info Text */}
      {!selectedFile && (
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">AI-Powered Menu Extraction</p>
              <p className="text-muted-foreground mt-1">
                Upload a photo of any menu and our AI will automatically extract the items,
                descriptions, prices, and dietary information.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared Import Preview Component
function ImportPreview({ rows, sectionCount }: { rows: CsvRow[]; sectionCount: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="font-medium">
          {rows.length} items in {sectionCount} sections
        </span>
      </div>

      <div className="max-h-48 overflow-auto rounded-lg border">
        <div className="divide-y">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 bg-muted/50 p-3 text-sm font-medium">
            <div>Section</div>
            <div>Name</div>
            <div>Price</div>
            <div>Tags</div>
          </div>
          {/* Rows */}
          {rows.slice(0, 10).map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 p-3 text-sm">
              <div className="truncate">{row.section}</div>
              <div className="truncate">{row.name}</div>
              <div>{row.price || '-'}</div>
              <div>
                {row.dietaryTags && (
                  <Badge variant="secondary" className="text-xs">
                    {row.dietaryTags}
                  </Badge>
                )}
              </div>
            </div>
          ))}
          {rows.length > 10 && (
            <div className="p-3 text-center text-sm text-muted-foreground">
              ... and {rows.length - 10} more items
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Shared Import Mode Selector Component
function ImportModeSelector({
  mode,
  onModeChange,
}: {
  mode: 'append' | 'replace';
  onModeChange: (mode: 'append' | 'replace') => void;
}) {
  return (
    <div className="space-y-3">
      <Label>Import Mode</Label>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => onModeChange('append')}
          className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
            mode === 'append'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground'
          }`}
        >
          <div className="font-medium">Append</div>
          <div className="text-sm text-muted-foreground">
            Add to existing items
          </div>
        </button>
        <button
          type="button"
          onClick={() => onModeChange('replace')}
          className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
            mode === 'replace'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground'
          }`}
        >
          <div className="font-medium">Replace</div>
          <div className="text-sm text-muted-foreground">
            Delete existing, add new
          </div>
        </button>
      </div>
      {mode === 'replace' && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500 bg-yellow-50 p-3 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">
            This will delete all existing sections and items before importing.
          </span>
        </div>
      )}
    </div>
  );
}
