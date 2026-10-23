export const axisTick = { fontSize: 10, fill: "var(--color-muted-foreground)" };
export const categoryTick = { fontSize: 11, fill: "var(--color-muted-foreground)" };
// A card-coloured outline drawn behind each value keeps it legible where it crosses grid or trend lines.
export const valueLabel = {
  fontSize: 11,
  fontWeight: 600,
  fill: "var(--color-foreground)",
  stroke: "var(--color-card)",
  strokeWidth: 3,
  strokeLinejoin: "round" as const,
  paintOrder: "stroke",
};
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
