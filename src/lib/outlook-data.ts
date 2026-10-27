import {
  activeByStatus,
  activePatientsTrend,
  canAsk,
  forwardQuestion,
  funnel,
  kpis,
  last,
  monthlyVials,
  pendingPatients,
  prescribers,
  sum,
  type PanelLabel,
} from "@/lib/dashboard-data";
import { executiveTargets } from "@/lib/executive-data";
import { engagementFunnel, fieldByMonth, fieldRegionalSummary } from "@/lib/field-data";
import {
  marketAccessKpis,
  paAnalysis,
  restarts,
  stopReasons,
  stops,
  timeToTherapy,
  vialsAdministered,
} from "@/lib/market-access-data";
import {
  emailByAudience,
  engagementByMonth,
  highValueActions,
  impressionsByMonth,
  marketingKpis,
  regionalSummary,
  websiteVisitsByMonth,
} from "@/lib/marketing-data";

// Predictive and prescriptive figures for the assistant. Projections carry the average monthly
// change of the last three months (Jun → Sep) forward to December; recommendations size each
// action from the backlogs and gaps in the data. Every figure is derived, never typed in.

export const projectionMethod = "Straight-line trend of the last three months (Jun → Sep)";
export const projectedMonths = ["Oct", "Nov", "Dec"] as const;

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

export function monthlyStep(values: number[], window = 3) {
  const latest = values[values.length - 1] ?? 0;
  const base = values[values.length - 1 - window] ?? latest;
  return (latest - base) / window;
}

export function projectAhead(values: number[], months: number = projectedMonths.length) {
  const latest = values[values.length - 1] ?? 0;
  const step = monthlyStep(values);
  return Array.from({ length: months }, (_, i) => latest + step * (i + 1));
}

// Net sales per paid vial: WAC less gross-to-net.
const netPerVialM = (kpis.netSales.wac * (1 - kpis.netSales.gtn)) / 1e6;

// --- Sales outlook (Executive Summary) -------------------------------------------------------
const paidVialsAhead = projectAhead(monthlyVials.map((row) => row.paid));
export const salesOutlook = {
  months: projectedMonths.map((month, i) => ({
    month,
    paidVials: round1(paidVialsAhead[i] ?? 0),
    netSalesM: round2((paidVialsAhead[i] ?? 0) * netPerVialM),
  })),
  q4PaidVials: Math.round(sum(paidVialsAhead)),
  q4NetSalesM: round1(sum(paidVialsAhead) * netPerVialM),
  q3NetSalesM: round1(sum(monthlyVials.slice(-3).map((row) => row.paid)) * netPerVialM),
  yearEndNetSalesM: round1(kpis.netSales.ltd + sum(paidVialsAhead) * netPerVialM),
  paidVialsPerMonthStep: round1(monthlyStep(monthlyVials.map((row) => row.paid))),
};

// --- Closing the sales gap (Executive Summary) ----------------------------------------------
// Each patient on therapy uses about this many doses a month (September doses ÷ active patients).
const dosesPerPatientMonth = last(vialsAdministered).total / kpis.activePatients.total;
const monthlyValueM = (patients: number) => round2(patients * dosesPerPatientMonth * netPerVialM);
const latestStatus = last(activeByStatus);
const pendingAt = (stage: string) => pendingPatients.find((row) => row.stage === stage);
const lpPending = pendingAt("Procedure scheduling");
const accessPending =
  (pendingAt("Benefits verification")?.total ?? 0) + (pendingAt("Prior authorization")?.total ?? 0);

export const salesActions = {
  gapM: round1(kpis.netSales.forecast - kpis.netSales.ltd),
  dosesPerPatientMonth: round2(dosesPerPatientMonth),
  netPerVialK: Math.round(netPerVialM * 1000),
  actions: [
    {
      action: "Move Quick Start and Bridge patients to commercial coverage",
      patients: latestStatus.quickStart + latestStatus.bridge,
      monthlyNetSalesM: monthlyValueM(latestStatus.quickStart + latestStatus.bridge),
    },
    {
      action: "Clear the procedure scheduling backlog",
      patients: lpPending?.total ?? 0,
      monthlyNetSalesM: monthlyValueM(lpPending?.total ?? 0),
    },
    {
      action: "Resolve pending benefits checks and PAs",
      patients: accessPending,
      monthlyNetSalesM: monthlyValueM(accessPending),
    },
  ],
};
export const salesActionsTotal = {
  patients: sum(salesActions.actions.map((row) => row.patients)),
  monthlyNetSalesM: round2(sum(salesActions.actions.map((row) => row.monthlyNetSalesM))),
};
export const monthsToCloseGapWithFirstAction = round1(
  salesActions.gapM / (salesActions.actions[0]?.monthlyNetSalesM ?? 1),
);

