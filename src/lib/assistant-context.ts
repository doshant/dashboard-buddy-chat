import { dataThrough, type PanelLabel } from "@/lib/dashboard-data";
import {
  activeOutlook,
  fieldActions,
  freeToPaidActions,
  hvaActions,
  inventoryRisk,
  marketingActions,
  mediaOutlook,
  over30Actions,
  prescriberOutlook,
  projectionMethod,
  reachOutlook,
  repeatActions,
  salesActions,
  salesActionsTotal,
  salesMilestone,
  salesOutlook,
  searchStory,
  stopActions,
  supplyOutlook,
  timeOutlook,
  timeToDoseActions,
  trafficOutlook,
} from "@/lib/outlook-data";
import { spendRates } from "@/lib/marketing-data";
import {
  marketingBaseline,
  marketingBaselineFor,
  marketingSimulatorSummary,
  searchWinBack,
} from "@/lib/marketing-simulator-data";
import { buildDashboardData } from "@/lib/scoped-data";
import { simulatorBaseline, simulatorSummary } from "@/lib/simulator-data";
import type { Scope } from "@/lib/scope";

// The data the live assistant answers from: the figures for the selected geography and period,
// limited to the tabs the user's profile can open. Forward-looking figures are national, launch to
// date. Everything here is derived from the same modules the dashboard renders.

// Tabs whose headline figures appear on the Executive Summary are answerable from it, matching the
// assistant's access rules for preset answers.
const launchTabs: PanelLabel[] = ["Executive Summary", "Overview"];

