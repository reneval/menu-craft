import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

const PRESETS = [
  { label: 'Today', getValue: () => ({ start: new Date(), end: new Date() }) },
  { label: 'Yesterday', getValue: () => ({ start: subDays(new Date(), 1), end: subDays(new Date(), 1) }) },
  { label: 'Last 7 days', getValue: () => ({ start: subDays(new Date(), 6), end: new Date() }) },
  { label: 'Last 30 days', getValue: () => ({ start: subDays(new Date(), 29), end: new Date() }) },
  { label: 'This week', getValue: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'This month', getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
];

function formatDateToStr(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'MMM d, yyyy');
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [tempStart, setTempStart] = useState<Date | undefined>(
    value.startDate ? new Date(value.startDate) : undefined
  );
  const [tempEnd, setTempEnd] = useState<Date | undefined>(
    value.endDate ? new Date(value.endDate) : undefined
  );

  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    const { start, end } = preset.getValue();
    onChange({
      startDate: formatDateToStr(start),
      endDate: formatDateToStr(end),
    });
    setOpen(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (selecting === 'start') {
      setTempStart(date);
      setTempEnd(undefined);
      setSelecting('end');
    } else {
      if (tempStart && date < tempStart) {
        setTempStart(date);
        setTempEnd(tempStart);
      } else {
        setTempEnd(date);
      }
      if (tempStart) {
        const finalStart = date < tempStart ? date : tempStart;
        const finalEnd = date < tempStart ? tempStart : date;
        onChange({
          startDate: formatDateToStr(finalStart),
          endDate: formatDateToStr(finalEnd),
        });
        setOpen(false);
        setSelecting('start');
      }
    }
  };

  const displayText = value.startDate && value.endDate
    ? `${formatDisplayDate(value.startDate)} - ${formatDisplayDate(value.endDate)}`
    : 'Select date range';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[280px] justify-start text-left font-normal',
            !value.startDate && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r p-2 space-y-1">
            <p className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
              Quick select
            </p>
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-3">
            <p className="mb-2 text-sm text-muted-foreground">
              {selecting === 'start' ? 'Select start date' : 'Select end date'}
            </p>
            <Calendar
              mode="single"
              selected={selecting === 'start' ? tempStart : tempEnd}
              onSelect={handleDateSelect}
              disabled={(date: Date) => date > new Date()}
              initialFocus
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
