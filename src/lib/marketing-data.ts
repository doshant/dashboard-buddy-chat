import { sum } from "@/lib/launch-data";
import { allocate, monthNames, type PeriodWindow } from "@/lib/scope";

// Marketing covers four channels: the brand website, HCP email, social media and paid search.
// Figures are stored as raw monthly counts and every total, rate and spend is derived, so the
// cards, charts and regional table always agree. Site visits reconcile with the channels: each
// social, search and email click is a site visit, and the remaining visits come from other sources (unpaid search, direct visits, referrals).
// Months run Jan–Sep 2026 (launch in January). `start` limits figures to the selected period.

const share = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const share2 = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 10000) / 100 : 0;
const cents = (value: number) => Math.round(value * 100) / 100;

export const formatRate = (value: number) => `${value.toFixed(1)}%`;
export const formatRate2 = (value: number) => `${value.toFixed(2)}%`;
export const formatSpend = (dollars: number) => `$${formatCount(dollars)}`;
export const formatDollars = (dollars: number) => `$${dollars.toFixed(2)}`;

// Rounds half up on the integer count (toFixed would turn 1.45M into "1.4M").
export function formatCount(value: number) {
  if (value >= 1_000_000) return `${(Math.round(value / 100_000) / 10).toFixed(1)}M`;
  if (value >= 1_000) return `${(Math.round(value / 100) / 10).toFixed(1)}k`;
  return Math.round(value).toLocaleString("en-US");
}

// How each channel is bought: HCP email per email sent, social per 1,000 impressions, paid
// search per click (each month's cost per click is in the search data). Spend in any scope
// follows the counts.
export const spendRates = { emailPerSend: 1.5, socialCpm: 25 };

// Channel attribution (see attribution-data): net sales each digital visit brings, and how the
// rest of each month's net sales splits between the other tactics.
export const attributionRules = {
  // Net sales per site visit each digital tactic brings. Search visits show intent and HCP email
  // clicks come from prescribers, so both are worth more than a social visit.
  revenuePerVisit: { search: 22, social: 11, email: 120 },
  // Shares of the net sales digital doesn't account for.
  otherShares: { field: 0.4, access: 0.25, base: 0.35 },
};

export const spendChannels = [
  { key: "email", label: "HCP email" },
  { key: "social", label: "Social media" },
  { key: "search", label: "Paid search" },
] as const;

export const visitSources = [
  { key: "social", label: "Social media" },
  { key: "search", label: "Paid search" },
  { key: "email", label: "HCP email" },
  { key: "other", label: "Other sources" },
] as const;

export const hvaTypes = [
  { key: "download", label: "Resource download" },
  { key: "repRequest", label: "Rep request" },
  { key: "signUp", label: "Support sign-up" },
] as const;

type EmailCounts = {
  sent: number;
  bounced: number;
  opened: number;
  clicked: number;
  converted: number;
};
const emailMeasures = ["sent", "bounced", "opened", "clicked", "converted"] as const;

export type MarketingRaw = {
  // Social media: impressions (k), engagements (reactions, comments, shares and video views)
  // and clicks through to the brand website.
  social: { month: string; impressionsK: number; engagements: number; clicks: number }[];
  // Paid search: impressions (k), clicks through to the brand website and cost per click.
  search: { impressionsK: number; clicks: number; cpc: number }[];
  // Sessions on the HCP and patient brand websites.
  website: { hcp: number; patient: number }[];
  highValueActions: { download: number; repRequest: number; signUp: number }[];
  // HCP email campaigns; delivered is sent less bounces, and each click is a site visit.
  email: EmailCounts[];
};

const nationalWebsite = [
  { hcp: 7_400, patient: 4_100 },
  { hcp: 8_300, patient: 4_600 },
  { hcp: 9_100, patient: 5_000 },
  { hcp: 9_600, patient: 5_300 },
  { hcp: 10_200, patient: 5_600 },
  { hcp: 10_900, patient: 6_000 },
  { hcp: 11_400, patient: 6_300 },
  // Aug–Sep: paid search lost clicks to a competitor (see the search data), so visits fell.
  { hcp: 11_060, patient: 6_260 },
  { hcp: 10_480, patient: 6_160 },
];

