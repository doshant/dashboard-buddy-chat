import {
  cancelledByStep,
  funnel,
  kpis,
  last,
  monthlyVials,
  pct,
  pendingByStep,
  sum,
} from "@/lib/dashboard-data";

// Market Access figures reuse the Overview control totals (referrals, first doses,
// active patients, shipped vials) so every split reconciles to the same whole.

// One vial per intrathecal dose; administered can never run ahead of shipments.
export const vialsAdministered = [
  { month: "Jan", paid: 3, free: 7 },
  { month: "Feb", paid: 10, free: 8 },
  { month: "Mar", paid: 12, free: 7 },
  { month: "Apr", paid: 12, free: 6 },
  { month: "May", paid: 16, free: 5 },
  { month: "Jun", paid: 19, free: 5 },
  { month: "Jul", paid: 22, free: 5 },
  { month: "Aug", paid: 23, free: 5 },
  { month: "Sep", paid: 26, free: 5 },
].map((row) => ({ ...row, total: row.paid + row.free }));

const administeredPaid = sum(vialsAdministered.map((row) => row.paid));
const administeredFree = sum(vialsAdministered.map((row) => row.free));
const administeredTotal = administeredPaid + administeredFree;

// Loading doses are every first and second dose in the funnel; EAP transitions all completed loading.
const eapPatients = kpis.newPatients.eapSinceLaunch;
const eapMaintenanceDoses = 31;
const loadingDoses = {
  eap: eapPatients * 2,
  nonEap: funnel.firstDose + funnel.secondDose - eapPatients * 2,
};
export const administeredByPhase = [
  { phase: "Loading (1–2)", eap: loadingDoses.eap, nonEap: loadingDoses.nonEap },
  {
    phase: "Maintenance (3+)",
    eap: eapMaintenanceDoses,
    nonEap: administeredTotal - loadingDoses.eap - loadingDoses.nonEap - eapMaintenanceDoses,
  },
].map((row) => ({ ...row, total: row.eap + row.nonEap }));

// First-dose coverage for each new patient; monthly totals match Overview new patients.
export const newPatientsByGoods = [
  { month: "Jan", commercial: 3, quickStart: 3, bridge: 1, pap: 2 },
  { month: "Feb", commercial: 3, quickStart: 3, bridge: 1, pap: 1 },
  { month: "Mar", commercial: 3, quickStart: 2, bridge: 1, pap: 1 },
  { month: "Apr", commercial: 3, quickStart: 2, bridge: 0, pap: 1 },
  { month: "May", commercial: 4, quickStart: 2, bridge: 1, pap: 0 },
  { month: "Jun", commercial: 5, quickStart: 1, bridge: 1, pap: 1 },
  { month: "Jul", commercial: 5, quickStart: 1, bridge: 1, pap: 0 },
  { month: "Aug", commercial: 5, quickStart: 1, bridge: 1, pap: 1 },
  { month: "Sep", commercial: 7, quickStart: 1, bridge: 0, pap: 1 },
].map((row) => ({ ...row, total: row.commercial + row.quickStart + row.bridge + row.pap }));

const startedPaid = sum(newPatientsByGoods.map((row) => row.commercial));
const startedFree = funnel.firstDose - startedPaid;
const cancelled = sum(Object.values(cancelledByStep));
const knownOutcomes = funnel.referred - kpis.pending.total;

export const referralOutcomes = [
  { key: "paid", label: "Started on paid", patients: startedPaid },
  { key: "free", label: "Started on free goods", patients: startedFree },
  { key: "pending", label: "Pending", patients: kpis.pending.total },
  { key: "cancelled", label: "Cancelled", patients: cancelled },
] as const;

export const conversion = {
  referred: funnel.referred,
  knownOutcomes,
  started: funnel.firstDose,
  startedPaid,
  therapyTotalPct: pct(funnel.firstDose, funnel.referred),
  therapyKnownPct: pct(funnel.firstDose, knownOutcomes),
  paidKnownPct: pct(startedPaid, knownOutcomes),
};

const paPending = sum(Object.values(pendingByStep.priorAuthorization));
export const priorAuth = {
  submitted: funnel.benefitsVerified,
  approved: funnel.paApproved,
  denied: cancelledByStep.priorAuthorization,
  pending: paPending,
  approvalPct: pct(funnel.paApproved, funnel.benefitsVerified),
};

