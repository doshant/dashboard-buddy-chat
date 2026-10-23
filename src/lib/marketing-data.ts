import { sum } from "@/lib/dashboard-data";

// Marketing figures are stored as raw counts (impressions in thousands) and every
// total and rate is derived, so the cards, charts and regional table always agree.
// Launch month M1 is January 2026.

const share = (part: number, whole: number) => Math.round((part / whole) * 1000) / 10;

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

// Paid media impressions (k) by month and channel.
export const impressionsByMonth = [
  { month: "M1", calendar: "Jan", display: 560, video: 320, social: 360, search: 150, other: 60 },
  { month: "M2", calendar: "Feb", display: 610, video: 360, social: 400, search: 170, other: 80 },
  { month: "M3", calendar: "Mar", display: 660, video: 400, social: 450, search: 190, other: 80 },
  { month: "M4", calendar: "Apr", display: 670, video: 420, social: 470, search: 200, other: 80 },
  { month: "M5", calendar: "May", display: 690, video: 440, social: 490, search: 210, other: 80 },
  { month: "M6", calendar: "Jun", display: 730, video: 480, social: 530, search: 220, other: 90 },
  { month: "M7", calendar: "Jul", display: 750, video: 500, social: 550, search: 230, other: 90 },
  { month: "M8", calendar: "Aug", display: 790, video: 540, social: 590, search: 240, other: 100 },
  { month: "M9", calendar: "Sep", display: 820, video: 580, social: 630, search: 250, other: 100 },
].map((row) => ({ ...row, total: row.display + row.video + row.social + row.search + row.other }));

const totalImpressionsK = sum(impressionsByMonth.map((row) => row.total));

export const impressionsByChannel = channels.map((channel) => ({
  label: channel.label,
  value: sum(impressionsByMonth.map((row) => row[channel.key])),
}));

// Ad clicks and video views, the numerator of the engagement rate.
const engagementCounts = [
  { clicks: 6_200, videoViews: 86_000 },
  { clicks: 7_000, videoViews: 99_000 },
  { clicks: 7_800, videoViews: 112_000 },
  { clicks: 8_100, videoViews: 119_000 },
  { clicks: 8_600, videoViews: 127_000 },
  { clicks: 9_300, videoViews: 140_000 },
  { clicks: 9_700, videoViews: 148_000 },
  { clicks: 10_400, videoViews: 162_000 },
  { clicks: 11_100, videoViews: 176_000 },
];

export const engagementByMonth = impressionsByMonth.map((row, i) => {
  const counts = engagementCounts[i] ?? { clicks: 0, videoViews: 0 };
  return {
    month: row.month,
    calendar: row.calendar,
    ...counts,
    rate: share(counts.clicks + counts.videoViews, row.total * 1000),
  };
});

// Sessions on the HCP and patient brand websites.
export const websiteVisitsByMonth = [
  { hcp: 4_100, patient: 7_400 },
  { hcp: 4_600, patient: 8_300 },
  { hcp: 5_000, patient: 9_100 },
  { hcp: 5_300, patient: 9_600 },
  { hcp: 5_600, patient: 10_200 },
  { hcp: 6_000, patient: 10_900 },
  { hcp: 6_300, patient: 11_400 },
  { hcp: 6_700, patient: 12_100 },
  { hcp: 7_200, patient: 12_900 },
].map((row, i) => ({
  month: impressionsByMonth[i]?.month ?? `M${i + 1}`,
  ...row,
  total: row.hcp + row.patient,
}));

export const highValueActions = [
  { label: "Resource download", value: 6_200 },
  { label: "Rep request", value: 410 },
  { label: "Support sign-up", value: 160 },
];

// HCP and patient email campaigns; delivered is sent less bounces.
export const emailByAudience = [
  { audience: "HCP", sent: 48_600, bounced: 1_900, opened: 12_140, clicked: 1_630, converted: 240 },
  {
    audience: "Patient",
    sent: 21_400,
    bounced: 700,
    opened: 7_450,
    clicked: 1_290,
    converted: 310,
  },
].map((row) => ({ ...row, delivered: row.sent - row.bounced }));

const [hcpEmail, patientEmail] = emailByAudience;
const emailStage = (stage: string, key: "delivered" | "opened" | "clicked" | "converted") => {
  const hcp = hcpEmail?.[key] ?? 0;
  const patient = patientEmail?.[key] ?? 0;
  return { stage, hcp, patient, total: hcp + patient };
};

export const emailFunnel = [
  emailStage("Delivered", "delivered"),
  emailStage("Opened", "opened"),
  emailStage("Clicked", "clicked"),
  emailStage("Converted (HVA)", "converted"),
];

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

type RegionCounts = Omit<(typeof regions)[number], "region">;

function withRates(region: string, row: RegionCounts) {
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

const totalClicks = sum(engagementByMonth.map((row) => row.clicks));
const totalVideoViews = sum(engagementByMonth.map((row) => row.videoViews));
const totalVisits = sum(websiteVisitsByMonth.map((row) => row.total));
const totalHvas = sum(highValueActions.map((row) => row.value));
const delivered = sum(emailByAudience.map((row) => row.delivered));
const opened = sum(emailByAudience.map((row) => row.opened));
const clicked = sum(emailByAudience.map((row) => row.clicked));
const firstVisits = websiteVisitsByMonth[0]?.total ?? 0;
const lastVisits = websiteVisitsByMonth[websiteVisitsByMonth.length - 1]?.total ?? 0;
const priorVisits = websiteVisitsByMonth[websiteVisitsByMonth.length - 2]?.total ?? 0;

export const marketingKpis = {
  impressions: {
    total: totalImpressionsK * 1000,
    latestMonth: (impressionsByMonth[impressionsByMonth.length - 1]?.total ?? 0) * 1000,
    firstMonth: (impressionsByMonth[0]?.total ?? 0) * 1000,
  },
  engagement: {
    clicks: totalClicks,
    videoViews: totalVideoViews,
    rate: share(totalClicks + totalVideoViews, totalImpressionsK * 1000),
    firstMonthRate: engagementByMonth[0]?.rate ?? 0,
    latestMonthRate: engagementByMonth[engagementByMonth.length - 1]?.rate ?? 0,
  },
  website: {
    total: totalVisits,
    hcp: sum(websiteVisitsByMonth.map((row) => row.hcp)),
    patient: sum(websiteVisitsByMonth.map((row) => row.patient)),
    growthSinceLaunchPct: Math.round((lastVisits / firstVisits - 1) * 100),
    growthVsPriorPct: Math.round((lastVisits / priorVisits - 1) * 100),
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