// --- Vial supply outlook (Market Access) ----------------------------------------------------
const dosesAhead = projectAhead(vialsAdministered.map((row) => row.total));
const q4Doses = Math.round(sum(dosesAhead));
const decemberDoses = Math.round(dosesAhead[dosesAhead.length - 1] ?? 0);
export const supplyOutlook = {
  months: projectedMonths.map((month, i) => ({ month, doses: Math.round(dosesAhead[i] ?? 0) })),
  q4Doses,
  onHand: marketAccessKpis.inventory.total,
  // Shipments to cover Q4 doses and end December with one month of cover.
  q4ShipmentsNeeded: q4Doses + decemberDoses - marketAccessKpis.inventory.total,
  q3Shipments: sum(monthlyVials.slice(-3).map((row) => row.total)),
  decemberDoses,
};

// --- Speeding up time to first dose (Market Access) -----------------------------------------
const latestReferralMonth = last(timeToTherapy);
export const timeToDoseActions = {
  month: latestReferralMonth.month,
  firstDoseDays: latestReferralMonth.firstDose,
  paDays: latestReferralMonth.firstApprovedPa,
  lpDays: latestReferralMonth.firstDose - latestReferralMonth.firstApprovedPa,
  lpShare: Math.round(
    ((latestReferralMonth.firstDose - latestReferralMonth.firstApprovedPa) /
      latestReferralMonth.firstDose) *
      100,
  ),
  lpPending: lpPending?.total ?? 0,
  lpOver30: lpPending?.d31plus ?? 0,
  accessPending,
  accessOver30:
    (pendingAt("Benefits verification")?.d31plus ?? 0) +
    (pendingAt("Prior authorization")?.d31plus ?? 0),
  totalPending: kpis.pending.total,
  firstDoseStep: round1(monthlyStep(timeToTherapy.map((row) => row.firstDose))),
};

// --- Website traffic outlook (Marketing) ----------------------------------------------------
const visitsAhead = projectAhead(websiteVisitsByMonth.map((row) => row.total));
export const trafficOutlook = {
  months: projectedMonths.map((month, i) => ({ month, visits: Math.round(visitsAhead[i] ?? 0) })),
  q4Visits: Math.round(sum(visitsAhead)),
  q3Visits: sum(websiteVisitsByMonth.slice(-3).map((row) => row.total)),
  q4Hvas: Math.round((sum(visitsAhead) * marketingKpis.hva.rate) / 100),
  stepPerMonth: Math.round(monthlyStep(websiteVisitsByMonth.map((row) => row.total))),
};

// --- Where to focus marketing (Marketing) ---------------------------------------------------
const [hcpEmail, patientEmail] = emailByAudience;
const weakest = [...regionalSummary].sort((a, b) => a.hvaRate - b.hvaRate)[0]!;
export const marketingActions = {
  weakestRegion: weakest.region,
  weakestHvaRate: weakest.hvaRate,
  weakestOpenRate: weakest.openRate,
  nationalHvaRate: marketingKpis.hva.rate,
  nationalOpenRate: marketingKpis.email.openRate,
  hcpOpenRate: round1(((hcpEmail?.opened ?? 0) / (hcpEmail?.delivered ?? 1)) * 100),
  patientOpenRate: round1(((patientEmail?.opened ?? 0) / (patientEmail?.delivered ?? 1)) * 100),
  hcpOpensPerPoint: Math.round((hcpEmail?.delivered ?? 0) / 100),
  hcpConversion: round1(((hcpEmail?.converted ?? 0) / (hcpEmail?.delivered ?? 1)) * 100),
  patientConversion: round1(
    ((patientEmail?.converted ?? 0) / (patientEmail?.delivered ?? 1)) * 100,
  ),
};

