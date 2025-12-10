import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  useOrganization,
  useUpdateOrganization,
  usePlans,
  useSubscription,
  useCreateCheckout,
  useCreatePortalSession,
  useInvoices,
} from '@menucraft/api-client';
import { useCurrentOrg } from '@/store/organization';
import { useState, useEffect } from 'react';
import { Loader2, Building2, Users, CreditCard, Save, Check, Zap, ExternalLink, Receipt, Download, Eye } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export const Route = createFileRoute('/_dashboard/settings/')({
  component: SettingsPage,
});

function SettingsPage() {
  const orgId = useCurrentOrg();
  const { data: organization, isLoading } = useOrganization(orgId || '');
  const updateOrganization = useUpdateOrganization(orgId || '');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setSlug(organization.slug);
    }
  }, [organization]);

  const handleSave = () => {
    if (!name.trim()) return;

    updateOrganization.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          toast({
            title: 'Settings saved',
            description: 'Your organization settings have been updated.',
            variant: 'success',
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to save settings',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your account and organization settings</p>
      </div>

      <div className="grid gap-6">
        {/* Organization Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Organization</CardTitle>
                <CardDescription>Manage your organization details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Organization Slug</Label>
              <Input
                id="org-slug"
                value={slug}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                This is your unique identifier and cannot be changed.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={!name.trim() || updateOrganization.isPending}>
                {updateOrganization.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage your team and permissions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 font-medium">Team management coming soon</p>
              <p className="text-sm text-muted-foreground">
                Invite team members and manage their roles and permissions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Billing */}
        <BillingSection orgId={orgId || ''} />
      </div>
    </div>
  );
}

function BillingSection({ orgId }: { orgId: string }) {
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription(orgId);
  const { data: plans, isLoading: plansLoading } = usePlans();
  const createCheckout = useCreateCheckout(orgId);
  const createPortalSession = useCreatePortalSession(orgId);

  const handleUpgrade = async (priceId: string) => {
    try {
      const result = await createCheckout.mutateAsync({
        priceId,
        successUrl: `${window.location.origin}/settings?upgraded=true`,
        cancelUrl: `${window.location.origin}/settings`,
      });
      window.location.href = result.url;
    } catch {
      toast({
        title: 'Failed to create checkout',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const result = await createPortalSession.mutateAsync({
        returnUrl: `${window.location.origin}/settings`,
      });
      window.location.href = result.url;
    } catch {
      toast({
        title: 'Failed to open billing portal',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  if (subscriptionLoading || plansLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Manage your subscription and billing</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentPlan = subscription?.plan;
  const isFreePlan = subscription?.status === 'free';
  const isPaidPlan = subscription?.status === 'active';

  // Available upgrade plans (exclude current plan and free plan)
  const upgradePlans = plans?.filter(
    (p) => p.slug !== 'free' && p.slug !== currentPlan?.slug && p.isActive
  ) || [];

  return (
    <>
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>Your subscription and usage</CardDescription>
              </div>
            </div>
            {isPaidPlan && (
              <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage Subscription
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Info */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{currentPlan?.name || 'Free'}</h3>
                  <Badge variant={isFreePlan ? 'secondary' : 'default'}>
                    {isFreePlan ? 'Free' : subscription?.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentPlan?.monthlyPrice === 0
                    ? 'No monthly fee'
                    : `$${currentPlan?.monthlyPrice}/month`}
                </p>
              </div>
            </div>
            {subscription?.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Usage Stats */}
          {currentPlan?.limits && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Plan Limits</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Venues</span>
                    <span className="text-muted-foreground">
                      {currentPlan.limits.venues === -1 ? 'Unlimited' : `Up to ${currentPlan.limits.venues}`}
                    </span>
                  </div>
                  {currentPlan.limits.venues !== -1 && (
                    <Progress value={0} className="h-2" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Menus per venue</span>
                    <span className="text-muted-foreground">
                      {currentPlan.limits.menusPerVenue === -1 ? 'Unlimited' : `Up to ${currentPlan.limits.menusPerVenue}`}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Languages</span>
                    <span className="text-muted-foreground">
                      {currentPlan.limits.languages === -1 ? 'Unlimited' : currentPlan.limits.languages}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Custom domains</span>
                  <Badge variant={currentPlan.limits.customDomains ? 'default' : 'secondary'}>
                    {currentPlan.limits.customDomains ? 'Included' : 'Not available'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          {currentPlan?.features && currentPlan.features.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Included Features</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {currentPlan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      {isFreePlan && upgradePlans.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Upgrade Your Plan</CardTitle>
                <CardDescription>Get more features and higher limits</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {upgradePlans.map((plan) => (
                <div key={plan.id} className="rounded-lg border p-4">
                  <div className="mb-4">
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-2xl font-bold">
                      ${plan.monthlyPrice}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </p>
                  </div>
                  {plan.features && (
                    <ul className="mb-4 space-y-2">
                      {plan.features.slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(plan.stripePriceId)}
                    disabled={createCheckout.isPending}
                  >
                    {createCheckout.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Upgrade to {plan.name}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice History */}
      <InvoiceHistory orgId={orgId} />
    </>
  );
}

function InvoiceHistory({ orgId }: { orgId: string }) {
  const { data: invoices, isLoading } = useInvoices(orgId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>Your past invoices and payments</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>Your past invoices and payments</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Receipt className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 font-medium">No invoices yet</p>
            <p className="text-sm text-muted-foreground">
              Your billing history will appear here once you subscribe to a paid plan.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Paid</Badge>;
      case 'open':
        return <Badge variant="secondary">Open</Badge>;
      case 'void':
        return <Badge variant="outline">Void</Badge>;
      case 'uncollectible':
        return <Badge variant="destructive">Uncollectible</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Your past invoices and payments</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {invoice.number || `Invoice ${invoice.id.slice(-8)}`}
                    </p>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(invoice.created)}
                    {invoice.periodStart && invoice.periodEnd && (
                      <span className="ml-2">
                        ({formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-semibold">
                  {formatAmount(invoice.amountPaid || invoice.amountDue, invoice.currency)}
                </p>
                <div className="flex gap-2">
                  {invoice.hostedInvoiceUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="View invoice"
                    >
                      <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {invoice.invoicePdf && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="Download PDF"
                    >
                      <a href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
