import { sum } from "@/lib/launch-data";
import { allocate } from "@/lib/scope";

// Marketing figures are stored as raw monthly counts (impressions in thousands) and every
// total and rate is derived, so the cards, charts and regional table always agree.
// Launch month M1 is January 2026. `start` limits totals and rates to the selected period.

const share = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

export const formatRate = (value: number) => `${value.toFixed(1)}%`;

// Rounds half up on the integer count (toFixed would turn 1.45M into "1.4M").
export function formatCount(value: number) {
  if (value >= 1_000_000) return `${(Math.round(value / 100_000) / 10).toFixed(1)}M`;
  if (value >= 1_000) return `${(Math.round(value / 100) / 10).toFixed(1)}k`;
  return value.toLocaleString("en-US");
}

export const channels = [
  { key: "display", label: "Display ads" },
  { key: "video", label: "Pre-roll video" },
  { key: "social", label: "Social media" },
  { key: "search", label: "Paid search" },
  { key: "other", label: "Other" },
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
  // Paid media impressions (k) by month and channel.
  impressions: {
    month: string;
    calendar: string;
    display: number;
    video: number;
    social: number;
    search: number;
    other: number;
  }[];
  // Ad clicks and video views, the numerator of the engagement rate.
  engagement: { clicks: number; videoViews: number }[];
  // Sessions on the HCP and patient brand websites.
  website: { hcp: number; patient: number }[];
  highValueActions: { download: number; repRequest: number; signUp: number }[];
  // HCP and patient email campaigns; delivered is sent less bounces.
  email: { hcp: EmailCounts; patient: EmailCounts }[];
};

const nationalWebsite = [
  { hcp: 4_100, patient: 7_400 },
  { hcp: 4_600, patient: 8_300 },
  { hcp: 5_000, patient: 9_100 },
  { hcp: 5_300, patient: 9_600 },
  { hcp: 5_600, patient: 10_200 },
  { hcp: 6_000, patient: 10_900 },
  { hcp: 6_300, patient: 11_400 },
  { hcp: 6_700, patient: 12_100 },
  { hcp: 7_200, patient: 12_900 },
];

// Launch-to-date totals for high value actions and email, spread across months in proportion to
// that month's website visits (HCP visits for HCP email, patient visits for patient email).
const hvaTotals = { download: 6_200, repRequest: 410, signUp: 160 };
const emailTotals: { hcp: EmailCounts; patient: EmailCounts } = {
  hcp: { sent: 48_600, bounced: 1_900, opened: 12_140, clicked: 1_630, converted: 240 },
  patient: { sent: 21_400, bounced: 700, opened: 7_450, clicked: 1_290, converted: 310 },
};
const byVisits = (total: number, key: "hcp" | "patient" | "total") =>
  allocate(
    total,
    nationalWebsite.map((row) => (key === "total" ? row.hcp + row.patient : row[key])),
  );
const monthlyEmail = (audience: "hcp" | "patient") => {
  const split = emailMeasures.map((measure) => byVisits(emailTotals[audience][measure], audience));
  return nationalWebsite.map(
    (_, i) =>
      Object.fromEntries(
        emailMeasures.map((measure, m) => [measure, split[m]?.[i] ?? 0]),
      ) as EmailCounts,
  );
};
const hvaSplit = {
  download: byVisits(hvaTotals.download, "total"),
  repRequest: byVisits(hvaTotals.repRequest, "total"),
  signUp: byVisits(hvaTotals.signUp, "total"),
};
const hcpEmail = monthlyEmail("hcp");
const patientEmail = monthlyEmail("patient");

export const nationalMarketingRaw: MarketingRaw = {
  impressions: [
    { month: "M1", calendar: "Jan", display: 560, video: 320, social: 360, search: 150, other: 60 },
    { month: "M2", calendar: "Feb", display: 610, video: 360, social: 400, search: 170, other: 80 },
    { month: "M3", calendar: "Mar", display: 660, video: 400, social: 450, search: 190, other: 80 },
    { month: "M4", calendar: "Apr", display: 670, video: 420, social: 470, search: 200, other: 80 },
    { month: "M5", calendar: "May", display: 690, video: 440, social: 490, search: 210, other: 80 },
    { month: "M6", calendar: "Jun", display: 730, video: 480, social: 530, search: 220, other: 90 },
    { month: "M7", calendar: "Jul", display: 750, video: 500, social: 550, search: 230, other: 90 },
    {
      month: "M8",
      calendar: "Aug",
      display: 790,
      video: 540,
      social: 590,
      search: 240,
      other: 100,
    },
    {
      month: "M9",
      calendar: "Sep",
      display: 820,
      video: 580,
      social: 630,
      search: 250,
      other: 100,
    },
  ],
  engagement: [
    { clicks: 6_200, videoViews: 86_000 },
    { clicks: 7_000, videoViews: 99_000 },
    { clicks: 7_800, videoViews: 112_000 },
    { clicks: 8_100, videoViews: 119_000 },
    { clicks: 8_600, videoViews: 127_000 },
    { clicks: 9_300, videoViews: 140_000 },
    { clicks: 9_700, videoViews: 148_000 },
    { clicks: 10_400, videoViews: 162_000 },
    { clicks: 11_100, videoViews: 176_000 },
  ],
  website: nationalWebsite,
  highValueActions: nationalWebsite.map((_, i) => ({
    download: hvaSplit.download[i] ?? 0,
    repRequest: hvaSplit.repRequest[i] ?? 0,
    signUp: hvaSplit.signUp[i] ?? 0,
  })),
  email: nationalWebsite.map((_, i) => ({ hcp: hcpEmail[i]!, patient: patientEmail[i]! })),
};

