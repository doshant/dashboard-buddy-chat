import { nationalReferralRaw, type ReferralRaw } from "@/lib/executive-data";
import { fieldRegions, nationalFieldRaw, type FieldRaw } from "@/lib/field-data";
import { nationalLaunchRaw, sum, type LaunchRaw } from "@/lib/launch-data";
import { nationalMarketAccessRaw, type MarketAccessRaw } from "@/lib/market-access-data";
import { paFunnel, paRawFor } from "@/lib/pa-data";
import {
  nationalMarketingRaw,
  regions as marketingRegions,
  type MarketingRaw,
} from "@/lib/marketing-data";
import { allocate, regionNames, splitAmount, splitFlow, type RegionName } from "@/lib/scope";

// Splits the national raw inputs between the four regions. Every split is exact, so each month's
// regional values add back to the national value. Linked figures are split in order so they stay
// consistent inside a region: first doses match new patient starts, the referral funnel never
// widens, pending and cancelled patients fill each funnel gap, and channel inventory never goes
// negative. Medians (time to therapy, days pending) can't be split and stay national.

export type DashboardRaw = {
  launch: LaunchRaw;
  marketAccess: MarketAccessRaw;
  field: FieldRaw;
  marketing: MarketingRaw;
  referrals: ReferralRaw;
};

export const nationalRaw: DashboardRaw = {
  launch: nationalLaunchRaw,
  marketAccess: nationalMarketAccessRaw,
  field: nationalFieldRaw,
  marketing: nationalMarketingRaw,
  referrals: nationalReferralRaw,
};

const R = regionNames.length;
const byRegion = <T>(make: (r: number) => T) => Array.from({ length: R }, (_, r) => make(r));
const column = <T, K extends keyof T>(rows: T[], key: K) => rows.map((row) => row[key] as number);
const at = (values: number[] | undefined, r: number) => values?.[r] ?? 0;

// Splits several national parts between regions whose totals are already fixed, one part at a
// time, so each region's parts add up to its total. The last part takes whatever is left.
function cascade(parts: number[], totals: number[]): number[][] {
  const left = [...totals];
  return parts.map((part, p) => {
    const split = p === parts.length - 1 ? [...left] : allocate(part, left);
    split.forEach((value, r) => {
      left[r] = at(left, r) - value;
    });
    return split;
  });
}

// Patients and sales follow where prescribers are (12 / 8 / 7 / 11 of 38).
const patientWeights = fieldRegions.map((row) => row.prescribers);
const regionIndex = (region: string) => regionNames.indexOf(region as RegionName);

