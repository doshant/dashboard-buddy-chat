// What-If Simulator, Marketing scenario: the impact and ROI of changing social media impressions,
// paid search clicks and the HCP email click rate. Each input changes the site visits a channel
// brings, and the channel attribution grid (attribution-data) values each visit in net sales, so
// added net sales over the next six months follow the same model as the channel ROIs. Spend
// follows how each channel is bought (social per 1,000 impressions, search per click, HCP email per
// send), and ROI is the added net sales over the added spend. Baselines are the selected
// geography's latest month, so "today" matches the Marketing tab.

import { attributionRules } from "@/lib/attribution-data";
import { marketingWhatIfQuestions } from "@/lib/dashboard-data";
import { spendRates } from "@/lib/marketing-data";
import { buildDashboardData, type DashboardData } from "@/lib/scoped-data";
import type { Geography } from "@/lib/scope";
import {
  downWords,
  improveWords,
  netPerVial,
  projectPaidVials,
  salesProjection,
  simulatorBaseline,
  simulatorMonths,
  upWords,
  whatIfCue,
} from "@/lib/simulator-data";

export type MarketingLevers = {
  socialImpressionsK: number;
  searchClicks: number;
  emailClickRatePct: number;
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;
const cents = (value: number) => Math.round(value * 100) / 100;

// Net sales impact in $M from $1M, otherwise in $k, so small changes don't read as $0.0M.
export const formatNetSales = (dollars: number) =>
  Math.abs(dollars) >= 1e6
    ? `$${(Math.abs(dollars) / 1e6).toFixed(1)}M`
    : `$${Math.round(Math.abs(dollars) / 1000)}k`;

// `data` must be a launch-to-date build, so the monthly series cover every month since launch.
export function marketingBaseline(data: DashboardData) {
  const { socialByMonth, searchByMonth, emailByMonth, visitsBySourceByMonth } = data.marketing;
  const social = socialByMonth[socialByMonth.length - 1]!;
  const search = searchByMonth[searchByMonth.length - 1]!;
  const email = emailByMonth[emailByMonth.length - 1]!;
  const peak = searchByMonth.reduce((best, row) => (row.clicks > best.clicks ? row : best));
  return {
    month: social.month,
    levers: {
      socialImpressionsK: social.impressionsK,
      searchClicks: search.clicks,
      emailClickRatePct: email.clickRate,
    } satisfies MarketingLevers,
    sales: simulatorBaseline(data),
    // Social site visits per impression this month.
    socialClickThrough: social.impressionsK ? social.clicks / (social.impressionsK * 1000) : 0,
    searchCpc: search.cpc,
    searchPeak: { month: peak.month, clicks: peak.clicks },
    emailSent: email.sent,
    emailDelivered: email.delivered,
    // Site visits the three channels don't bring (unpaid search, direct, referrals) stay as today.
    otherVisits: visitsBySourceByMonth[visitsBySourceByMonth.length - 1]?.other ?? 0,
  };
}

export type MarketingBaseline = ReturnType<typeof marketingBaseline>;

// Slider ranges: volumes up to double today's (search far enough to win back its best month);
// click rate up to at least 15%.
export function marketingLeverRanges({ levers, searchPeak }: MarketingBaseline) {
  return {
    socialImpressionsK: { min: 0, max: Math.ceil((levers.socialImpressionsK * 2) / 100) * 100 },
    searchClicks: {
      min: 0,
      max: Math.ceil(Math.max(levers.searchClicks * 2, searchPeak.clicks * 1.5) / 1000) * 1000,
    },
    emailClickRatePct: { min: 0, max: Math.max(15, Math.ceil(levers.emailClickRatePct * 2)) },
  };
}

// One month of spend and site visits for each channel at the given levers.
function month(baseline: MarketingBaseline, levers: MarketingLevers) {
  return [
    {
      key: "email",
      label: "HCP email",
      spend: baseline.emailSent * spendRates.emailPerSend,
      visits: Math.round((baseline.emailDelivered * levers.emailClickRatePct) / 100),
    },
    {
      key: "social",
      label: "Social media",
      spend: levers.socialImpressionsK * spendRates.socialCpm,
      visits: Math.round(levers.socialImpressionsK * 1000 * baseline.socialClickThrough),
    },
    {
      key: "search",
      label: "Paid search",
      spend: cents(levers.searchClicks * baseline.searchCpc),
      visits: levers.searchClicks,
    },
  ];
}

export function simulateMarketing(baseline: MarketingBaseline, levers: MarketingLevers) {
  const today = month(baseline, baseline.levers);
  const scenario = month(baseline, levers);
  const total = (rows: typeof today, key: "spend" | "visits") =>
    rows.reduce((sum, row) => sum + row[key], 0);
  const spendToday = cents(total(today, "spend"));
  const spend = cents(total(scenario, "spend"));
  const visitsToday = total(today, "visits");
  const visits = total(scenario, "visits");
  const deltaSpend = cents(spend - spendToday);
  const deltaSpendSixMonths = cents(deltaSpend * simulatorMonths.length);

  // Impact: each added visit is worth its channel's net sales per visit from the attribution grid.
  const { revenuePerVisit } = attributionRules;
  const deltaRevenuePerMonth = scenario.reduce(
    (sum, row, i) =>
      sum +
      (row.visits - today[i]!.visits) * revenuePerVisit[row.key as keyof typeof revenuePerVisit],
    0,
  );
  const deltaRevenue = deltaRevenuePerMonth * simulatorMonths.length;
  // The current trajectory, with the added net sales on top of each projected month.
  const current = salesProjection(
    baseline.sales,
    projectPaidVials(baseline.sales, baseline.sales.paidStartsPerMonth),
  );
  const chart = current.chart.map((row) =>
    (simulatorMonths as readonly string[]).includes(row.month)
      ? { ...row, simulated: round2(row.current + deltaRevenuePerMonth / 1e6) }
      : row,
  );
  // Paid patients on therapy the added net sales pay for, at today's doses per patient.
  const revenuePerPatientMonth = netPerVial * baseline.sales.dosesPerPatientMonth;
  const incrementalPatients = revenuePerPatientMonth
    ? Math.round(deltaRevenuePerMonth / revenuePerPatientMonth)
    : 0;
  // Net sales per $1 of added spend; with no added spend there is no ROI to show.
  const roi = deltaSpendSixMonths > 0 ? round1(deltaRevenue / deltaSpendSixMonths) : null;

  return {
    chart,
    currentNetSalesM: current.currentNetSalesM,
    simulatedNetSalesM: round1(current.currentNetSalesM + deltaRevenue / 1e6),
    deltaNetSalesM: round1(deltaRevenue / 1e6),
    deltaNetSales: Math.round(deltaRevenue),
    deltaRevenuePerMonth: Math.round(deltaRevenuePerMonth),
    incrementalPatients,
    baselinePaidStartsPerMonth: current.baselinePaidStartsPerMonth,
    paidStartsPerMonth: round1(
      baseline.sales.paidStartsPerMonth + incrementalPatients / simulatorMonths.length,
    ),
    channels: scenario.map((row, i) => ({
      ...row,
      spendToday: today[i]!.spend,
      visitsToday: today[i]!.visits,
      costPerVisit: row.visits ? cents(row.spend / row.visits) : null,
      costPerVisitToday: today[i]!.visits ? cents(today[i]!.spend / today[i]!.visits) : null,
    })),
    spendToday,
    spend,
    deltaSpend,
    deltaSpendPct: spendToday ? Math.round((deltaSpend / spendToday) * 100) : 0,
    deltaSpendSixMonths,
    visitsToday,
    visits,
    siteVisitsToday: visitsToday + baseline.otherVisits,
    siteVisits: visits + baseline.otherVisits,
    costPerVisitToday: visitsToday ? cents(spendToday / visitsToday) : 0,
    costPerVisit: visits ? cents(spend / visits) : 0,
    roi,
  };
}

// One-click scenarios on the page; the assistant quotes the same ones.
export function marketingPresets(baseline: MarketingBaseline) {
  const base = baseline.levers;
  return [
    {
      label: `Search back to ${baseline.searchPeak.month}`,
      levers: { ...base, searchClicks: baseline.searchPeak.clicks },
    },
    {
      label: "Social +20%",
      levers: {
        ...base,
        socialImpressionsK: Math.round((base.socialImpressionsK * 1.2) / 10) * 10,
      },
    },
    {
      label: "Email click rate +1%",
      levers: { ...base, emailClickRatePct: round1(base.emailClickRatePct + 1) },
    },
  ];
}

// The Marketing scenario for the assistant: today's levers, the rules, and each preset's result.
export function marketingSimulatorSummary(baseline: MarketingBaseline) {
  const today = simulateMarketing(baseline, baseline.levers);
  return {
    output:
      "Impact and ROI: projected net sales over the next 6 months, new paid patients, and ROI (added net sales ÷ added marketing spend)",
    horizon: `Next 6 months (${simulatorMonths[0]}–${simulatorMonths[simulatorMonths.length - 1]})`,
    today: {
      month: baseline.month,
      ...baseline.levers,
      monthlySpend: today.spendToday,
      siteVisitsPerMonth: today.siteVisitsToday,
      newPaidPatientsPerMonth: today.baselinePaidStartsPerMonth,
    },
    pricing: {
      socialPer1000Impressions: spendRates.socialCpm,
      searchCostPerClick: baseline.searchCpc,
      hcpEmailPerSend: spendRates.emailPerSend,
      hcpEmailsSentPerMonth: baseline.emailSent,
    },
    rules: [
      "Each social, search and email click is a site visit; other site visits stay as today.",
      `Added net sales come from the channel attribution grid: each paid search visit is worth $${attributionRules.revenuePerVisit.search}, a social visit $${attributionRules.revenuePerVisit.social} and an HCP email click $${attributionRules.revenuePerVisit.email} a month in net sales.`,
      `Spend: social impressions × $${spendRates.socialCpm.toFixed(2)} per 1,000; search clicks × $${baseline.searchCpc.toFixed(2)}; HCP email is paid per send, so its click rate adds visits without adding spend.`,
      "ROI is added net sales over the next 6 months divided by added marketing spend over the same months.",
    ],
    scenarios: marketingPresets(baseline).map(({ label, levers }) => {
      const result = simulateMarketing(baseline, levers);
      return {
        scenario: label,
        levers,
        addedNetSalesSixMonths: result.deltaNetSales,
        incrementalPaidPatients: result.incrementalPatients,
        addedSpendSixMonths: result.deltaSpendSixMonths,
        roi: result.roi,
      };
    }),
  };
}

export const marketingBaselineFor = (geography: Geography) =>
  marketingBaseline(buildDashboardData({ geography, period: "Launch to Date" }));

// The fix in the paid search story: buy back search's best month of clicks at today's cost per
// click. Matches the "Search back to …" preset and its what-if question.
export function searchWinBack(baseline: MarketingBaseline) {
  const levers = { ...baseline.levers, searchClicks: baseline.searchPeak.clicks };
  const result = simulateMarketing(baseline, levers);
  return {
    clicksToday: baseline.levers.searchClicks,
    clicksScenario: levers.searchClicks,
    costPerClick: baseline.searchCpc,
    extraSpendPerMonth: result.deltaSpend,
    extraSpendSixMonths: result.deltaSpendSixMonths,
    monthlySpendToday: result.spendToday,
    monthlySpendScenario: result.spend,
    addedNetSalesSixMonths: result.deltaNetSales,
    incrementalPaidPatients: result.incrementalPatients,
    roi: result.roi,
  };
}

// --- What-if questions in the assistant ------------------------------------------------------
// A question such as "What if paid search clicks go back to 6,020?" sets the Marketing levers
// (from today's values) and is answered from the same model. Rate changes such as "up 1%" add
// percentage points, matching the sliders.

type LeverKey = keyof MarketingLevers;

const leverPatterns: { key: LeverKey; pattern: RegExp }[] = [
  { key: "searchClicks", pattern: /paid search(?: clicks?)?|search clicks?|\bsearch\b/g },
  { key: "emailClickRatePct", pattern: /(?:email )?click rate|email clicks?|\bemail\b/g },
  { key: "socialImpressionsK", pattern: /social(?: media)?(?: impressions?)?|impressions?/g },
];

const leverNames: Record<LeverKey, string> = {
  socialImpressionsK: "Social impressions a month",
  searchClicks: "Paid search clicks a month",
  emailClickRatePct: "HCP email click rate",
};
const leverValue = (key: LeverKey, value: number) =>
  key === "socialImpressionsK"
    ? value >= 1000
      ? `${(value / 1000).toFixed(2)}M`
      : `${value}k`
    : key === "searchClicks"
      ? value.toLocaleString("en-US")
      : `${value.toFixed(1)}%`;
const money = (value: number) =>
  Math.abs(value) >= 1000
    ? `$${(Math.abs(value) / 1000).toFixed(1)}k`
    : `$${Math.abs(value).toFixed(0)}`;

export function parseMarketingWhatIf(question: string, baseline: MarketingBaseline) {
  // Drop thousands separators, so "6,020" reads as one number.
  const text = question
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/(\d),(?=\d{3})/g, "$1");
  if (!whatIfCue.test(text)) return null;
  const base = baseline.levers;
  const ranges = marketingLeverRanges(baseline);
  const requested: Partial<MarketingLevers> = {};

  for (const clause of text.split(/,|;|\band\b|\bplus\b|\bwith\b|\bwhile\b|\balso\b/)) {
    const lever = leverPatterns.find(({ pattern }) => clause.match(pattern));
    const number = clause.match(/(\d+(?:\.\d+)?)\s*(%|percent|pts?\b|points?\b|m\b|million|k\b)?/);
    if (!lever || !number) continue;
    const { key } = lever;
    // Read the clause without the lever's own name, so its words aren't read as directions.
    const rest = clause.replace(lever.pattern, " ");
    const amount = Number(number[1]);
    const unit = number[2] ?? "";
    const sign = downWords.test(rest) ? -1 : upWords.test(rest) || improveWords.test(rest) ? 1 : 0;
    const relative = /\bby\b/.test(rest) || (sign !== 0 && !/\bto\b/.test(rest));
    const direction = sign || 1;
    const isPercent = unit === "%" || unit === "percent";

    if (key === "socialImpressionsK" || key === "searchClicks") {
      // Volumes: a percentage is relative to today; otherwise a count (impressions in thousands).
      const scale = key === "socialImpressionsK" ? 1 : 1000;
      const count =
        unit === "m" || unit === "million"
          ? amount * 1000 * scale
          : unit === "k"
            ? amount * (key === "socialImpressionsK" ? 1 : 1000)
            : amount;
      requested[key] = isPercent
        ? base[key] * (1 + (direction * amount) / 100)
        : relative
          ? base[key] + direction * count
          : count;
    } else {
      requested[key] = relative ? base[key] + direction * amount : amount;
    }
  }
  if (Object.keys(requested).length === 0) return null;

  const levers: MarketingLevers = { ...base };
  for (const key of Object.keys(requested) as LeverKey[]) {
    const asked = requested[key]!;
    const rounded =
      key === "socialImpressionsK"
        ? Math.round(asked / 10) * 10
        : key === "searchClicks"
          ? Math.round(asked)
          : round1(asked);
    levers[key] = Math.min(ranges[key].max, Math.max(ranges[key].min, rounded));
  }
  const capped = (Object.keys(requested) as LeverKey[]).filter(
    (key) =>
      Math.abs(requested[key]! - levers[key]) >
      (key === "socialImpressionsK" ? 5 : key === "searchClicks" ? 1 : 0.05),
  );
  return { levers, requested: Object.keys(requested) as LeverKey[], capped };
}

