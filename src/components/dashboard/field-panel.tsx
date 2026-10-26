import { useState } from "react";
import {
  CalendarDays,
  Handshake,
  Percent,
  PhoneCall,
  Repeat,
  Stethoscope,
  Target,
  UserCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  categoryTick,
  tooltipProps,
  valueLabel,
  type Series,
} from "@/components/dashboard/chart-theme";
import {
  DashboardPanel,
  SeriesLegend,
  StackedMonthlyBars,
  StatCard,
} from "@/components/dashboard/primitives";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import { callTypes, withFieldRates } from "@/lib/field-data";
import { shapeRate, shapeTrend, trendLabel } from "@/lib/trend";

type RegionRow = ReturnType<typeof withFieldRates>;

const callSeries: Series[] = [
  { key: "faceToFace", label: "Face-to-face", color: "series-1" },
  { key: "virtual", label: "Virtual", color: "series-2" },
  { key: "phone", label: "Phone", color: "series-3" },
];

type CallFilter = "all" | (typeof callTypes)[number]["key"];

const regionColumns = [
  { label: "HCPs targeted", value: (row: RegionRow) => `${row.targeted}` },
  { label: "HCPs reached", value: (row: RegionRow) => `${row.reached}` },
  { label: "Reach %", value: (row: RegionRow) => `${Math.round(row.reachPct)}%` },
  { label: "Calls", value: (row: RegionRow) => `${row.calls}` },
  { label: "Prescribers", value: (row: RegionRow) => `${row.prescribers}` },
];

