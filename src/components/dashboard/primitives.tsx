import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  axisTick,
  categoryTick,
  seriesSwatch,
  surfaceGap,
  tooltipProps,
  valueLabel,
  type Series,
  type SeriesColor,
} from "@/components/dashboard/chart-theme";

const topRadius: [number, number, number, number] = [4, 4, 0, 0];
const endRadius: [number, number, number, number] = [0, 4, 4, 0];

// Small monthly trend drawn beside a KPI value; scaled to its own min and max.
export function Sparkline({
  values,
  label,
  color = "var(--series-1)",
  className = "h-7 w-24",
}: {
  values: number[];
  label: string;
  color?: string;
  className?: string;
}) {
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values.map((value, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * 100;
    const y = 26 - ((value - min) / range) * 22;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={`shrink-0 overflow-visible ${className}`}
    >
      <polygon points={`0,28 ${points.join(" ")} 100,28`} fill={color} opacity={0.1} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function StatCard({
  title,
  Icon,
  value,
  detail,
  comparison,
  trend,
}: {
  title: string;
  Icon: LucideIcon;
  value: string;
  detail: string;
  comparison: { text: string; direction?: "up" | "down" };
  trend?: { values: number[]; label: string };
}) {
  const TrendIcon = comparison.direction === "up" ? ArrowUpRight : ArrowDownRight;
  const trendClass =
    comparison.direction === "up"
      ? "text-trend-up"
      : comparison.direction === "down"
        ? "text-trend-down"
        : "text-foreground";
  return (
    <section className="dashboard-panel flex min-h-[124px] flex-col gap-1.5 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold text-primary">{title}</h2>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-primary">
          <Icon size={15} strokeWidth={2.1} />
        </span>
      </div>
      {trend && trend.values.length > 1 ? (
        <div className="flex items-end justify-between gap-3">
          <p className="text-[26px] font-bold leading-none tabular-nums">{value}</p>
          <Sparkline values={trend.values} label={trend.label} />
        </div>
      ) : (
        <p className="text-[26px] font-bold leading-none tabular-nums">{value}</p>
      )}
      <p className="text-[11px] leading-snug text-muted-foreground">{detail}</p>
      <p
        className={`mt-auto inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${trendClass}`}
      >
        {comparison.text}
        {comparison.direction && <TrendIcon size={12} strokeWidth={2.7} />}
      </p>
    </section>
  );
}

export function DashboardPanel({
  title,
  subtitle,
  className,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  className: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`dashboard-panel p-3 sm:p-3.5 ${className}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold leading-snug text-primary">{title}</h2>
          {subtitle && <p className="text-[11px] leading-snug text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// A small segmented control for switching a panel's view, placed in the panel's `action` slot.
export function ViewToggle<Key extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { key: Key; label: string }[];
  value: Key;
  onChange: (key: Key) => void;
}) {
  return (
    <div
      className="flex shrink-0 rounded-md border border-border p-0.5"
      role="group"
      aria-label={label}
    >
      {options.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={value === item.key}
          onClick={() => onChange(item.key)}
          className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${value === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ChartLegend({
  items,
  textSize = "text-[10px]",
}: {
  items: { label: string; className: string }[];
  textSize?: string;
}) {
  return (
    <div
      className={`flex min-h-4 flex-wrap items-center justify-center gap-x-2.5 gap-y-1 ${textSize} text-muted-foreground`}
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          <span className={`size-2 rounded-full ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function SeriesLegend({ series }: { series: Series[] }) {
  return (
    <ChartLegend
      items={series.map((item) => ({ label: item.label, className: seriesSwatch[item.color] }))}
    />
  );
}

const groupThousands = (value: number) => value.toLocaleString("en-US");

// Monthly stacked columns with the stack total labelled on top.
export function StackedMonthlyBars({
  data,
  series,
  formatValue = groupThousands,
  formatTick = formatValue,
}: {
  data: ({ month: string; total: number } & Record<string, string | number>)[];
  series: Series[];
  formatValue?: (value: number) => string;
  // Axis ticks are whole numbers, so they can drop decimals the bar labels keep.
  formatTick?: (value: number) => string;
}) {
  return (
    <>
      <div className="dashboard-chart h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, bottom: 2, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickFormatter={(value) => formatTick(Number(value))}
            />
            <Tooltip {...tooltipProps} formatter={(value) => formatValue(Number(value))} />
            {series.map((item, index) => {
              const isTop = index === series.length - 1;
              return (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.label}
                  stackId="stack"
                  fill={`var(--${item.color})`}
                  maxBarSize={26}
                  {...surfaceGap}
                  {...(isTop ? { radius: topRadius } : {})}
                >
                  {isTop && (
                    <LabelList
                      dataKey="total"
                      position="top"
                      style={valueLabel}
                      formatter={(value: unknown) => formatValue(Number(value))}
                    />
                  )}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SeriesLegend series={series} />
    </>
  );
}

// Horizontal stacked bars by category, with the row total labelled at the end.
export function StackedCategoryBars({
  data,
  categoryKey,
  series,
  categoryWidth = 96,
  height = Math.max(120, data.length * 44 + 24),
  formatValue = groupThousands,
}: {
  data: ({ total: number } & Record<string, string | number>)[];
  categoryKey: string;
  series: Series[];
  categoryWidth?: number;
  height?: number;
  formatValue?: (value: number) => string;
}) {
  return (
    <>
      <div className="dashboard-chart" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 38, bottom: 4, left: 4 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="3 4" />
            <XAxis
              type="number"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickFormatter={(value) => formatValue(Number(value))}
            />
            <YAxis
              type="category"
              dataKey={categoryKey}
              tickLine={false}
              axisLine={false}
              width={categoryWidth}
              tick={categoryTick}
            />
            <Tooltip {...tooltipProps} formatter={(value) => formatValue(Number(value))} />
            {series.map((item, index) => {
              const isEnd = index === series.length - 1;
              return (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.label}
                  stackId="stack"
                  fill={`var(--${item.color})`}
                  maxBarSize={26}
                  {...surfaceGap}
                  {...(isEnd ? { radius: endRadius } : {})}
                >
                  {isEnd && (
                    <LabelList
                      dataKey="total"
                      position="right"
                      style={valueLabel}
                      formatter={(value: unknown) => formatValue(Number(value))}
                    />
                  )}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SeriesLegend series={series} />
    </>
  );
}

// Single-series horizontal bars, labelled with the value and its share of the total.
export function RankedBars({
  data,
  color = "series-1",
  unit,
  formatValue = (value) => `${value}`,
  showShare = true,
  categoryWidth = 112,
}: {
  data: { label: string; value: number }[];
  color?: SeriesColor;
  unit: string;
  formatValue?: (value: number) => string;
  showShare?: boolean;
  categoryWidth?: number;
}) {
  const total = data.reduce((acc, row) => acc + row.value, 0);
  const rows = data.map((row) => ({
    ...row,
    display: showShare
      ? `${formatValue(row.value)} · ${Math.round((row.value / total) * 100)}%`
      : formatValue(row.value),
  }));
  return (
    <div className="dashboard-chart" style={{ height: Math.max(110, rows.length * 34 + 12) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 2, right: 76, bottom: 2, left: 4 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={categoryWidth}
            tick={categoryTick}
          />
          <Tooltip {...tooltipProps} formatter={(value) => [formatValue(Number(value)), unit]} />
          <Bar
            dataKey="value"
            name={unit}
            fill={`var(--${color})`}
            radius={endRadius}
            maxBarSize={20}
          >
            {/* Drawn directly: the default label wraps to the bar's width on short bars. */}
            <LabelList
              dataKey="display"
              content={({ x, y, width, height, value }) => (
                <text
                  x={Number(x) + Number(width) + 6}
                  y={Number(y) + Number(height) / 2}
                  dy="0.35em"
                  {...valueLabel}
                >
                  {value}
                </text>
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
