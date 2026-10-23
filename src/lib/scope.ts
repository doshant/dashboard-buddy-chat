// Geography and time-period scope for the dashboard, plus the integer splitting rules that divide
// national figures between regions so every regional number adds back to the national one.

export const regionNames = ["Northeast", "Southeast", "Midwest", "West"] as const;
export type RegionName = (typeof regionNames)[number];
export type Geography = "Nation" | RegionName;

export const timePeriods = ["Launch to Date", "QTD", "Monthly"] as const;
export type TimePeriod = (typeof timePeriods)[number];

export type Scope = { geography: Geography; period: TimePeriod };
export const nationalScope: Scope = { geography: "Nation", period: "Launch to Date" };

// Months shown for each period: launch (Jan) to date, Q3 (Jul–Sep), or the latest month (Sep).
const windowStarts: Record<TimePeriod, number> = { "Launch to Date": 0, QTD: 6, Monthly: 8 };
export const windowStart = (period: TimePeriod) => windowStarts[period];

export const periodLabels: Record<TimePeriod, { short: string; long: string }> = {
  "Launch to Date": { short: "LTD", long: "launch to date" },
  QTD: { short: "QTD", long: "Q3 to date" },
  Monthly: { short: "Sep", long: "in September" },
};

const sumOf = (values: number[]) => values.reduce((total, value) => total + value, 0);

// Splits a whole number in proportion to weights, rounding by largest remainder so the parts add
// up exactly. A part never exceeds its weight when the total doesn't exceed the weights' sum.
export function allocate(total: number, weights: readonly number[]): number[] {
  const weightSum = sumOf([...weights]);
  if (total === 0 || weightSum === 0) return weights.map(() => 0);
  const targets = weights.map((weight) => (total * weight) / weightSum);
  const parts = targets.map(Math.floor);
  let left = total - sumOf(parts);
  const order = targets
    .map((target, i) => ({ i, remainder: target - Math.floor(target) }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    parts[i] = (parts[i] ?? 0) + 1;
    left -= 1;
  }
  return parts;
}

// Splits a monthly flow between regions, carrying each month's rounding into the next so the
// regional totals land exactly on weight × total (when that is a whole number).
export function splitFlow(values: readonly number[], weights: readonly number[]): number[][] {
  const weightSum = sumOf([...weights]);
  const carry = weights.map(() => 0);
  const byRegion = weights.map(() => [] as number[]);
  for (const value of values) {
    const ideal = weights.map((weight, r) =>
      Math.max(0, (value * weight) / weightSum + (carry[r] ?? 0)),
    );
    const parts = allocate(value, ideal);
    parts.forEach((part, r) => {
      carry[r] = (ideal[r] ?? 0) - part;
      byRegion[r]?.push(part);
    });
  }
  return byRegion;
}

// Splits a value that isn't a count (a forecast in $M) in exact proportion.
export const splitAmount = (value: number, weights: readonly number[]) => {
  const weightSum = sumOf([...weights]);
  return weights.map((weight) => (weightSum ? (value * weight) / weightSum : 0));
};
