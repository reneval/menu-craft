import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useMenuActivity,
  formatActivityAction,
  getActivityActionType,
  type ActivityLogEntry,
} from '@menucraft/api-client';
import { formatDistanceToNow } from 'date-fns';
import {
  History,
  Plus,
  Pencil,
  Trash2,
  Rocket,
  Activity,
  Copy,
  Building2,
} from 'lucide-react';

interface ActivityLogCardProps {
  orgId: string;
  venueId: string;
  menuId: string;
}

export function ActivityLogCard({ orgId, venueId, menuId }: ActivityLogCardProps) {
  const { data: activities, isLoading, error } = useMenuActivity(orgId, venueId, menuId, {
    limit: 10,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Log
          </CardTitle>
          <CardDescription>Recent changes to this menu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Activity Log
        </CardTitle>
        <CardDescription>Recent changes to this menu</CardDescription>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground">
              Changes to this menu will appear here
            </p>
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            {activities.map((activity, index) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                isLast={index === activities.length - 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityItem({
  activity,
  isLast,
}: {
  activity: ActivityLogEntry;
  isLast: boolean;
}) {
  const actionType = getActivityActionType(activity.action);
  const actionText = formatActivityAction(activity.action);

  const userName = activity.user?.name || activity.user?.email || 'Unknown user';

  const ActionIcon = getActionIcon(actionType, activity.action);
  const iconColor = getActionIconColor(actionType);

  return (
    <div className="relative flex items-start gap-3 pb-4">
      {/* Icon dot on timeline */}
      <div
        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background ${iconColor}`}
      >
        <ActionIcon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{actionText}</span>
          {activity.resourceName && activity.resourceType !== 'menu' && (
            <span className="text-sm text-muted-foreground truncate">
              &quot;{activity.resourceName}&quot;
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <span>{userName}</span>
          <span>&middot;</span>
          <span>
            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Metadata details */}
        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <MetadataDisplay metadata={activity.metadata} action={activity.action} />
        )}
      </div>
    </div>
  );
}

function getActionIcon(actionType: string, action: string) {
  if (action.includes('clone')) return Building2;
  if (action.includes('duplicate')) return Copy;

  switch (actionType) {
    case 'create':
      return Plus;
    case 'update':
      return Pencil;
    case 'delete':
      return Trash2;
    case 'publish':
      return Rocket;
    default:
      return Activity;
  }
}

function getActionIconColor(actionType: string): string {
  switch (actionType) {
    case 'create':
      return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400';
    case 'update':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
    case 'delete':
      return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400';
    case 'publish':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function MetadataDisplay({
  metadata,
  action,
}: {
  metadata: Record<string, unknown>;
  action: string;
}) {
  // Only show relevant metadata
  if (action === 'menu.update' && metadata.changes) {
    const changes = metadata.changes as string[];
    if (changes.length === 0) return null;
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Changed: {changes.join(', ')}
      </p>
    );
  }

  if (action === 'menu.clone' && metadata.targetVenueName) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Cloned to {metadata.targetVenueName as string}
      </p>
    );
  }

  if (action === 'menu.duplicate' && metadata.sourceMenuName) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        From &quot;{metadata.sourceMenuName as string}&quot;
      </p>
    );
  }

  if (action === 'menu.publish' && metadata.version) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Version {metadata.version as number}
      </p>
    );
  }

  return null;
}
