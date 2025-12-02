import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateSchedule, useUpdateSchedule } from '@menucraft/api-client';
import type { MenuSchedule, ScheduleType } from '@menucraft/shared-types';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  venueId: string;
  menuId: string;
  schedule?: MenuSchedule | null;
}

const DAYS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

const PRESETS = [
  { label: 'Breakfast', startTime: '07:00', endTime: '11:00', days: [1, 2, 3, 4, 5] },
  { label: 'Lunch', startTime: '11:00', endTime: '15:00', days: [1, 2, 3, 4, 5] },
  { label: 'Dinner', startTime: '17:00', endTime: '22:00', days: [1, 2, 3, 4, 5, 6, 0] },
  { label: 'Happy Hour', startTime: '16:00', endTime: '18:00', days: [1, 2, 3, 4, 5] },
  { label: 'Weekend Brunch', startTime: '09:00', endTime: '14:00', days: [0, 6] },
];

export function ScheduleFormDialog({
  open,
  onOpenChange,
  orgId,
  venueId,
  menuId,
  schedule,
}: ScheduleFormDialogProps) {
  const [scheduleType, setScheduleType] = useState<ScheduleType>('always');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const createSchedule = useCreateSchedule(orgId, venueId, menuId);
  const updateSchedule = useUpdateSchedule(orgId, venueId, menuId, schedule?.id || '');

  const isEditing = !!schedule;

  useEffect(() => {
    if (schedule) {
      setScheduleType(schedule.scheduleType);
      setStartTime(schedule.startTime || '09:00');
      setEndTime(schedule.endTime || '17:00');
      setDaysOfWeek(schedule.daysOfWeek || [1, 2, 3, 4, 5]);
      setStartDate(schedule.startDate || '');
      setEndDate(schedule.endDate || '');
      setPriority(schedule.priority);
      setIsActive(schedule.isActive);
    } else {
      setScheduleType('always');
      setStartTime('09:00');
      setEndTime('17:00');
      setDaysOfWeek([1, 2, 3, 4, 5]);
      setStartDate('');
      setEndDate('');
      setPriority(0);
      setIsActive(true);
    }
  }, [schedule, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      scheduleType,
      startTime: scheduleType === 'time_range' || scheduleType === 'date_range' ? startTime : undefined,
      endTime: scheduleType === 'time_range' || scheduleType === 'date_range' ? endTime : undefined,
      daysOfWeek: scheduleType === 'time_range' || scheduleType === 'day_of_week' ? daysOfWeek : undefined,
      startDate: scheduleType === 'date_range' ? startDate : undefined,
      endDate: scheduleType === 'date_range' ? endDate : undefined,
      priority,
      isActive,
    };

    const mutation = isEditing ? updateSchedule : createSchedule;

    mutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: isEditing ? 'Schedule updated' : 'Schedule created',
          variant: 'success',
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast({
          title: isEditing ? 'Failed to update schedule' : 'Failed to create schedule',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setScheduleType('time_range');
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
    setDaysOfWeek(preset.days);
  };

  const isPending = createSchedule.isPending || updateSchedule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Schedule' : 'Add Schedule'}</DialogTitle>
          <DialogDescription>
            Define when this menu is available to customers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div className="space-y-2">
              <Label>Quick Presets</Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Schedule Type</Label>
            <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Always Available</SelectItem>
                <SelectItem value="time_range">Time Range</SelectItem>
                <SelectItem value="day_of_week">Specific Days</SelectItem>
                <SelectItem value="date_range">Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(scheduleType === 'time_range' || scheduleType === 'date_range') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {(scheduleType === 'time_range' || scheduleType === 'day_of_week') && (
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex gap-1">
                {DAYS.map((day) => (
                  <Button
                    key={day.id}
                    type="button"
                    variant={daysOfWeek.includes(day.id) ? 'default' : 'outline'}
                    size="sm"
                    className={cn('flex-1 px-2', daysOfWeek.includes(day.id) && 'bg-primary')}
                    onClick={() => toggleDay(day.id)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {scheduleType === 'date_range' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Higher priority schedules take precedence
              </p>
            </div>
            <div className="space-y-2">
              <Label>Active</Label>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
                <span className="text-sm text-muted-foreground">
                  {isActive ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
