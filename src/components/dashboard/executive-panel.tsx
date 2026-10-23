import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DashboardPanel,
  Sparkline,
  StackedCategoryBars,
  StackedMonthlyBars,
} from "@/components/dashboard/primitives";
import type { Series } from "@/components/dashboard/chart-theme";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import type { LaunchData } from "@/lib/launch-data";
import { type ExecutiveMetric, type KpiGroup, type Status, type Tone } from "@/lib/executive-data";

const statusDot: Record<Status, string> = {
  Ahead: "bg-brand-green",
  "On track": "bg-brand-blue",
  Watch: "bg-brand-orange",
  Behind: "bg-trend-down",
};

const toneClass: Record<Tone, string> = {
  good: "border-trend-up/40 bg-trend-up/5 text-trend-up",
  bad: "border-trend-down/40 bg-trend-down/5 text-trend-down",
  watch: "border-watch/40 bg-watch/5 text-watch",
  neutral: "border-border bg-secondary/60 text-muted-foreground",
};

const activeViewsFor = ({ activePatientsTrend, activeByStatus }: LaunchData) => ({
  all: {
    label: "All active",
    subtitle: "Dosed in last 16 weeks · loading (doses 1–2) vs maintenance (3+)",
    data: activePatientsTrend.map((row) => ({ ...row, total: row.loading + row.maintenance })),
    series: [
      { key: "maintenance", label: "Maintenance", color: "series-1" },
      { key: "loading", label: "Loading", color: "series-2" },
    ] satisfies Series[],
  },
  status: {
    label: "By status",
    subtitle: "Commercial is paid; Quick Start, Bridge and PAP are free",
    data: activeByStatus.map((row) => ({
      ...row,
      total: row.commercial + row.quickStart + row.bridge + row.pap,
    })),
    series: [
      { key: "commercial", label: "Commercial", color: "series-1" },
      { key: "quickStart", label: "Quick Start", color: "series-2" },
      { key: "bridge", label: "Bridge", color: "series-3" },
      { key: "pap", label: "PAP", color: "series-4" },
    ] satisfies Series[],
  },
});

