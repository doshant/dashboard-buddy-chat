// Launch figures (vials, net sales, patients, prescribers) built from raw monthly inputs, so the
// same rules produce the national view and any region. `start` limits sums to the selected period;
// point-in-time measures (active, pending) and the since-launch funnel always run to September.

import type { PeriodWindow } from "@/lib/scope";

export const wacPerVial = 180_000;
export const assumedGtn = 0.15;

export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
export const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

export function last<T>(rows: T[], offset = 1): T {
  const row = rows[rows.length - offset];
  if (row === undefined) throw new Error("Expected a populated series");
  return row;
}

export function toNetSalesM(paidVials: number) {
  return round2((paidVials * wacPerVial * (1 - assumedGtn)) / 1e6);
}

type Aging = { d0to14: number; d15to30: number; d31plus: number };

export type LaunchRaw = {
  monthlyVials: {
    month: string;
    paid: number;
    free: number;
    budget: number;
    le: number;
    forecastNetSales: number;
  }[];
  activePatientsTrend: { month: string; loading: number; maintenance: number }[];
  activeByStatus: {
    month: string;
    commercial: number;
    quickStart: number;
    bridge: number;
    pap: number;
  }[];
  newPatients: { month: string; eapTransition: number; newToBrand: number }[];
  funnel: {
    referred: number;
    benefitsVerified: number;
    paApproved: number;
    firstDose: number;
    secondDose: number;
    maintenance: number;
  };
  pendingByStep: { benefitsVerification: Aging; priorAuthorization: Aging; lpScheduling: Aging };
  pendingAvgDays: number;
  prescribers: { month: string; new: number; repeat: number }[];
};

export const nationalLaunchRaw: LaunchRaw = {
  // Ex-factory shipments against the original budget and the latest estimate (LE).
  monthlyVials: [
    { month: "Jan", paid: 6, free: 8, budget: 16, le: 14, forecastNetSales: 1.2 },
    { month: "Feb", paid: 12, free: 9, budget: 20, le: 21, forecastNetSales: 1.8 },
    { month: "Mar", paid: 13, free: 7, budget: 22, le: 20, forecastNetSales: 2.3 },
    { month: "Apr", paid: 13, free: 6, budget: 24, le: 19, forecastNetSales: 2.7 },
    { month: "May", paid: 17, free: 6, budget: 26, le: 23, forecastNetSales: 3.0 },
    { month: "Jun", paid: 21, free: 6, budget: 28, le: 27, forecastNetSales: 3.3 },
    { month: "Jul", paid: 23, free: 5, budget: 30, le: 29, forecastNetSales: 3.6 },
    { month: "Aug", paid: 26, free: 6, budget: 32, le: 31, forecastNetSales: 3.9 },
    { month: "Sep", paid: 29, free: 6, budget: 34, le: 33, forecastNetSales: 4.2 },
  ],
  activePatientsTrend: [
    { month: "Jan", loading: 9, maintenance: 0 },
    { month: "Feb", loading: 14, maintenance: 3 },
    { month: "Mar", loading: 11, maintenance: 12 },
    { month: "Apr", loading: 10, maintenance: 18 },
    { month: "May", loading: 10, maintenance: 24 },
    { month: "Jun", loading: 12, maintenance: 29 },
    { month: "Jul", loading: 11, maintenance: 36 },
    { month: "Aug", loading: 12, maintenance: 42 },
    { month: "Sep", loading: 11, maintenance: 51 },
  ],
  // Commercial is paid drug; Quick Start, Bridge and PAP are free-goods programs.
  activeByStatus: [
    { month: "Jan", commercial: 2, quickStart: 3, bridge: 1, pap: 3 },
    { month: "Feb", commercial: 6, quickStart: 5, bridge: 2, pap: 4 },
    { month: "Mar", commercial: 11, quickStart: 5, bridge: 3, pap: 4 },
    { month: "Apr", commercial: 16, quickStart: 5, bridge: 3, pap: 4 },
    { month: "May", commercial: 21, quickStart: 6, bridge: 3, pap: 4 },
    { month: "Jun", commercial: 26, quickStart: 7, bridge: 3, pap: 5 },
    { month: "Jul", commercial: 31, quickStart: 7, bridge: 4, pap: 5 },
    { month: "Aug", commercial: 37, quickStart: 7, bridge: 4, pap: 6 },
    { month: "Sep", commercial: 44, quickStart: 7, bridge: 5, pap: 6 },
  ],
  newPatients: [
    { month: "Jan", eapTransition: 7, newToBrand: 2 },
    { month: "Feb", eapTransition: 5, newToBrand: 3 },
    { month: "Mar", eapTransition: 3, newToBrand: 4 },
    { month: "Apr", eapTransition: 2, newToBrand: 4 },
    { month: "May", eapTransition: 1, newToBrand: 6 },
    { month: "Jun", eapTransition: 1, newToBrand: 7 },
    { month: "Jul", eapTransition: 0, newToBrand: 7 },
    { month: "Aug", eapTransition: 0, newToBrand: 8 },
    { month: "Sep", eapTransition: 0, newToBrand: 9 },
  ],
  // Cumulative since launch: patients who have ever reached each step.
  funnel: {
    referred: 80,
    benefitsVerified: 77,
    paApproved: 73,
    firstDose: 69,
    secondDose: 64,
    maintenance: 54,
  },
  pendingByStep: {
    benefitsVerification: { d0to14: 2, d15to30: 0, d31plus: 0 },
    priorAuthorization: { d0to14: 1, d15to30: 1, d31plus: 1 },
    lpScheduling: { d0to14: 1, d15to30: 1, d31plus: 2 },
  },
  pendingAvgDays: 22,
  prescribers: [
    { month: "Jan", new: 7, repeat: 0 },
    { month: "Feb", new: 5, repeat: 5 },
    { month: "Mar", new: 4, repeat: 8 },
    { month: "Apr", new: 3, repeat: 10 },
    { month: "May", new: 4, repeat: 12 },
    { month: "Jun", new: 4, repeat: 14 },
    { month: "Jul", new: 3, repeat: 17 },
    { month: "Aug", new: 2, repeat: 19 },
    { month: "Sep", new: 6, repeat: 19 },
  ],
};

