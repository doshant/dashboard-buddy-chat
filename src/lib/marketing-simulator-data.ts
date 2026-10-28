// What-If Simulator, Marketing scenario: how monthly marketing spend changes when the volumes and
// rates move. The inputs are social media impressions, paid search clicks and the HCP email click
// rate. Spend follows how each channel is bought: social per 1,000 impressions, search per click
// and HCP email per email sent, so the email click rate changes results, not spend. Baselines
// are the selected geography's latest month, so "today" matches the Marketing tab.

import { marketingWhatIfQuestions } from "@/lib/dashboard-data";
import { spendRates } from "@/lib/marketing-data";
import { buildDashboardData, type DashboardData } from "@/lib/scoped-data";
import type { Geography } from "@/lib/scope";
import { downWords, improveWords, simulatorMonths, upWords, whatIfCue } from "@/lib/simulator-data";

export type MarketingLevers = {
  socialImpressionsK: number;
  searchClicks: number;
  emailClickRatePct: number;
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const cents = (value: number) => Math.round(value * 100) / 100;

// `data` must be a launch-to-date build, so the monthly series cover every month since launch.
export function marketingBaseline(data: DashboardData) {
  const { socialByMonth, searchByMonth, emailByMonth } = data.marketing;
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
    // Social site visits per impression this month.
    socialClickThrough: social.impressionsK ? social.clicks / (social.impressionsK * 1000) : 0,
    searchCpc: search.cpc,
    searchPeak: { month: peak.month, clicks: peak.clicks },
    emailSent: email.sent,
    emailDelivered: email.delivered,
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
  return {
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
    deltaSpendSixMonths: cents(deltaSpend * simulatorMonths.length),
    visitsToday,
    visits,
    costPerVisitToday: visitsToday ? cents(spendToday / visitsToday) : 0,
    costPerVisit: visits ? cents(spend / visits) : 0,
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

// The Marketing scenario for the assistant: today's levers, the pricing, and each preset's result.
export function marketingSimulatorSummary(baseline: MarketingBaseline) {
  const today = simulateMarketing(baseline, baseline.levers);
  return {
    output: "Monthly marketing spend, today vs scenario, by channel; and the change over 6 months",
    today: {
      month: baseline.month,
      ...baseline.levers,
      monthlySpend: today.spendToday,
      siteVisitsPerMonth: today.visitsToday,
    },
    pricing: {
      socialPer1000Impressions: spendRates.socialCpm,
      searchCostPerClick: baseline.searchCpc,
      hcpEmailPerSend: spendRates.emailPerSend,
      hcpEmailsSentPerMonth: baseline.emailSent,
    },
    rules: [
      `Social spend is impressions × $${spendRates.socialCpm.toFixed(2)} per 1,000.`,
      `Paid search spend is clicks × $${baseline.searchCpc.toFixed(2)}, this month's cost per click.`,
      `HCP email spend is ${baseline.emailSent.toLocaleString("en-US")} emails a month × $${spendRates.emailPerSend.toFixed(2)}; the click rate changes site visits and cost per visit, not spend.`,
      "Each social, search and email click is a site visit.",
    ],
    scenarios: marketingPresets(baseline).map(({ label, levers }) => {
      const result = simulateMarketing(baseline, levers);
      return {
        scenario: label,
        levers,
        monthlySpend: result.spend,
        changePerMonth: result.deltaSpend,
        changeOverSixMonths: result.deltaSpendSixMonths,
        siteVisitsPerMonth: result.visits,
        costPerSiteVisit: result.costPerVisit,
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
  const delta = result.deltaSpend;
  const sign = (value: number) => (value > 0 ? "+" : value < 0 ? "-" : "");

  // Short headlines with one fact per sub-point, the same shape as the other answers.
  const bullets = [
    delta === 0
      ? `- **Monthly spend stays at ${money(result.spendToday)}**`
      : `- **Monthly spend ${delta > 0 ? "rises" : "falls"} by about ${money(delta)}** (${money(result.spendToday)} → ${money(result.spend)}, ${sign(delta)}${Math.abs(result.deltaSpendPct)}%)`,
    `  - Over the next 6 months: ${sign(delta)}${money(result.deltaSpendSixMonths)}`,
    `  - Site visits a month: ${result.visitsToday.toLocaleString("en-US")} → ${result.visits.toLocaleString("en-US")}`,
    `  - Cost per site visit: $${result.costPerVisitToday.toFixed(2)} → $${result.costPerVisit.toFixed(2)}`,
    `- **Scenario${where === "National" ? "" : `, ${where}`}**`,
    ...(moved.length
      ? moved.map(
          (key) =>
            `  - ${leverNames[key]}: ${leverValue(key, base[key])} → ${leverValue(key, levers[key])}`,
        )
      : ["  - No change from today"]),
  ];
  const notes = [
    `Spend is priced at ${baseline.month}'s rates: social $${spendRates.socialCpm.toFixed(2)} per 1,000 impressions, search $${baseline.searchCpc.toFixed(2)} per click and HCP email $${spendRates.emailPerSend.toFixed(2)} per send, so email rates change visits, not spend. The What-If Simulator tab now shows this scenario; move the sliders to try other values.`,
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
      "| Channel | Spend today | Scenario | Change |",
      "| --- | ---: | ---: | ---: |",
      ...result.channels.map(
        (row) =>
          `| ${row.label} | ${money(row.spendToday)} | ${money(row.spend)} | ${sign(row.spend - row.spendToday)}${money(row.spend - row.spendToday)} |`,
      ),
      `| **Total a month** | **${money(result.spendToday)}** | **${money(result.spend)}** | **${sign(delta)}${money(delta)}** |`,
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
