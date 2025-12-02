import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailyView } from '@menucraft/api-client';
import { format, parseISO } from 'date-fns';

interface ViewsChartProps {
  data: DailyView[];
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d');
  } catch {
    return dateStr;
  }
}

export function ViewsChart({ data }: ViewsChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    displayDate: formatDate(item.date),
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No data for selected period</p>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0]?.payload as DailyView & { displayDate: string };
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <p className="text-sm font-medium">{data.displayDate}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.count} view{data.count !== 1 ? 's' : ''}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#colorViews)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
