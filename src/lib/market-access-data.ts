import {
  buildLaunchData,
  last,
  nationalLaunchRaw,
  pct,
  sum,
  type LaunchData,
} from "@/lib/launch-data";
import type { PeriodWindow } from "@/lib/scope";

// Market Access figures reuse the launch control totals (referrals, first doses, active
// patients, shipped vials) so every split reconciles to the same whole. Built from raw inputs so
// the national view and each region follow the same rules; `start` limits period sums.

export type MarketAccessRaw = {
  // One vial per dose; administered can never run ahead of shipments.
  vialsAdministered: { month: string; paid: number; free: number }[];
  eapMaintenanceDoses: number;
  // First-dose coverage for each new patient; monthly totals match launch new patients.
  newPatientsByGoods: {
    month: string;
    commercial: number;
    quickStart: number;
    bridge: number;
    pap: number;
  }[];
  // Median days from referral, by referral month; September referrals are still maturing.
  timeToTherapy: { month: string; firstApprovedPa: number; firstDose: number }[];
  timeToTherapyMedians: {
    firstApprovedPa: { mean: number; median: number };
    firstDose: { mean: number; median: number };
  };
  // Every referred patient, including free-drug and unmapped payers.
  payerMixReferred: { payer: string; patients: number }[];
  // Paid doses administered, with average patient coinsurance after foundation / copay support.
  payerMixPaidDoses: { payer: string; doses: number; oopPerDose: number }[];
  // Cancellations happen before a first dose; discontinuations after dosing.
  stopReasons: { reason: string; cancelled: number; discontinued: number }[];
  restarts: { patients: number; reason: string; medianDaysOff: number };
  inventory: { location: string; paid: number; free: number }[];
};

export const nationalMarketAccessRaw: MarketAccessRaw = {
  vialsAdministered: [
    { month: "Jan", paid: 3, free: 7 },
    { month: "Feb", paid: 10, free: 8 },
    { month: "Mar", paid: 12, free: 7 },
    { month: "Apr", paid: 12, free: 6 },
    { month: "May", paid: 16, free: 5 },
    { month: "Jun", paid: 19, free: 5 },
    { month: "Jul", paid: 22, free: 5 },
    { month: "Aug", paid: 23, free: 5 },
    { month: "Sep", paid: 26, free: 5 },
  ],
  eapMaintenanceDoses: 31,
  newPatientsByGoods: [
    { month: "Jan", commercial: 3, quickStart: 3, bridge: 1, pap: 2 },
    { month: "Feb", commercial: 3, quickStart: 3, bridge: 1, pap: 1 },
    { month: "Mar", commercial: 3, quickStart: 2, bridge: 1, pap: 1 },
    { month: "Apr", commercial: 3, quickStart: 2, bridge: 0, pap: 1 },
    { month: "May", commercial: 4, quickStart: 2, bridge: 1, pap: 0 },
    { month: "Jun", commercial: 5, quickStart: 1, bridge: 1, pap: 1 },
    { month: "Jul", commercial: 5, quickStart: 1, bridge: 1, pap: 0 },
    { month: "Aug", commercial: 5, quickStart: 1, bridge: 1, pap: 1 },
    { month: "Sep", commercial: 7, quickStart: 1, bridge: 0, pap: 1 },
  ],
  timeToTherapy: [
    { month: "Jan", firstApprovedPa: 21, firstDose: 40 },
    { month: "Feb", firstApprovedPa: 19, firstDose: 36 },
    { month: "Mar", firstApprovedPa: 17, firstDose: 33 },
    { month: "Apr", firstApprovedPa: 16, firstDose: 31 },
    { month: "May", firstApprovedPa: 14, firstDose: 28 },
    { month: "Jun", firstApprovedPa: 13, firstDose: 26 },
    { month: "Jul", firstApprovedPa: 12, firstDose: 24 },
    { month: "Aug", firstApprovedPa: 11, firstDose: 23 },
  ],
  timeToTherapyMedians: {
    firstApprovedPa: { mean: 18, median: 15 },
    firstDose: { mean: 34, median: 29 },
  },
  payerMixReferred: [
    { payer: "Commercial", patients: 24 },
    { payer: "Medicare FFS", patients: 22 },
    { payer: "Medicare Advantage", patients: 14 },
    { payer: "Medicaid / CHIP", patients: 9 },
    { payer: "Free drug", patients: 6 },
    { payer: "Unmapped", patients: 5 },
  ],
  payerMixPaidDoses: [
    { payer: "Medicare FFS", doses: 52, oopPerDose: 410 },
    { payer: "Commercial", doses: 47, oopPerDose: 35 },
    { payer: "Medicare Advantage", doses: 31, oopPerDose: 620 },
    { payer: "Medicaid / CHIP", doses: 13, oopPerDose: 0 },
  ],
  stopReasons: [
    { reason: "Death", cancelled: 1, discontinued: 3 },
    { reason: "Ventilation", cancelled: 0, discontinued: 2 },
    { reason: "Hospice", cancelled: 0, discontinued: 2 },
    { reason: "Access denial", cancelled: 1, discontinued: 2 },
  ],
  restarts: { patients: 2, reason: "Access denial resolved", medianDaysOff: 41 },
  inventory: [
    { location: "Specialty distributor", paid: 7, free: 2 },
    { location: "Northeast sites", paid: 4, free: 1 },
    { location: "Southeast sites", paid: 2, free: 1 },
    { location: "Midwest sites", paid: 1, free: 1 },
    { location: "West sites", paid: 3, free: 1 },
  ],
};