// --- HCP reach outlook (Field Activity) -----------------------------------------------------
const latestField = last(fieldByMonth);
const reachedAhead = projectAhead(fieldByMonth.map((row) => row.reached)).map((value) =>
  Math.min(value, latestField.targeted),
);
const callsAhead = projectAhead(fieldByMonth.map((row) => row.total));
export const reachOutlook = {
  months: projectedMonths.map((month, i) => ({
    month,
    reached: Math.round(reachedAhead[i] ?? 0),
    calls: Math.round(callsAhead[i] ?? 0),
  })),
  decemberReached: Math.round(reachedAhead[reachedAhead.length - 1] ?? 0),
  targeted: latestField.targeted,
  decemberReachPct: Math.round(
    ((reachedAhead[reachedAhead.length - 1] ?? 0) / latestField.targeted) * 100,
  ),
  q4Calls: Math.round(sum(callsAhead)),
  q3Calls: sum(fieldByMonth.slice(-3).map((row) => row.total)),
};

// --- Field priorities (Field Activity) ------------------------------------------------------
const byReach = [...fieldRegionalSummary].sort((a, b) => a.reachPct - b.reachPct);
export const fieldActions = {
  unreached: latestField.targeted - latestField.reached,
  unreachedByRegion: fieldRegionalSummary.map((row) => ({
    region: row.region,
    unreached: row.targeted - row.reached,
    reachPct: Math.round(row.reachPct),
    conversionPct: Math.round((row.prescribers / row.reached) * 100),
  })),
  lowestReach: byReach.slice(0, 2).map((row) => row.region),
  reachedNotPrescribing: latestField.reached - kpis.prescribers.sinceLaunch,
  conversionPct: Math.round((kpis.prescribers.sinceLaunch / latestField.reached) * 100),
};

// --- Monthly net sales milestone (Executive Summary) ----------------------------------------
export const salesMilestone = {
  thresholdM: 5,
  month: salesOutlook.months.find((row) => row.netSalesM >= 5)?.month ?? null,
  latestM: last(monthlyVials).paid * netPerVialM,
};

// --- Active patient outlook (Executive Summary) ---------------------------------------------
const activeTotals = activePatientsTrend.map((row) => row.loading + row.maintenance);
const activeAhead = projectAhead(activeTotals);
export const activeOutlook = {
  current: kpis.activePatients.total,
  stepPerMonth: Math.round(monthlyStep(activeTotals)),
  months: projectedMonths.map((month, i) => ({ month, active: Math.round(activeAhead[i] ?? 0) })),
  december: Math.round(activeAhead[activeAhead.length - 1] ?? 0),
};

// --- Free goods to paid (Executive Summary) -------------------------------------------------
// Quick Start and Bridge are temporary programs; PAP is income-based and usually stays free.
export const freeToPaidActions = {
  programs: [
    {
      program: "Quick Start",
      patients: latestStatus.quickStart,
      action: "Complete benefits checks and move to commercial",
      monthlyNetSalesM: monthlyValueM(latestStatus.quickStart),
    },
    {
      program: "Bridge",
      patients: latestStatus.bridge,
      action: "Resolve the coverage gap or appeal",
      monthlyNetSalesM: monthlyValueM(latestStatus.bridge),
    },
    {
      program: "PAP",
      patients: latestStatus.pap,
      action: "Re-screen for Medicare or Medicaid eligibility",
      monthlyNetSalesM: monthlyValueM(latestStatus.pap),
    },
  ],
  totalFree: kpis.activePatients.free,
  freeSharePct: Math.round((kpis.activePatients.free / kpis.activePatients.total) * 100),
};

// --- Patients waiting over 30 days (Executive Summary) --------------------------------------
const over30 = kpis.pending.over30;
export const over30Actions = {
  patients: over30,
  byStage: pendingPatients
    .filter((row) => row.d31plus > 0)
    .map((row) => ({ stage: row.stage, patients: row.d31plus })),
  monthlyNetSalesM: monthlyValueM(over30),
  abandonmentIfLostPct: round1(((stops.cancelled + over30) / funnel.referred) * 100),
  abandonmentNowPct: round1((stops.cancelled / funnel.referred) * 100),
};