// Median days from referral, by referral month; September referrals are still maturing.
export const timeToTherapy = [
  { month: "Jan", firstApprovedPa: 21, firstDose: 40 },
  { month: "Feb", firstApprovedPa: 19, firstDose: 36 },
  { month: "Mar", firstApprovedPa: 17, firstDose: 33 },
  { month: "Apr", firstApprovedPa: 16, firstDose: 31 },
  { month: "May", firstApprovedPa: 14, firstDose: 28 },
  { month: "Jun", firstApprovedPa: 13, firstDose: 26 },
  { month: "Jul", firstApprovedPa: 12, firstDose: 24 },
  { month: "Aug", firstApprovedPa: 11, firstDose: 23 },
];

export const timeToTherapySummary = {
  firstApprovedPa: { mean: 18, median: 15, patients: funnel.paApproved },
  firstDose: { mean: 34, median: 29, patients: kpis.newPatients.newToBrandSinceLaunch },
};

// Every referred patient, including free-drug and unmapped payers.
export const payerMixReferred = [
  { payer: "Commercial", patients: 24 },
  { payer: "Medicare FFS", patients: 22 },
  { payer: "Medicare Advantage", patients: 14 },
  { payer: "Medicaid / CHIP", patients: 9 },
  { payer: "Free drug", patients: 6 },
  { payer: "Unmapped", patients: 5 },
];

// Paid doses administered, with average patient coinsurance after foundation / copay support.
export const payerMixPaidDoses = [
  { payer: "Medicare FFS", doses: 52, oopPerDose: 410 },
  { payer: "Commercial", doses: 47, oopPerDose: 35 },
  { payer: "Medicare Advantage", doses: 31, oopPerDose: 620 },
  { payer: "Medicaid / CHIP", doses: 13, oopPerDose: 0 },
];

export const averageOopPerDose = Math.round(
  sum(payerMixPaidDoses.map((row) => row.doses * row.oopPerDose)) /
    sum(payerMixPaidDoses.map((row) => row.doses)),
);

// Cancellations happen before a first dose; discontinuations after dosing.
export const stopReasons = [
  { reason: "Death", cancelled: 1, discontinued: 3 },
  { reason: "Ventilation", cancelled: 0, discontinued: 2 },
  { reason: "Hospice", cancelled: 0, discontinued: 2 },
  { reason: "Access denial", cancelled: 1, discontinued: 2 },
].map((row) => ({ ...row, total: row.cancelled + row.discontinued }));

const discontinued = sum(stopReasons.map((row) => row.discontinued));
export const restarts = { patients: 2, reason: "Access denial resolved", medianDaysOff: 41 };

export const stops = {
  cancelled: sum(stopReasons.map((row) => row.cancelled)),
  discontinued,
  restarted: restarts.patients,
  offTherapy: discontinued - restarts.patients,
};

export const inventory = [
  { location: "Specialty distributor", paid: 7, free: 2 },
  { location: "East sites", paid: 4, free: 2 },
  { location: "West sites", paid: 3, free: 1 },
  { location: "Central sites", paid: 3, free: 1 },
].map((row) => ({ ...row, total: row.paid + row.free }));

const inventoryTotal = sum(inventory.map((row) => row.total));
const recentMonthlyDoses = sum(vialsAdministered.slice(-3).map((row) => row.total)) / 3;

export const marketAccessKpis = {
  administered: {
    total: administeredTotal,
    paid: administeredPaid,
    free: administeredFree,
    loading: administeredByPhase[0]?.total ?? 0,
    maintenance: last(administeredByPhase).total,
    latestMonth: last(vialsAdministered).total,
  },
  inventory: {
    total: inventoryTotal,
    distributor: inventory[0]?.total ?? 0,
    sites: inventoryTotal - (inventory[0]?.total ?? 0),
    paid: sum(inventory.map((row) => row.paid)),
    free: sum(inventory.map((row) => row.free)),
    monthsOnHand: Math.round((inventoryTotal / recentMonthlyDoses) * 10) / 10,
    recentMonthlyDoses: Math.round(recentMonthlyDoses),
  },
  shipped: { paid: kpis.vials.paid, free: kpis.vials.free, total: kpis.vials.total },
};

// Running shipped-minus-administered by month; must never go negative.
export const channelBalance = monthlyVials.map((shipped, i) => {
  const shippedToDate = sum(monthlyVials.slice(0, i + 1).map((row) => row.total));
  const administeredToDate = sum(vialsAdministered.slice(0, i + 1).map((row) => row.total));
  return { month: shipped.month, onHand: shippedToDate - administeredToDate };
});
