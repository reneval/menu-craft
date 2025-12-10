import { Link } from '@tanstack/react-router';
import { useTrialStatus, useSubscription } from '@menucraft/api-client';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Clock, Sparkles, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { env } from '@/config/env';

// Safe useAuth that works when Clerk isn't configured
function useSafeAuth() {
  if (!env.CLERK_PUBLISHABLE_KEY) {
    return { orgId: undefined };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkAuth();
}

interface UpgradeBannerProps {
  className?: string;
}

export function UpgradeBanner({ className = '' }: UpgradeBannerProps) {
  const { orgId } = useSafeAuth();
  const [dismissed, setDismissed] = useState(false);

  const { data: trialStatus } = useTrialStatus(orgId || '');
  const { data: subscription } = useSubscription(orgId || '');

  if (!orgId || dismissed) return null;

  // Don't show if on paid plan
  if (subscription?.status === 'active' && subscription?.plan?.slug !== 'free') {
    return null;
  }

  // Trial banner
  if (trialStatus?.isTrialing) {
    const daysRemaining = trialStatus.daysRemaining;
    const isUrgent = daysRemaining <= 3;

    return (
      <div
        className={`relative px-4 py-3 ${
          isUrgent
            ? 'bg-amber-50 border-b border-amber-200'
            : 'bg-blue-50 border-b border-blue-200'
        } ${className}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isUrgent ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            ) : (
              <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
            )}
            <p className={`text-sm font-medium ${isUrgent ? 'text-amber-800' : 'text-blue-800'}`}>
              {daysRemaining === 0
                ? 'Your trial ends today!'
                : daysRemaining === 1
                  ? 'Your trial ends tomorrow!'
                  : `${daysRemaining} days left in your free trial`}
              <span className="hidden sm:inline">
                {' '}
                — Upgrade now to keep all your features.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/settings" search={{ tab: 'billing' }}>
              <Button
                size="sm"
                variant={isUrgent ? 'default' : 'outline'}
                className={isUrgent ? 'bg-amber-600 hover:bg-amber-700' : ''}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Upgrade
              </Button>
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-black/5"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Free plan banner (trial expired or never started)
  if (subscription?.status === 'free') {
    return (
      <div
        className={`relative px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200 ${className}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
            <p className="text-sm font-medium text-purple-800">
              Unlock unlimited menus, languages, and remove branding.
              <span className="hidden sm:inline"> Upgrade to Pro for €9/month.</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/settings" search={{ tab: 'billing' }}>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="h-4 w-4 mr-1" />
                Upgrade to Pro
              </Button>
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-black/5"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Smaller inline upgrade prompt for use within pages
 */
export function UpgradePrompt({
  feature,
  className = '',
}: {
  feature: string;
  className?: string;
}) {
  const { orgId } = useSafeAuth();

  if (!orgId) return null;

  return (
    <div
      className={`rounded-lg border border-purple-200 bg-purple-50 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
        <div className="flex-grow">
          <p className="text-sm font-medium text-purple-800">
            Upgrade to unlock {feature}
          </p>
          <p className="text-sm text-purple-600 mt-1">
            Get unlimited access with Pro for €9/month.
          </p>
        </div>
        <Link to="/settings" search={{ tab: 'billing' }}>
          <Button size="sm" variant="outline" className="border-purple-300 text-purple-700">
            Upgrade
          </Button>
        </Link>
      </div>
    </div>
  );
}
