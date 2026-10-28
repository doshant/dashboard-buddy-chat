import { createContext, useContext, useMemo, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  marketingBaselineFor,
  marketingLeverRanges,
  marketingPresets,
  simulateMarketing,
  type MarketingBaseline,
  type MarketingLevers,
} from "@/lib/marketing-simulator-data";
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

// The simulator's chart is the page's centrepiece, so its labels are larger than other tabs'.
const chartTick = { ...axisTick, fontSize: 13 };
const chartTooltip = {
  ...tooltipProps,
  contentStyle: { ...tooltipProps.contentStyle, fontSize: 13 },
};

const money = (valueM: number) => `${valueM < 0 ? "−" : "+"}$${Math.abs(valueM).toFixed(1)}M`;
const signed = (value: number, unit = "") =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value)}${unit}`;
const thousands = (value: number) =>
  value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`;
const round1 = (value: number) => Math.round(value * 10) / 10;
const percent = (value: number) => `${value.toFixed(1)}%`;
const impressions = (valueK: number) =>
  valueK >= 1000 ? `${(valueK / 1000).toFixed(2)}M` : valueK ? `${valueK}k` : "0";
const dollars = (value: number) =>
  Math.abs(value) >= 1000
    ? `$${(Math.abs(value) / 1000).toFixed(1)}k`
    : `$${Math.abs(value).toFixed(0)}`;