function splitLaunch() {
  const raw = nationalLaunchRaw;
  const months = raw.monthlyVials.map((row) => row.month);

  const vials = {
    paid: splitFlow(column(raw.monthlyVials, "paid"), patientWeights),
    free: splitFlow(column(raw.monthlyVials, "free"), patientWeights),
    budget: splitFlow(column(raw.monthlyVials, "budget"), patientWeights),
    le: splitFlow(column(raw.monthlyVials, "le"), patientWeights),
  };
  const forecast = raw.monthlyVials.map((row) => splitAmount(row.forecastNetSales, patientWeights));

  // Benefits verification and PA come from each region's own PA record (pa-data): every PA
  // submitted is a patient who passed benefits verification, and approvals include appeals won.
  const f = raw.funnel;
  const paByRegion = regionNames.map((region) => paFunnel(paRawFor(region)));
  const benefitsVerified = paByRegion.map((row) => row.submitted);
  const paApproved = paByRegion.map((row) => row.approved);
  // First doses split the national starts in proportion to approvals, so no region starts more
  // patients than it approved; monthly starts then follow each region's first doses.
  const firstDose = allocate(f.firstDose, paApproved);
  const referred = benefitsVerified.map(
    (v, r) => v + at(allocate(f.referred - f.benefitsVerified, patientWeights), r),
  );
  const secondDose = allocate(f.secondDose, firstDose);
  const maintenance = allocate(f.maintenance, secondDose);

  const starts = splitFlow(
    raw.newPatients.map((row) => row.eapTransition + row.newToBrand),
    firstDose,
  );
  const startsByType = raw.newPatients.map((row, m) =>
    cascade(
      [row.eapTransition, row.newToBrand],
      byRegion((r) => at(starts[r], m)),
    ),
  );
  const eap = byRegion((r) => months.map((_, m) => at(startsByType[m]?.[0], r)));
  const newToBrand = byRegion((r) => months.map((_, m) => at(startsByType[m]?.[1], r)));

  // Each funnel gap holds the step's pending patients plus those cancelled there.
  const nationalPending = raw.pendingByStep;
  const stepSplit = (
    gap: number[],
    cancelled: number,
    aging: typeof nationalPending.lpScheduling,
  ) => {
    const cancelledSplit = allocate(cancelled, gap);
    const pending = gap.map((g, r) => g - at(cancelledSplit, r));
    const [d0to14, d15to30, d31plus] = cascade(
      [aging.d0to14, aging.d15to30, aging.d31plus],
      pending,
    );
    return {
      cancelled: cancelledSplit,
      aging: byRegion((r) => ({
        d0to14: at(d0to14, r),
        d15to30: at(d15to30, r),
        d31plus: at(d31plus, r),
      })),
    };
  };
  const agingTotal = (a: { d0to14: number; d15to30: number; d31plus: number }) =>
    a.d0to14 + a.d15to30 + a.d31plus;
  const bv = stepSplit(
    referred.map((v, r) => v - at(benefitsVerified, r)),
    f.referred - f.benefitsVerified - agingTotal(nationalPending.benefitsVerification),
    nationalPending.benefitsVerification,
  );
  // PA: pending patients (awaiting a decision or an appeal) and upheld denials come from the record.
  const paPending = paByRegion.map((row) => row.pending);
  const [paD0to14, paD15to30, paD31plus] = cascade(
    [
      nationalPending.priorAuthorization.d0to14,
      nationalPending.priorAuthorization.d15to30,
      nationalPending.priorAuthorization.d31plus,
    ],
    paPending,
  );
  const pa = {
    cancelled: paByRegion.map((row) => row.cancelled),
    aging: byRegion((r) => ({
      d0to14: at(paD0to14, r),
      d15to30: at(paD15to30, r),
      d31plus: at(paD31plus, r),
    })),
  };
  const lp = stepSplit(
    paApproved.map((v, r) => v - at(firstDose, r)),
    f.paApproved - f.firstDose - agingTotal(nationalPending.lpScheduling),
    nationalPending.lpScheduling,
  );

  // Active patients: September is starts less those off therapy; earlier months split directly.
  const statusRows = raw.activeByStatus;
  const lastMonth = statusRows.length - 1;
  const nationalActive = statusRows.map(
    (row) => row.commercial + row.quickStart + row.bridge + row.pap,
  );
  const offTherapyNational = f.firstDose - (nationalActive[lastMonth] ?? 0);
  const offTherapy = allocate(offTherapyNational, firstDose);
  const activeTotals = nationalActive.map((total, m) =>
    m === lastMonth
      ? firstDose.map((v, r) => v - at(offTherapy, r))
      : allocate(total, patientWeights),
  );
  const status = statusRows.map((row, m) =>
    cascade([row.commercial, row.quickStart, row.bridge, row.pap], activeTotals[m] ?? []),
  );
  const loading = raw.activePatientsTrend.map((row, m) =>
    allocate(row.loading, activeTotals[m] ?? []),
  );

  const prescriberWeights = fieldRegions.map((row) => row.prescribers);
  const newPrescribers = splitFlow(column(raw.prescribers, "new"), prescriberWeights);
  const repeatPrescribers = raw.prescribers.map((row) => allocate(row.repeat, patientWeights));

  const regions = byRegion<LaunchRaw>((r) => ({
    monthlyVials: months.map((month, m) => ({
      month,
      paid: at(vials.paid[r], m),
      free: at(vials.free[r], m),
      budget: at(vials.budget[r], m),
      le: at(vials.le[r], m),
      forecastNetSales: at(forecast[m], r),
    })),
    activePatientsTrend: months.map((month, m) => ({
      month,
      loading: at(loading[m], r),
      maintenance: at(activeTotals[m], r) - at(loading[m], r),
    })),
    activeByStatus: months.map((month, m) => ({
      month,
      commercial: at(status[m]?.[0], r),
      quickStart: at(status[m]?.[1], r),
      bridge: at(status[m]?.[2], r),
      pap: at(status[m]?.[3], r),
    })),
    newPatients: months.map((month, m) => ({
      month,
      eapTransition: at(eap[r], m),
      newToBrand: at(newToBrand[r], m),
    })),
    funnel: {
      referred: at(referred, r),
      benefitsVerified: at(benefitsVerified, r),
      paApproved: at(paApproved, r),
      firstDose: at(firstDose, r),
      secondDose: at(secondDose, r),
      maintenance: at(maintenance, r),
    },
    pendingByStep: {
      benefitsVerification: bv.aging[r]!,
      priorAuthorization: pa.aging[r]!,
      lpScheduling: lp.aging[r]!,
    },
    pendingAvgDays: raw.pendingAvgDays,
    prescribers: months.map((month, m) => ({
      month,
      new: at(newPrescribers[r], m),
      repeat: at(repeatPrescribers[m], r),
    })),
  }));

  const cancelledTotals = byRegion(
    (r) => at(bv.cancelled, r) + at(pa.cancelled, r) + at(lp.cancelled, r),
  );
  return { regions, referred, firstDose, offTherapy, cancelledTotals, vials, eap, newToBrand };
}

