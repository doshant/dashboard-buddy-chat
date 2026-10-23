import { describe, expect, it } from "vitest";
import { resolveDashboardAnswer, starterQuestionsFor, sum } from "@/lib/dashboard-data";
import {
  emailByAudience,
  emailFunnel,
  engagementByMonth,
  formatCount,
  highValueActions,
  impressionsByChannel,
  impressionsByMonth,
  marketingKpis,
  regionalSummary,
  regionalTotal,
  websiteVisitsByMonth,
} from "@/lib/marketing-data";

describe("Marketing control totals", () => {
  it("adds impressions by channel and by month to the same total", () => {
    const total = marketingKpis.impressions.total / 1000;
    expect(sum(impressionsByChannel.map((row) => row.value))).toBe(total);
    expect(sum(impressionsByMonth.map((row) => row.total))).toBe(total);
  });

  it("adds every regional measure up to the national totals", () => {
    expect(regionalTotal.impressions).toBe(marketingKpis.impressions.total);
    expect(regionalTotal.clicks).toBe(marketingKpis.engagement.clicks);
    expect(regionalTotal.videoViews).toBe(marketingKpis.engagement.videoViews);
    expect(regionalTotal.visits).toBe(marketingKpis.website.total);
    expect(regionalTotal.hvas).toBe(marketingKpis.hva.total);
    expect(regionalTotal.delivered).toBe(marketingKpis.email.delivered);
    expect(regionalTotal.opens).toBe(marketingKpis.email.opened);
    expect(regionalTotal.emailClicks).toBe(marketingKpis.email.clicked);
    expect(regionalSummary).toHaveLength(4);
  });

  it("derives the regional total rates to match the KPI cards", () => {
    expect(regionalTotal.engagementRate).toBe(marketingKpis.engagement.rate);
    expect(regionalTotal.hvaRate).toBe(marketingKpis.hva.rate);
    expect(regionalTotal.openRate).toBe(marketingKpis.email.openRate);
    expect(regionalTotal.clickRate).toBe(marketingKpis.email.clickRate);
  });

  it("splits website visits into HCP and patient sessions", () => {
    for (const row of websiteVisitsByMonth) expect(row.total).toBe(row.hcp + row.patient);
    expect(marketingKpis.website.hcp + marketingKpis.website.patient).toBe(
      marketingKpis.website.total,
    );
    expect(sum(highValueActions.map((row) => row.value))).toBeLessThan(marketingKpis.website.total);
  });

  it("keeps the email funnel narrowing at every step, for each audience", () => {
    for (const row of emailByAudience) {
      expect(row.delivered).toBe(row.sent - row.bounced);
      expect(row.opened).toBeLessThanOrEqual(row.delivered);
      expect(row.clicked).toBeLessThanOrEqual(row.opened);
      expect(row.converted).toBeLessThanOrEqual(row.clicked);
    }
    emailFunnel.forEach((row, i) => {
      expect(row.total).toBe(row.hcp + row.patient);
      const previous = emailFunnel[i - 1];
      if (previous) expect(row.total).toBeLessThanOrEqual(previous.total);
    });
    expect(marketingKpis.email.converted).toBeLessThanOrEqual(marketingKpis.hva.total);
  });

  it("computes engagement from clicks plus video views over impressions", () => {
    expect(marketingKpis.engagement.rate).toBe(7.2);
    expect(engagementByMonth[0]?.rate).toBe(6.4);
    expect(engagementByMonth.at(-1)?.rate).toBe(7.9);
  });

  it("answers the Marketing starter questions with the figures on the cards", () => {
    const [channels, engagement, website, email, region] = starterQuestionsFor("Marketing").map(
      (question) => resolveDashboardAnswer(question).response,
    );
    const { impressions, website: visits, email: emails } = marketingKpis;
    expect(channels).toContain(`${formatCount(impressions.total)} impressions`);
    expect(channels).toContain(`from ${formatCount(impressions.firstMonth)} in M1`);
    expect(engagement).toContain(`${marketingKpis.engagement.rate}%`);
    expect(website).toContain(`${formatCount(visits.total)} visits`);
    expect(website).toContain(`+${visits.growthSinceLaunchPct}%`);
    expect(email).toContain(`${formatCount(emails.delivered)} emails`);
    expect(email).toContain(`${emails.openRate}% open rate`);
    expect(email).toContain(`${emails.clickRate}% click rate`);
    const northeast = regionalSummary[0];
    expect(region).toContain(`${northeast?.engagementRate}% engagement`);
    expect(region).toContain(`${northeast?.openRate}% email open rate`);
  });
});
