// What-If Simulator: a rule-based model of how four market access levers move new paid patients
// and net sales over the next six months. Baselines come from the selected geography's launch-to-
// date figures; the rules are fixed demo assumptions, shown on the page next to each lever.

import { assumedGtn, last, sum, wacPerVial } from "@/lib/launch-data";
import { projectAhead } from "@/lib/outlook-data";
import { buildDashboardData, type DashboardData } from "@/lib/scoped-data";
import type { Geography } from "@/lib/scope";

export const simulatorMonths = ["Oct", "Nov", "Dec", "Jan '27", "Feb '27", "Mar '27"] as const;

export const simulatorRules = {
  // Every 10% cut in patient out-of-pocket cost per dose adds 12% more new paid patients.
  oopElasticity: 1.2,
  // Every day faster to PA approval adds 1% more new paid patients (fewer drop out while waiting).
  paDayLift: 0.01,
  // PA approval to first dose (procedure scheduling) can't be shorter than this.
  minSchedulingDays: 5,
};

export type SimulatorLevers = {
  referralToPaidPct: number;
  paDays: number;
  firstDoseDays: number;
  oopPerDose: number;
};

// Net sales per paid vial: WAC less gross-to-net.
export const netPerVial = wacPerVial * (1 - assumedGtn);
const netPerVialM = netPerVial / 1e6;
const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

// `data` must be a launch-to-date build, so the monthly series cover every month since launch.
export function simulatorBaseline({ launch, marketAccess }: DashboardData) {
  const { conversion, timeToTherapySummary, averageOopPerDose, newPatientsByGoods } = marketAccess;
  const paidActive = launch.kpis.activePatients.paid;
  const vials = launch.trend.monthlyVials;
  return {
    levers: {
      referralToPaidPct: conversion.paidKnownPct,
      paDays: timeToTherapySummary.firstApprovedPa.median,
      firstDoseDays: timeToTherapySummary.firstDose.median,
      oopPerDose: averageOopPerDose,
    } satisfies SimulatorLevers,
    // New patients starting on paid (commercial) drug: average of the last three months.
    paidStartsPerMonth: sum(newPatientsByGoods.slice(-3).map((row) => row.commercial)) / 3,
    // Paid doses a month per paid patient on therapy (September).
    dosesPerPatientMonth: paidActive ? last(marketAccess.vialsAdministered).paid / paidActive : 0,
    actual: vials.slice(-3).map((row) => ({ month: row.month, netSalesM: row.paid * netPerVialM })),
    paidVials: vials.map((row) => row.paid),
  };
}

export type SimulatorBaseline = ReturnType<typeof simulatorBaseline>;

// Slider ranges around the baseline, so every geography's starting point sits inside them.
// Referral → Paid is a share of referrals, so it spans the full 0–100%.
export function leverRanges({ levers }: SimulatorBaseline) {
  return {
    referralToPaidPct: { min: 0, max: 100 },
    paDays: { min: Math.max(1, levers.paDays - 10), max: levers.paDays + 15 },
    firstDoseDays: {
      min: Math.max(1, levers.paDays - 10) + simulatorRules.minSchedulingDays,
      max: levers.firstDoseDays + 20,
    },
    oopPerDose: { min: 0, max: Math.ceil((levers.oopPerDose * 2) / 50) * 50 },
  };
}

// Moving PA approval moves first dose by the same number of days (PA is part of it), keeping at
// least the minimum scheduling time between them.
export function withPaDays(levers: SimulatorLevers, paDays: number, maxFirstDose: number) {
  const firstDoseDays = Math.min(
    maxFirstDose,
    Math.max(
      paDays + simulatorRules.minSchedulingDays,
      levers.firstDoseDays + paDays - levers.paDays,
    ),
  );
  return { ...levers, paDays, firstDoseDays };
}