export function buildAssistantContext(scope: Scope, allowedPanels: readonly PanelLabel[]) {
  const data = buildDashboardData(scope);
  const can = (panel: PanelLabel) => allowedPanels.includes(panel);
  // The simulator always starts from launch-to-date figures for the selected geography.
  const launchToDate = () =>
    buildDashboardData({ geography: scope.geography, period: "Launch to Date" });
  const canLaunch = launchTabs.some(can);
  const { launch, marketAccess, field, marketing, executive, regional } = data;

  return {
    scope: {
      geography: scope.geography,
      period: data.period.long,
      periodShort: data.period.short,
      dataThrough,
      note: "Period totals cover the selected period; active patients, pending patients, inventory, the referral funnel and payer mix are as of the data date or since launch.",
    },
    allowedTabs: allowedPanels.filter((panel) => panel !== "Overview"),
    restrictedTabs: (
      [
        "Executive Summary",
        "Market Access",
        "Marketing",
        "Field Activity",
        "What-If Simulator",
      ] as const
    ).filter((panel) => !can(panel)),
    ...(can("Executive Summary") && {
      executiveSummary: {
        insights: executive.executiveInsights,
        launchHealth: executive.executiveMetrics.map(
          ({ title, value, caption, status, detail }) => ({
            title,
            value,
            caption,
            status,
            detail: detail.label,
            badge: detail.badge.text,
            supporting: detail.submetrics.map(({ label, value: v, badge }) => ({
              label,
              value: v,
              note: badge?.text,
            })),
          }),
        ),
        keyPerformanceIndicators: executive.kpiGroups.map(
          ({ title, value, label, badge, submetrics }) => ({
            title,
            value,
            label,
            note: badge.text,
            supporting: submetrics.map(({ label: l, value: v, badge: b }) => ({
              label: l,
              value: v,
              note: b?.text,
            })),
          }),
        ),
      },
    }),
    ...(canLaunch && {
      salesAndPatients: {
        kpis: launch.kpis,
        attainment: launch.attainment,
        monthlyInPeriod: launch.monthlyVials.map((row, i) => ({
          month: row.month,
          paidVials: row.paid,
          freeVials: row.free,
          totalVials: row.total,
          budgetVials: row.budget,
          leVials: row.le,
          netSalesM: launch.monthlyNetSales[i]?.actual,
          forecastNetSalesM: launch.monthlyNetSales[i]?.forecast,
        })),
        monthlyTrendSinceLaunch: launch.trend.monthlyVials.map((row, i) => ({
          month: row.month,
          totalVials: row.total,
          netSalesM: launch.trend.monthlyNetSales[i]?.actual,
          activePatients:
            (launch.trend.activePatientsTrend[i]?.loading ?? 0) +
            (launch.trend.activePatientsTrend[i]?.maintenance ?? 0),
          newPatients:
            (launch.trend.newPatients[i]?.eapTransition ?? 0) +
            (launch.trend.newPatients[i]?.newToBrand ?? 0),
          newPrescribers: launch.trend.prescribers[i]?.new,
        })),
        activeByStatusLatest: launch.trend.activeByStatus.at(-1),
        referralFunnelSinceLaunch: launch.patientFunnel,
        pendingPatients: launch.pendingPatients,
        pendingAvgDays: launch.pendingAvgDays,
        cancelledByStep: launch.cancelledByStep,
      },
    }),
    ...(can("Market Access") && {
      marketAccess: {
        kpis: marketAccess.marketAccessKpis,
        dosesAdministeredInPeriod: marketAccess.vialsAdministered,
        dosesByPhaseSinceLaunch: marketAccess.administeredByPhase,
        newPatientsByGoods: marketAccess.newPatientsByGoods,
        referralOutcomes: marketAccess.referralOutcomes,
        conversion: marketAccess.conversion,
        priorAuth: marketAccess.priorAuth,
        // First-pass PA decisions and denials for the selected scope; Q3 site table and appeals are
        // since the Jul 1 payer policy change. priorAuth.approvalPct is approval after appeal.
        priorAuthFirstPass: marketAccess.paAnalysis,
        priorAuthFirstPassByMonthSinceLaunch: marketAccess.trend.paMonths,
        timeToTherapyByReferralMonth: marketAccess.trend.timeToTherapy,
        timeToTherapySummary: marketAccess.timeToTherapySummary,
        payerMixReferred: marketAccess.payerMixReferred,
        payerMixPaidDoses: marketAccess.payerMixPaidDoses,
        averagePatientCostPerDose: marketAccess.averageOopPerDose,
        stopReasons: marketAccess.stopReasons,
        stops: marketAccess.stops,
        restarts: marketAccess.restarts,
        inventory: marketAccess.inventory,
      },
    }),
    ...(can("Marketing") && {
      marketing: {
        kpis: marketing.marketingKpis,
        // Spend is in dollars; impressions are in thousands (impressionsK).
        spendRates,
        spendByMonth: marketing.spendByMonth,
        spendByChannel: marketing.spendByChannel,
        websiteVisitsByMonth: marketing.websiteVisitsByMonth,
        // Each social, search and HCP email click is a site visit; "other" is every other source
        // (unpaid search, direct visits and referrals).
        visitsBySourceByMonth: marketing.visitsBySourceByMonth,
        highValueActions: marketing.highValueActions,
        hcpEmailByMonth: marketing.emailByMonth,
        hcpEmailFunnel: marketing.emailFunnel,
        socialByMonth: marketing.socialByMonth,
        paidSearchByMonth: marketing.searchByMonth,
        regionalSummary: [...regional.marketing.rows, regional.marketing.total],
      },
    }),
    ...(can("Field Activity") && {
      fieldActivity: {
        kpis: field.fieldKpis,
        monthsInPeriod: field.fieldByMonth,
        monthlyTrendSinceLaunch: field.trend.fieldByMonth.map(
          ({ month, total, targeted, reached }) => ({
            month,
            calls: total,
            targeted,
            reached,
          }),
        ),
        callMix: field.callMix,
        engagementFunnel: field.engagementFunnel,
        regionalSummary: [...regional.field.rows, regional.field.total],
      },
    }),
    // Rule-based what-if scenarios for the selected geography, from launch-to-date figures: one
    // set of levers for each of the profile's Marketing and Market Access tabs.
    ...(can("What-If Simulator") && {
      whatIfSimulator: {
        ...(can("Marketing") && {
          marketing: marketingSimulatorSummary(marketingBaseline(launchToDate())),
        }),
        ...(can("Market Access") && {
          marketAccess: simulatorSummary(simulatorBaseline(launchToDate())),
        }),
      },
    }),
    // Precomputed projections and recommendations (national, launch to date). Quote these rather
    // than recalculating, so live answers agree with the dashboard.
    outlook: {
      method: `${projectionMethod}. A demo estimate, not a forecast.`,
      ...(canLaunch && {
        sales: {
          salesOutlook,
          salesMilestone,
          activeOutlook,
          salesActions,
          salesActionsTotal,
          freeToPaidActions,
          over30Actions,
        },
      }),
      ...(can("Market Access") && {
        marketAccess: { supplyOutlook, inventoryRisk, timeOutlook, timeToDoseActions, stopActions },
      }),
      ...(can("Marketing") && {
        marketing: {
          trafficOutlook,
          mediaOutlook,
          marketingActions,
          hvaActions,
          paidSearchStory: {
            note: "Website visits fell from Jul to Sep only because paid search lost clicks: its cost per click rose while monthly spend held at about $12k, the pattern of a competitor bidding on our branded and condition terms from mid-August. Lost visits, HVAs and rep requests are counted against July's search clicks; extraBudgetPerMonth buys back the lost clicks at today's cost per click. winBack is the What-If Simulator's spend for buying back the peak month's search clicks (the question 'What if paid search clicks go back to 6,020?'): quote it for what winning back search costs.",
            ...searchStory,
            winBack: searchWinBack(marketingBaselineFor("Nation")),
          },
        },
      }),
      ...(can("Field Activity") && {
        field: { reachOutlook, prescriberOutlook, fieldActions, repeatActions },
      }),
    },
  };
}

export type AssistantContext = ReturnType<typeof buildAssistantContext>;