const signedDollars = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${dollars(value)}`;
const changePct = (value: number, today: number) =>
  today ? Math.round(((value - today) / today) * 100) : 0;

// Which levers the simulator shows. Each profile sees the scenarios for the tabs it can open.
export const simulatorScenarios = ["Marketing", "Market Access"] as const;
export type SimulatorScenario = (typeof simulatorScenarios)[number];

// The scenario and levers live with the page, so they survive tab changes and a what-if question
// in the assistant can set them. null levers mean today's values for the selected geography.
export const SimulatorLeversContext = createContext<{
  scenarios: readonly SimulatorScenario[];
  scenario: SimulatorScenario;
  setScenario: (scenario: SimulatorScenario) => void;
  levers: SimulatorLevers | null;
  setLevers: (levers: SimulatorLevers | null) => void;
  marketingLevers: MarketingLevers | null;
  setMarketingLevers: (levers: MarketingLevers | null) => void;
}>({
  scenarios: ["Market Access"],
  scenario: "Market Access",
  setScenario: () => {},
  levers: null,
  setLevers: () => {},
  marketingLevers: null,
  setMarketingLevers: () => {},
});

export function SimulatorPanel() {
  const { scope } = useDashboardData();
  const { scenario } = useContext(SimulatorLeversContext);
  const where = scope.geography === "Nation" ? "National" : scope.geography;
  // The simulator always starts from launch-to-date figures for the selected geography.
  const accessBaseline = useMemo(() => simulatorBaselineFor(scope.geography), [scope.geography]);
  const marketingBaseline = useMemo(() => marketingBaselineFor(scope.geography), [scope.geography]);
  return scenario === "Marketing" ? (
    <MarketingSimulator baseline={marketingBaseline} where={where} />
  ) : (
    <AccessSimulator baseline={accessBaseline} where={where} />
  );
}

function MarketingSimulator({ baseline, where }: { baseline: MarketingBaseline; where: string }) {
  const base = baseline.levers;
  const ranges = marketingLeverRanges(baseline);
  const { marketingLevers, setMarketingLevers } = useContext(SimulatorLeversContext);
  const levers = marketingLevers ?? base;
  const result = simulateMarketing(baseline, levers);
  const set = (change: Partial<MarketingLevers>) => setMarketingLevers({ ...levers, ...change });
  const month = baseline.month;

  return (
    <SimulatorLayout
      where={where}
      subtitle={`${where} figures for ${month} are the starting point`}
      changed={(Object.keys(base) as (keyof MarketingLevers)[]).some(
        (key) => levers[key] !== base[key],
      )}
      onReset={() => setMarketingLevers(null)}
      presets={marketingPresets(baseline)}
      onPreset={setMarketingLevers}
      levers={
        <>
          <Lever
            label="Social Media Impressions a Month"
            value={levers.socialImpressionsK}
            display={impressions(levers.socialImpressionsK)}
            delta={changePct(levers.socialImpressionsK, base.socialImpressionsK)}
            unit="%"
            baseline={`${impressions(base.socialImpressionsK)} in ${month}`}
            rule="Costs $25.00 per 1,000 impressions; about 0.7% click through to the site"
            range={ranges.socialImpressionsK}
            formatBound={impressions}
            step={10}
            onChange={(value) => set({ socialImpressionsK: value })}
          />
          <Lever
            label="Paid Search Clicks a Month"
            value={levers.searchClicks}
            display={levers.searchClicks.toLocaleString("en-US")}
            delta={changePct(levers.searchClicks, base.searchClicks)}
            unit="%"
            baseline={`${base.searchClicks.toLocaleString("en-US")} in ${month}, ${baseline.searchPeak.clicks.toLocaleString("en-US")} at the ${baseline.searchPeak.month} peak`}
            rule={`Costs $${baseline.searchCpc.toFixed(2)} per click (${month}'s rate); each click is a site visit`}
            range={ranges.searchClicks}
            formatBound={(value) => value.toLocaleString("en-US")}
            step={10}
            onChange={(value) => set({ searchClicks: value })}
          />
          <Lever
            label="HCP Email Click Rate"
            value={levers.emailClickRatePct}
            display={percent(levers.emailClickRatePct)}
            delta={round1(levers.emailClickRatePct - base.emailClickRatePct)}
            unit="%"
            baseline={`${percent(base.emailClickRatePct)} of delivered HCP emails are clicked`}
            rule="Email is paid per send, so the click rate changes site visits, not spend"
            range={ranges.emailClickRatePct}
            formatBound={(value) => `${value}%`}
            step={0.1}
            onChange={(value) => set({ emailClickRatePct: round1(value) })}
          />
        </>
      }
      chartTitle="Monthly Marketing Spend: Today vs Scenario"
      chartSubtitle={`${where} · spend a month by channel, priced at ${month}'s rates`}
      chart={<SpendComparison result={result} />}
      tiles={
        <>
          <ResultTile
            label="Monthly Spend"
            value={dollars(result.spend)}
            detail={`${dollars(result.spendToday)} today`}
            tone={0}
          />
          <ResultTile
            label="Change a Month"
            value={signedDollars(result.deltaSpend)}
            detail={`${result.deltaSpendPct > 0 ? "+" : ""}${result.deltaSpendPct}% vs today`}
            tone={-result.deltaSpend}
          />
          <ResultTile
            label="Change over 6 Months"
            value={signedDollars(result.deltaSpendSixMonths)}
            detail={`${simulatorMonths[0]}–${simulatorMonths[simulatorMonths.length - 1]}`}
            tone={-result.deltaSpendSixMonths}
          />
          <ResultTile
            label="Cost per Site Visit"
            value={`$${result.costPerVisit.toFixed(2)}`}
            detail={`$${result.costPerVisitToday.toFixed(2)} today · ${result.visits.toLocaleString("en-US")} visits a month`}
            tone={result.costPerVisitToday - result.costPerVisit}
          />
        </>
      }
      note="Spend follows how each channel is bought: social per 1,000 impressions, search per click and HCP email per send."
    />
  );
}

// Today's and the scenario's monthly spend as two stacked columns, with the channel detail below.
const spendSeries = [
  { key: "email", label: "HCP email", color: "var(--series-1)", swatch: "bg-series-1" },
  { key: "social", label: "Social media", color: "var(--series-2)", swatch: "bg-series-2" },
  { key: "search", label: "Paid search", color: "var(--series-3)", swatch: "bg-series-3" },
] as const;

