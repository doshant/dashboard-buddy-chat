// Shapes a monthly series (January to September) for the small trend charts on KPI cards: by month
// for launch to date, quarter over quarter for QTD, or nothing for a single month, where the card
// shows only its numbers.

export type TrendView = "monthly" | "quarterly" | "none";

const quarters = <T>(values: T[]) =>
  [values.slice(0, 3), values.slice(3, 6), values.slice(6, 9)].filter((quarter) => quarter.length);

const sumOf = (values: number[]) => values.reduce((total, value) => total + value, 0);
const round2 = (value: number) => Math.round(value * 100) / 100;

// Flows (sales, calls, visits) add up across a quarter; levels (patients, HCPs, rates already
// measured to date) take the quarter-end value.
export function shapeTrend(values: number[], kind: "sum" | "last", view: TrendView) {
  if (view === "none") return [];
  if (view === "monthly") return values;
  return quarters(values).map((quarter) =>
    kind === "sum" ? round2(sumOf(quarter)) : (quarter[quarter.length - 1] ?? 0),
  );
}

// A rate per month, or per quarter from the quarter's own totals (not an average of monthly rates).
export function shapeRate(
  numerators: number[],
  denominators: number[],
  view: TrendView,
  scale = 1,
) {
  if (view === "none") return [];
  const rate = (n: number[], d: number[]) => (sumOf(d) ? round2((sumOf(n) / sumOf(d)) * scale) : 0);
  if (view === "monthly") return numerators.map((n, i) => rate([n], [denominators[i] ?? 0]));
  const denominatorQuarters = quarters(denominators);
  return quarters(numerators).map((quarter, q) => rate(quarter, denominatorQuarters[q] ?? []));
}

export const trendLabel = (view: TrendView) => (view === "quarterly" ? "by quarter" : "by month");
