// Charts Clara draws in the chat for Marketing answers. An answer gives the figures first; asking to
// chart it ("Show this as a chart", "graph that") draws the chart for the same topic. Charts use
// the dashboard's national, launch-to-date figures, so they always match the page.

import { answerTopicFor } from "@/lib/dashboard-data";
import {
  emailFunnel,
  regionalSummary,
  searchByMonth,
  socialByMonth,
  spendByMonth,
  visitsBySourceByMonth,
} from "@/lib/marketing-data";

export type ChartFormat = "count" | "dollars" | "cents" | "percent";

export type ChatChartSeries = {
  key: string;
  label: string;
  color: "series-1" | "series-2" | "series-3" | "series-4" | "target";
  type?: "bar" | "line";
  // Bars with the same stack id stack on each other.
  stack?: string;
  axis?: "left" | "right";
};

export type ChatChartSpec = {
  title: string;
  subtitle: string;
  xKey: string;
  data: Record<string, string | number>[];
  series: ChatChartSeries[];
  format: ChartFormat;
  rightFormat?: ChartFormat;
};

// The follow-up offered under answers that can be charted.
export const chartFollowUp = "Show this as a chart";

// "Chart this", "graph that", "can you plot it", "visualize the spend"...
export const isChartRequest = (question: string) =>
  /\b(chart|graph|plot|visuali[sz]e)\b/i.test(question);

const spendChart: ChatChartSpec = {
  title: "Marketing spend by month",
  subtitle: "HCP email, social media and paid search, Jan–Sep 2026",
  xKey: "month",
  data: spendByMonth.map(({ month, email, social, search }) => ({ month, email, social, search })),
  series: [
    { key: "email", label: "HCP email", color: "series-1", stack: "spend" },
    { key: "social", label: "Social media", color: "series-2", stack: "spend" },
    { key: "search", label: "Paid search", color: "series-3", stack: "spend" },
  ],
  format: "dollars",
};

const visitsChart: ChatChartSpec = {
  title: "Website visits by source",
  subtitle: "Each social, search and email click is a visit",
  xKey: "month",
  data: visitsBySourceByMonth.map(({ month, search, social, email, other }) => ({
    month,
    search,
    social,
    email,
    other,
  })),
  series: [
    { key: "search", label: "Paid search", color: "series-3", stack: "visits" },
    { key: "social", label: "Social media", color: "series-2", stack: "visits" },
    { key: "email", label: "HCP email", color: "series-1", stack: "visits" },
    { key: "other", label: "Other sources", color: "target", stack: "visits" },
  ],
  format: "count",
};

const searchChart: ChatChartSpec = {
  title: "Paid search clicks vs cost per click",
  subtitle: "Clicks fall as cost per click rises from August",
  xKey: "month",
  data: searchByMonth.map(({ month, clicks, cpc }) => ({ month, clicks, cpc })),
  series: [
    { key: "clicks", label: "Clicks", color: "series-3" },
    { key: "cpc", label: "Cost per click", color: "series-4", type: "line", axis: "right" },
  ],
  format: "count",
  rightFormat: "cents",
};

const impressionsChart: ChatChartSpec = {
  title: "Impressions by channel",
  subtitle: "Social media and paid search impressions a month",
  xKey: "month",
  data: socialByMonth.map((row, i) => ({
    month: row.month,
    social: row.impressionsK * 1000,
    search: (searchByMonth[i]?.impressionsK ?? 0) * 1000,
  })),
  series: [
    { key: "social", label: "Social media", color: "series-2", stack: "impressions" },
    { key: "search", label: "Paid search", color: "series-3", stack: "impressions" },
  ],
  format: "count",
};

const emailChart: ChatChartSpec = {
  title: "HCP email funnel",
  subtitle: "Launch to date",
  xKey: "stage",
  data: emailFunnel.map(({ stage, total }) => ({ stage: stage.replace(" (HVA)", ""), total })),
  series: [{ key: "total", label: "HCP emails", color: "series-1" }],
  format: "count",
};

const regionChart: ChatChartSpec = {
  title: "HCP engagement by region",
  subtitle: "HCP email open rate and website HVA rate",
  xKey: "region",
  data: regionalSummary.map(({ region, openRate, hvaRate }) => ({ region, openRate, hvaRate })),
  series: [
    { key: "openRate", label: "HCP open rate", color: "series-1" },
    { key: "hvaRate", label: "HVA rate", color: "series-2" },
  ],
  format: "percent",
};

const socialChart: ChatChartSpec = {
  title: "Social engagement rate",
  subtitle: "Engagements ÷ social impressions, by month",
  xKey: "month",
  data: socialByMonth.map(({ month, engagementRate }) => ({ month, engagementRate })),
  series: [{ key: "engagementRate", label: "Engagement rate", color: "series-2", type: "line" }],
  format: "percent",
};

const chartsByTopic: Record<string, ChatChartSpec> = {
  marketingSpend: spendChart,
  websiteTraffic: visitsChart,
  visitsDrop: visitsChart,
  paidSearch: searchChart,
  searchDrop: searchChart,
  mediaImpressions: impressionsChart,
  emailPerformance: emailChart,
  regionalMarketing: regionChart,
  socialMedia: socialChart,
};

// The chart for a question's topic, or null if its answer has nothing to chart.
export function chatChartFor(question: string): ChatChartSpec | null {
  return chartsByTopic[answerTopicFor(question)] ?? null;
}
