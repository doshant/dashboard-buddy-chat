import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axisTick, seriesSwatch, tooltipProps } from "@/components/dashboard/chart-theme";
import { ChartLegend } from "@/components/dashboard/primitives";
import type { ChartFormat, ChatChartSpec } from "@/lib/chat-charts";

const formatters: Record<ChartFormat, (value: number) => string> = {
  count: (value) =>
    value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : value >= 1_000
        ? `${(value / 1_000).toFixed(1)}k`
        : `${Math.round(value)}`,
  dollars: (value) =>
    value >= 1_000 ? `$${(value / 1_000).toFixed(1)}k` : `$${Math.round(value)}`,
  cents: (value) => `$${value.toFixed(2)}`,
  percent: (value) => `${value.toFixed(1)}%`,
};
// Axis ticks drop the decimals the tooltips keep.
const tickFormatters: Record<ChartFormat, (value: number) => string> = {
  ...formatters,
  count: (value) =>
    value >= 1_000_000
      ? `${value / 1_000_000}M`
      : value >= 1_000
        ? `${value / 1_000}k`
        : `${value}`,
  dollars: (value) => (value >= 1_000 ? `$${value / 1_000}k` : `$${value}`),
  percent: (value) => `${value}%`,
};

// A compact chart in one of Clara's replies.
export function ChatChart({ chart }: { chart: ChatChartSpec }) {
  const hasRightAxis = chart.series.some((series) => series.axis === "right");
  const formatFor = (key: string) =>
    formatters[
      chart.series.find((series) => series.key === key)?.axis === "right"
        ? (chart.rightFormat ?? chart.format)
        : chart.format
    ];
  return (
    <figure
      aria-label={chart.title}
      className="mt-1 w-full rounded-lg border border-border bg-card px-2.5 pb-2 pt-2.5"
    >
      <figcaption className="px-1">
        <p className="text-xs font-bold text-primary">{chart.title}</p>
        <p className="text-[10px] text-muted-foreground">{chart.subtitle}</p>
      </figcaption>
      <div className="mt-1.5 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chart.data}
            margin={{ top: 8, right: hasRightAxis ? 0 : 8, bottom: 0, left: -8 }}
          >
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
            <XAxis
              dataKey={chart.xKey}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              interval={0}
              tickFormatter={(value: string) =>
                value.length > 14 ? `${value.slice(0, 13)}…` : value
              }
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={44}
              tickFormatter={(value: number) => tickFormatters[chart.format](value)}
            />
            {hasRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={axisTick}
                width={40}
                tickFormatter={(value: number) =>
                  tickFormatters[chart.rightFormat ?? chart.format](value)
                }
              />
            )}
            <Tooltip
              {...tooltipProps}
              formatter={(value, name, item) => [
                formatFor(String(item.dataKey))(Number(value)),
                name,
              ]}
            />
            {chart.series.map((series) =>
              series.type === "line" ? (
                <Line
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  yAxisId={series.axis ?? "left"}
                  type="monotone"
                  stroke={`var(--${series.color})`}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: `var(--${series.color})` }}
                  isAnimationActive={false}
                />
              ) : (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  yAxisId={series.axis ?? "left"}
                  {...(series.stack ? { stackId: series.stack } : {})}
                  fill={`var(--${series.color})`}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {chart.series.length > 1 && (
        <ChartLegend
          items={chart.series.map((series) => ({
            label: series.label,
            className: seriesSwatch[series.color],
          }))}
        />
      )}
    </figure>
  );
}