// Paid vials per projected month: the current trajectory, and with `paidStartsPerMonth` new paid
// patients a month who start `daysSaved` days sooner. Both simulator scenarios project this way.
export function projectPaidVials(
  baseline: SimulatorBaseline,
  paidStartsPerMonth: number,
  daysSaved = 0,
) {
  const extraStartsPerMonth = paidStartsPerMonth - baseline.paidStartsPerMonth;
  const currentVials = projectAhead(baseline.paidVials, simulatorMonths.length);
  const months = simulatorMonths.map((month, i) => {
    const current = Math.max(0, currentVials[i] ?? 0);
    // New starters arrive through the month, so on average they are on therapy half of it.
    // Starting sooner adds patient-months on therapy: each month's starters dose earlier.
    const extraPatients = extraStartsPerMonth * (i + 0.5) + (paidStartsPerMonth * daysSaved) / 30;
    const simulated = Math.max(0, current + extraPatients * baseline.dosesPerPatientMonth);
    return { month, currentVials: current, simulatedVials: simulated };
  });
  const deltaNetSalesM =
    sum(months.map((row) => row.simulatedVials - row.currentVials)) * netPerVialM;
  return { months, deltaNetSalesM, extraStartsPerMonth };
}

// Net sales a month for the chart (actual Jul–Sep, then projected) and the six-month totals.
export function salesProjection(
  baseline: SimulatorBaseline,
  { months, deltaNetSalesM, extraStartsPerMonth }: ReturnType<typeof projectPaidVials>,
) {
  return {
    chart: [
      ...baseline.actual.map((row) => ({
        month: row.month,
        current: round2(row.netSalesM),
        simulated: round2(row.netSalesM),
      })),
      ...months.map((row) => ({
        month: row.month,
        current: round2(row.currentVials * netPerVialM),
        simulated: round2(row.simulatedVials * netPerVialM),
      })),
    ],
    currentNetSalesM: round1(sum(months.map((row) => row.currentVials)) * netPerVialM),
    simulatedNetSalesM: round1(sum(months.map((row) => row.simulatedVials)) * netPerVialM),
    deltaNetSalesM: round1(deltaNetSalesM),
    incrementalPatients: Math.round(extraStartsPerMonth * simulatorMonths.length),
    baselinePaidStartsPerMonth: round1(baseline.paidStartsPerMonth),
  };
}

// Paid vials per projected month under the current trajectory and under the given levers.
function project(baseline: SimulatorBaseline, levers: SimulatorLevers) {
  const base = baseline.levers;
  const oopChange = base.oopPerDose ? (levers.oopPerDose - base.oopPerDose) / base.oopPerDose : 0;
  const oopFactor = Math.max(0, 1 - simulatorRules.oopElasticity * oopChange);
  const paFactor = Math.max(0, 1 + simulatorRules.paDayLift * (base.paDays - levers.paDays));
  const conversionFactor = base.referralToPaidPct
    ? levers.referralToPaidPct / base.referralToPaidPct
    : 1;

  const paidStartsPerMonth = baseline.paidStartsPerMonth * conversionFactor * oopFactor * paFactor;
  return {
    ...projectPaidVials(baseline, paidStartsPerMonth, base.firstDoseDays - levers.firstDoseDays),
    paidStartsPerMonth,
    effectiveReferralToPaidPct: levers.referralToPaidPct * oopFactor * paFactor,
  };
}

export function simulate(baseline: SimulatorBaseline, levers: SimulatorLevers) {
  const base = baseline.levers;
  const result = project(baseline, levers);
  const { months } = result;

  // Extra copay support: the out-of-pocket cut, paid on every simulated paid dose. Its return
  // counts only the sales the out-of-pocket lever adds on its own.
  const copaySupportCost =
    Math.max(0, base.oopPerDose - levers.oopPerDose) * sum(months.map((row) => row.simulatedVials));
  const copayDeltaM = project(baseline, { ...base, oopPerDose: levers.oopPerDose }).deltaNetSalesM;

  return {
    ...salesProjection(baseline, result),
    paidStartsPerMonth: round1(result.paidStartsPerMonth),
    effectiveReferralToPaidPct: Math.min(100, Math.round(result.effectiveReferralToPaidPct)),
    copaySupportCost: Math.round(copaySupportCost),
    copayRoi: copaySupportCost > 0 ? round1((copayDeltaM * 1e6) / copaySupportCost) : null,
  };
}

