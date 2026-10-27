import { createContext, useContext, useMemo } from "react";
import { RotateCcw } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axisTick, tooltipProps } from "@/components/dashboard/chart-theme";
import { ChartLegend, DashboardPanel } from "@/components/dashboard/primitives";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import { Slider } from "@/components/ui/slider";
import {
  leverRanges,
  netPerVial,
  simulate,
  simulatorBaselineFor,
  simulatorMonths,
  simulatorPresets,
  simulatorRules,
  withPaDays,
  type SimulatorBaseline,
  type SimulatorLevers,
} from "@/lib/simulator-data";

const money = (valueM: number) => `${valueM < 0 ? "−" : "+"}$${Math.abs(valueM).toFixed(1)}M`;
const signed = (value: number, unit = "") =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value)}${unit}`;
const thousands = (value: number) =>
  value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`;

// The levers live with the page, so a what-if question in the assistant can set them. null means
// today's values for the selected geography.
export const SimulatorLeversContext = createContext<{
  levers: SimulatorLevers | null;
  setLevers: (levers: SimulatorLevers | null) => void;
}>({ levers: null, setLevers: () => {} });

export function SimulatorPanel() {
  const { scope } = useDashboardData();
  // The simulator always starts from launch-to-date figures for the selected geography.
  const baseline = useMemo(() => simulatorBaselineFor(scope.geography), [scope.geography]);
  return <Simulator baseline={baseline} geography={scope.geography} />;
}

