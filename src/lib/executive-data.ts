import { buildLaunchData, nationalLaunchRaw, sum, type LaunchData } from "@/lib/launch-data";
import { buildFieldData, nationalFieldRaw, type FieldData } from "@/lib/field-data";
import {
  buildMarketAccessData,
  nationalMarketAccessRaw,
  type MarketAccessData,
} from "@/lib/market-access-data";
import {
  buildMarketingData,
  formatCount,
  formatRate,
  formatSpend,
  nationalMarketingRaw,
  type MarketingData,
} from "@/lib/marketing-data";
import {
  monthNames,
  periodLabel,
  periodWindow,
  type PeriodLabel,
  type PeriodWindow,
} from "@/lib/scope";
import { shapeTrend, type TrendView } from "@/lib/trend";

// The Executive Summary only re-presents figures owned by the other tabs, plus monthly referrals
// so fill and abandonment rates can be trended. Targets are demo planning assumptions. Built from
// the other tabs' data for one geography and period.

const round1 = (value: number) => Math.round(value * 10) / 10;
const share1 = (part: number, whole: number) => round1((part / whole) * 100);

export const executiveTargets = { hcpReachPct: 85, fillRatePct: 85, abandonmentMaxPct: 5 };

// New referrals by month (sums to the funnel's 80) and cancellations by the month they occurred.
export type ReferralRaw = { referralsByMonth: number[]; cancellationsByMonth: number[] };
export const nationalReferralRaw: ReferralRaw = {
  referralsByMonth: [12, 9, 8, 7, 8, 9, 9, 9, 9],
  cancellationsByMonth: [0, 0, 1, 0, 0, 1, 0, 0, 0],
};

const cumulative = (values: number[]) => values.map((_, i) => sum(values.slice(0, i + 1)));

export type Status = "Ahead" | "On track" | "Watch" | "Behind";
export type Tone = "good" | "bad" | "watch" | "neutral";

// Share of a target reached: 105%+ is ahead, 98%+ on track, 90%+ watch, otherwise behind.
function statusFor(pctOfTarget: number): Status {
  if (pctOfTarget >= 105) return "Ahead";
  if (pctOfTarget >= 98) return "On track";
  if (pctOfTarget >= 90) return "Watch";
  return "Behind";
}

export type Submetric = { label: string; value: string; badge?: { text: string; tone: Tone } };
export type ExecutiveMetric = {
  key: string;
  title: string;
  value: string;
  caption: string;
  status: Status;
  trend: number[];
  detail: { label: string; badge: { text: string; tone: Tone }; submetrics: Submetric[] };
};

// Key performance indicators below the glance row: one card per area the top row doesn't cover.
export type KpiGroup = {
  key: string;
  title: string;
  value: string;
  label: string;
  badge: { text: string; tone: Tone };
  trend: number[];
  submetrics: Submetric[];
};

export type ExecutiveInput = {
  launch: LaunchData;
  marketAccess: MarketAccessData;
  field: FieldData;
  marketing: MarketingData;
  referrals: ReferralRaw;
  window: PeriodWindow;
  label: PeriodLabel;
  trendView: TrendView;
};