// Launch-to-date totals for high value actions and HCP email. HVAs follow each month's website
// visits; HCP email follows its send plan, which doesn't depend on site traffic.
const hvaTotals = { download: 5_985, repRequest: 396, signUp: 155 };
const hcpEmailTotals: EmailCounts = {
  sent: 48_600,
  bounced: 1_900,
  opened: 12_140,
  clicked: 1_630,
  converted: 240,
};
const hcpEmailPlan = [7_400, 8_300, 9_100, 9_600, 10_200, 10_900, 11_400, 12_100, 12_900];
const byVisits = (total: number) =>
  allocate(
    total,
    nationalWebsite.map((row) => row.hcp + row.patient),
  );
const emailSplit = emailMeasures.map((measure) => allocate(hcpEmailTotals[measure], hcpEmailPlan));
const hvaSplit = {
  download: byVisits(hvaTotals.download),
  repRequest: byVisits(hvaTotals.repRequest),
  signUp: byVisits(hvaTotals.signUp),
};

export const nationalMarketingRaw: MarketingRaw = {
  social: [
    { month: "Jan", impressionsK: 470, engagements: 18_800, clicks: 3_000 },
    { month: "Feb", impressionsK: 520, engagements: 21_300, clicks: 3_400 },
    { month: "Mar", impressionsK: 580, engagements: 24_400, clicks: 3_700 },
    { month: "Apr", impressionsK: 600, engagements: 25_800, clicks: 3_900 },
    { month: "May", impressionsK: 620, engagements: 27_300, clicks: 4_100 },
    { month: "Jun", impressionsK: 670, engagements: 30_200, clicks: 4_400 },
    { month: "Jul", impressionsK: 690, engagements: 31_700, clicks: 4_600 },
    { month: "Aug", impressionsK: 730, engagements: 34_300, clicks: 4_900 },
    { month: "Sep", impressionsK: 770, engagements: 37_000, clicks: 5_200 },
  ],
  // Demo scenario: from mid-August a competitor bids on our branded and condition search terms.
  // Cost per click jumps, the monthly search budget (about $12k) buys fewer impressions and
  // clicks, and site visits fall while social and HCP email keep growing.
  search: [
    { impressionsK: 190, clicks: 3_900, cpc: 2 },
    { impressionsK: 210, clicks: 4_340, cpc: 2 },
    { impressionsK: 230, clicks: 4_760, cpc: 2 },
    { impressionsK: 240, clicks: 5_040, cpc: 2 },
    { impressionsK: 250, clicks: 5_380, cpc: 2 },
    { impressionsK: 270, clicks: 5_740, cpc: 2 },
    { impressionsK: 280, clicks: 6_020, cpc: 2 },
    { impressionsK: 240, clicks: 4_900, cpc: 2.45 },
    { impressionsK: 170, clicks: 3_400, cpc: 3.55 },
  ],
  website: nationalWebsite,
  highValueActions: nationalWebsite.map((_, i) => ({
    download: hvaSplit.download[i] ?? 0,
    repRequest: hvaSplit.repRequest[i] ?? 0,
    signUp: hvaSplit.signUp[i] ?? 0,
  })),
  email: nationalWebsite.map(
    (_, i) =>
      Object.fromEntries(
        emailMeasures.map((measure, m) => [measure, emailSplit[m]?.[i] ?? 0]),
      ) as EmailCounts,
  ),
};

// Regional marketing totals since launch; they add up to the national totals, and regional views
// split the national months in these proportions.
export const regions = [
  {
    region: "Northeast",
    socialImpressionsK: 1_660,
    socialEngagements: 74_700,
    socialClicks: 11_100,
    searchImpressionsK: 630,
    searchClicks: 13_200,
    searchSpend: 28_669,
    visits: 41_610,
    hvas: 2_018,
    sent: 14_700,
    delivered: 14_140,
    opens: 3_800,
    emailClicks: 510,
  },
  {
    region: "Southeast",
    socialImpressionsK: 1_430,
    socialEngagements: 62_900,
    socialClicks: 9_400,
    searchImpressionsK: 510,
    searchClicks: 10_600,
    searchSpend: 23_022,
    visits: 33_600,
    hvas: 1_583,
    sent: 11_900,
    delivered: 11_430,
    opens: 2_920,
    emailClicks: 390,
  },
  {
    region: "Midwest",
    socialImpressionsK: 1_120,
    socialEngagements: 48_700,
    socialClicks: 7_200,
    searchImpressionsK: 400,
    searchClicks: 8_260,
    searchSpend: 17_940,
    visits: 26_640,
    hvas: 1_226,
    sent: 9_400,
    delivered: 9_020,
    opens: 2_250,
    emailClicks: 300,
  },
  {
    region: "West",
    socialImpressionsK: 1_440,
    socialEngagements: 64_500,
    socialClicks: 9_500,
    searchImpressionsK: 540,
    searchClicks: 11_420,
    searchSpend: 24_804,
    visits: 35_910,
    hvas: 1_709,
    sent: 12_600,
    delivered: 12_110,
    opens: 3_170,
    emailClicks: 430,
  },
];