// --- Channel inventory risk (Market Access) -------------------------------------------------
const octoberDoses = dosesAhead[0] ?? 0;
export const inventoryRisk = {
  onHand: marketAccessKpis.inventory.total,
  octoberDoses: Math.round(octoberDoses),
  daysOfCover: Math.round((marketAccessKpis.inventory.total / octoberDoses) * 31),
  monthsOnHand: marketAccessKpis.inventory.monthsOnHand,
  // Ship enough in October to cover its doses and start November with a month of cover.
  octoberShipment:
    Math.round(octoberDoses) + Math.round(dosesAhead[1] ?? 0) - marketAccessKpis.inventory.total,
};

// --- Time to first dose outlook (Market Access) ---------------------------------------------
// Referral months run to August, so the projection covers September to December referrals.
const timeMonths = ["Sep", "Oct", "Nov", "Dec"] as const;
const firstDoseAhead = projectAhead(
  timeToTherapy.map((row) => row.firstDose),
  timeMonths.length,
);
const paAhead = projectAhead(
  timeToTherapy.map((row) => row.firstApprovedPa),
  timeMonths.length,
);
export const timeOutlook = {
  latestMonth: last(timeToTherapy).month,
  latestFirstDose: last(timeToTherapy).firstDose,
  months: timeMonths.map((month, i) => ({
    month,
    firstDose: Math.round(firstDoseAhead[i] ?? 0),
    firstApprovedPa: Math.round(paAhead[i] ?? 0),
  })),
};

// --- Reducing discontinuations (Market Access) ----------------------------------------------
const progressionReasons = ["Death", "Ventilation", "Hospice"];
export const stopActions = {
  total: stops.cancelled + stops.discontinued,
  reasons: stopReasons,
  progression: sum(
    stopReasons.filter((row) => progressionReasons.includes(row.reason)).map((row) => row.total),
  ),
  accessDenials: stopReasons.find((row) => row.reason === "Access denial")?.total ?? 0,
  restarted: restarts.patients,
};

// --- Media outlook (Marketing) --------------------------------------------------------------
const impressionsAhead = projectAhead(impressionsByMonth.map((row) => row.total));
const engagementAhead = projectAhead(engagementByMonth.map((row) => row.rate));
export const mediaOutlook = {
  months: projectedMonths.map((month, i) => ({
    month,
    impressionsK: Math.round(impressionsAhead[i] ?? 0),
    engagementRate: round1(engagementAhead[i] ?? 0),
  })),
  q4ImpressionsK: Math.round(sum(impressionsAhead)),
  q3ImpressionsK: sum(impressionsByMonth.slice(-3).map((row) => row.total)),
  latestRate: last(engagementByMonth).rate,
};

// --- Turning website visits into rep requests (Marketing) -----------------------------------
const repRequests = highValueActions.find((row) => row.label === "Rep request")?.value ?? 0;
export const hvaActions = {
  repRequests,
  hcpVisits: marketingKpis.website.hcp,
  repRequestsPer1kHcpVisits: round1((repRequests / marketingKpis.website.hcp) * 1000),
  repRequestSharePct: Math.round((repRequests / marketingKpis.hva.total) * 100),
  downloads: highValueActions.find((row) => row.label === "Resource download")?.value ?? 0,
  supportSignups: highValueActions.find((row) => row.label === "Support sign-up")?.value ?? 0,
};

// --- New prescriber outlook (Field Activity) ------------------------------------------------
// New prescribers are lumpy month to month, so this uses the last three months' average.
const recentNewPrescribers = prescribers.slice(-3).map((row) => row.new);
const newPerMonth = sum(recentNewPrescribers) / recentNewPrescribers.length;
export const prescriberOutlook = {
  recent: prescribers.slice(-3).map((row) => ({ month: row.month, new: row.new })),
  perMonth: round1(newPerMonth),
  q4New: Math.round(newPerMonth * projectedMonths.length),
  sinceLaunch: kpis.prescribers.sinceLaunch,
  december: kpis.prescribers.sinceLaunch + Math.round(newPerMonth * projectedMonths.length),
};

