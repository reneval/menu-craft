import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useDomains,
  useAddDomain,
  useVerifyDomain,
  useDeleteDomain,
  type CustomDomain,
} from '@menucraft/api-client';
import { toast } from '@/components/ui/use-toast';
import {
  Globe,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface CustomDomainsProps {
  orgId: string;
  venueId: string;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: 'Pending Verification',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
  },
  verifying: {
    icon: Loader2,
    label: 'Verifying...',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  active: {
    icon: CheckCircle2,
    label: 'Active',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  failed: {
    icon: AlertCircle,
    label: 'Verification Failed',
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
};

export function CustomDomains({ orgId, venueId }: CustomDomainsProps) {
  const [newDomain, setNewDomain] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<CustomDomain | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const { data: domains, isLoading } = useDomains(orgId, venueId);
  const addDomain = useAddDomain(orgId, venueId);
  const verifyDomain = useVerifyDomain(orgId, venueId);
  const deleteDomain = useDeleteDomain(orgId, venueId);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDomain.trim()) return;

    try {
      await addDomain.mutateAsync(newDomain.trim());
      toast({
        title: 'Domain added',
        description: 'Please configure your DNS settings to verify the domain.',
        variant: 'success',
      });
      setNewDomain('');
    } catch (error: any) {
      toast({
        title: 'Failed to add domain',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleVerify = async (domain: CustomDomain) => {
    try {
      const result = await verifyDomain.mutateAsync(domain.id);
      if (result.verified) {
        toast({
          title: 'Domain verified!',
          description: `${domain.domain} is now active and ready to use.`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Verification pending',
          description: result.message || 'Please check your DNS settings.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!domainToDelete) return;

    try {
      await deleteDomain.mutateAsync(domainToDelete.id);
      toast({
        title: 'Domain removed',
        description: `${domainToDelete.domain} has been removed.`,
        variant: 'success',
      });
      setDeleteDialogOpen(false);
      setDomainToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Failed to remove domain',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard.`,
    });
  };

  // Get the CNAME target - in production this would be your actual domain
  const cnameTarget = 'menu.menucraft.io';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Custom Domains
          </CardTitle>
          <CardDescription>
            Use your own domain to serve your menu (e.g., menu.yourrestaurant.com)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Domain Form */}
          <form onSubmit={handleAddDomain} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="menu.yourdomain.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!newDomain.trim() || addDomain.isPending}>
              {addDomain.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Domain
            </Button>
          </form>

          {/* Domain List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : domains && domains.length > 0 ? (
            <div className="space-y-3">
              {domains.map((domain) => {
                const status = STATUS_CONFIG[domain.status];
                const StatusIcon = status.icon;
                const isExpanded = expandedDomain === domain.id;

                return (
                  <div
                    key={domain.id}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'rounded-full p-1.5',
                            status.bg
                          )}
                        >
                          <StatusIcon
                            className={cn(
                              'h-4 w-4',
                              status.color,
                              domain.status === 'verifying' && 'animate-spin'
                            )}
                          />
                        </div>
                        <div>
                          <p className="font-medium">{domain.domain}</p>
                          <p className={cn('text-xs', status.color)}>
                            {status.label}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {domain.status === 'active' && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`https://${domain.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-3 w-3" />
                              Visit
                            </a>
                          </Button>
                        )}
                        {domain.status !== 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerify(domain)}
                            disabled={verifyDomain.isPending}
                          >
                            {verifyDomain.isPending ? (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-3 w-3" />
                            )}
                            Verify
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDomainToDelete(domain);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* DNS Instructions (for pending domains) */}
                    {domain.status !== 'active' && (
                      <div className="rounded-lg bg-muted/50 p-4 space-y-4">
                        <p className="text-sm font-medium">DNS Configuration Required</p>
                        <p className="text-xs text-muted-foreground">
                          Add the following DNS records to verify your domain:
                        </p>

                        <div className="space-y-3">
                          {/* CNAME Record */}
                          <div className="rounded border bg-background p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">CNAME Record</Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => copyToClipboard(cnameTarget, 'CNAME value')}
                              >
                                <Copy className="mr-1 h-3 w-3" />
                                Copy
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Host:</span>
                                <code className="ml-2 rounded bg-muted px-1">
                                  {domain.domain.split('.')[0]}
                                </code>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Value:</span>
                                <code className="ml-2 rounded bg-muted px-1">{cnameTarget}</code>
                              </div>
                            </div>
                          </div>

                          {/* TXT Record */}
                          <div className="rounded border bg-background p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">TXT Record (Verification)</Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() =>
                                  copyToClipboard(domain.verificationToken, 'TXT value')
                                }
                              >
                                <Copy className="mr-1 h-3 w-3" />
                                Copy
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Host:</span>
                                <code className="ml-2 rounded bg-muted px-1">_menucraft</code>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Value:</span>
                                <code className="ml-2 rounded bg-muted px-1 break-all">
                                  {domain.verificationToken}
                                </code>
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          DNS changes can take up to 48 hours to propagate. Click "Verify" to check.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Globe className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 font-medium">No custom domains</p>
              <p className="text-sm text-muted-foreground">
                Add a domain to serve your menu on your own URL
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Domain?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {domainToDelete?.domain} from your venue. Your menu will no longer
              be accessible at this domain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDomain.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDomain.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
