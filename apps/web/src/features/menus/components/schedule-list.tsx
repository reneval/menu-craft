import { Button } from '@/components/ui/button';
import { useSchedules, useDeleteSchedule, useUpdateSchedule } from '@menucraft/api-client';
import type { MenuSchedule } from '@menucraft/shared-types';
import { Loader2, Plus, Trash2, Clock, Calendar, CalendarRange } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

interface ScheduleListProps {
  orgId: string;
  venueId: string;
  menuId: string;
  onAdd: () => void;
  onEdit: (schedule: MenuSchedule) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDays(daysOfWeek: number[] | null): string {
  if (!daysOfWeek || daysOfWeek.length === 0) return 'Every day';
  if (daysOfWeek.length === 7) return 'Every day';

  // Check for weekdays (Mon-Fri)
  if (
    daysOfWeek.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => daysOfWeek.includes(d))
  ) {
    return 'Weekdays';
  }

  // Check for weekends
  if (
    daysOfWeek.length === 2 &&
    daysOfWeek.includes(0) &&
    daysOfWeek.includes(6)
  ) {
    return 'Weekends';
  }

  return daysOfWeek.map((d) => DAYS[d]).join(', ');
}

function formatTime(time: string | null): string {
  if (!time) return '';
  const parts = time.split(':');
  const hours = parts[0] || '0';
  const minutes = parts[1] || '00';
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${minutes} ${ampm}`;
}

function ScheduleCard({
  schedule,
  orgId,
  venueId,
  menuId,
  onEdit,
}: {
  schedule: MenuSchedule;
  orgId: string;
  venueId: string;
  menuId: string;
  onEdit: (schedule: MenuSchedule) => void;
}) {
  const deleteSchedule = useDeleteSchedule(orgId, venueId, menuId);
  const updateSchedule = useUpdateSchedule(orgId, venueId, menuId, schedule.id);

  const handleDelete = () => {
    deleteSchedule.mutate(schedule.id, {
      onSuccess: () => {
        toast({
          title: 'Schedule deleted',
          variant: 'success',
        });
      },
      onError: (error) => {
        toast({
          title: 'Failed to delete schedule',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  const handleToggle = (isActive: boolean) => {
    updateSchedule.mutate(
      { isActive },
      {
        onError: (error) => {
          toast({
            title: 'Failed to update schedule',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const getScheduleDescription = () => {
    switch (schedule.scheduleType) {
      case 'always':
        return 'Always available';
      case 'time_range':
        return `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)} on ${formatDays(schedule.daysOfWeek)}`;
      case 'day_of_week':
        return `All day on ${formatDays(schedule.daysOfWeek)}`;
      case 'date_range':
        return `${schedule.startDate || '?'} to ${schedule.endDate || '?'}`;
      default:
        return 'Unknown schedule type';
    }
  };

  const getIcon = () => {
    switch (schedule.scheduleType) {
      case 'always':
        return <Clock className="h-4 w-4" />;
      case 'time_range':
        return <Clock className="h-4 w-4" />;
      case 'day_of_week':
        return <Calendar className="h-4 w-4" />;
      case 'date_range':
        return <CalendarRange className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div
      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
      onClick={() => onEdit(schedule)}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          {getIcon()}
        </div>
        <div>
          <p className="text-sm font-medium capitalize">
            {schedule.scheduleType.replace('_', ' ')}
          </p>
          <p className="text-xs text-muted-foreground">{getScheduleDescription()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Priority: {schedule.priority}</span>
        <Checkbox
          checked={schedule.isActive}
          onCheckedChange={(checked) => handleToggle(checked === true)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={deleteSchedule.isPending}
        >
          {deleteSchedule.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function ScheduleList({ orgId, venueId, menuId, onAdd, onEdit }: ScheduleListProps) {
  const { data: schedules, isLoading } = useSchedules(orgId, venueId, menuId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Active Schedules</p>
          <p className="text-xs text-muted-foreground">
            Define when this menu is available to customers
          </p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Schedule
        </Button>
      </div>

      {schedules && schedules.length > 0 ? (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              orgId={orgId}
              venueId={venueId}
              menuId={menuId}
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Clock className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No schedules configured</p>
          <p className="text-xs text-muted-foreground">
            This menu will always be available when published
          </p>
          <Button className="mt-4" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Schedule
          </Button>
        </div>
      )}
    </div>
  );
}