// Regional marketing totals since launch; regional views split the national months to match.
export const regions = [
  {
    region: "Northeast",
    impressionsK: 5_120,
    clicks: 23_900,
    videoViews: 352_000,
    visits: 43_100,
    hvas: 2_090,
    delivered: 20_300,
    opens: 6_050,
    emailClicks: 910,
  },
  {
    region: "Southeast",
    impressionsK: 4_380,
    clicks: 19_200,
    videoViews: 287_000,
    visits: 34_800,
    hvas: 1_640,
    delivered: 16_600,
    opens: 4_700,
    emailClicks: 690,
  },
  {
    region: "Midwest",
    impressionsK: 3_460,
    clicks: 14_800,
    videoViews: 226_000,
    visits: 27_600,
    hvas: 1_270,
    delivered: 13_100,
    opens: 3_690,
    emailClicks: 560,
  },
  {
    region: "West",
    impressionsK: 4_450,
    clicks: 20_300,
    videoViews: 304_000,
    visits: 37_200,
    hvas: 1_770,
    delivered: 17_400,
    opens: 5_150,
    emailClicks: 760,
  },
];

export type RegionCounts = Omit<(typeof regions)[number], "region">;

export function withRates(region: string, row: RegionCounts) {
  return {
    region,
    ...row,
    impressions: row.impressionsK * 1000,
    engagementRate: share(row.clicks + row.videoViews, row.impressionsK * 1000),
    hvaRate: share(row.hvas, row.visits),
    openRate: share(row.opens, row.delivered),
    clickRate: share(row.emailClicks, row.delivered),
  };
}