function Simulator({ baseline, geography }: { baseline: SimulatorBaseline; geography: string }) {
  const base = baseline.levers;
  const ranges = leverRanges(baseline);
  const shared = useContext(SimulatorLeversContext);
  const levers = shared.levers ?? base;
  const setLevers = shared.setLevers;
  const result = simulate(baseline, levers);
  const changed = (Object.keys(base) as (keyof SimulatorLevers)[]).some(
    (key) => levers[key] !== base[key],
  );

  const presets = simulatorPresets(baseline);

  const oopChangePct = base.oopPerDose
    ? Math.round(((levers.oopPerDose - base.oopPerDose) / base.oopPerDose) * 100)
    : 0;
  const where = geography === "Nation" ? "National" : geography;

  return (
    <section aria-label="What-if simulator" className="grid grid-cols-12 gap-4">
      <DashboardPanel
        title="Assumptions"
        subtitle={`${where} launch-to-date figures are the starting point`}
        className="col-span-12 xl:col-span-4"
        action={
          <button
            type="button"
            onClick={() => setLevers(null)}
            disabled={!changed}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw size={12} aria-hidden="true" />
            Reset
          </button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setLevers(preset.levers)}
              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid gap-5">
          <Lever
            label="Referral → Paid"
            value={levers.referralToPaidPct}
            display={`${levers.referralToPaidPct}%`}
            delta={levers.referralToPaidPct - base.referralToPaidPct}
            unit=" pts"
            baseline={`${base.referralToPaidPct}% of known referral outcomes start on paid drug`}
            rule="New paid patients scale with the conversion rate"
            range={ranges.referralToPaidPct}
            step={1}
            onChange={(value) => setLevers({ ...levers, referralToPaidPct: value })}
          />
          <Lever
            label="Time to First Approved PA"
            value={levers.paDays}
            display={`${levers.paDays} days`}
            delta={levers.paDays - base.paDays}
            unit=" days"
            baseline={`Median ${base.paDays} days from referral`}
            rule={`Each day faster: +${simulatorRules.paDayLift * 100}% new paid patients (fewer drop out while waiting). Moves time to first dose by the same days.`}
            range={ranges.paDays}
            step={1}
            onChange={(value) => setLevers(withPaDays(levers, value, ranges.firstDoseDays.max))}
          />
          <Lever
            label="Time to First Dose"
            value={levers.firstDoseDays}
            display={`${levers.firstDoseDays} days`}
            delta={levers.firstDoseDays - base.firstDoseDays}
            unit=" days"
            baseline={`Median ${base.firstDoseDays} days from referral`}
            rule={`Each day faster: patients dose sooner, adding paid doses. At least ${simulatorRules.minSchedulingDays} days after PA approval.`}
            range={{
              min: Math.max(
                ranges.firstDoseDays.min,
                levers.paDays + simulatorRules.minSchedulingDays,
              ),
              max: ranges.firstDoseDays.max,
            }}
            step={1}
            onChange={(value) => setLevers({ ...levers, firstDoseDays: value })}
          />
          <Lever
            label="Avg Out-of-Pocket per Dose"
            value={levers.oopPerDose}
            display={`$${levers.oopPerDose}`}
            delta={oopChangePct}
            unit="%"
            baseline={`$${base.oopPerDose} patient cost per paid dose today`}
            rule={`Every 10% lower: +${simulatorRules.oopElasticity * 10}% new paid patients. The cut is paid as copay support.`}
            range={ranges.oopPerDose}
            step={5}
            onChange={(value) => setLevers({ ...levers, oopPerDose: value })}
          />
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="Projected Net Sales: Current vs Simulated"
        subtitle={`${where} · $M a month · actual Jul–Sep, projected ${simulatorMonths[0]}–${simulatorMonths[simulatorMonths.length - 1]}`}
        className="col-span-12 xl:col-span-8"
      >
        <ChartLegend
          items={[
            { label: "Current trajectory", className: "bg-target" },
            { label: "Simulated", className: "bg-series-1" },
          ]}
        />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.chart} margin={{ top: 12, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
              <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `$${value}M`}
                domain={[0, "auto"]}
              />
              <Tooltip
                {...tooltipProps}
                cursor={{ stroke: "var(--color-border)" }}
                formatter={(value) => `$${Number(value).toFixed(2)}M`}
              />
              <ReferenceLine
                x="Sep"
                stroke="var(--color-muted-foreground)"
                strokeDasharray="2 3"
                label={{ value: "Projected →", position: "insideTopRight", ...axisTick }}
              />
              <Line
                dataKey="current"
                name="Current trajectory"
                stroke="var(--target)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 2.5, fill: "var(--target)" }}
                isAnimationActive={false}
              />
              <Line
                dataKey="simulated"
                name="Simulated"
                stroke="var(--series-1)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--series-1)" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ResultTile
            label="Projected Δ Net Sales"
            value={money(result.deltaNetSalesM)}
            detail={`Next 6 months: $${result.simulatedNetSalesM}M vs $${result.currentNetSalesM}M`}
            tone={result.deltaNetSalesM}
          />
          <ResultTile
            label="Incremental Paid Patients"
            value={signed(result.incrementalPatients)}
            detail={`${result.paidStartsPerMonth} new paid a month vs ${result.baselinePaidStartsPerMonth}`}
            tone={result.incrementalPatients}
          />
          <ResultTile
            label="Effective Referral → Paid"
            value={`${result.effectiveReferralToPaidPct}%`}
            detail={`${base.referralToPaidPct}% today, after all levers`}
            tone={result.effectiveReferralToPaidPct - base.referralToPaidPct}
          />
          <ResultTile
            label="Copay Support ROI"
            value={result.copayRoi === null ? "–" : `${result.copayRoi}x`}
            detail={
              result.copayRoi === null
                ? "No extra copay support"
                : `Net sales per $1 of copay support (${thousands(result.copaySupportCost)})`
            }
            tone={result.copayRoi ?? 0}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Rule-based demo estimates, not a forecast. Current trajectory carries the last three
          months' trend forward; levers add or remove paid doses at ${netPerVial / 1000}k net per
          vial.
        </p>
      </DashboardPanel>
    </section>
  );
}

function Lever({
  label,
  value,
  display,
  delta,
  unit,
  baseline,
  rule,
  range,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  delta: number;
  unit: string;
  baseline: string;
  rule: string;
  range: { min: number; max: number };
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-xs tabular-nums">
          {delta !== 0 && (
            <span className="mr-1.5 text-[11px] text-muted-foreground">{signed(delta, unit)}</span>
          )}
          <span className="font-bold text-primary">{display}</span>
        </span>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={range.min}
        max={range.max}
        step={step}
        onValueChange={([next]) => next !== undefined && onChange(next)}
      />
      <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>{range.min}</span>
        <span>{range.max}</span>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        <span className="font-medium text-foreground">Today:</span> {baseline}
        <br />
        <span className="font-medium text-foreground">Rule:</span> {rule}
      </p>
    </div>
  );
}

function ResultTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: number;
}) {
  const color = tone > 0 ? "text-trend-up" : tone < 0 ? "text-trend-down" : "text-foreground";
  return (
    <div className="rounded-md bg-secondary/60 px-3 py-2.5 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{detail}</p>
    </div>
  );
}