// --- Growing repeat prescribers (Field Activity) --------------------------------------------
const repeatPrescribers =
  engagementFunnel.find((row) => row.stage === "Repeat prescribers")?.hcps ?? 0;
const champions = engagementFunnel.find((row) => row.stage === "Champions")?.hcps ?? 0;
export const repeatActions = {
  oneTime: kpis.prescribers.sinceLaunch - repeatPrescribers,
  repeatNotChampion: repeatPrescribers - champions,
  champions,
  sinceLaunch: kpis.prescribers.sinceLaunch,
};

// --- Signals flagged when the assistant opens --------------------------------------------------
// When the data shows a problem (sales behind forecast, patients stuck, low inventory...), the
// matching forward-looking question is offered up front with the reason it was flagged.
export type AttentionSignal = { panel: PanelLabel; question: string; reason: string };

const signalRules: (AttentionSignal & { active: boolean })[] = [
  // The Market Access story: first-pass PA denials. Flagged first on both tabs that show it.
  {
    panel: "Executive Summary",
    active: paAnalysis.firstPassQ3 < paAnalysis.firstPassH1 - 10,
    question: forwardQuestion("paDenials"),
    reason: `First-pass PA approval fell from ${paAnalysis.firstPassH1}% in H1 to ${paAnalysis.firstPassQ3}% in Q3`,
  },
  {
    panel: "Market Access",
    active: paAnalysis.firstPassQ3 < paAnalysis.firstPassH1 - 10,
    question: forwardQuestion("paDenials"),
    reason: `First-pass PA approval fell from ${paAnalysis.firstPassH1}% in H1 to ${paAnalysis.firstPassQ3}% in Q3`,
  },
  {
    panel: "Executive Summary",
    active: kpis.netSales.attainmentPct < 100,
    question: forwardQuestion("salesActions"),
    reason: `Net sales at ${kpis.netSales.attainmentPct}% of forecast launch to date`,
  },
  {
    panel: "Executive Summary",
    active: over30 > 0,
    question: forwardQuestion("over30Actions"),
    reason: `${over30} patients waiting more than 30 days to start`,
  },
  {
    panel: "Market Access",
    active: marketAccessKpis.inventory.monthsOnHand < 1,
    question: forwardQuestion("inventoryRisk"),
    reason: `Only about ${inventoryRisk.daysOfCover} days of vials on hand`,
  },
  {
    panel: "Market Access",
    active: timeToDoseActions.lpOver30 > 0,
    question: forwardQuestion("timeToDoseActions"),
    reason: `${timeToDoseActions.lpOver30} patients stuck at procedure scheduling for 30+ days`,
  },
  {
    panel: "Marketing",
    active: marketingActions.hcpOpenRate < marketingActions.patientOpenRate,
    question: forwardQuestion("marketingActions"),
    reason: `HCP emails open at ${marketingActions.hcpOpenRate.toFixed(1)}% vs ${marketingActions.patientOpenRate.toFixed(1)}% for patients`,
  },
  {
    panel: "Marketing",
    active: hvaActions.repRequestSharePct < 10,
    question: forwardQuestion("hvaActions"),
    reason: `Only ${hvaActions.repRequestSharePct}% of high value actions are rep requests`,
  },
  {
    panel: "Field Activity",
    active:
      Math.round((latestField.reached / latestField.targeted) * 100) < executiveTargets.hcpReachPct,
    question: forwardQuestion("fieldActions"),
    reason: `HCP reach at ${Math.round((latestField.reached / latestField.targeted) * 100)}%, below the ${executiveTargets.hcpReachPct}% target`,
  },
  {
    panel: "Field Activity",
    active: repeatActions.oneTime / repeatActions.sinceLaunch > 0.3,
    question: forwardQuestion("repeatActions"),
    reason: `${repeatActions.oneTime} of ${repeatActions.sinceLaunch} prescribers have prescribed only once`,
  },
];

export function attentionSignalsFor(panel: string, allowedPanels: readonly PanelLabel[]) {
  return signalRules
    .filter((rule) => rule.active && rule.panel === panel && canAsk(rule.question, allowedPanels))
    .map(({ panel: signalPanel, question, reason }) => ({ panel: signalPanel, question, reason }));
}