function Badge({ text, tone }: { text: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex w-fit max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${toneClass[tone]}`}
    >
      {text}
    </span>
  );
}

function StatusLabel({ status }: { status: Status }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-foreground">
      <span className={`size-2 rounded-full ${statusDot[status]}`} />
      {status}
    </span>
  );
}

function MetricDetail({ metric }: { metric: ExecutiveMetric }) {
  return (
    <div
      id={`exec-detail-${metric.key}`}
      className="dashboard-panel grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
    >
      <div className="flex flex-col gap-2 lg:border-r lg:border-border lg:pr-4">
        <p className="text-xs font-bold text-primary">{metric.title}</p>
        <p className="text-sm font-semibold leading-snug">{metric.detail.label}</p>
        <Badge {...metric.detail.badge} />
        <Sparkline
          values={metric.trend}
          label={`${metric.title} by month`}
          className="mt-1 h-12 w-full"
        />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {metric.detail.submetrics.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <dt className="order-2 text-[11px] leading-snug text-muted-foreground">{item.label}</dt>
            <dd className="order-1 text-xl font-bold leading-none tabular-nums">{item.value}</dd>
            {item.badge && (
              <dd className="order-3">
                <Badge {...item.badge} />
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}

function KpiCard({ group }: { group: KpiGroup }) {
  return (
    <section className="dashboard-panel flex flex-col p-4">
      <h3 className="text-xs font-bold text-primary">{group.title}</h3>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-2xl font-bold leading-none text-primary tabular-nums">{group.value}</p>
          <p className="text-[11px] leading-snug text-muted-foreground">{group.label}</p>
          <Badge {...group.badge} />
        </div>
        <Sparkline
          values={group.trend}
          label={`${group.title} trend by month`}
          className="h-11 w-32"
        />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
        {group.submetrics.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-col gap-1">
            <dt className="order-2 text-[11px] leading-snug text-muted-foreground">{item.label}</dt>
            <dd className="order-1 text-lg font-bold leading-none tabular-nums">{item.value}</dd>
            {item.badge && (
              <dd className="order-3">
                <Badge {...item.badge} />
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ExecutivePanel() {
  const [selected, setSelected] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"all" | "status">("all");
  const { executive, launch } = useDashboardData();
  const { executiveInsights, executiveMetrics, kpiGroups } = executive;
  const { kpis, pendingPatients } = launch;
  const activeViews = activeViewsFor(launch);
  const selectedMetric = executiveMetrics.find((metric) => metric.key === selected);
  const view = activeViews[activeView];

  return (
    <>
      <section aria-label="Insights" className="dashboard-panel mb-4 p-4">
        <h2 className="text-sm font-bold text-primary">Insights</h2>
        <p className="mt-1 text-sm font-semibold">{executiveInsights.headline}</p>
        <ul className="mt-2 grid gap-1 text-[13px] leading-snug">
          {executiveInsights.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
              {bullet}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Launch health at a glance" className="mb-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold text-primary">Launch Health at a Glance</h2>
          <p className="text-[11px] text-muted-foreground">Select a measure for more detail</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {executiveMetrics.map((metric) => {
            const isSelected = metric.key === selected;
            return (
              <button
                key={metric.key}
                type="button"
                aria-expanded={isSelected}
                aria-controls={isSelected ? `exec-detail-${metric.key}` : undefined}
                onClick={() => setSelected(isSelected ? null : metric.key)}
                className={`dashboard-panel flex flex-col gap-1.5 px-3.5 py-3 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? "ring-2 ring-primary" : ""}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold leading-snug text-primary">
                    {metric.title}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`mt-0.5 shrink-0 text-muted-foreground transition-transform ${isSelected ? "rotate-180" : ""}`}
                  />
                </span>
                <span className="flex items-end justify-between gap-2">
                  <span className="text-2xl font-bold leading-none tabular-nums">
                    {metric.value}
                  </span>
                  <StatusLabel status={metric.status} />
                </span>
                <span className="text-[11px] leading-snug text-muted-foreground">
                  {metric.caption}
                </span>
                <Sparkline
                  values={metric.trend}
                  label={`${metric.title} by month`}
                  className="mt-auto h-7 w-full"
                />
              </button>
            );
          })}
        </div>
        {selectedMetric && (
          <div className="mt-3">
            <MetricDetail metric={selectedMetric} />
          </div>
        )}
      </section>

      <section aria-label="Key performance indicators" className="mb-4">
        <h2 className="mb-2 text-sm font-bold text-primary">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {kpiGroups.map((group) => (
            <KpiCard key={group.key} group={group} />
          ))}
        </div>
      </section>

      <section aria-label="Patient charts" className="dashboard-chart-grid grid grid-cols-12 gap-4">
        <DashboardPanel
          title="Active Patients"
          subtitle={view.subtitle}
          className="col-span-12 lg:col-span-7"
          action={
            <div
              className="flex shrink-0 rounded-md border border-border p-0.5"
              role="group"
              aria-label="Active patients view"
            >
              {(Object.keys(activeViews) as (keyof typeof activeViews)[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={activeView === key}
                  onClick={() => setActiveView(key)}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${activeView === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                >
                  {activeViews[key].label}
                </button>
              ))}
            </div>
          }
        >
          <StackedMonthlyBars data={view.data} series={view.series} />
        </DashboardPanel>

        <DashboardPanel
          title="Pending Patients"
          subtitle={`Referred, not yet dosed · ${kpis.pending.total} patients, aged by days pending`}
          className="col-span-12 lg:col-span-5"
        >
          <StackedCategoryBars
            data={pendingPatients}
            categoryKey="stage"
            categoryWidth={96}
            height={220}
            series={[
              { key: "d0to14", label: "0–14 days", color: "aging-1" },
              { key: "d15to30", label: "15–30 days", color: "aging-2" },
              { key: "d31plus", label: "31+ days", color: "aging-3" },
            ]}
          />
        </DashboardPanel>
      </section>
    </>
  );
}
