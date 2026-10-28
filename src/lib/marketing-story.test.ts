import { describe, expect, it } from "vitest";
import { profiles, questionKind, resolveDashboardAnswer } from "@/lib/dashboard-data";
import { formatSpend } from "@/lib/marketing-data";
import {
  marketingBaselineFor,
  marketingWhatIfFor,
  searchWinBack,
  simulateMarketing,
} from "@/lib/marketing-simulator-data";
import { attentionSignalsFor, searchStory } from "@/lib/outlook-data";

// The demo story on the Marketing tab: website visits drop, Clara traces it to paid search,
// sizes the cost and recommends how to win it back, ending in the What-If Simulator.
const story = [
  "Why did website visits drop in September?",
  "What happened to paid search?",
  "What is the paid search drop costing us?",
  "How do we win back paid search?",
];
const whatIf = "What if paid search clicks go back to 6,020?";
const answer = (question: string) => resolveDashboardAnswer(question).response;
const jenny = profiles.find((profile) => profile.name === "Jenny")!;
const count = (value: number) => value.toLocaleString("en-US");
const dollars = (value: number) => `$${value.toFixed(2)}`;

describe("Marketing demo story: the paid search drop", () => {
  it("opens with the visit drop flagged in the data", () => {
    const [first] = attentionSignalsFor("Marketing", jenny.panels);
    expect(first?.question).toBe(story[0]);
    expect(first?.reason).toContain(`${Math.abs(searchStory.visitsChangePct)}%`);
  });

  it("is in the data: search falls while every other source grows", () => {
    expect(searchStory.visitsChangePct).toBeLessThan(0);
    expect(searchStory.clicksChangePct).toBeLessThan(-30);
    expect(searchStory.cpcChangePct).toBeGreaterThan(50);
    expect(Math.abs(searchStory.latestSpend - searchStory.peakSpend)).toBeLessThan(500);
    for (const source of searchStory.sources) {
      if (source.key === "search") expect(source.change).toBeLessThan(0);
      else expect(source.change, source.key).toBeGreaterThan(0);
    }
  });

  it("leads each answer to the next step of the story", () => {
    story.forEach((question, i) => {
      const { suggestions } = resolveDashboardAnswer(question, jenny.panels);
      const next = story[i + 1] ?? whatIf;
      expect(suggestions[0], question).toBe(next);
      expect(questionKind(question)).not.toBe("Descriptive");
    });
    expect(marketingWhatIfFor(whatIf, "Nation")).not.toBeNull();
  });

  it("explains the drop with the visits by source", () => {
    const text = answer(story[0]!);
    expect(text).toContain(`Visits fell ${Math.abs(searchStory.visitsChangePct)}%`);
    for (const source of searchStory.sources) {
      const change = `${source.change > 0 ? "+" : "-"}${count(Math.abs(source.change))}`;
      expect(text).toContain(`| ${count(source.peak)} | ${count(source.latest)} | ${change} |`);
    }
  });

  it("finds the cause in paid search cost per click", () => {
    const text = answer(story[1]!);
    expect(text).toContain(`up ${searchStory.cpcChangePct}% since ${searchStory.peakMonth}`);
    expect(text).toContain(`${dollars(searchStory.peakCpc)} → ${dollars(searchStory.latestCpc)}`);
    expect(text).toContain(`(${searchStory.impressionsChangePct}%)`);
    expect(text).toContain(`(${searchStory.clicksChangePct}%)`);
    for (const row of searchStory.months) {
      expect(text).toContain(
        `| ${row.month} | ${row.impressionsK}k | ${count(row.clicks)} | ${dollars(row.cpc)} | ${formatSpend(row.spend)} |`,
      );
    }
  });

  it("sizes the cost, with the simulator's own spend", () => {
    const text = answer(story[2]!);
    expect(text).toContain(`${count(searchStory.lostVisits)} site visits`);
    expect(text).toContain(`${searchStory.lostHvas} high value actions`);
    expect(text).toContain(`${searchStory.lostRepRequests} rep requests`);
    expect(text).toContain(`about ${count(searchStory.clicksLostPerMonth)} visits a month`);

    const nation = marketingBaselineFor("Nation");
    const levers = marketingWhatIfFor(whatIf, "Nation")!.levers;
    const result = simulateMarketing(nation, levers);
    expect(text).toContain(`about ${formatSpend(result.deltaSpend)} more a month`);
    expect(text).toContain(
      `from ${formatSpend(result.spendToday)} to ${formatSpend(result.spend)}`,
    );
    expect(text).toContain(
      `${formatSpend(result.deltaSpendSixMonths)} more over the next six months`,
    );
    expect(result.deltaSpend).toBeCloseTo(searchStory.extraBudgetPerMonth, 0);

    // The live assistant gets the same spend as the what-if question.
    const winBack = searchWinBack(nation);
    expect(winBack.clicksScenario).toBe(levers.searchClicks);
    expect(winBack.extraSpendPerMonth).toBe(result.deltaSpend);
  });

  it("recommends a fix sized from the data", () => {
    const text = answer(story[3]!);
    expect(text).toContain(`about ${formatSpend(searchStory.extraBudgetPerMonth)} a month`);
    expect(text).toContain(`${count(searchStory.clicksLostPerMonth)} lost visits`);
    expect(text).toContain(`social (${dollars(searchStory.socialCostPerVisit)})`);
    expect(text).toContain(`would then buy ${count(searchStory.clicksAtPeakCpc)} clicks`);
    expect(text).toContain(`≈ ${searchStory.hcpClicksPerPoint} site visits`);
    expect(text).toContain(
      `Back to ${searchStory.peakMonth}'s ${count(searchStory.peakClicks)} clicks`,
    );
  });
});