function splitMarketAccess(launch: ReturnType<typeof splitLaunch>) {
  const raw = nationalMarketAccessRaw;
  const months = raw.vialsAdministered.map((row) => row.month);
  const regionsLaunch = launch.regions;

  // Channel inventory by month; September is each region's own sites plus its distributor share.
  const shipped = nationalLaunchRaw.monthlyVials.map((row) => row.paid + row.free);
  const administered = raw.vialsAdministered.map((row) => row.paid + row.free);
  const nationalOnHand = shipped.map(
    (_, m) => sum(shipped.slice(0, m + 1)) - sum(administered.slice(0, m + 1)),
  );
  const [distributorRow, ...siteRows] = raw.inventory;
  const siteFor = (r: number) =>
    siteRows.find((row) => regionIndex(row.location.replace(" sites", "")) === r);
  const distributorTotal = (distributorRow?.paid ?? 0) + (distributorRow?.free ?? 0);
  const distributor = allocate(distributorTotal, patientWeights);
  const sites = byRegion((r) => (siteFor(r)?.paid ?? 0) + (siteFor(r)?.free ?? 0));
  const onHand = nationalOnHand.map((total, m) =>
    m === months.length - 1
      ? byRegion((r) => at(distributor, r) + at(sites, r))
      : allocate(total, patientWeights),
  );

  // Administered = shipped this month + stock carried in − stock carried out.
  const shippedByRegion = byRegion((r) =>
    months.map((_, m) => at(launch.vials.paid[r], m) + at(launch.vials.free[r], m)),
  );
  const adminTotals = months.map((_, m) =>
    byRegion(
      (r) => at(shippedByRegion[r], m) + (m > 0 ? at(onHand[m - 1], r) : 0) - at(onHand[m], r),
    ),
  );
  const adminPaid = raw.vialsAdministered.map((row, m) => allocate(row.paid, adminTotals[m] ?? []));
  const paidSinceLaunch = byRegion((r) => sum(adminPaid.map((month) => at(month, r))));
  const adminSinceLaunch = byRegion((r) => sum(adminTotals.map((month) => at(month, r))));

  const eapPatients = byRegion((r) => sum(launch.eap[r] ?? []));
  const eapMaintenance = allocate(raw.eapMaintenanceDoses, eapPatients);

  const goods = raw.newPatientsByGoods.map((row, m) =>
    cascade(
      [row.commercial, row.quickStart, row.bridge, row.pap],
      byRegion((r) => at(launch.eap[r], m) + at(launch.newToBrand[r], m)),
    ),
  );
  const payersReferred = cascade(
    raw.payerMixReferred.map((row) => row.patients),
    launch.referred,
  );
  const payersPaid = cascade(
    raw.payerMixPaidDoses.map((row) => row.doses),
    paidSinceLaunch,
  );

  const restarted = allocate(raw.restarts.patients, patientWeights);
  const discontinuedTotals = byRegion((r) => at(launch.offTherapy, r) + at(restarted, r));
  const stopCancelled = cascade(
    raw.stopReasons.map((row) => row.cancelled),
    launch.cancelledTotals,
  );
  const stopDiscontinued = cascade(
    raw.stopReasons.map((row) => row.discontinued),
    discontinuedTotals,
  );
  const distributorPaid = allocate(distributorRow?.paid ?? 0, distributor);

  const regions = byRegion<MarketAccessRaw>((r) => ({
    vialsAdministered: months.map((month, m) => ({
      month,
      paid: at(adminPaid[m], r),
      free: at(adminTotals[m], r) - at(adminPaid[m], r),
    })),
    eapMaintenanceDoses: at(eapMaintenance, r),
    newPatientsByGoods: raw.newPatientsByGoods.map((row, m) => ({
      month: row.month,
      commercial: at(goods[m]?.[0], r),
      quickStart: at(goods[m]?.[1], r),
      bridge: at(goods[m]?.[2], r),
      pap: at(goods[m]?.[3], r),
    })),
    timeToTherapy: raw.timeToTherapy,
    timeToTherapyMedians: raw.timeToTherapyMedians,
    payerMixReferred: raw.payerMixReferred.map((row, p) => ({
      payer: row.payer,
      patients: at(payersReferred[p], r),
    })),
    payerMixPaidDoses: raw.payerMixPaidDoses.map((row, p) => ({
      ...row,
      doses: at(payersPaid[p], r),
    })),
    stopReasons: raw.stopReasons.map((row, p) => ({
      reason: row.reason,
      cancelled: at(stopCancelled[p], r),
      discontinued: at(stopDiscontinued[p], r),
    })),
    restarts: { ...raw.restarts, patients: at(restarted, r) },
    inventory: [
      {
        location: "Specialty distributor",
        paid: at(distributorPaid, r),
        free: at(distributor, r) - at(distributorPaid, r),
      },
      ...(siteFor(r) ? [siteFor(r)!] : []),
    ],
    pa: paRawFor(regionNames[r]!),
  }));
  void regionsLaunch;
  return { regions, adminSinceLaunch };
}