export function marketingWhatIfAnswer(
  baseline: MarketingBaseline,
  parsed: NonNullable<ReturnType<typeof parseMarketingWhatIf>>,
  where: string,
  question: string,
) {
  const base = baseline.levers;
  const { levers } = parsed;
  const result = simulateMarketing(baseline, levers);
  const moved = (Object.keys(base) as LeverKey[]).filter((key) => levers[key] !== base[key]);
  const delta = result.deltaNetSales;
  const patients = result.incrementalPatients;
  const horizon = `${simulatorMonths[0]}–${simulatorMonths[simulatorMonths.length - 1]}`;
  const sign = (value: number) => (value > 0 ? "+" : value < 0 ? "-" : "");
  const roiLine =
    result.roi !== null
      ? `- **ROI about ${result.roi}x**: ${sign(delta)}${formatNetSales(delta)} in net sales for ${money(result.deltaSpendSixMonths)} more marketing spend over 6 months`
      : result.deltaSpendSixMonths < 0
        ? `- **Spend falls by ${money(result.deltaSpendSixMonths)}** over 6 months`
        : "- **No added spend**: HCP email is paid per send, so a better click rate is pure upside";

  // Short headlines with one fact per sub-point, the same shape as the other answers.
  const bullets = [
    delta === 0
      ? `- **No change to projected net sales** (${horizon})`
      : `- **${delta > 0 ? "Adds" : "Loses"} about ${formatNetSales(delta)} in net sales** (${horizon})`,
    `  - ${Math.abs(patients)} ${patients >= 0 ? "more" : "fewer"} paid patients over 6 months`,
    `  - Site visits a month: ${result.siteVisitsToday.toLocaleString("en-US")} → ${result.siteVisits.toLocaleString("en-US")}`,
    roiLine,
    `- **Scenario${where === "National" ? "" : `, ${where}`}**`,
    ...(moved.length
      ? moved.map(
          (key) =>
            `  - ${leverNames[key]}: ${leverValue(key, base[key])} → ${leverValue(key, levers[key])}`,
        )
      : ["  - No change from today"]),
  ];
  const notes = [
    `Demo estimate, not a forecast: added visits are valued with the channel attribution grid (paid search $${attributionRules.revenuePerVisit.search}, social $${attributionRules.revenuePerVisit.social} and HCP email $${attributionRules.revenuePerVisit.email} per visit), and spend is priced at ${baseline.month}'s rates. The What-If Simulator tab now shows this scenario; move the sliders to try other values.`,
  ];
  if (parsed.capped.length) {
    notes.push(
      `${parsed.capped.map((key) => leverNames[key]).join(" and ")} ${parsed.capped.length > 1 ? "were" : "was"} capped at the slider range.`,
    );
  }
  const row = (label: string, today: string, scenarioValue: string) =>
    `| ${label} | ${today} | ${scenarioValue} |`;
  return {
    title: "What-if scenario",
    response: [
      ...bullets,
      "",
      "| Measure | Today | Scenario |",
      "| --- | ---: | ---: |",
      row(
        "Net sales, next 6 months",
        `$${result.currentNetSalesM.toFixed(1)}M`,
        `$${result.simulatedNetSalesM.toFixed(1)}M`,
      ),
      row(
        "New paid patients a month",
        `${result.baselinePaidStartsPerMonth}`,
        `${result.paidStartsPerMonth}`,
      ),
      row(
        "Site visits a month",
        result.siteVisitsToday.toLocaleString("en-US"),
        result.siteVisits.toLocaleString("en-US"),
      ),
      row("Marketing spend a month", money(result.spendToday), money(result.spend)),
      row("ROI", "–", result.roi === null ? "–" : `${result.roi}x`),
      "",
      notes.join(" "),
    ].join("\n"),
    suggestions: marketingWhatIfQuestions.filter((item) => item !== question).slice(0, 3),
  };
}

// The levers and the assistant's answer for a marketing what-if question, or null if it isn't one.
export function marketingWhatIfFor(question: string, geography: Geography) {
  const baseline = marketingBaselineFor(geography);
  const parsed = parseMarketingWhatIf(question, baseline);
  if (!parsed) return null;
  const where = geography === "Nation" ? "National" : geography;
  return {
    levers: parsed.levers,
    answer: marketingWhatIfAnswer(baseline, parsed, where, question),
  };
}