const agingTotal = (row: Aging) => row.d0to14 + row.d15to30 + row.d31plus;

export function buildLaunchData(
  raw: LaunchRaw,
  { start, end }: PeriodWindow = { start: 0, end: undefined },
) {
  const { funnel, pendingByStep, pendingAvgDays } = raw;
  const allVials = raw.monthlyVials.map((row) => ({ ...row, total: row.paid + row.free }));
  const allNetSales = allVials.map((row) => ({
    month: row.month,
    actual: toNetSalesM(row.paid),
    forecast: row.forecastNetSales,
  }));
  const inPeriod = <T>(rows: T[]) => rows.slice(start, end);

  const monthlyVials = inPeriod(allVials);
  const monthlyNetSales = inPeriod(allNetSales);

  const patientFunnel = [
    { stage: "Referred", patients: funnel.referred },
    { stage: "Benefits verified", patients: funnel.benefitsVerified },
    { stage: "PA approved", patients: funnel.paApproved },
    { stage: "First dose", patients: funnel.firstDose },
    { stage: "Second dose", patients: funnel.secondDose },
    { stage: "Maintenance (3+)", patients: funnel.maintenance },
  ];

  const pendingPatients = [
    { stage: "Benefits verification", ...pendingByStep.benefitsVerification },
    { stage: "Prior authorization", ...pendingByStep.priorAuthorization },
    { stage: "Procedure scheduling", ...pendingByStep.lpScheduling },
  ].map((row) => ({ ...row, total: agingTotal(row) }));

  // Referrals that left the funnel before a first dose, by the step where they stopped.
  const cancelledByStep = {
    benefitsVerification:
      funnel.referred - funnel.benefitsVerified - agingTotal(pendingByStep.benefitsVerification),
    priorAuthorization:
      funnel.benefitsVerified - funnel.paApproved - agingTotal(pendingByStep.priorAuthorization),
    lpScheduling: funnel.paApproved - funnel.firstDose - agingTotal(pendingByStep.lpScheduling),
  };

  // Month and QTD attainment always refer to September and Q3; the period total follows `start`.
  const q3Vials = allVials.slice(-3);
  const q3NetSales = allNetSales.slice(-3);
  const latestNetSales = last(allNetSales);
  const latestVials = last(allVials);
  const attainment = {
    netSales: {
      month: { actual: latestNetSales.actual, target: latestNetSales.forecast },
      qtd: {
        actual: round1(sum(q3NetSales.map((row) => row.actual))),
        target: round1(sum(q3NetSales.map((row) => row.forecast))),
      },
      ltd: {
        actual: round1(sum(monthlyNetSales.map((row) => row.actual))),
        target: round1(sum(monthlyNetSales.map((row) => row.forecast))),
      },
    },
    vials: {
      month: { actual: latestVials.total, target: latestVials.budget },
      qtd: {
        actual: sum(q3Vials.map((row) => row.total)),
        target: sum(q3Vials.map((row) => row.budget)),
      },
      ltd: {
        actual: sum(monthlyVials.map((row) => row.total)),
        target: sum(monthlyVials.map((row) => row.budget)),
      },
    },
  };

  const latestStatus = last(raw.activeByStatus);
  const latestActive = last(raw.activePatientsTrend);
  const activeTotal = latestActive.loading + latestActive.maintenance;
  const priorActive = last(raw.activePatientsTrend, 2);
  const priorActiveTotal = priorActive.loading + priorActive.maintenance;
  const latestNew = last(raw.newPatients);
  const latestPrescribers = last(raw.prescribers);
  const vialsTotal = sum(monthlyVials.map((row) => row.total));
  const vialsBudget = sum(monthlyVials.map((row) => row.budget));
  const vialsLe = sum(monthlyVials.map((row) => row.le));

  const kpis = {
    // `ltd` is the selected period's total: launch to date in the national view.
    netSales: {
      ltd: attainment.netSales.ltd.actual,
      forecast: attainment.netSales.ltd.target,
      attainmentPct: pct(attainment.netSales.ltd.actual, attainment.netSales.ltd.target),
      wac: wacPerVial,
      gtn: assumedGtn,
    },
    vials: {
      paid: sum(monthlyVials.map((row) => row.paid)),
      free: sum(monthlyVials.map((row) => row.free)),
      total: vialsTotal,
      budget: vialsBudget,
      le: vialsLe,
      budgetPct: pct(vialsTotal, vialsBudget),
      lePct: pct(vialsTotal, vialsLe),
    },
    activePatients: {
      total: activeTotal,
      paid: latestStatus.commercial,
      free: latestStatus.quickStart + latestStatus.bridge + latestStatus.pap,
      loading: latestActive.loading,
      maintenance: latestActive.maintenance,
      prior: priorActiveTotal,
      changePct: pct(activeTotal - priorActiveTotal, priorActiveTotal),
    },
    newPatients: {
      total: latestNew.eapTransition + latestNew.newToBrand,
      eapTransition: latestNew.eapTransition,
      newToBrand: latestNew.newToBrand,
      inPeriod: sum(inPeriod(raw.newPatients).map((row) => row.eapTransition + row.newToBrand)),
      sinceLaunch: sum(raw.newPatients.map((row) => row.eapTransition + row.newToBrand)),
      eapSinceLaunch: sum(raw.newPatients.map((row) => row.eapTransition)),
      newToBrandSinceLaunch: sum(raw.newPatients.map((row) => row.newToBrand)),
    },
    pending: {
      total: sum(pendingPatients.map((row) => row.total)),
      over30: sum(pendingPatients.map((row) => row.d31plus)),
      avgDays: pendingAvgDays,
    },
    prescribers: {
      new: latestPrescribers.new,
      ordering: latestPrescribers.new + latestPrescribers.repeat,
      inPeriod: sum(inPeriod(raw.prescribers).map((row) => row.new)),
      sinceLaunch: sum(raw.prescribers.map((row) => row.new)),
    },
  };

  return {
    monthlyVials,
    monthlyNetSales,
    activePatientsTrend: inPeriod(raw.activePatientsTrend),
    activeByStatus: inPeriod(raw.activeByStatus),
    newPatients: inPeriod(raw.newPatients),
    prescribers: inPeriod(raw.prescribers),
    funnel,
    patientFunnel,
    pendingByStep,
    pendingPatients,
    pendingAvgDays,
    cancelledByStep,
    attainment,
    kpis,
    // Whole-launch monthly series, for sparklines and trends that ignore the period.
    trend: {
      monthlyVials: allVials,
      monthlyNetSales: allNetSales,
      activePatientsTrend: raw.activePatientsTrend,
      activeByStatus: raw.activeByStatus,
      newPatients: raw.newPatients,
      prescribers: raw.prescribers,
    },
  };
}

export type LaunchData = ReturnType<typeof buildLaunchData>;