export type RegionCounts = Omit<(typeof regions)[number], "region">;

export function sumRegionCounts(rows: RegionCounts[]): RegionCounts {
  const total = (key: keyof RegionCounts) => sum(rows.map((row) => row[key]));
  return {
    socialImpressionsK: total("socialImpressionsK"),
    socialEngagements: total("socialEngagements"),
    socialClicks: total("socialClicks"),
    searchImpressionsK: total("searchImpressionsK"),
    searchClicks: total("searchClicks"),
    searchSpend: total("searchSpend"),
    visits: total("visits"),
    hvas: total("hvas"),
    sent: total("sent"),
    delivered: total("delivered"),
    opens: total("opens"),
    emailClicks: total("emailClicks"),
  };
}

export function withRates(region: string, row: RegionCounts) {
  return {
    region,
    ...row,
    socialEngagementRate: share(row.socialEngagements, row.socialImpressionsK * 1000),
    searchCtr: share(row.searchClicks, row.searchImpressionsK * 1000),
    hvaRate: share(row.hvas, row.visits),
    openRate: share(row.opens, row.delivered),
    clickRate: share(row.emailClicks, row.delivered),
    spend:
      row.sent * spendRates.emailPerSend +
      row.socialImpressionsK * spendRates.socialCpm +
      row.searchSpend,
  };
}