// One-click scenarios on the page; the assistant quotes the same ones.
export function simulatorPresets(baseline: SimulatorBaseline) {
  const base = baseline.levers;
  const ranges = leverRanges(baseline);
  return [
    {
      label: "PA approved 5 days faster",
      levers: withPaDays(
        base,
        Math.max(ranges.paDays.min, base.paDays - 5),
        ranges.firstDoseDays.max,
      ),
    },
    {
      label: "Out-of-pocket 20% lower",
      levers: { ...base, oopPerDose: Math.round((base.oopPerDose * 0.8) / 5) * 5 },
    },
    {
      label: "Referral → Paid +10%",
      levers: {
        ...base,
        referralToPaidPct: Math.min(ranges.referralToPaidPct.max, base.referralToPaidPct + 10),
      },
    },
  ];
}

// The simulator for the assistant: today's levers, the rules, and each scenario's result.
export function simulatorSummary(baseline: SimulatorBaseline) {
  const scenarios = [
    ...simulatorPresets(baseline),
    {
      label: "Out-of-pocket 10% lower",
      levers: {
        ...baseline.levers,
        oopPerDose: Math.round((baseline.levers.oopPerDose * 0.9) / 5) * 5,
      },
    },
  ];
  return {
    horizon: `Next 6 months (${simulatorMonths[0]}–${simulatorMonths[simulatorMonths.length - 1]})`,
    today: {
      ...baseline.levers,
      paidStartsPerMonth: Math.round(baseline.paidStartsPerMonth * 10) / 10,
    },
    rules: [
      "New paid patients scale with Referral → Paid.",
      `Each day faster to PA approval adds ${simulatorRules.paDayLift * 100}% more new paid patients and moves time to first dose by the same days.`,
      "Each day faster to first dose adds paid doses because patients start sooner.",
      `Every 10% lower out-of-pocket cost per dose adds ${simulatorRules.oopElasticity * 10}% more new paid patients; the cut is paid as copay support.`,
      "Current trajectory carries the last three months' trend in paid vials forward.",
    ],
    scenarios: scenarios.map(({ label, levers }) => {
      const result = simulate(baseline, levers);
      return {
        scenario: label,
        levers,
        deltaNetSalesM: result.deltaNetSalesM,
        incrementalPaidPatients: result.incrementalPatients,
        newPaidPatientsPerMonth: result.paidStartsPerMonth,
        effectiveReferralToPaidPct: result.effectiveReferralToPaidPct,
        copaySupportCost: result.copaySupportCost,
        copayRoi: result.copayRoi,
      };
    }),
  };
}

// --- What-if questions in the assistant ------------------------------------------------------
// A question such as "What if out-of-pocket is 15% lower and PA is 5 days faster?" sets the
// simulator's levers (from today's values) and is answered from the same model.

type LeverKey = keyof SimulatorLevers;

const leverPatterns: { key: LeverKey; pattern: RegExp }[] = [
  { key: "referralToPaidPct", pattern: /referral\s*(?:→|->|to)?\s*paid|conversion/g },
  { key: "firstDoseDays", pattern: /time to (?:first )?(?:dose|therapy)|first dose|days to dose/g },
  {
    key: "oopPerDose",
    pattern: /out[- ]of[- ]pocket(?: cost)?(?: per dose)?|\boop\b|co-?pay|patient cost/g,
  },
  {
    key: "paDays",
    pattern: /time to (?:first )?approved pa|prior auth\w*|\bpa\b|\bpas\b|pa approval|approval/g,
  },
];