export function buildExecutiveData(input: ExecutiveInput) {
  const { launch, marketAccess, field, marketing, referrals } = input;
  const { start, end } = input.window;
  const totals = (values: number[]) => shapeTrend(values, "sum", input.trendView);
  const levels = (values: number[]) => shapeTrend(values, "last", input.trendView);
  const period = input.label;
  const { attainment, funnel, kpis, pendingPatients } = launch;
  const { monthlyNetSales, monthlyVials, activePatientsTrend, newPatients, prescribers } =
    launch.trend;
  const {
    averageOopPerDose,
    conversion,
    marketAccessKpis,
    payerMixPaidDoses,
    payerMixReferred,
    priorAuth,
    restarts,
    stopReasons,
    stops,
    timeToTherapySummary,
  } = marketAccess;
  const timeToTherapy = marketAccess.trend.timeToTherapy;
  const vialsAdministered = marketAccess.trend.vialsAdministered;
  const { engagementFunnel, fieldKpis } = field;
  const fieldByMonth = field.trend.fieldByMonth;
  const { marketingKpis } = marketing;
  const websiteVisitsByMonth = marketing.trend.websiteVisitsByMonth;

  const startsByMonth = newPatients.map((row) => row.eapTransition + row.newToBrand);
  const referredToDate = cumulative(referrals.referralsByMonth);
  const startedToDate = cumulative(startsByMonth);
  const cancelledToDate = cumulative(referrals.cancellationsByMonth);
  // First-pass PA approval fell in Q3; both Executive cards that mention PA show the drop.
  const firstPassTrend = `${marketAccess.paAnalysis.firstPassH1}% H1 → ${marketAccess.paAnalysis.firstPassQ3}% Q3`;
  const fillAndAbandonByMonth = referredToDate.map((referred, i) => ({
    month: newPatients[i]?.month ?? monthNames[i] ?? "",
    referred,
    fillPct: share1(startedToDate[i] ?? 0, referred),
    abandonPct: share1(cancelledToDate[i] ?? 0, referred),
  }));
  // Fill and abandonment for the period: starts and cancellations per referral in its months.
  const referredInPeriod = sum(referrals.referralsByMonth.slice(start, end));
  const startedInPeriod = sum(startsByMonth.slice(start, end));
  const cancelledInPeriod = sum(referrals.cancellationsByMonth.slice(start, end));

  const pendingOver30 = kpis.pending.over30;
  const lpPending = pendingPatients.find((row) => row.stage === "Procedure scheduling")?.total ?? 0;
  const grossSalesM = round1((kpis.vials.paid * kpis.netSales.wac) / 1e6);
  const fillPct = share1(startedInPeriod, referredInPeriod);
  const abandonPct = share1(cancelledInPeriod, referredInPeriod);
  const cancelReasons = stopReasons
    .filter((row) => row.cancelled > 0)
    .map((row) => `${row.cancelled} ${row.reason.toLowerCase()}`)
    .join(" · ");
  const firstDoseTrend = `${timeToTherapy[0]?.firstDose} → ${timeToTherapy.at(-1)?.firstDose} days`;

  const executiveMetrics: ExecutiveMetric[] = [
    {
      key: "sales",
      title: "Sales Performance",
      value: `${kpis.netSales.attainmentPct}%`,
      caption: `Net sales (${period.short}) vs forecast`,
      status: statusFor(kpis.netSales.attainmentPct),
      trend: totals(monthlyNetSales.map((row) => row.actual)),
      detail: {
        label: `${kpis.netSales.ltd}M net sales ${period.long}`,
        badge: {
          text: `${kpis.netSales.attainmentPct}% of $${kpis.netSales.forecast}M forecast`,
          tone: "watch",
        },
        submetrics: [
          {
            label: "Net sales, Q3 QTD",
            value: `$${attainment.netSales.qtd.actual}M`,
            badge: {
              text: `${Math.round((attainment.netSales.qtd.actual / attainment.netSales.qtd.target) * 100)}% of forecast`,
              tone: "good",
            },
          },
          {
            label: "Net sales, September",
            value: `$${attainment.netSales.month.actual.toFixed(1)}M`,
            badge: {
              text: `${Math.round((attainment.netSales.month.actual / attainment.netSales.month.target) * 100)}% of forecast`,
              tone: "good",
            },
          },
          {
            label: `Gross sales ${period.short}`,
            value: `$${grossSalesM}M`,
            badge: {
              text: `${kpis.vials.paid} paid vials × $${kpis.netSales.wac / 1000}k`,
              tone: "neutral",
            },
          },
          {
            label: "Gross-to-net",
            value: `${Math.round(kpis.netSales.gtn * 100)}%`,
            badge: { text: "Assumed", tone: "neutral" },
          },
        ],
      },
    },
    {
      key: "demand",
      title: "Demand · Vials",
      value: `${kpis.vials.lePct}%`,
      caption: `Vials (${period.short}) vs latest estimate`,
      status: statusFor(kpis.vials.lePct),
      trend: totals(monthlyVials.map((row) => row.total)),
      detail: {
        label: `${kpis.vials.total} vials shipped ${period.long}`,
        badge: { text: `${kpis.vials.lePct}% of ${kpis.vials.le} LE`, tone: "good" },
        submetrics: [
          {
            label: "vs original budget",
            value: `${kpis.vials.budgetPct}%`,
            badge: { text: `${kpis.vials.total} of ${kpis.vials.budget}`, tone: "watch" },
          },
          { label: "Paid / free vials", value: `${kpis.vials.paid} / ${kpis.vials.free}` },
          {
            label: "Vials administered",
            value: `${marketAccessKpis.administered.total}`,
            badge: { text: `${marketAccessKpis.administered.latestMonth} in Sep`, tone: "good" },
          },
          {
            label: "Channel inventory",
            value: `${marketAccessKpis.inventory.total} vials`,
            badge: {
              text: `${marketAccessKpis.inventory.monthsOnHand} months on hand`,
              tone: "neutral",
            },
          },
        ],
      },
    },
    {
      key: "hcp",
      title: "HCP Engagement",
      value: `${fieldKpis.reachPct}%`,
      caption: `HCP reach vs ${executiveTargets.hcpReachPct}% target`,
      status: statusFor((fieldKpis.reachPct / executiveTargets.hcpReachPct) * 100),
      trend: levels(fieldByMonth.map((row) => row.reachPct)),
      detail: {
        label: `${fieldKpis.reached} of ${fieldKpis.targeted} targeted HCPs reached`,
        badge: { text: `Target: ${executiveTargets.hcpReachPct}%`, tone: "watch" },
        submetrics: [
          {
            label: "Active prescribers",
            value: `${fieldKpis.activePrescribers}`,
            badge: { text: `${fieldKpis.prescribersSinceLaunch} since launch`, tone: "neutral" },
          },
          {
            label: "Total calls",
            value: fieldKpis.calls.toLocaleString("en-US"),
            badge: { text: `${fieldKpis.latestCalls} in Sep`, tone: "good" },
          },
          { label: "Face-to-face rate", value: `${fieldKpis.faceToFacePct}%` },
          { label: "Avg calls per HCP", value: fieldKpis.callsPerHcp.toFixed(1) },
        ],
      },
    },
    {
      key: "patients",
      title: "Patient Summary",
      value: `${kpis.activePatients.total}`,
      caption: "Active patients",
      status: kpis.activePatients.changePct >= 0 ? "On track" : "Watch",
      trend: levels(activePatientsTrend.map((row) => row.loading + row.maintenance)),
      detail: {
        label: `${kpis.activePatients.total} active patients (${kpis.activePatients.paid} paid, ${kpis.activePatients.free} free)`,
        badge: { text: `+${kpis.activePatients.changePct}% MoM`, tone: "good" },
        submetrics: [
          {
            label: "New starts, September",
            value: `${kpis.newPatients.total}`,
            badge: { text: "All new to brand", tone: "good" },
          },
          {
            label: "Pending patients",
            value: `${kpis.pending.total}`,
            badge: { text: `${pendingOver30} over 30 days`, tone: "bad" },
          },
          {
            label: "Discontinued after dosing",
            value: `${stops.discontinued}`,
            badge: { text: `${stops.restarted} restarted`, tone: "neutral" },
          },
          {
            label: "Median days to first dose",
            value: `${timeToTherapySummary.firstDose.median}d`,
            badge: { text: firstDoseTrend, tone: "good" },
          },
        ],
      },
    },
    {
      key: "fill",
      title: "Fill Rate",
      value: `${Math.round(fillPct)}%`,
      caption: "Referrals reaching a first dose",
      status: statusFor((fillPct / executiveTargets.fillRatePct) * 100),
      trend: levels(fillAndAbandonByMonth.map((row) => row.fillPct)),
      detail: {
        label: `${startedInPeriod} of ${referredInPeriod} referrals filled ${period.long}`,
        badge: { text: `Target: ${executiveTargets.fillRatePct}%`, tone: "good" },
        submetrics: [
          {
            label: "Filled, of known outcomes",
            value: `${conversion.therapyKnownPct}%`,
            badge: { text: `${funnel.firstDose} of ${conversion.knownOutcomes}`, tone: "good" },
          },
          {
            label: "Still pending",
            value: `${kpis.pending.total}`,
            badge: { text: `${lpPending} at procedure scheduling`, tone: "watch" },
          },
          {
            label: "PA first-pass approval",
            value: `${marketAccess.paAnalysis.firstPassPct}%`,
            badge: { text: firstPassTrend, tone: "bad" },
          },
          {
            label: "Median days to first dose",
            value: `${timeToTherapySummary.firstDose.median}d`,
            badge: { text: firstDoseTrend, tone: "good" },
          },
        ],
      },
    },
    {
      key: "abandonment",
      title: "Abandonment Rate",
      value: `${abandonPct}%`,
      caption: "Referrals cancelled before a first dose",
      status: abandonPct <= executiveTargets.abandonmentMaxPct ? "On track" : "Behind",
      trend: levels(fillAndAbandonByMonth.map((row) => row.abandonPct)),
      detail: {
        label: `${cancelledInPeriod} of ${referredInPeriod} referrals abandoned ${period.long}`,
        badge: { text: `Target: ≤ ${executiveTargets.abandonmentMaxPct}%`, tone: "good" },
        submetrics: [
          {
            label: "Cancellation reasons",
            value: `${stops.cancelled}`,
            badge: { text: cancelReasons, tone: "neutral" },
          },
          {
            label: "Pending over 30 days",
            value: `${pendingOver30}`,
            badge: {
              text: `${share1(pendingOver30, funnel.referred)}% of referrals at risk`,
              tone: "bad",
            },
          },
          {
            label: "Discontinued after dosing",
            value: `${share1(stops.discontinued, funnel.firstDose)}%`,
            badge: { text: `${stops.discontinued} of ${funnel.firstDose} started`, tone: "bad" },
          },
          {
            label: "Off therapy",
            value: `${stops.offTherapy}`,
            badge: { text: `${stops.restarted} restarted`, tone: "neutral" },
          },
        ],
      },
    },
  ];

  const onTrack = executiveMetrics.filter(
    (metric) => metric.status === "On track" || metric.status === "Ahead",
  );
  const needsWatch = executiveMetrics.filter((metric) => !onTrack.includes(metric));

  const executiveInsights = {
    headline: `${onTrack.length} of ${executiveMetrics.length} launch measures are on track${needsWatch.length ? `; ${needsWatch.map((metric) => metric.title).join(" and ")} ${needsWatch.length === 1 ? "needs" : "need"} watching` : ""}.`,
    bullets: [
      `Net sales are at ${kpis.netSales.attainmentPct}% of forecast ${period.long}, while Q3 is running at ${Math.round((attainment.netSales.qtd.actual / attainment.netSales.qtd.target) * 100)}%.`,
      `Vial demand is at ${kpis.vials.lePct}% of the latest estimate, with ${kpis.vials.total} vials shipped ${period.long}.`,
      `${kpis.activePatients.total} patients are active, up ${kpis.activePatients.changePct}% on August. ${Math.round(fillPct)}% of referrals ${period.long} have filled and ${abandonPct}% were abandoned.`,
      `${kpis.pending.total} patients are pending, ${pendingOver30} for more than 30 days, mostly at procedure scheduling.`,
      `Field teams have reached ${fieldKpis.reachPct}% of targeted HCPs (target ${executiveTargets.hcpReachPct}%); ${fieldKpis.activePrescribers} prescribers ordered in September.`,
    ],
  };

  const executiveKpis = {
    fillPct,
    fillKnownPct: conversion.therapyKnownPct,
    abandonPct,
    cancelled: stops.cancelled,
    pendingOver30,
    pendingOver30Pct: share1(pendingOver30, funnel.referred),
    discontinuedPct: share1(stops.discontinued, funnel.firstDose),
  };

  const paidDoses = sum(payerMixPaidDoses.map((row) => row.doses));
  const medicareFfsDoses =
    payerMixPaidDoses.find((row) => row.payer === "Medicare FFS")?.doses ?? 0;
  const medicareReferred = sum(
    payerMixReferred.filter((row) => row.payer.startsWith("Medicare")).map((row) => row.patients),
  );
  const funnelStage = (stage: string) =>
    engagementFunnel.find((row) => row.stage === stage)?.hcps ?? 0;
  const latestPrescribers = prescribers[prescribers.length - 1]!;
  const lastBusier = [...prescribers.slice(0, -1)]
    .reverse()
    .find((row) => row.new >= latestPrescribers.new);
  const pctOf = (part: number, whole: number) => Math.round((part / whole) * 100);
  const firstPaTrend = `${timeToTherapy[0]?.firstApprovedPa} → ${timeToTherapy.at(-1)?.firstApprovedPa} days`;

  const kpiGroups: KpiGroup[] = [
    {
      key: "sales",
      title: "Sales & Demand",
      value: `$${kpis.netSales.ltd}M`,
      label: `Net sales ${period.long}`,
      badge: { text: `${kpis.netSales.attainmentPct}% of forecast`, tone: "watch" },
      trend: totals(monthlyNetSales.map((row) => row.actual)),
      submetrics: [
        {
          label: "Net sales, Q3 QTD",
          value: `$${attainment.netSales.qtd.actual}M`,
          badge: {
            text: `${pctOf(attainment.netSales.qtd.actual, attainment.netSales.qtd.target)}% of forecast`,
            tone: "good",
          },
        },
        {
          label: "Paid share of vials",
          value: `${pctOf(kpis.vials.paid, kpis.vials.total)}%`,
          badge: { text: `${kpis.vials.paid} of ${kpis.vials.total}`, tone: "neutral" },
        },
        {
          label: "Doses administered, Sep",
          value: `${marketAccessKpis.administered.latestMonth}`,
          badge: {
            text: `${marketAccessKpis.administered.sinceLaunch} since launch`,
            tone: "good",
          },
        },
      ],
    },
    {
      key: "journey",
      title: "Patient Journey",
      value: `${timeToTherapySummary.firstDose.median}d`,
      label: "Median days, referral to first dose",
      badge: { text: firstDoseTrend, tone: "good" },
      trend: levels(timeToTherapy.map((row) => row.firstDose)),
      submetrics: [
        {
          label: "Median days to PA approval",
          value: `${timeToTherapySummary.firstApprovedPa.median}d`,
          badge: { text: firstPaTrend, tone: "good" },
        },
        {
          label: "Benefits verified",
          value: `${pctOf(funnel.benefitsVerified, funnel.referred)}%`,
          badge: {
            text: `${funnel.benefitsVerified} of ${funnel.referred} referrals`,
            tone: "neutral",
          },
        },
        {
          label: "PA first-pass approval",
          value: `${marketAccess.paAnalysis.firstPassPct}%`,
          badge: { text: firstPassTrend, tone: "bad" },
        },
      ],
    },
    {
      key: "adherence",
      title: "Adherence & Persistence",
      value: `${pctOf(funnel.maintenance, funnel.firstDose)}%`,
      label: "Starters reaching maintenance (dose 3+)",
      badge: { text: `${funnel.maintenance} of ${funnel.firstDose}`, tone: "neutral" },
      trend: levels(activePatientsTrend.map((row) => row.maintenance)),
      submetrics: [
        {
          label: "Second-dose rate",
          value: `${pctOf(funnel.secondDose, funnel.firstDose)}%`,
          badge: { text: `${funnel.secondDose} of ${funnel.firstDose}`, tone: "good" },
        },
        {
          label: "Discontinued after dosing",
          value: `${pctOf(stops.discontinued, funnel.firstDose)}%`,
          badge: { text: `${stops.discontinued} patients`, tone: "bad" },
        },
        {
          label: "Restarted therapy",
          value: `${restarts.patients}`,
          badge: { text: `Median ${restarts.medianDaysOff} days off`, tone: "neutral" },
        },
      ],
    },
    {
      key: "payer",
      title: "Payer & Affordability",
      value: `${paidDoses}`,
      label: "Paid doses administered since launch",
      badge: { text: `Medicare FFS ${pctOf(medicareFfsDoses, paidDoses)}%`, tone: "neutral" },
      trend: totals(vialsAdministered.map((row) => row.paid)),
      submetrics: [
        {
          label: "Medicare share of referrals",
          value: `${pctOf(medicareReferred, funnel.referred)}%`,
          badge: { text: `${medicareReferred} of ${funnel.referred}`, tone: "neutral" },
        },
        {
          label: "Avg patient cost per dose",
          value: `$${averageOopPerDose}`,
          badge: { text: "After copay support", tone: "good" },
        },
        {
          label: "Active on free goods",
          value: `${pctOf(kpis.activePatients.free, kpis.activePatients.total)}%`,
          badge: {
            text: `${kpis.activePatients.free} of ${kpis.activePatients.total}`,
            tone: "watch",
          },
        },
      ],
    },
    {
      key: "prescribers",
      title: "Prescriber Adoption",
      value: `${latestPrescribers.new}`,
      label: "New prescribers in September",
      badge: { text: lastBusier ? `Most since ${lastBusier.month}` : "Highest yet", tone: "good" },
      trend: totals(prescribers.map((row) => row.new)),
      submetrics: [
        {
          label: "Prescribers since launch",
          value: `${kpis.prescribers.sinceLaunch}`,
          badge: { text: `${kpis.prescribers.ordering} ordering in Sep`, tone: "neutral" },
        },
        {
          label: "Repeat prescribers",
          value: `${funnelStage("Repeat prescribers")}`,
          badge: {
            text: `${pctOf(funnelStage("Repeat prescribers"), kpis.prescribers.sinceLaunch)}% of prescribers`,
            tone: "good",
          },
        },
        {
          label: "Champions",
          value: `${funnelStage("Champions")}`,
          badge: { text: "3+ patients started", tone: "neutral" },
        },
      ],
    },
    {
      key: "marketing",
      title: "Marketing Reach",
      value: formatRate(marketingKpis.hva.rate),
      label: "Website visits with a high value action",
      badge: { text: `${formatCount(marketingKpis.hva.total)} actions`, tone: "neutral" },
      trend: totals(websiteVisitsByMonth.map((row) => row.total)),
      submetrics: [
        {
          label: "Website visits",
          value: formatCount(marketingKpis.website.total),
          badge:
            marketingKpis.website.growthVsPriorPct < 0
              ? { text: `${marketingKpis.website.growthVsPriorPct}% vs prior month`, tone: "watch" }
              : { text: `+${marketingKpis.website.growthSinceLaunchPct}% since Jan`, tone: "good" },
        },
        {
          label: "HCP email open rate",
          value: formatRate(marketingKpis.email.openRate),
          badge: {
            text: `Click rate ${formatRate(marketingKpis.email.clickRate)}`,
            tone: "neutral",
          },
        },
        {
          label: "Marketing spend",
          value: formatSpend(marketingKpis.spend.total),
          badge: {
            text: `${formatCount(marketingKpis.paidMedia.impressions)} paid impressions`,
            tone: "neutral",
          },
        },
      ],
    },
  ];

  return {
    executiveMetrics,
    executiveInsights,
    executiveKpis,
    kpiGroups,
    trendView: input.trendView,
    fillAndAbandonByMonth,
    referralsByMonth: referrals.referralsByMonth,
  };
}

export type ExecutiveData = ReturnType<typeof buildExecutiveData>;

const nationalLaunch = buildLaunchData(nationalLaunchRaw);
export const {
  executiveMetrics,
  executiveInsights,
  executiveKpis,
  kpiGroups,
  fillAndAbandonByMonth,
  referralsByMonth,
} = buildExecutiveData({
  launch: nationalLaunch,
  marketAccess: buildMarketAccessData(nationalLaunch, nationalMarketAccessRaw),
  field: buildFieldData(nationalLaunch, nationalFieldRaw),
  marketing: buildMarketingData(nationalMarketingRaw),
  referrals: nationalReferralRaw,
  window: periodWindow({ period: "Launch to Date" }),
  label: periodLabel({ period: "Launch to Date" }),
  trendView: "monthly",
});
