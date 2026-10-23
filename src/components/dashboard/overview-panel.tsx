import { useState } from "react";
import {
  CircleDollarSign,
  Hourglass,
  Stethoscope,
  UserPlus,
  UsersRound,
  Warehouse,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartLegend,
  DashboardPanel,
  StackedCategoryBars,
  StackedMonthlyBars,
  StatCard,
} from "@/components/dashboard/primitives";
import { axisTick, surfaceGap, tooltipProps, valueLabel } from "@/components/dashboard/chart-theme";
import {
  activeByStatus,
  activePatientsTrend,
  attainment,
  funnel,
  kpis,
  monthlyNetSales,
  monthlyVials,
  newPatients,
  patientFunnel,
  pendingPatients,
  prescribers,
} from "@/lib/dashboard-data";

export function OverviewPanel() {
  const [forecastMetric, setForecastMetric] = useState<"netSales" | "vials">("netSales");

  const funnelRows = patientFunnel.map((row) => ({
    ...row,
    label: `${row.patients} · ${Math.round((row.patients / funnel.referred) * 100)}%`,
  }));
  const forecastRows =
    forecastMetric === "netSales"
      ? monthlyNetSales
      : monthlyVials.map((row) => ({
          month: row.month,
          actual: row.total,
          forecast: row.budget,
          le: row.le,
        }));
  const activeRows = activePatientsTrend.map((row) => ({
    ...row,
    total: row.loading + row.maintenance,
  }));
  const statusRows = activeByStatus.map((row) => ({
    ...row,
    total: row.commercial + row.quickStart + row.bridge + row.pap,
  }));
  const newPatientRows = newPatients.map((row) => ({
    ...row,
    total: row.eapTransition + row.newToBrand,
  }));
  const prescriberRows = prescribers.map((row) => ({ ...row, total: row.new + row.repeat }));

  const formatMoney = (value: unknown) => `$${Number(value).toFixed(1)}M`;
  const formatForecast =
    forecastMetric === "netSales" ? formatMoney : (value: unknown) => `${value}`;
  const target = attainment[forecastMetric];
  const attainmentTiles = [
    { label: "Sep", row: target.month },
    { label: "Q3 QTD", row: target.qtd },
    { label: "Launch to date", row: target.ltd },
  ];

  return (
    <>
      <section
        aria-label="Launch KPIs"
        className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
      >
        <StatCard
          title="Ex-factory Net Sales"
          Icon={CircleDollarSign}
          value={`$${kpis.netSales.ltd.toFixed(1)}M`}
          detail={`Launch to date · WAC $${kpis.netSales.wac / 1000}K/vial less ${kpis.netSales.gtn * 100}% GTN`}
          comparison={{
            text: `${kpis.netSales.attainmentPct}% of $${kpis.netSales.forecast.toFixed(1)}M forecast`,
            direction: kpis.netSales.attainmentPct >= 100 ? "up" : "down",
          }}
        />
        <StatCard
          title="Ex-factory Vials"
          Icon={Warehouse}
          value={kpis.vials.total.toString()}
          detail={`Paid ${kpis.vials.paid} · Free ${kpis.vials.free}`}
          comparison={{
            text: `${kpis.vials.budgetPct}% of budget · ${kpis.vials.lePct}% of LE`,
            direction: kpis.vials.lePct >= 100 ? "up" : "down",
          }}
        />
        <StatCard
          title="Active Patients"
          Icon={UsersRound}
          value={kpis.activePatients.total.toString()}
          detail={`Paid ${kpis.activePatients.paid} · Free ${kpis.activePatients.free} · Loading ${kpis.activePatients.loading} / Maint. ${kpis.activePatients.maintenance}`}
          comparison={{
            text: `+${kpis.activePatients.changePct}% vs Aug (${kpis.activePatients.prior})`,
            direction: "up",
          }}
        />
        <StatCard
          title="New Patients · Sep"
          Icon={UserPlus}
          value={kpis.newPatients.total.toString()}
          detail={`New to brand ${kpis.newPatients.newToBrand} · EAP transition ${kpis.newPatients.eapTransition}`}
          comparison={{ text: `${kpis.newPatients.sinceLaunch} first doses since launch` }}
        />
        <StatCard
          title="Pending Patients"
          Icon={Hourglass}
          value={kpis.pending.total.toString()}
          detail={`Avg ${kpis.pending.avgDays} days pending`}
          comparison={{ text: `${kpis.pending.over30} waiting 31+ days`, direction: "down" }}
        />
        <StatCard
          title="New Prescribers · Sep"
          Icon={Stethoscope}
          value={kpis.prescribers.new.toString()}
          detail={`of ${kpis.prescribers.ordering} HCPs ordering in Sep`}
          comparison={{ text: `${kpis.prescribers.sinceLaunch} prescribers since launch` }}
        />
      </section>

      <section aria-label="Launch charts" className="dashboard-chart-grid grid grid-cols-12 gap-4">
        <DashboardPanel
          title="Patient Funnel"
          subtitle="Patients reaching each step since launch · % of referred"
          className="col-span-12 lg:col-span-5"
        >
          <div className="dashboard-chart h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelRows}
                layout="vertical"
                margin={{ top: 4, right: 58, bottom: 4, left: 4 }}
              >
                <XAxis type="number" hide domain={[0, funnel.referred]} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tickLine={false}
                  axisLine={false}
                  width={108}
                  tick={{ ...axisTick, fontSize: 10 }}
                />
                <Tooltip
                  {...tooltipProps}
                  formatter={(value) => [`${value} patients`, "Reached"]}
                />
                <Bar
                  dataKey="patients"
                  name="Patients"
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
          title="Actual vs Forecast"
          subtitle={
            forecastMetric === "netSales"
              ? "Monthly net sales vs launch forecast"
              : "Monthly vials vs original budget and LE"
          }
          className="col-span-12 lg:col-span-7"
          action={
            <div
              role="group"
              aria-label="Forecast metric"
              className="flex rounded-md border border-border p-0.5 text-[11px]"
            >
              {(
                [
                  ["netSales", "Net sales"],
                  ["vials", "Vials"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={forecastMetric === key}
                  onClick={() => setForecastMetric(key)}
                  className={`rounded px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${forecastMetric === key ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          <div className="grid gap-3 md:grid-cols-[1fr_168px]">
            <div className="dashboard-chart h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={forecastRows}
                  margin={{ top: 16, right: 8, bottom: 2, left: -14 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--color-border)"
                    strokeDasharray="3 4"
                  />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                    tickFormatter={(v) => (forecastMetric === "netSales" ? `$${v}M` : `${v}`)}
                  />
                  <Tooltip {...tooltipProps} formatter={(value) => formatForecast(value)} />
                  <Bar
                    dataKey="actual"
                    name="Actual"
                    fill="var(--series-1)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  >
                    <LabelList
                      dataKey="actual"
                      position="top"
                      formatter={(v: unknown) =>
                        forecastMetric === "netSales" ? Number(v).toFixed(1) : `${v}`
                      }
                      style={valueLabel}
                    />
                  </Bar>
                  <Line
                    dataKey="forecast"
                    name={forecastMetric === "netSales" ? "Launch forecast" : "Original budget"}
                    type="monotone"
                    stroke="var(--target)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 3, fill: "var(--target)" }}
                  />
                  {forecastMetric === "vials" && (
                    <Line
                      dataKey="le"
                      name="LE"
                      type="monotone"
                      stroke="var(--series-3)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "var(--series-3)" }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <dl className="grid grid-cols-3 gap-2 md:grid-cols-1">
              {attainmentTiles.map(({ label, row }) => {
                const rowPct = Math.round((row.actual / row.target) * 100);
                return (
                  <div key={label} className="rounded-md bg-secondary/60 px-3 py-2">
                    <dt className="text-[10px] uppercase text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatForecast(row.actual)}
                      </span>
                      <span
                        className={`text-[11px] font-semibold tabular-nums ${rowPct >= 100 ? "text-trend-up" : "text-trend-down"}`}
                      >
                        {rowPct}%
                      </span>
                    </dd>
                    <dd className="text-[10px] tabular-nums text-muted-foreground">
                      vs {formatForecast(row.target)}{" "}
                      {forecastMetric === "netSales" ? "forecast" : "budget"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
          <ChartLegend
            items={[
              { label: "Actual", className: "bg-series-1" },
              {
                label: forecastMetric === "netSales" ? "Launch forecast" : "Original budget",
                className: "bg-target",
              },
              ...(forecastMetric === "vials" ? [{ label: "LE", className: "bg-series-3" }] : []),
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Ex-factory Vials"
          subtitle="Paid vs free vials shipped, with latest estimate"
          className="col-span-12 md:col-span-6 xl:col-span-4"
        >
          <div className="dashboard-chart h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={monthlyVials}
                margin={{ top: 16, right: 8, bottom: 2, left: -20 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="3 4"
                />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} />
                <Tooltip {...tooltipProps} />
                <Bar
                  dataKey="paid"
                  name="Paid"
                  stackId="vials"
                  fill="var(--series-1)"
                  maxBarSize={26}
                  {...surfaceGap}
                />
                <Bar
                  dataKey="free"
                  name="Free"
                  stackId="vials"
                  fill="var(--series-2)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={26}
                  {...surfaceGap}
                >
                  <LabelList dataKey="total" position="top" style={valueLabel} />
                </Bar>
                <Line
                  dataKey="le"
                  name="LE"
                  type="monotone"
                  stroke="var(--target)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            items={[
              { label: "Paid", className: "bg-series-1" },
              { label: "Free", className: "bg-series-2" },
              { label: "LE", className: "bg-target" },
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Active Patients"
          subtitle="Dosed in last 16 weeks · loading (doses 1–2) vs maintenance (3+)"
          className="col-span-12 md:col-span-6 xl:col-span-4"
        >
          <StackedMonthlyBars
            data={activeRows}
            series={[
              { key: "maintenance", label: "Maintenance", color: "series-1" },
              { key: "loading", label: "Loading", color: "series-2" },
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Active Patients by Status"
          subtitle="Commercial is paid; Quick Start, Bridge and PAP are free"
          className="col-span-12 md:col-span-6 xl:col-span-4"
        >
          <StackedMonthlyBars
            data={statusRows}
            series={[
              { key: "commercial", label: "Commercial", color: "series-1" },
              { key: "quickStart", label: "Quick Start", color: "series-2" },
              { key: "bridge", label: "Bridge", color: "series-3" },
              { key: "pap", label: "PAP", color: "series-4" },
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          title="New Patients (First Dose)"
          subtitle="First intrathecal loading dose · EAP transition vs new to brand"
          className="col-span-12 md:col-span-6 xl:col-span-4"
        >
          <StackedMonthlyBars
            data={newPatientRows}
            series={[
              { key: "newToBrand", label: "New to brand", color: "series-1" },
              { key: "eapTransition", label: "EAP transition", color: "series-3" },
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Pending Patients"
          subtitle={`Referred, not yet dosed · ${kpis.pending.total} patients, aged by days pending`}
          className="col-span-12 md:col-span-6 xl:col-span-4"
        >
          <StackedCategoryBars
            data={pendingPatients}
            categoryKey="stage"
            categoryWidth={86}
            height={196}
            series={[
              { key: "d0to14", label: "0–14 days", color: "aging-1" },
              { key: "d15to30", label: "15–30 days", color: "aging-2" },
              { key: "d31plus", label: "31+ days", color: "aging-3" },
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          title="New Prescribers"
          subtitle="HCPs ordering by month · first-time vs repeat"
          className="col-span-12 md:col-span-12 xl:col-span-4"
        >
          <StackedMonthlyBars
            data={prescriberRows}
            series={[
              { key: "repeat", label: "Repeat prescribers", color: "series-1" },
              { key: "new", label: "New prescribers", color: "series-3" },
            ]}
          />
        </DashboardPanel>
      </section>
    </>
  );
}