export const whatIfCue = /\bif\b|simulat|scenario|suppose|\bimpact\b|\beffect\b/;
export const downWords =
  /\b(cut|cuts|reduce[sd]?|lower(?:ed|s)?|drops?|decrease[sd]?|faster|sooner|shorter|less|fewer|down|falls?|shave|quicker)\b/;
export const upWords =
  /\b(increase[sd]?|raise[sd]?|rises?|higher|more|slower|longer|up|grows?|boost(?:ed|s)?)\b/;
export const improveWords = /\b(improve[sd]?|better|speed(?:s|ed)? up)\b/;

const leverNames: Record<LeverKey, string> = {
  referralToPaidPct: "Referral → Paid",
  paDays: "Time to first approved PA",
  firstDoseDays: "Time to first dose",
  oopPerDose: "Out-of-pocket per dose",
};
const leverValue = (key: LeverKey, value: number) =>
  key === "oopPerDose" ? `$${value}` : key === "referralToPaidPct" ? `${value}%` : `${value} days`;

export function parseWhatIf(question: string, baseline: SimulatorBaseline) {
  const text = question.toLowerCase().replace(/[’']/g, "");
  if (!whatIfCue.test(text)) return null;
  const base = baseline.levers;
  const ranges = leverRanges(baseline);
  const requested: Partial<SimulatorLevers> = {};

  for (const clause of text.split(/,|;|\band\b|\bplus\b|\bwith\b|\bwhile\b|\balso\b/)) {
    const lever = leverPatterns.find(({ pattern }) => clause.match(pattern));
    const number = clause.match(/(\$)?\s*(\d+(?:\.\d+)?)\s*(%|percent|pts?\b|points?\b|days?\b)?/);
    if (!lever || !number) continue;
    const { key } = lever;
    // Read the clause without the lever's own name, so "time to first dose" isn't read as "to".
    const rest = clause.replace(lever.pattern, " ");
    const amount = Number(number[2]);
    const isPercent = number[3] === "%" || number[3] === "percent";
    const improveSign = key === "referralToPaidPct" ? 1 : -1;
    const sign = downWords.test(rest)
      ? -1
      : upWords.test(rest)
        ? 1
        : improveWords.test(rest)
          ? improveSign
          : 0;
    const relative = /\bby\b/.test(rest) || (sign !== 0 && !/\bto\b/.test(rest));

    let value: number;
    if (!relative) value = amount;
    else {
      const direction = sign || improveSign;
      if (key === "oopPerDose" && isPercent)
        value = base.oopPerDose * (1 + (direction * amount) / 100);
      else value = base[key] + direction * amount;
    }
    requested[key] = value;
  }
  if (Object.keys(requested).length === 0) return null;

  const clamp = (key: LeverKey, value: number) => {
    const rounded = key === "oopPerDose" ? Math.round(value / 5) * 5 : Math.round(value);
    return Math.min(ranges[key].max, Math.max(ranges[key].min, rounded));
  };
  let levers: SimulatorLevers = { ...base };
  if (requested.referralToPaidPct !== undefined)
    levers.referralToPaidPct = clamp("referralToPaidPct", requested.referralToPaidPct);
  if (requested.oopPerDose !== undefined)
    levers.oopPerDose = clamp("oopPerDose", requested.oopPerDose);
  if (requested.paDays !== undefined)
    levers = withPaDays(levers, clamp("paDays", requested.paDays), ranges.firstDoseDays.max);
  if (requested.firstDoseDays !== undefined)
    levers.firstDoseDays = Math.max(
      levers.paDays + simulatorRules.minSchedulingDays,
      clamp("firstDoseDays", requested.firstDoseDays),
    );

  const capped = (Object.keys(requested) as LeverKey[]).filter((key) => {
    const asked = requested[key]!;
    return Math.abs(asked - levers[key]) > (key === "oopPerDose" ? 2.5 : 0.5);
  });
  return { levers, requested: Object.keys(requested) as LeverKey[], capped };
}

export const whatIfQuestions = [
  "What if out-of-pocket cost is 20% lower?",
  "What if PA approval is 5 days faster?",
  "What if Referral → Paid rises to 65%?",
  "What if we cut out-of-pocket by 10% and PA is 3 days faster?",
];

export function whatIfAnswer(
  baseline: SimulatorBaseline,
  parsed: NonNullable<ReturnType<typeof parseWhatIf>>,
  where: string,
  question: string,
) {
  const base = baseline.levers;
  const { levers } = parsed;
  const result = simulate(baseline, levers);
  const moved = (Object.keys(base) as LeverKey[]).filter((key) => levers[key] !== base[key]);
  const delta = result.deltaNetSalesM;
  const patients = result.incrementalPatients;
  const horizon = `${simulatorMonths[0]}–${simulatorMonths[simulatorMonths.length - 1]}`;

  // Short headlines with one fact per sub-point, the same shape as the other answers.
  const bullets = [
    delta === 0
      ? `- **No change to projected net sales** (${horizon})`
      : `- **${delta > 0 ? "Adds" : "Loses"} about $${Math.abs(delta).toFixed(1)}M in net sales** (${horizon})`,
    `  - ${Math.abs(patients)} ${patients >= 0 ? "more" : "fewer"} paid patients over 6 months`,
    `  - New paid patients a month: ${result.baselinePaidStartsPerMonth} → ${result.paidStartsPerMonth}`,
    `  - Effective Referral → Paid: ${base.referralToPaidPct}% → ${result.effectiveReferralToPaidPct}%`,
    `- **Scenario${where === "National" ? "" : `, ${where}`}**`,
    ...(moved.length
      ? moved.map(
          (key) =>
            `  - ${leverNames[key]}: ${leverValue(key, base[key])} → ${leverValue(key, levers[key])}`,
        )
      : ["  - No change from today"]),
  ];
  if (result.copayRoi !== null) {
    bullets.push(
      `- **Copay support: about $${(result.copaySupportCost / 1000).toFixed(1)}k**`,
      `  - Returns about ${Math.round(result.copayRoi)}x in net sales`,
    );
  }
  const row = (label: string, today: string, scenarioValue: string) =>
    `| ${label} | ${today} | ${scenarioValue} |`;
  const notes = [
    "Rule-based demo estimate, not a forecast. The What-If Simulator tab now shows this scenario; move the sliders to try other values.",
  ];
  if (parsed.capped.length) {
    notes.push(
      `${parsed.capped.map((key) => leverNames[key]).join(" and ")} ${parsed.capped.length > 1 ? "were" : "was"} capped at the slider range.`,
    );
  }
  return {
    title: "What-if scenario",
    response: [
      ...bullets,
      "",
      "| Measure | Today | Scenario |",
      "| --- | ---: | ---: |",
      ...(Object.keys(base) as LeverKey[]).map((key) =>
        row(leverNames[key], leverValue(key, base[key]), leverValue(key, levers[key])),
      ),
      row(
        "New paid patients a month",
        `${result.baselinePaidStartsPerMonth}`,
        `${result.paidStartsPerMonth}`,
      ),
      row(
        "Net sales, next 6 months",
        `$${result.currentNetSalesM.toFixed(1)}M`,
        `$${result.simulatedNetSalesM.toFixed(1)}M`,
      ),
      "",
      notes.join(" "),
    ].join("\n"),
    suggestions: whatIfQuestions.filter((item) => item !== question).slice(0, 3),
  };
}

export const simulatorBaselineFor = (geography: Geography) =>
  simulatorBaseline(buildDashboardData({ geography, period: "Launch to Date" }));

// The levers and the assistant's answer for a what-if question, or null if it isn't one.
export function whatIfFor(question: string, geography: Geography) {
  const baseline = simulatorBaselineFor(geography);
  const parsed = parseWhatIf(question, baseline);
  if (!parsed) return null;
  const where = geography === "Nation" ? "National" : geography;
  return { levers: parsed.levers, answer: whatIfAnswer(baseline, parsed, where, question) };
}