export function FieldPanel() {
  const [callFilter, setCallFilter] = useState<CallFilter>("all");
  const { field, regional, scope, period, executive } = useDashboardData();
  const { callMix, engagementFunnel, fieldByMonth, fieldKpis: k } = field;
  const { rows: fieldRegionalSummary, total: fieldRegionalTotal } = regional.field;
  // Launch comparisons use every month since launch. The small trend charts follow the period:
  // by month for launch to date, quarter over quarter for QTD, numbers only for a single month.
  const trendMonths = field.trend.fieldByMonth;
  const view = executive.trendView;
  const by = trendLabel(view);
  const column = (
    key: "targeted" | "reached" | "reachPct" | "ordering" | "total" | "faceToFace" | "sellingDays",
  ) => trendMonths.map((row) => row[key]);
  const levels = (key: Parameters<typeof column>[0]) => shapeTrend(column(key), "last", view);
  const callsPerReachedHcp = trendMonths.map(
    (row, i) => trendMonths.slice(0, i + 1).reduce((acc, r) => acc + r.total, 0) / row.reached,
  );
  const firstMonth = trendMonths[0];

  const shownSeries =
    callFilter === "all" ? callSeries : callSeries.filter((item) => item.key === callFilter);
  // The bar-top total follows the call types shown.
  const callRows = fieldByMonth.map((row) => ({
    ...row,
    total: shownSeries.reduce(
      (acc, item) => acc + row[item.key as (typeof callTypes)[number]["key"]],
      0,
    ),
  }));
  const funnelRows = engagementFunnel.map((row) => ({
    ...row,
    label: `${row.hcps} · ${Math.round((row.hcps / k.targeted) * 100)}%`,
  }));

  return (
    <>
      <section
        aria-label="Field activity KPIs"
        className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="HCPs Targeted"
          Icon={Target}
          value={`${k.targeted}`}
          detail="Treating physicians on the call plan"
          comparison={{ text: `Up from ${firstMonth?.targeted} in ${firstMonth?.month}` }}
          trend={{ values: levels("targeted"), label: `HCPs targeted ${by}` }}
        />
        <StatCard
          title="HCPs Reached"
          Icon={UserCheck}
          value={`${k.reached}`}
          detail="Targeted HCPs with at least one call"
          comparison={{
            text: `+${k.reached - (trendMonths.at(-2)?.reached ?? 0)} in ${trendMonths.at(-1)?.month}`,
            direction: "up",
          }}
          trend={{ values: levels("reached"), label: `HCPs reached ${by}` }}
        />
        <StatCard
          title="Reach %"
          Icon={Percent}
          value={`${k.reachPct}%`}
          detail={`${k.reached} of ${k.targeted} targeted HCPs`}
          comparison={{
            text: `Up from ${Math.round(firstMonth?.reachPct ?? 0)}% in ${firstMonth?.month}`,
            direction: "up",
          }}
          trend={{ values: levels("reachPct"), label: `Reach % ${by}` }}
        />
        <StatCard
          title="Active Prescribers"
          Icon={Stethoscope}
          value={`${k.activePrescribers}`}
          detail="HCPs ordering in Sep"
          comparison={{ text: `${k.prescribersSinceLaunch} prescribers since launch` }}
          trend={{ values: levels("ordering"), label: `Ordering prescribers ${by}` }}
        />
        <StatCard
          title="Total Calls Made"
          Icon={PhoneCall}
          value={k.calls.toLocaleString("en-US")}
          detail="Face-to-face, virtual and phone calls"
          comparison={{
            text:
              k.firstMonth === trendMonths.at(-1)?.month
                ? `${k.latestCalls} in ${k.firstMonth}`
                : `${k.latestCalls} in M9, up from ${k.firstCalls} in ${k.firstMonth}`,
            direction: "up",
          }}
          trend={{ values: shapeTrend(column("total"), "sum", view), label: `Calls ${by}` }}
        />
        <StatCard
          title="Avg Calls / HCP"
          Icon={Repeat}
          value={k.callsPerHcp.toFixed(1)}
          detail={`${k.calls.toLocaleString("en-US")} calls across ${k.reached} reached HCPs`}
          comparison={{ text: `Calls ${period.long}` }}
          trend={{
            values: shapeTrend(callsPerReachedHcp, "last", view),
            label: `Cumulative calls per reached HCP ${by}`,
          }}
        />
        <StatCard
          title="Avg Calls / Day"
          Icon={CalendarDays}
          value={k.callsPerDay.toFixed(1)}
          detail={`Field team, over ${k.sellingDays} selling days`}
          comparison={{ text: `${k.latestCallsPerDay.toFixed(1)} a day in M9`, direction: "up" }}
          trend={{
            values: shapeRate(column("total"), column("sellingDays"), view),
            label: `Calls per day ${by}`,
          }}
        />
        <StatCard
          title="Face-to-Face Rate"
          Icon={Handshake}
          value={`${k.faceToFacePct}%`}
          detail="Share of all calls made in person"
          comparison={{ text: `Virtual ${callMix[1]?.pct}% · Phone ${callMix[2]?.pct}%` }}
          trend={{
            values: shapeRate(column("faceToFace"), column("total"), view, 100),
            label: `Face-to-face share ${by}`,
          }}
        />
      </section>

      <section
        aria-label="Field activity charts"
        className="dashboard-chart-grid grid grid-cols-12 gap-4"
      >
        <DashboardPanel
          title="Engagement Funnel"
          subtitle="HCPs at each stage since launch · % of targeted · champions have 3+ patients"
          className="col-span-12 lg:col-span-6"
        >
          <div className="dashboard-chart h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelRows}
                layout="vertical"
                margin={{ top: 4, right: 68, bottom: 4, left: 4 }}
              >
                <XAxis type="number" hide domain={[0, k.targeted]} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tickLine={false}
                  axisLine={false}
                  width={118}
                  tick={categoryTick}
                />
                <Tooltip {...tooltipProps} formatter={(value) => [`${value} HCPs`, "HCPs"]} />
                <Bar
                  dataKey="hcps"
                  name="HCPs"
                  fill="var(--series-1)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={26}
                >
                  <LabelList dataKey="label" position="right" style={valueLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Call Type by Month"
          subtitle="Field calls by type · M1 = Jan 2026"
          className="col-span-12 lg:col-span-6"
          action={
            <div
              className="flex shrink-0 rounded-md border border-border p-0.5"
              role="group"
              aria-label="Call type"
            >
              {([{ key: "all", label: "All" }, ...callTypes] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={callFilter === item.key}
                  onClick={() => setCallFilter(item.key)}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${callFilter === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        >
          <StackedMonthlyBars data={callRows} series={shownSeries} />
        </DashboardPanel>

        <DashboardPanel
          title="Call Type Mix"
          subtitle={`Share of ${k.calls.toLocaleString("en-US")} calls ${period.long}`}
          className="col-span-12 md:col-span-5"
        >
          <div className="dashboard-chart h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Tooltip
                  {...tooltipProps}
                  formatter={(value, name) => [
                    `${Number(value).toLocaleString("en-US")} calls`,
                    name,
                  ]}
                />
                <Pie
                  data={callMix}
                  dataKey="calls"
                  nameKey="label"
                  innerRadius="52%"
                  outerRadius="78%"
                  startAngle={90}
                  endAngle={-270}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                  label={({ payload, x, y, textAnchor }) => (
                    <text
                      x={x}
                      y={y}
                      textAnchor={textAnchor}
                      dominantBaseline="central"
                      {...valueLabel}
                    >
                      {`${(payload as (typeof callMix)[number]).pct}%`}
                    </text>
                  )}
                  labelLine={false}
                >
                  {callMix.map((row, i) => (
                    <Cell key={row.key} fill={`var(--${callSeries[i]?.color ?? "series-1"})`} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <SeriesLegend series={callSeries} />
        </DashboardPanel>

        <DashboardPanel
          title="Regional HCP Summary"
          subtitle={`Field reach by region · calls ${period.long} · ${scope.geography === "Nation" ? "totals match the cards above" : `${scope.geography} highlighted; totals are national`}`}
          className="col-span-12 md:col-span-7"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs tabular-nums">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Region
                  </th>
                  {regionColumns.map((column) => (
                    <th
                      key={column.label}
                      scope="col"
                      className="px-3 py-2 text-right font-semibold"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fieldRegionalSummary.map((row) => (
                  <tr
                    key={row.region}
                    className={`border-b border-border/60 ${row.region === scope.geography ? "bg-secondary/70" : ""}`}
                  >
                    <th scope="row" className="py-2 pr-3 font-semibold">
                      {row.region}
                    </th>
                    {regionColumns.map((column) => (
                      <td key={column.label} className="px-3 py-2 text-right">
                        {column.value(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold text-primary">
                  <th scope="row" className="py-2 pr-3">
                    {fieldRegionalTotal.region}
                  </th>
                  {regionColumns.map((column) => (
                    <td key={column.label} className="px-3 py-2 text-right">
                      {column.value(fieldRegionalTotal)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </DashboardPanel>
      </section>
    </>
  );
}
