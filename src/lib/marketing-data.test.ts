import { describe, expect, it } from "vitest";
import { resolveDashboardAnswer, starterQuestionsFor, sum } from "@/lib/dashboard-data";
import {
  emailByMonth,
  emailFunnel,
  formatCount,
  formatDollars,
  formatRate,
  formatSpend,
  highValueActions,
  impressionsByChannel,
  marketingKpis,
  paidMediaByMonth,
  regionalSummary,
  regionalTotal,
  searchByMonth,
  socialByMonth,
  spendByChannel,
  spendByMonth,
  spendRates,
  visitsBySourceByMonth,
  websiteVisitsByMonth,
} from "@/lib/marketing-data";

const { spend, website, hva, email, social, search, paidMedia } = marketingKpis;

describe("Marketing control totals", () => {
  it("adds channel spend up to the total, by month and by channel", () => {
    expect(spend.email + spend.social + spend.search).toBe(spend.total);
    expect(sum(spendByChannel.map((row) => row.value))).toBe(spend.total);
    expect(sum(spendByMonth.map((row) => row.total))).toBe(spend.total);
    for (const row of spendByMonth) expect(row.total).toBe(row.email + row.social + row.search);
  });

  it("prices each channel the way it is bought", () => {
    expect(spend.email).toBe(email.sent * spendRates.emailPerSend);
    expect(spend.social).toBe(social.impressionsK * spendRates.socialCpm);
    expect(spend.search).toBeCloseTo(sum(searchByMonth.map((row) => row.clicks * row.cpc)), 2);
    expect(spend.total).toBe(308_585);
  });

  it("reconciles website visits with the channel clicks that bring them", () => {
    for (const row of visitsBySourceByMonth) {
      expect(row.social + row.search + row.email + row.other, row.month).toBe(row.total);
      expect(row.other, row.month).toBeGreaterThan(0);
    }
    const { sources } = website;
    expect(sources.social).toBe(social.clicks);
    expect(sources.search).toBe(search.clicks);
    expect(sources.email).toBe(email.clicked);
    expect(sources.social + sources.search + sources.email + sources.other).toBe(website.total);
    expect(sum(socialByMonth.map((row) => row.clicks))).toBe(social.clicks);
    expect(sum(searchByMonth.map((row) => row.clicks))).toBe(search.clicks);
  });

  it("adds social and search into paid media", () => {
    expect(paidMedia.impressions).toBe(social.impressions + search.impressions);
    expect(paidMedia.clicks).toBe(social.clicks + search.clicks);
    for (const [i, row] of paidMediaByMonth.entries()) {
      expect(row.impressionsK).toBe(
        (socialByMonth[i]?.impressionsK ?? 0) + (searchByMonth[i]?.impressionsK ?? 0),
      );
    }
  });

  it("adds every regional measure up to the national totals", () => {
    expect(regionalTotal.socialImpressionsK).toBe(social.impressionsK);
    expect(regionalTotal.socialEngagements).toBe(social.engagements);
    expect(regionalTotal.socialClicks).toBe(social.clicks);
    expect(regionalTotal.searchImpressionsK).toBe(search.impressionsK);
    expect(regionalTotal.searchClicks).toBe(search.clicks);
    expect(regionalTotal.visits).toBe(website.total);
    expect(regionalTotal.hvas).toBe(hva.total);
    expect(regionalTotal.sent).toBe(email.sent);
    expect(regionalTotal.delivered).toBe(email.delivered);
    expect(regionalTotal.opens).toBe(email.opened);
    expect(regionalTotal.emailClicks).toBe(email.clicked);
    expect(regionalTotal.spend).toBe(spend.total);
    expect(regionalSummary).toHaveLength(4);
  });

  it("derives the regional total rates to match the KPI cards", () => {
    expect(regionalTotal.socialEngagementRate).toBe(social.engagementRate);
    expect(regionalTotal.searchCtr).toBe(search.ctr);
    expect(regionalTotal.hvaRate).toBe(hva.rate);
    expect(regionalTotal.openRate).toBe(email.openRate);
    expect(regionalTotal.clickRate).toBe(email.clickRate);
  });

  it("splits website visits into HCP and patient sessions", () => {
    for (const row of websiteVisitsByMonth) expect(row.total).toBe(row.hcp + row.patient);
    expect(website.hcp + website.patient).toBe(website.total);
    expect(sum(highValueActions.map((row) => row.value))).toBe(hva.total);
    expect(hva.total).toBeLessThan(website.total);
  });

  it("keeps the HCP email funnel narrowing at every step", () => {
    for (const row of emailByMonth) {
      expect(row.delivered).toBe(row.sent - row.bounced);
      expect(row.opened).toBeLessThanOrEqual(row.delivered);
      expect(row.clicked).toBeLessThanOrEqual(row.opened);
      expect(row.converted).toBeLessThanOrEqual(row.clicked);
    }
    expect(emailFunnel.map((row) => row.total)).toEqual([
      email.delivered,
      email.opened,
      email.clicked,
      email.converted,
    ]);
    expect(email.converted).toBeLessThanOrEqual(hva.total);
    expect(email).toMatchObject({ delivered: 46_700, openRate: 26, clickRate: 3.5 });
  });

  it("answers the Marketing starter questions with the figures on the cards", () => {
    const [spending, impressions, traffic, emails] = starterQuestionsFor("Marketing").map(
      (question) => resolveDashboardAnswer(question).response,
    );
    const socialAnswer = resolveDashboardAnswer("How is social media performing?").response;
    const searchAnswer = resolveDashboardAnswer("How is paid search performing?").response;
    expect(impressions).toContain(`${formatCount(paidMedia.impressions)} impressions`);
    for (const row of impressionsByChannel) {
      const share = Math.round((row.value / (paidMedia.impressions / 1000)) * 100);
      expect(impressions).toContain(
        `| ${row.label} | ${formatCount(row.value * 1000)} | ${share}% |`,
      );
    }
    expect(impressions).toContain(`${formatDollars(paidMedia.cpm)} per 1,000`);
    expect(impressions).toContain(`**${formatCount(paidMedia.clicks)}**`);
    expect(spending).toContain(`spent ${formatSpend(spend.total)}`);
    expect(spending).toContain(`${formatSpend(spend.social)} on social media`);
    expect(spending).toContain(`${formatSpend(spend.search)} on paid search`);
    expect(spending).toContain(`${formatSpend(spend.email)} on HCP email`);
    expect(spending).toContain(`${formatSpend(spend.latestMonth)} in Sep`);
    expect(spending).toContain(`${formatDollars(spend.costPerPaidVisit)} per site visit`);
    expect(traffic).toContain(`${formatCount(website.total)} visits`);
    expect(traffic).toContain(`+${website.growthSinceLaunchPct}%`);
    expect(traffic).toContain(`| Other sources | ${formatCount(website.sources.other)} |`);
    expect(emails).toContain(`${formatCount(email.delivered)} HCP emails`);
    expect(emails).toContain(`${formatRate(email.openRate)} open rate`);
    expect(emails).toContain(`${formatRate(email.clickRate)} click rate`);
    expect(emails).toContain(formatDollars(email.costPerHva));
    expect(socialAnswer).toContain(`${formatCount(social.impressions)} impressions`);
    expect(socialAnswer).toContain(`| Engagement rate | ${formatRate(social.engagementRate)} |`);
    expect(socialAnswer).toContain(`| Spend | ${formatSpend(social.spend)} |`);
    expect(searchAnswer).toContain(`${formatCount(search.clicks)} clicks`);
    expect(searchAnswer).toContain(`| Click-through rate | ${formatRate(search.ctr)} |`);
    expect(searchAnswer).toContain(`| Spend | ${formatSpend(search.spend)} |`);
  });

  it("answers the regional question with the table's figures", () => {
    const region = resolveDashboardAnswer("Which region is performing best?").response;
    for (const row of regionalSummary) {
      expect(region).toContain(
        `| ${row.region} | ${formatCount(row.visits)} | ${formatRate(row.hvaRate)} | ${formatRate(row.openRate)} | ${formatRate(row.searchCtr)} | ${formatSpend(row.spend)} |`,
      );
    }
  });
});