function splitField() {
  const raw = nationalFieldRaw;
  const callTotals = raw.months.map((row) => row.faceToFace + row.virtual + row.phone);
  const callsByRegion = splitFlow(
    callTotals,
    fieldRegions.map((row) => row.calls),
  );
  const callTypes = raw.months.map((row, m) =>
    cascade(
      [row.faceToFace, row.virtual, row.phone],
      byRegion((r) => at(callsByRegion[r], m)),
    ),
  );
  const targeted = raw.months.map((row) =>
    allocate(
      row.targeted,
      fieldRegions.map((x) => x.targeted),
    ),
  );
  const reached = raw.months.map((row) =>
    allocate(
      row.reached,
      fieldRegions.map((x) => x.reached),
    ),
  );
  const prescribers = fieldRegions.map((row) => row.prescribers);
  const repeat = allocate(raw.repeatPrescribers, prescribers);
  const champions = allocate(raw.champions, repeat);

  return byRegion<FieldRaw>((r) => ({
    months: raw.months.map((row, m) => ({
      ...row,
      faceToFace: at(callTypes[m]?.[0], r),
      virtual: at(callTypes[m]?.[1], r),
      phone: at(callTypes[m]?.[2], r),
      targeted: at(targeted[m], r),
      reached: Math.min(at(reached[m], r), at(targeted[m], r)),
    })),
    repeatPrescribers: at(repeat, r),
    champions: at(champions, r),
  }));
}