export function buildMarketingData(raw: MarketingRaw, start = 0) {
  const inPeriod = <T>(rows: T[]) => rows.slice(start);

  const allImpressions = raw.impressions.map((row) => ({
    ...row,
    total: row.display + row.video + row.social + row.search + row.other,
  }));
  const impressionsByMonth = inPeriod(allImpressions);
  const totalImpressionsK = sum(impressionsByMonth.map((row) => row.total));

  const impressionsByChannel = channels.map((channel) => ({
    label: channel.label,
    value: sum(impressionsByMonth.map((row) => row[channel.key])),
  }));

  const engagementByMonth = inPeriod(
    allImpressions.map((row, i) => {
      const counts = raw.engagement[i] ?? { clicks: 0, videoViews: 0 };
      return {
        month: row.month,
        calendar: row.calendar,
        ...counts,
        rate: share(counts.clicks + counts.videoViews, row.total * 1000),
      };
    }),
  );

  const allVisits = raw.website.map((row, i) => ({
    month: allImpressions[i]?.month ?? `M${i + 1}`,
    ...row,
    total: row.hcp + row.patient,
  }));
  const websiteVisitsByMonth = inPeriod(allVisits);

  const hvaMonths = inPeriod(raw.highValueActions);
  const highValueActions = hvaTypes.map(({ key, label }) => ({
    label,
    value: sum(hvaMonths.map((row) => row[key])),
  }));

  const emailMonths = inPeriod(raw.email);
  const emailTotal = (audience: "hcp" | "patient") =>
    Object.fromEntries(
      emailMeasures.map((measure) => [
        measure,
        sum(emailMonths.map((row) => row[audience][measure])),
      ]),
    ) as EmailCounts;
  const emailByAudience = [
    { audience: "HCP", ...emailTotal("hcp") },
    { audience: "Patient", ...emailTotal("patient") },
  ].map((row) => ({ ...row, delivered: row.sent - row.bounced }));

  const [hcpEmailRow, patientEmailRow] = emailByAudience;
  const emailStage = (stage: string, key: "delivered" | "opened" | "clicked" | "converted") => {
    const hcp = hcpEmailRow?.[key] ?? 0;
    const patient = patientEmailRow?.[key] ?? 0;
    return { stage, hcp, patient, total: hcp + patient };
  };
  const emailFunnel = [
    emailStage("Delivered", "delivered"),
    emailStage("Opened", "opened"),
    emailStage("Clicked", "clicked"),
    emailStage("Converted (HVA)", "converted"),
  ];

  const totalClicks = sum(engagementByMonth.map((row) => row.clicks));
  const totalVideoViews = sum(engagementByMonth.map((row) => row.videoViews));
  const totalVisits = sum(websiteVisitsByMonth.map((row) => row.total));
  const totalHvas = sum(highValueActions.map((row) => row.value));
  const delivered = sum(emailByAudience.map((row) => row.delivered));
  const opened = sum(emailByAudience.map((row) => row.opened));
  const clicked = sum(emailByAudience.map((row) => row.clicked));
  const firstVisits = allVisits[0]?.total ?? 0;
  const lastVisits = allVisits[allVisits.length - 1]?.total ?? 0;
  const priorVisits = allVisits[allVisits.length - 2]?.total ?? 0;
  const firstInPeriod = engagementByMonth[0];
  const latest = allImpressions[allImpressions.length - 1];

  const marketingKpis = {
    impressions: {
      total: totalImpressionsK * 1000,
      latestMonth: (latest?.total ?? 0) * 1000,
      firstMonth: (impressionsByMonth[0]?.total ?? 0) * 1000,
      firstMonthLabel: impressionsByMonth[0]?.month ?? "M1",
      latestMonthLabel: latest?.month ?? "M9",
    },
    engagement: {
      clicks: totalClicks,
      videoViews: totalVideoViews,
      rate: share(totalClicks + totalVideoViews, totalImpressionsK * 1000),
      firstMonthRate: firstInPeriod?.rate ?? 0,
      latestMonthRate: engagementByMonth[engagementByMonth.length - 1]?.rate ?? 0,
    },
    website: {
      total: totalVisits,
      hcp: sum(websiteVisitsByMonth.map((row) => row.hcp)),
      patient: sum(websiteVisitsByMonth.map((row) => row.patient)),
      growthSinceLaunchPct: firstVisits ? Math.round((lastVisits / firstVisits - 1) * 100) : 0,
      growthVsPriorPct: priorVisits ? Math.round((lastVisits / priorVisits - 1) * 100) : 0,
    },
    hva: { total: totalHvas, rate: share(totalHvas, totalVisits) },
    email: {
      sent: sum(emailByAudience.map((row) => row.sent)),
      bounced: sum(emailByAudience.map((row) => row.bounced)),
      delivered,
      opened,
      clicked,
      converted: sum(emailByAudience.map((row) => row.converted)),
      openRate: share(opened, delivered),
      clickRate: share(clicked, delivered),
      clickToOpenRate: share(clicked, opened),
    },
  };

  // This geography and period's totals in the shape of a regional table row.
  const summaryRow = (region: string) =>
    withRates(region, {
      impressionsK: totalImpressionsK,
      clicks: totalClicks,
      videoViews: totalVideoViews,
      visits: totalVisits,
      hvas: totalHvas,
      delivered,
      opens: opened,
      emailClicks: clicked,
    });

  return {
    impressionsByMonth,
    impressionsByChannel,
    engagementByMonth,
    websiteVisitsByMonth,
    highValueActions,
    emailByAudience,
    emailFunnel,
    marketingKpis,
    summaryRow,
    trend: { websiteVisitsByMonth: allVisits, impressionsByMonth: allImpressions },
  };
}

export type MarketingData = ReturnType<typeof buildMarketingData>;

export const {
  impressionsByMonth,
  impressionsByChannel,
  engagementByMonth,
  websiteVisitsByMonth,
  highValueActions,
  emailByAudience,
  emailFunnel,
  marketingKpis,
} = buildMarketingData(nationalMarketingRaw);

const regionTotal = (key: keyof RegionCounts) => sum(regions.map((row) => row[key]));

export const regionalSummary = regions.map(({ region, ...row }) => withRates(region, row));
export const regionalTotal = withRates("Total", {
  impressionsK: regionTotal("impressionsK"),
  clicks: regionTotal("clicks"),
  videoViews: regionTotal("videoViews"),
  visits: regionTotal("visits"),
  hvas: regionTotal("hvas"),
  delivered: regionTotal("delivered"),
  opens: regionTotal("opens"),
  emailClicks: regionTotal("emailClicks"),
});
