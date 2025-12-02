import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Copy, Code, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface EmbedCodeGeneratorProps {
  venueSlug: string;
  venueName: string;
}

type WidgetType = 'iframe' | 'shadow';
type WidgetTheme = 'light' | 'dark' | 'auto';

export function EmbedCodeGenerator({ venueSlug, venueName }: EmbedCodeGeneratorProps) {
  const [widgetType, setWidgetType] = useState<WidgetType>('iframe');
  const [height, setHeight] = useState('600');
  const [theme, setTheme] = useState<WidgetTheme>('auto');
  const [copied, setCopied] = useState(false);

  // Base URL for widgets - in production this would be the real domain
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://menucraft.io';

  const generateIframeCode = () => {
    return `<!-- MenuCraft Widget for ${venueName} -->
<div id="menucraft-widget" data-venue="${venueSlug}" data-height="${height}px"></div>
<script>
  window.MenuCraftWidget = {
    venue: '${venueSlug}',
    height: '${height}px',
    theme: '${theme}',
    baseUrl: '${baseUrl}'
  };
</script>
<script src="${baseUrl}/widgets/menucraft-widget.js" async></script>`;
  };

  const generateShadowCode = () => {
    return `<!-- MenuCraft Widget for ${venueName} (Shadow DOM) -->
<div id="menucraft-widget" data-venue="${venueSlug}"></div>
<script>
  window.MenuCraftWidgetShadow = {
    venue: '${venueSlug}',
    theme: '${theme}',
    apiUrl: '${baseUrl}/api'
  };
</script>
<script src="${baseUrl}/widgets/menucraft-widget-shadow.js" async></script>`;
  };

  const code = widgetType === 'iframe' ? generateIframeCode() : generateShadowCode();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Embed code copied to clipboard',
        variant: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please select and copy the code manually',
        variant: 'destructive',
      });
    }
  };

  const previewUrl = `${baseUrl}/m/${venueSlug}?embed=true${theme !== 'auto' ? `&theme=${theme}` : ''}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Embed Your Menu
          </CardTitle>
          <CardDescription>
            Add your menu to any website with a simple code snippet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Widget Type Selection */}
          <Tabs value={widgetType} onValueChange={(v) => setWidgetType(v as WidgetType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="iframe">Iframe (Recommended)</TabsTrigger>
              <TabsTrigger value="shadow">Shadow DOM</TabsTrigger>
            </TabsList>

            <TabsContent value="iframe" className="mt-4">
              <p className="text-sm text-muted-foreground">
                The iframe method loads your menu in an isolated container. This is the most
                compatible option and works with any website.
              </p>
            </TabsContent>

            <TabsContent value="shadow" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Shadow DOM renders the menu directly on your page with style isolation.
                This provides a more native feel but may not work with all websites.
              </p>
            </TabsContent>
          </Tabs>

          {/* Configuration Options */}
          <div className="grid gap-4 sm:grid-cols-2">
            {widgetType === 'iframe' && (
              <div className="space-y-2">
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  min="300"
                  max="2000"
                />
                <p className="text-xs text-muted-foreground">
                  The widget will auto-resize if content is taller
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as WidgetTheme)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (use menu theme)</SelectItem>
                  <SelectItem value="light">Force Light</SelectItem>
                  <SelectItem value="dark">Force Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Code Output */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Embed Code</Label>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                <code>{code}</code>
              </pre>
            </div>
          </div>

          {/* Preview Link */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Preview Widget</p>
              <p className="text-sm text-muted-foreground">
                See how your menu looks when embedded
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Preview
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Embed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Copy the embed code</h4>
            <p className="text-sm text-muted-foreground">
              Click the "Copy Code" button above to copy the embed snippet.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">2. Paste into your website</h4>
            <p className="text-sm text-muted-foreground">
              Add the code to your website's HTML where you want the menu to appear.
              This works with WordPress, Squarespace, Wix, and any HTML website.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">3. Customize (optional)</h4>
            <p className="text-sm text-muted-foreground">
              Adjust the height and theme settings above to match your website's design.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