function SpendComparison({ result }: { result: ReturnType<typeof simulateMarketing> }) {
  const column = (label: string, pick: (row: (typeof result.channels)[number]) => number) => ({
    label,
    ...Object.fromEntries(result.channels.map((row) => [row.key, pick(row)])),
    total: result.channels.reduce((sum, row) => sum + pick(row), 0),
  });
  const data = [column("Today", (row) => row.spendToday), column("Scenario", (row) => row.spend)];
  return (
    <div className="flex flex-1 flex-col">
      <ChartLegend
        textSize="text-[13px]"
        items={spendSeries.map((item) => ({ label: item.label, className: item.swatch }))}
      />
      <div className="min-h-56 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 20, bottom: 4, left: 0 }} barSize={96}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
            <XAxis dataKey="label" tick={chartTick} tickLine={false} axisLine={false} />
            <YAxis
              tick={chartTick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => (value ? `$${value / 1000}k` : "$0")}
            />
            <Tooltip
              {...chartTooltip}
              cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
              formatter={(value) => dollars(Number(value))}
            />
            {spendSeries.map((item, i) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                stackId="spend"
                fill={item.color}
                isAnimationActive={false}
              >
                {i === spendSeries.length - 1 && (
                  <LabelList
                    dataKey="total"
                    position="top"
                    formatter={(value: unknown) => dollars(Number(value))}
                    style={{ ...chartTick, fontWeight: 700, fill: "var(--color-foreground)" }}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="mt-2 w-full text-xs tabular-nums">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase text-muted-foreground">
            <th scope="col" className="py-1.5 text-left font-semibold">
              Channel
            </th>
            <th scope="col" className="py-1.5 text-center font-semibold">
              Spend today
            </th>
            <th scope="col" className="py-1.5 text-center font-semibold">
              Scenario
            </th>
            <th scope="col" className="py-1.5 text-center font-semibold">
              Change
            </th>
            <th scope="col" className="py-1.5 text-center font-semibold">
              Site visits
            </th>
            <th scope="col" className="py-1.5 text-center font-semibold">
              Cost per visit
            </th>
          </tr>
        </thead>
        <tbody>
          {result.channels.map((row) => (
            <tr key={row.key} className="border-b border-border/60">
              <th scope="row" className="py-1.5 text-left font-semibold">
                {row.label}
              </th>
              <td className="py-1.5 text-center">{dollars(row.spendToday)}</td>
              <td className="py-1.5 text-center">{dollars(row.spend)}</td>
              <td className="py-1.5 text-center">{signedDollars(row.spend - row.spendToday)}</td>
              <td className="py-1.5 text-center">
                {row.visitsToday.toLocaleString("en-US")} → {row.visits.toLocaleString("en-US")}
              </td>
              <td className="py-1.5 text-center">
                {row.costPerVisitToday === null ? "–" : `$${row.costPerVisitToday.toFixed(2)}`} →{" "}
                {row.costPerVisit === null ? "–" : `$${row.costPerVisit.toFixed(2)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccessSimulator({ baseline, where }: { baseline: SimulatorBaseline; where: string }) {
  const base = baseline.levers;
  const ranges = leverRanges(baseline);
  const { levers: chosen, setLevers } = useContext(SimulatorLeversContext);
  const levers = chosen ?? base;
  const result = simulate(baseline, levers);

  return (
    <SimulatorLayout
      where={where}
      changed={(Object.keys(base) as (keyof SimulatorLevers)[]).some(
        (key) => levers[key] !== base[key],
      )}
      onReset={() => setLevers(null)}
      presets={simulatorPresets(baseline)}
      onPreset={setLevers}
      levers={
        <>
          <Lever
            label="Referral → Paid"
            value={levers.referralToPaidPct}
            display={`${levers.referralToPaidPct}%`}
            delta={levers.referralToPaidPct - base.referralToPaidPct}
            unit="%"
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
            delta={changePct(levers.oopPerDose, base.oopPerDose)}
            unit="%"
            baseline={`$${base.oopPerDose} patient cost per paid dose today`}
            rule={`Every 10% lower: +${simulatorRules.oopElasticity * 10}% new paid patients. The cut is paid as copay support.`}
            range={ranges.oopPerDose}
            step={5}
            onChange={(value) => setLevers({ ...levers, oopPerDose: value })}
          />
        </>
      }
      chartTitle="Projected Net Sales: Current vs Simulated"
      chartSubtitle={`${where} · $M a month · actual Jul–Sep, projected ${simulatorMonths[0]}–${simulatorMonths[simulatorMonths.length - 1]}`}
      chart={<SalesChart chart={result.chart} />}
      note={`Current trajectory carries the last three months' trend forward; levers add or remove paid doses at $${netPerVial / 1000}k net per vial.`}
      tiles={
        <>
          <SalesTiles result={result} />
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
        </>
      }
    />
  );
}

function SimulatorLayout<Levers>({
  where,
  subtitle = `${where} launch-to-date figures are the starting point`,
  changed,
  onReset,
  presets,
  onPreset,
  levers,
  chartTitle,
  chartSubtitle,
  chart,
  tiles,
  note,
}: {
  where: string;
  subtitle?: string;
  changed: boolean;
  onReset: () => void;
  presets: { label: string; levers: Levers }[];
  onPreset: (levers: Levers) => void;
  levers: ReactNode;
  chartTitle: string;
  chartSubtitle: string;
  chart: ReactNode;
  tiles: ReactNode;
  note: string;
}) {
  return (
    // Assumptions (a third of the width, at least 220px) and the chart stay side by side, filling the height
    // between the header and the tab bar. Only phone widths stack them.
    <section
      aria-label="What-if simulator"
      className="grid grid-cols-1 gap-4 sm:min-h-[calc(100dvh-11.5rem)] sm:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]"
    >
      <DashboardPanel
        title="Assumptions"
        subtitle={subtitle}
        className="flex min-w-0 flex-col"
        action={
          <button
            type="button"
            onClick={onReset}
            disabled={!changed}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw size={12} aria-hidden="true" />
            Reset
          </button>
        }
      >
        <ScenarioSelect />
        <div className="mb-4 flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onPreset(preset.levers)}
              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Equal rows, so the levers share the pane height evenly. */}
        <div className="grid flex-1 auto-rows-fr gap-3">{levers}</div>
      </DashboardPanel>

      <DashboardPanel title={chartTitle} subtitle={chartSubtitle} className="flex min-w-0 flex-col">
        {chart}
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">{tiles}</div>
        <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>
      </DashboardPanel>
    </section>
  );
}

function SalesChart({ chart }: { chart: { month: string; current: number; simulated: number }[] }) {
  return (
    <>
      <ChartLegend
        textSize="text-[13px]"
        items={[
          { label: "Current trajectory", className: "bg-target" },
          { label: "Simulated", className: "bg-series-1" },
        ]}
      />
      <div className="min-h-72 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart} margin={{ top: 16, right: 20, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
            <XAxis dataKey="month" tick={chartTick} tickLine={false} axisLine={false} />
            <YAxis
              tick={chartTick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `$${value}M`}
              domain={[0, "auto"]}
            />
            <Tooltip
              {...chartTooltip}
              cursor={{ stroke: "var(--color-border)" }}
              formatter={(value) => `$${Number(value).toFixed(2)}M`}
            />
            <ReferenceLine
              x="Sep"
              stroke="var(--color-muted-foreground)"
              strokeDasharray="2 3"
              label={{ value: "Projected →", position: "insideTopRight", ...chartTick }}
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
    </>
  );
}

// Picks the scenario's levers. With only one scenario available, it shows which one.
function ScenarioSelect() {
  const { scenarios, scenario, setScenario } = useContext(SimulatorLeversContext);
  return (
    <label className="mb-3 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
      Levers
      <Select
        value={scenario}
        onValueChange={(value) => setScenario(value as SimulatorScenario)}
        disabled={scenarios.length < 2}
      >
        <SelectTrigger
          aria-label="Simulator levers"
          className="h-8 w-44 rounded-md border-border bg-card px-2.5 text-xs font-semibold text-primary shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {scenarios.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function SalesTiles({
  result,
}: {
  result: {
    deltaNetSalesM: number;
    simulatedNetSalesM: number;
    currentNetSalesM: number;
    incrementalPatients: number;
    paidStartsPerMonth: number;
    baselinePaidStartsPerMonth: number;
  };
}) {
  return (
    <>
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
    </>
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
  formatBound = String,
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
  formatBound?: (value: number) => string;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col justify-center gap-2.5 rounded-lg border border-border bg-secondary/30 px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-base tabular-nums">
          {delta !== 0 && (
            <span className="mr-1.5 text-xs text-muted-foreground">{signed(delta, unit)}</span>
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
      <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{formatBound(range.min)}</span>
        <span>{formatBound(range.max)}</span>
      </div>
      <div className="space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Today:</span> {baseline}
        </p>
        <p>
          <span className="font-semibold text-foreground">Rule:</span> {rule}
        </p>
      </div>
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