export function buildMarketingData(
  raw: MarketingRaw,
  { start, end }: PeriodWindow = { start: 0, end: undefined },
) {
  const inPeriod = <T>(rows: T[]) => rows.slice(start, end);
  const monthOf = (i: number) => raw.social[i]?.month ?? monthNames[i] ?? "";

  const allSocial = raw.social.map((row) => ({
    ...row,
    engagementRate: share(row.engagements, row.impressionsK * 1000),
    ctr: share2(row.clicks, row.impressionsK * 1000),
    spend: row.impressionsK * spendRates.socialCpm,
  }));
  const allSearch = raw.search.map((row, i) => ({
    month: monthOf(i),
    ...row,
    ctr: share(row.clicks, row.impressionsK * 1000),
    spend: cents(row.clicks * row.cpc),
  }));
  const allEmail = raw.email.map((row, i) => {
    const delivered = row.sent - row.bounced;
    return {
      month: monthOf(i),
      ...row,
      delivered,
      openRate: share(row.opened, delivered),
      clickRate: share(row.clicked, delivered),
      spend: row.sent * spendRates.emailPerSend,
    };
  });
  const allVisits = raw.website.map((row, i) => ({
    month: monthOf(i),
    ...row,
    total: row.hcp + row.patient,
  }));
  // Every visit has one source; "other" (unpaid search, direct, referrals) is what the channels
  // don't account for.
  const allSources = allVisits.map((row, i) => {
    const social = allSocial[i]?.clicks ?? 0;
    const search = allSearch[i]?.clicks ?? 0;
    const email = allEmail[i]?.clicked ?? 0;
    return {
      month: row.month,
      social,
      search,
      email,
      other: row.total - social - search - email,
      total: row.total,
    };
  });
  const allSpend = allVisits.map((row, i) => {
    const email = allEmail[i]?.spend ?? 0;
    const social = allSocial[i]?.spend ?? 0;
    const search = allSearch[i]?.spend ?? 0;
    return { month: row.month, email, social, search, total: email + social + search };
  });
  // Paid media is social plus paid search; the What-If Simulator moves it as one lever.
  const allPaidMedia = allSocial.map((row, i) => {
    const impressionsK = row.impressionsK + (allSearch[i]?.impressionsK ?? 0);
    const clicks = row.clicks + (allSearch[i]?.clicks ?? 0);
    return { month: row.month, impressionsK, clicks, ctr: share(clicks, impressionsK * 1000) };
  });

  const socialByMonth = inPeriod(allSocial);
  const searchByMonth = inPeriod(allSearch);
  const emailByMonth = inPeriod(allEmail);
  const websiteVisitsByMonth = inPeriod(allVisits);
  const visitsBySourceByMonth = inPeriod(allSources);
  const spendByMonth = inPeriod(allSpend);
  const paidMediaByMonth = inPeriod(allPaidMedia);

  const hvaMonths = inPeriod(raw.highValueActions);
  const highValueActions = hvaTypes.map(({ key, label }) => ({
    label,
    value: sum(hvaMonths.map((row) => row[key])),
  }));

  const total = <T>(rows: T[], key: keyof T) => sum(rows.map((row) => Number(row[key])));
  const first = <T>(rows: T[]) => rows[0];
  const last = <T>(rows: T[]) => rows[rows.length - 1];

  const email = {
    sent: total(emailByMonth, "sent"),
    bounced: total(emailByMonth, "bounced"),
    delivered: total(emailByMonth, "delivered"),
    opened: total(emailByMonth, "opened"),
    clicked: total(emailByMonth, "clicked"),
    converted: total(emailByMonth, "converted"),
    spend: total(emailByMonth, "spend"),
  };
  const social = {
    impressionsK: total(socialByMonth, "impressionsK"),
    engagements: total(socialByMonth, "engagements"),
    clicks: total(socialByMonth, "clicks"),
    spend: total(socialByMonth, "spend"),
  };
  const search = {
    impressionsK: total(searchByMonth, "impressionsK"),
    clicks: total(searchByMonth, "clicks"),
    spend: total(searchByMonth, "spend"),
  };
  const totalVisits = total(websiteVisitsByMonth, "total");
  const totalHvas = sum(highValueActions.map((row) => row.value));
  const totalSpend = email.spend + social.spend + search.spend;
  const paidImpressionsK = social.impressionsK + search.impressionsK;
  const paidClicks = social.clicks + search.clicks;
  const other = total(visitsBySourceByMonth, "other");
  const firstVisits = first(allVisits)?.total ?? 0;
  const lastVisits = last(allVisits)?.total ?? 0;
  const priorVisits = allVisits[allVisits.length - 2]?.total ?? 0;

  const emailFunnel = [
    { stage: "Delivered", hcp: email.delivered, total: email.delivered },
    { stage: "Opened", hcp: email.opened, total: email.opened },
    { stage: "Clicked", hcp: email.clicked, total: email.clicked },
    { stage: "Converted (HVA)", hcp: email.converted, total: email.converted },
  ];
  const spendByChannel = spendChannels.map(({ key, label }) => ({
    label,
    value: { email: email.spend, social: social.spend, search: search.spend }[key],
  }));
  // Only the channels bought on impressions; HCP email has none.
  const impressionsByChannel = [
    { label: "Social media", value: social.impressionsK },
    { label: "Paid search", value: search.impressionsK },
  ];

  const marketingKpis = {
    firstMonthLabel: first(socialByMonth)?.month ?? "Jan",
    latestMonthLabel: last(socialByMonth)?.month ?? "Sep",
    spend: {
      total: totalSpend,
      email: email.spend,
      social: social.spend,
      search: search.spend,
      firstMonth: first(spendByMonth)?.total ?? 0,
      latestMonth: last(spendByMonth)?.total ?? 0,
      // Social and search spend over the site visits they bring.
      costPerPaidVisit: paidClicks ? cents((social.spend + search.spend) / paidClicks) : 0,
      costPerHva: totalHvas ? cents(totalSpend / totalHvas) : 0,
    },
    website: {
      total: totalVisits,
      hcp: total(websiteVisitsByMonth, "hcp"),
      patient: total(websiteVisitsByMonth, "patient"),
      growthSinceLaunchPct: firstVisits ? Math.round((lastVisits / firstVisits - 1) * 100) : 0,
      growthVsPriorPct: priorVisits ? Math.round((lastVisits / priorVisits - 1) * 100) : 0,
      sources: { social: social.clicks, search: search.clicks, email: email.clicked, other },
      paidSharePct: totalVisits ? Math.round((paidClicks / totalVisits) * 100) : 0,
    },
    hva: { total: totalHvas, rate: share(totalHvas, totalVisits) },
    // HCP campaigns only.
    email: {
      ...email,
      openRate: share(email.opened, email.delivered),
      clickRate: share(email.clicked, email.delivered),
      clickToOpenRate: share(email.clicked, email.opened),
      costPerSend: spendRates.emailPerSend,
      costPerHva: email.converted ? cents(email.spend / email.converted) : 0,
    },
    social: {
      ...social,
      impressions: social.impressionsK * 1000,
      engagementRate: share(social.engagements, social.impressionsK * 1000),
      ctr: share2(social.clicks, social.impressionsK * 1000),
      cpm: spendRates.socialCpm,
      costPerClick: social.clicks ? cents(social.spend / social.clicks) : 0,
      firstMonthImpressions: (first(socialByMonth)?.impressionsK ?? 0) * 1000,
      latestMonthImpressions: (last(socialByMonth)?.impressionsK ?? 0) * 1000,
      firstMonthEngagementRate: first(socialByMonth)?.engagementRate ?? 0,
      latestMonthEngagementRate: last(socialByMonth)?.engagementRate ?? 0,
    },
    search: {
      ...search,
      impressions: search.impressionsK * 1000,
      ctr: share(search.clicks, search.impressionsK * 1000),
      // Average cost per click; the latest month shows the competitor's effect.
      cpc: search.clicks ? cents(search.spend / search.clicks) : 0,
      firstMonthCpc: first(searchByMonth)?.cpc ?? 0,
      latestMonthCpc: last(searchByMonth)?.cpc ?? 0,
      firstMonthImpressions: (first(searchByMonth)?.impressionsK ?? 0) * 1000,
      latestMonthImpressions: (last(searchByMonth)?.impressionsK ?? 0) * 1000,
      firstMonthClicks: first(searchByMonth)?.clicks ?? 0,
      latestMonthClicks: last(searchByMonth)?.clicks ?? 0,
    },
    paidMedia: {
      impressions: paidImpressionsK * 1000,
      clicks: paidClicks,
      ctr: share(paidClicks, paidImpressionsK * 1000),
      latestMonthImpressions: (last(paidMediaByMonth)?.impressionsK ?? 0) * 1000,
      // Social and search spend per 1,000 impressions.
      cpm: paidImpressionsK ? cents((social.spend + search.spend) / paidImpressionsK) : 0,
    },
  };

  // This geography and period's totals in the shape of a regional table row.
  const summaryRow = (region: string) =>
    withRates(region, {
      socialImpressionsK: social.impressionsK,
      socialEngagements: social.engagements,
      socialClicks: social.clicks,
      searchImpressionsK: search.impressionsK,
      searchClicks: search.clicks,
      searchSpend: search.spend,
      visits: totalVisits,
      hvas: totalHvas,
      sent: email.sent,
      delivered: email.delivered,
      opens: email.opened,
      emailClicks: email.clicked,
    });

  return {
    spendByMonth,
    spendByChannel,
    impressionsByChannel,
    websiteVisitsByMonth,
    visitsBySourceByMonth,
    highValueActions,
    emailByMonth,
    emailFunnel,
    socialByMonth,
    searchByMonth,
    paidMediaByMonth,
    marketingKpis,
    summaryRow,
    trend: { websiteVisitsByMonth: allVisits, paidMediaByMonth: allPaidMedia },
  };
}

export type MarketingData = ReturnType<typeof buildMarketingData>;

export const {
  spendByMonth,
  spendByChannel,
  impressionsByChannel,
  websiteVisitsByMonth,
  visitsBySourceByMonth,
  highValueActions,
  emailByMonth,
  emailFunnel,
  socialByMonth,
  searchByMonth,
  paidMediaByMonth,
  marketingKpis,
} = buildMarketingData(nationalMarketingRaw);

export const regionalSummary = regions.map(({ region, ...row }) => withRates(region, row));
export const regionalTotal = withRates("Total", sumRegionCounts(regions));