export function buildMarketAccessData(
  launch: LaunchData,
  raw: MarketAccessRaw,
  { start, end }: PeriodWindow = { start: 0, end: undefined },
) {
  const { funnel, kpis, cancelledByStep, pendingByStep } = launch;
  const inPeriod = <T>(rows: T[]) => rows.slice(start, end);

  const allAdministered = raw.vialsAdministered.map((row) => ({
    ...row,
    total: row.paid + row.free,
  }));
  const vialsAdministered = inPeriod(allAdministered);
  const administeredSinceLaunch = sum(allAdministered.map((row) => row.total));

  // Loading doses are every first and second dose in the funnel; EAP transitions all completed loading.
  const eapPatients = kpis.newPatients.eapSinceLaunch;
  const loadingDoses = {
    eap: eapPatients * 2,
    nonEap: funnel.firstDose + funnel.secondDose - eapPatients * 2,
  };
  const administeredByPhase = [
    { phase: "Loading (1–2)", eap: loadingDoses.eap, nonEap: loadingDoses.nonEap },
    {
      phase: "Maintenance (3+)",
      eap: raw.eapMaintenanceDoses,
      nonEap:
        administeredSinceLaunch - loadingDoses.eap - loadingDoses.nonEap - raw.eapMaintenanceDoses,
    },
  ].map((row) => ({ ...row, total: row.eap + row.nonEap }));

  const allByGoods = raw.newPatientsByGoods.map((row) => ({
    ...row,
    total: row.commercial + row.quickStart + row.bridge + row.pap,
  }));
  const newPatientsByGoods = inPeriod(allByGoods);

  const startedPaid = sum(allByGoods.map((row) => row.commercial));
  const startedFree = funnel.firstDose - startedPaid;
  const cancelled = sum(Object.values(cancelledByStep));
  const knownOutcomes = funnel.referred - kpis.pending.total;

  const referralOutcomes = [
    { key: "paid", label: "Started on paid", patients: startedPaid },
    { key: "free", label: "Started on free goods", patients: startedFree },
    { key: "pending", label: "Pending", patients: kpis.pending.total },
    { key: "cancelled", label: "Cancelled", patients: cancelled },
  ] as const;

  const conversion = {
    referred: funnel.referred,
    knownOutcomes,
    started: funnel.firstDose,
    startedPaid,
    therapyTotalPct: pct(funnel.firstDose, funnel.referred),
    therapyKnownPct: pct(funnel.firstDose, knownOutcomes),
    paidKnownPct: pct(startedPaid, knownOutcomes),
  };

  const priorAuth = {
    submitted: funnel.benefitsVerified,
    approved: funnel.paApproved,
    denied: cancelledByStep.priorAuthorization,
    pending: sum(Object.values(pendingByStep.priorAuthorization)),
    approvalPct: pct(funnel.paApproved, funnel.benefitsVerified),
  };

  // Referral months stop at August, so a Monthly view shows the latest matured month.
  const cohorts = raw.timeToTherapy.length;
  const cohortStart = Math.min(start, cohorts - 1);
  const cohortEnd = end === undefined ? cohorts : Math.min(Math.max(end, cohortStart + 1), cohorts);
  const timeToTherapy = raw.timeToTherapy.slice(cohortStart, cohortEnd);
  const timeToTherapySummary = {
    firstApprovedPa: { ...raw.timeToTherapyMedians.firstApprovedPa, patients: funnel.paApproved },
    firstDose: {
      ...raw.timeToTherapyMedians.firstDose,
      patients: kpis.newPatients.newToBrandSinceLaunch,
    },
  };

  const paidDoses = sum(raw.payerMixPaidDoses.map((row) => row.doses));
  const averageOopPerDose = paidDoses
    ? Math.round(sum(raw.payerMixPaidDoses.map((row) => row.doses * row.oopPerDose)) / paidDoses)
    : 0;

  const stopReasons = raw.stopReasons.map((row) => ({
    ...row,
    total: row.cancelled + row.discontinued,
  }));
  const discontinued = sum(stopReasons.map((row) => row.discontinued));
  const stops = {
    cancelled: sum(stopReasons.map((row) => row.cancelled)),
    discontinued,
    restarted: raw.restarts.patients,
    offTherapy: discontinued - raw.restarts.patients,
  };

  const inventory = raw.inventory.map((row) => ({ ...row, total: row.paid + row.free }));
  const inventoryTotal = sum(inventory.map((row) => row.total));
  const recentMonthlyDoses = sum(allAdministered.slice(-3).map((row) => row.total)) / 3;

  const marketAccessKpis = {
    administered: {
      total: sum(vialsAdministered.map((row) => row.total)),
      paid: sum(vialsAdministered.map((row) => row.paid)),
      free: sum(vialsAdministered.map((row) => row.free)),
      sinceLaunch: administeredSinceLaunch,
      loading: administeredByPhase[0]?.total ?? 0,
      maintenance: last(administeredByPhase).total,
      latestMonth: last(allAdministered).total,
    },
    inventory: {
      total: inventoryTotal,
      distributor: inventory[0]?.total ?? 0,
      sites: inventoryTotal - (inventory[0]?.total ?? 0),
      paid: sum(inventory.map((row) => row.paid)),
      free: sum(inventory.map((row) => row.free)),
      monthsOnHand: recentMonthlyDoses
        ? Math.round((inventoryTotal / recentMonthlyDoses) * 10) / 10
        : 0,
      recentMonthlyDoses: Math.round(recentMonthlyDoses),
    },
    shipped: { paid: kpis.vials.paid, free: kpis.vials.free, total: kpis.vials.total },
  };

  // Running shipped-minus-administered by month; must never go negative.
  const shippedMonths = launch.trend.monthlyVials;
  const channelBalance = shippedMonths.map((shipped, i) => {
    const shippedToDate = sum(shippedMonths.slice(0, i + 1).map((row) => row.total));
    const administeredToDate = sum(allAdministered.slice(0, i + 1).map((row) => row.total));
    return { month: shipped.month, onHand: shippedToDate - administeredToDate };
  });

  return {
    vialsAdministered,
    administeredByPhase,
    newPatientsByGoods,
    referralOutcomes,
    conversion,
    priorAuth,
    timeToTherapy,
    timeToTherapySummary,
    payerMixReferred: raw.payerMixReferred,
    payerMixPaidDoses: raw.payerMixPaidDoses,
    averageOopPerDose,
    stopReasons,
    restarts: raw.restarts,
    stops,
    inventory,
    marketAccessKpis,
    channelBalance,
    trend: { vialsAdministered: allAdministered, timeToTherapy: raw.timeToTherapy },
  };
}

export type MarketAccessData = ReturnType<typeof buildMarketAccessData>;

export const {
  vialsAdministered,
  administeredByPhase,
  newPatientsByGoods,
  referralOutcomes,
  conversion,
  priorAuth,
  timeToTherapy,
  timeToTherapySummary,
  payerMixReferred,
  payerMixPaidDoses,
  averageOopPerDose,
  stopReasons,
  restarts,
  stops,
  inventory,
  marketAccessKpis,
  channelBalance,
} = buildMarketAccessData(buildLaunchData(nationalLaunchRaw), nationalMarketAccessRaw);
