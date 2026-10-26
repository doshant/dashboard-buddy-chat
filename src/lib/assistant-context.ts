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
  stopActions,
  supplyOutlook,
  timeOutlook,
  timeToDoseActions,
  trafficOutlook,
} from "@/lib/outlook-data";
import { buildDashboardData } from "@/lib/scoped-data";
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
      ["Executive Summary", "Market Access", "Marketing", "Field Activity"] as const
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
        impressionsByMonthK: marketing.impressionsByMonth,
        impressionsByChannelK: marketing.impressionsByChannel,
        engagementByMonth: marketing.engagementByMonth,
        websiteVisitsByMonth: marketing.websiteVisitsByMonth,
        highValueActions: marketing.highValueActions,
        emailByAudience: marketing.emailByAudience,
        emailFunnel: marketing.emailFunnel,
        regionalSummary: [...regional.marketing.rows, regional.marketing.total],
      },
    }),
    ...(can("Field Activity") && {
      fieldActivity: {
        kpis: field.fieldKpis,
        monthsInPeriod: field.fieldByMonth,
        monthlyTrendSinceLaunch: field.trend.fieldByMonth.map(
          ({ month, calendar, total, targeted, reached }) => ({
            month,
            calendar,
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
        marketing: { trafficOutlook, mediaOutlook, marketingActions, hvaActions },
      }),
      ...(can("Field Activity") && {
        field: { reachOutlook, prescriberOutlook, fieldActions, repeatActions },
      }),
    },
  };
}

export type AssistantContext = ReturnType<typeof buildAssistantContext>;