function splitMarketing() {
  const raw = nationalMarketingRaw;
  const weight = (key: keyof (typeof marketingRegions)[number]) =>
    marketingRegions.map((row) => row[key] as number);

  // Split a monthly total with fixed regional weights, then its parts within each region.
  const splitParts = (parts: number[][], weights: number[]) => {
    const totals = splitFlow(
      parts[0]!.map((_, m) => sum(parts.map((part) => part[m] ?? 0))),
      weights,
    );
    return parts[0]!.map((_, m) =>
      cascade(
        parts.map((part) => part[m] ?? 0),
        byRegion((r) => at(totals[r], m)),
      ),
    );
  };

  const social = {
    impressionsK: splitFlow(column(raw.social, "impressionsK"), weight("socialImpressionsK")),
    engagements: splitFlow(column(raw.social, "engagements"), weight("socialEngagements")),
    clicks: splitFlow(column(raw.social, "clicks"), weight("socialClicks")),
  };
  const search = {
    impressionsK: splitFlow(column(raw.search, "impressionsK"), weight("searchImpressionsK")),
    clicks: splitFlow(column(raw.search, "clicks"), weight("searchClicks")),
  };
  const visits = splitParts(
    [column(raw.website, "hcp"), column(raw.website, "patient")],
    weight("visits"),
  );
  const hvaKeys = ["download", "repRequest", "signUp"] as const;
  const hvas = splitParts(
    hvaKeys.map((key) => column(raw.highValueActions, key)),
    weight("hvas"),
  );
  const email = {
    sent: splitFlow(column(raw.email, "sent"), weight("sent")),
    bounced: splitFlow(column(raw.email, "bounced"), weight("sent")),
    opened: splitFlow(column(raw.email, "opened"), weight("opens")),
    clicked: splitFlow(column(raw.email, "clicked"), weight("emailClicks")),
    converted: splitFlow(column(raw.email, "converted"), weight("emailClicks")),
  };

  return byRegion<MarketingRaw>((r) => ({
    social: raw.social.map((row, m) => ({
      month: row.month,
      impressionsK: at(social.impressionsK[r], m),
      engagements: at(social.engagements[r], m),
      clicks: at(social.clicks[r], m),
    })),
    search: raw.search.map((row, m) => ({
      impressionsK: at(search.impressionsK[r], m),
      clicks: at(search.clicks[r], m),
      cpc: row.cpc,
    })),
    website: raw.website.map((_, m) => ({
      hcp: at(visits[m]?.[0], r),
      patient: at(visits[m]?.[1], r),
    })),
    highValueActions: raw.highValueActions.map((_, m) => ({
      download: at(hvas[m]?.[0], r),
      repRequest: at(hvas[m]?.[1], r),
      signUp: at(hvas[m]?.[2], r),
    })),
    email: raw.email.map((_, m) => ({
      sent: at(email.sent[r], m),
      bounced: at(email.bounced[r], m),
      opened: at(email.opened[r], m),
      clicked: at(email.clicked[r], m),
      converted: at(email.converted[r], m),
    })),
  }));
}

function splitReferrals(launch: ReturnType<typeof splitLaunch>) {
  const referrals = splitFlow(nationalReferralRaw.referralsByMonth, launch.referred);
  const cancellations = splitFlow(nationalReferralRaw.cancellationsByMonth, launch.cancelledTotals);
  return byRegion<ReferralRaw>((r) => ({
    referralsByMonth: referrals[r] ?? [],
    cancellationsByMonth: cancellations[r] ?? [],
  }));
}

function buildRegionalRaw(): Record<RegionName, DashboardRaw> {
  const launch = splitLaunch();
  const marketAccess = splitMarketAccess(launch);
  const field = splitField();
  const marketing = splitMarketing();
  const referrals = splitReferrals(launch);
  return Object.fromEntries(
    regionNames.map((region, r) => [
      region,
      {
        launch: launch.regions[r]!,
        marketAccess: marketAccess.regions[r]!,
        field: field[r]!,
        marketing: marketing[r]!,
        referrals: referrals[r]!,
      },
    ]),
  ) as Record<RegionName, DashboardRaw>;
}

export const regionalRaw = buildRegionalRaw();
