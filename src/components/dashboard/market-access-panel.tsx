import {
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  Repeat,
  Route,
  Syringe,
  Timer,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DashboardPanel,
  RankedBars,
  SeriesLegend,
  StackedCategoryBars,
  StackedMonthlyBars,
  StatCard,
} from "@/components/dashboard/primitives";
import {
  axisTick,
  seriesSwatch,
  tooltipProps,
  valueLabel,
  type Series,
} from "@/components/dashboard/chart-theme";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";

const outcomeColors = {
  paid: "series-1",
  free: "series-2",
  pending: "aging-1",
  cancelled: "target",
} as const;

const timeSeries: Series[] = [
  { key: "firstDose", label: "Referral to first dose (non-EAP)", color: "series-1" },
  { key: "firstApprovedPa", label: "Referral to first approved PA", color: "series-3" },
];

export function MarketAccessPanel() {
  const { launch, marketAccess, period } = useDashboardData();
  const { funnel, kpis } = launch;
  const {
    administeredByPhase,
    averageOopPerDose,
    conversion,
    inventory,
    marketAccessKpis,
    newPatientsByGoods,
    payerMixPaidDoses,
    payerMixReferred,
    priorAuth,
    referralOutcomes,
    restarts,
    stopReasons,
    stops,
    timeToTherapy,
    timeToTherapySummary,
    vialsAdministered,
  } = marketAccess;
  const { administered, inventory: channel } = marketAccessKpis;
  const firstCohort = timeToTherapy[0];
  const lastCohort = timeToTherapy[timeToTherapy.length - 1];
  const cohortTrend = (key: "firstApprovedPa" | "firstDose") =>
    firstCohort && lastCohort && firstCohort !== lastCohort
      ? `${lastCohort.month} referrals ${lastCohort[key]} days, down from ${firstCohort[key]} in ${firstCohort.month}`
      : `${lastCohort?.month} referrals ${lastCohort?.[key]} days`;
  const paidDosesSinceLaunch = payerMixPaidDoses.reduce((acc, row) => acc + row.doses, 0);

  return (
    <>
      <section
        aria-label="Market access KPIs"
        className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title={`Vials Administered · ${period.short}`}
          Icon={Syringe}
          value={administered.total.toString()}
          detail={`Paid ${administered.paid} · Free ${administered.free} ${period.long}`}
          comparison={{
            text: `${administered.latestMonth} in Sep · ${channel.total} still in channel`,
          }}
        />
        <StatCard
          title="Referral → Therapy"
          Icon={Route}
          value={`${conversion.therapyTotalPct}%`}
          detail={`${conversion.started} of ${conversion.referred} referred patients started`}
          comparison={{
            text: `${conversion.therapyKnownPct}% of ${conversion.knownOutcomes} known outcomes`,
            direction: "up",
          }}
        />
        <StatCard
          title="Referral → Paid"
          Icon={CircleDollarSign}
          value={`${conversion.paidKnownPct}%`}
          detail={`${conversion.startedPaid} of ${conversion.knownOutcomes} known outcomes started on paid drug`}
          comparison={{
            text: `${conversion.started - conversion.startedPaid} started on free goods`,
          }}
        />
        <StatCard
          title="PA Approval Rate"
          Icon={BadgeCheck}
          value={`${priorAuth.approvalPct}%`}
          detail={`${priorAuth.approved} approved of ${priorAuth.submitted} PAs submitted`}
          comparison={{ text: `${priorAuth.pending} pending · ${priorAuth.denied} denied` }}
        />
        <StatCard
          title="Time to First Approved PA"
          Icon={CalendarClock}
          value={`${timeToTherapySummary.firstApprovedPa.median} days`}
          detail={`Median from referral · mean ${timeToTherapySummary.firstApprovedPa.mean} days · all payers`}
          comparison={{
            text: cohortTrend("firstApprovedPa"),
            direction: "up",
          }}
        />
        <StatCard
          title="Time to First Dose"
          Icon={Timer}
          value={`${timeToTherapySummary.firstDose.median} days`}
          detail={`Median from referral · mean ${timeToTherapySummary.firstDose.mean} days · ${timeToTherapySummary.firstDose.patients} non-EAP starts`}
          comparison={{
            text: cohortTrend("firstDose"),
            direction: "up",
          }}
        />
        <StatCard
          title="Avg Out-of-Pocket per Dose"
          Icon={Wallet}
          value={`$${averageOopPerDose}`}
          detail="Patient coinsurance after foundation / copay support"
          comparison={{ text: `Across ${paidDosesSinceLaunch} paid doses since launch` }}
        />
        <StatCard
          title="Patient Restarts"
          Icon={Repeat}
          value={restarts.patients.toString()}
          detail={`of ${stops.discontinued} discontinued patients resumed dosing`}
          comparison={{ text: `Median ${restarts.medianDaysOff} days off therapy` }}
        />
      </section>

      <section
        aria-label="Market access charts"
        className="dashboard-chart-grid grid grid-cols-12 gap-4"
      >
        <DashboardPanel
          title="Vials Administered"
          subtitle={`One vial per dose · paid vs free · ${period.long}`}
          className="col-span-12 xl:col-span-8"
        >
          <StackedMonthlyBars
            data={vialsAdministered}
            series={[
              { key: "paid", label: "Paid", color: "series-1" },
              { key: "free", label: "Free", color: "series-2" },
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Doses by Phase & Program"
          subtitle={`New (loading) vs continuing (maintenance) · ${administered.sinceLaunch} doses since launch`}
          className="col-span-12 md:col-span-6 xl:col-span-4"
        >
          <StackedCategoryBars
            data={administeredByPhase}
            categoryKey="phase"
            categoryWidth={92}
            height={196}
            series={[
              { key: "nonEap", label: "Non-EAP", color: "series-1" },
              { key: "eap", label: "EAP transition", color: "series-3" },
            ]}
          />
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Loading = {funnel.firstDose} first + {funnel.secondDose} second doses from the patient
            funnel
          </p>
        </DashboardPanel>

        <DashboardPanel
          title="Referral Outcomes"
          subtitle={`All ${funnel.referred} patients referred since launch · conversion to therapy and to paid`}
          className="col-span-12 md:col-span-6 xl:col-span-5"
        >
          <div
            className="flex h-9 w-full gap-0.5 overflow-hidden rounded-md"
            role="img"
            aria-label={referralOutcomes.map((row) => `${row.label} ${row.patients}`).join(", ")}
          >
            {referralOutcomes.map((row) => (
              <div
                key={row.key}
                className={`${seriesSwatch[outcomeColors[row.key]]} min-w-1.5`}
                style={{ width: `${(row.patients / funnel.referred) * 100}%` }}
                title={`${row.label}: ${row.patients}`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            {referralOutcomes.map((row) => (
              <span key={row.key} className="inline-flex items-center gap-1">
                <span className={`size-2 rounded-full ${seriesSwatch[outcomeColors[row.key]]}`} />
                {row.label} {row.patients}
              </span>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            {[
              {
                label: "To therapy · total",
                value: `${conversion.therapyTotalPct}%`,
                note: `${conversion.started} / ${conversion.referred}`,
              },
              {
                label: "To therapy · known",
                value: `${conversion.therapyKnownPct}%`,
                note: `${conversion.started} / ${conversion.knownOutcomes}`,
              },
              {
                label: "To paid · known",
                value: `${conversion.paidKnownPct}%`,
                note: `${conversion.startedPaid} / ${conversion.knownOutcomes}`,
              },
            ].map((tile) => (
              <div key={tile.label} className="rounded-md bg-secondary/60 px-3 py-2">
                <dt className="text-[10px] uppercase text-muted-foreground">{tile.label}</dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums">{tile.value}</dd>
                <dd className="text-[10px] tabular-nums text-muted-foreground">
                  {tile.note} patients
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Known outcomes exclude the {kpis.pending.total} patients still pending.
          </p>
        </DashboardPanel>

        <DashboardPanel
          title="New Patients by Goods Type"
          subtitle="How each new patient's first dose was covered"
          className="col-span-12 xl:col-span-7"
        >
          <StackedMonthlyBars
            data={newPatientsByGoods}
            series={[
              { key: "commercial", label: "Commercial", color: "series-1" },
              { key: "quickStart", label: "Quick Start", color: "series-2" },
              { key: "bridge", label: "Bridge", color: "series-3" },
              { key: "pap", label: "PAP", color: "series-4" },
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Time to Therapy"
          subtitle="Median days from referral, by referral month"
          className="col-span-12 xl:col-span-6"
        >
          <div className="dashboard-chart h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeToTherapy} margin={{ top: 20, right: 16, bottom: 2, left: -20 }}>
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
                  tickFormatter={(v) => `${v}d`}
                />
                <Tooltip
                  {...tooltipProps}
                  cursor={{ stroke: "var(--color-border)" }}
                  formatter={(value) => `${value} days`}
                />
                {timeSeries.map((item) => (
                  <Line
                    key={item.key}
                    dataKey={item.key}
                    name={item.label}
                    type="monotone"
                    stroke={`var(--${item.color})`}
                    strokeWidth={2}
                    dot={{ r: 3, fill: `var(--${item.color})` }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  >
                    <LabelList dataKey={item.key} position="top" style={valueLabel} />
                  </Line>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <SeriesLegend series={timeSeries} />
        </DashboardPanel>

        <DashboardPanel
          title="PA Outcomes"
          subtitle={`${priorAuth.submitted} patients with a PA submitted`}
          className="col-span-12 md:col-span-6 xl:col-span-3"
        >
          <p className="mb-1 text-[26px] font-bold leading-none tabular-nums">
            {priorAuth.approvalPct}%
          </p>
          <p className="mb-3 text-[11px] text-muted-foreground">approved</p>
          <RankedBars
            unit="Patients"
            categoryWidth={64}
            data={[
              { label: "Approved", value: priorAuth.approved },
              { label: "Pending", value: priorAuth.pending },
              { label: "Denied", value: priorAuth.denied },
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Out-of-Pocket per Dose"
          subtitle="Avg coinsurance after foundation / copay support"
          className="col-span-12 md:col-span-6 xl:col-span-3"
        >
          <p className="mb-1 text-[26px] font-bold leading-none tabular-nums">
            ${averageOopPerDose}
          </p>
          <p className="mb-3 text-[11px] text-muted-foreground">weighted across paid doses</p>
          <RankedBars
            unit="Avg per dose"
            color="series-3"
            showShare={false}
            categoryWidth={96}
            formatValue={(value) => `$${value}`}
            data={payerMixPaidDoses.map((row) => ({ label: row.payer, value: row.oopPerDose }))}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Payer Mix · All Referred"
          subtitle={`${funnel.referred} referred patients, including free-drug and unmapped`}
          className="col-span-12 md:col-span-6"
        >
          <RankedBars
            unit="Patients"
            data={payerMixReferred.map((row) => ({ label: row.payer, value: row.patients }))}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Payer Mix · Paid Doses"
          subtitle={`${paidDosesSinceLaunch} paid doses administered since launch, by payer`}
          className="col-span-12 md:col-span-6"
        >
          <RankedBars
            unit="Paid doses"
            color="series-4"
            data={payerMixPaidDoses.map((row) => ({ label: row.payer, value: row.doses }))}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Cancellations & Discontinuations"
          subtitle="Cancelled before a first dose vs discontinued after dosing"
          className="col-span-12 md:col-span-6"
        >
          <StackedCategoryBars
            data={stopReasons}
            categoryKey="reason"
            categoryWidth={84}
            series={[
              { key: "discontinued", label: "Discontinued", color: "series-1" },
              { key: "cancelled", label: "Cancelled", color: "series-3" },
            ]}
          />
          <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Cancelled", value: stops.cancelled },
              { label: "Discontinued", value: stops.discontinued },
              { label: "Restarted", value: stops.restarted },
              { label: "Off therapy", value: stops.offTherapy },
            ].map((tile) => (
              <div key={tile.label} className="rounded-md bg-secondary/60 px-2 py-1.5">
                <dt className="text-[10px] text-muted-foreground">{tile.label}</dt>
                <dd className="text-sm font-semibold tabular-nums">{tile.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {funnel.firstDose} first doses − {stops.discontinued} discontinued + {stops.restarted}{" "}
            restarted = {kpis.activePatients.total} active patients
          </p>
        </DashboardPanel>

        <DashboardPanel
          title="Site & Channel Inventory"
          subtitle="Vials on hand at the distributor and treating sites"
          className="col-span-12 md:col-span-6"
        >
          <StackedCategoryBars
            data={inventory}
            categoryKey="location"
            categoryWidth={118}
            series={[
              { key: "paid", label: "Paid", color: "series-1" },
              { key: "free", label: "Free", color: "series-2" },
            ]}
          />
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "On hand", value: `${channel.total} vials` },
              { label: "Months of supply", value: `~${channel.monthsOnHand}` },
              { label: "Recent doses / mo", value: `${channel.recentMonthlyDoses}` },
            ].map((tile) => (
              <div key={tile.label} className="rounded-md bg-secondary/60 px-2 py-1.5">
                <dt className="text-[10px] text-muted-foreground">{tile.label}</dt>
                <dd className="text-sm font-semibold tabular-nums">{tile.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {marketAccessKpis.shipped.total} vials shipped − {administered.total} administered ={" "}
            {channel.total} in channel
          </p>
        </DashboardPanel>
      </section>
    </>
  );
}
