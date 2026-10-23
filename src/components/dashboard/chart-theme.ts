export const axisTick = { fontSize: 9, fill: "var(--color-muted-foreground)" };
export const valueLabel = { fontSize: 9, fill: "var(--color-foreground)" };
export const tooltipProps = {
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: 6,
    color: "var(--color-popover-foreground)",
    fontSize: 11,
  },
  labelStyle: { fontWeight: 700, color: "var(--color-popover-foreground)" },
  itemStyle: { color: "var(--color-popover-foreground)", padding: 0 },
  cursor: { fill: "var(--color-muted)", opacity: 0.5 },
};
export const surfaceGap = { stroke: "var(--color-card)", strokeWidth: 1 };

// Literal class names so Tailwind's scanner generates every swatch.
export const seriesSwatch = {
  "series-1": "bg-series-1",
  "series-2": "bg-series-2",
  "series-3": "bg-series-3",
  "series-4": "bg-series-4",
  "aging-1": "bg-aging-1",
  "aging-2": "bg-aging-2",
  "aging-3": "bg-aging-3",
  target: "bg-target",
} as const;

export type SeriesColor = keyof typeof seriesSwatch;
export type Series = { key: string; label: string; color: SeriesColor };
