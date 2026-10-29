import { describe, expect, it } from "vitest";
import { buildAssistantContext } from "@/lib/assistant-context";
import { marketingWhatIfQuestions, profiles } from "@/lib/dashboard-data";
import { marketingKpis, searchByMonth, spendByMonth, spendRates } from "@/lib/marketing-data";
import {
  marketingBaselineFor,
  marketingLeverRanges,
  marketingPresets,
  marketingWhatIfFor,
  parseMarketingWhatIf,
  searchWinBack,
  simulateMarketing,
} from "@/lib/marketing-simulator-data";
import { regionNames, type Geography } from "@/lib/scope";
import { attributionRules } from "@/lib/attribution-data";
import { searchStory } from "@/lib/outlook-data";

const nation = marketingBaselineFor("Nation");
const latestSearch = searchByMonth[searchByMonth.length - 1]!;

describe("What-If Simulator, Marketing levers", () => {
  it("starts from the latest month on the Marketing tab", () => {
    expect(nation.month).toBe("Sep");
    expect(nation.levers).toEqual({
      socialImpressionsK: 770,
      searchClicks: 3_400,
      emailClickRatePct: 3.5,
    });
    const today = simulateMarketing(nation, nation.levers);
    expect(today.spendToday).toBe(spendByMonth[spendByMonth.length - 1]!.total);
    expect(today.deltaSpend).toBe(0);
    expect(today.deltaSpendSixMonths).toBe(0);
  });

  it("prices each input the way the channel is bought", () => {
    const social = simulateMarketing(nation, { ...nation.levers, socialImpressionsK: 870 });
    expect(social.deltaSpend).toBe(100 * spendRates.socialCpm);

    const search = simulateMarketing(nation, { ...nation.levers, searchClicks: 4_400 });
    expect(search.deltaSpend).toBeCloseTo(1_000 * latestSearch.cpc, 2);
    expect(search.visits - search.visitsToday).toBe(1_000);

    expect(search.deltaSpendSixMonths).toBeCloseTo(search.deltaSpend * 6, 2);
  });

  it("changes email results, not spend, when the click rate moves", () => {
    const result = simulateMarketing(nation, { ...nation.levers, emailClickRatePct: 4.5 });
    expect(result.deltaSpend).toBe(0);
    expect(result.visits).toBeGreaterThan(result.visitsToday);
    expect(result.costPerVisit).toBeLessThan(result.costPerVisitToday);
  });

  it("keeps every geography's baseline and presets inside the slider ranges", () => {
    for (const geography of ["Nation", ...regionNames] as Geography[]) {
      const baseline = marketingBaselineFor(geography);
      const ranges = marketingLeverRanges(baseline);
      for (const { levers } of [{ levers: baseline.levers }, ...marketingPresets(baseline)]) {
        for (const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
          expect(levers[key], `${geography} ${key}`).toBeGreaterThanOrEqual(ranges[key].min);
          expect(levers[key], `${geography} ${key}`).toBeLessThanOrEqual(ranges[key].max);
        }
      }
    }
  });

  it("sizes winning back paid search from the latest cost per click", () => {
    const winBack = searchWinBack(nation);
    expect(winBack.clicksScenario).toBe(6_020);
    expect(winBack.extraSpendPerMonth).toBeCloseTo((6_020 - 3_400) * latestSearch.cpc, 2);
    expect(winBack.monthlySpendToday).toBe(marketingKpis.spend.latestMonth);
  });

  it("gives the live assistant each profile's own scenarios", () => {
    const scope = { geography: "Nation", period: "Launch to Date" } as const;
    const whatIf = (name: string) =>
      buildAssistantContext(scope, profiles.find((item) => item.name === name)!.panels)
        .whatIfSimulator;
    expect(Object.keys(whatIf("Jenny") ?? {})).toEqual(["marketing", "marketAccess"]);
    expect(Object.keys(whatIf("Bob") ?? {})).toEqual(["marketAccess"]);
    expect(Object.keys(whatIf("Jeff") ?? {})).toEqual(["marketing"]);
  });

  it("reads marketing what-if questions into slider values, from today's values", () => {
    const levers = (question: string) => parseMarketingWhatIf(question, nation)?.levers;
    expect(levers("What if paid search clicks go back to 6,020?")).toMatchObject({
      searchClicks: 6_020,
    });
    expect(levers("What if social impressions rise 20%?")).toMatchObject({
      socialImpressionsK: 924,
    });
    expect(levers("What if social impressions go to 1M?")).toMatchObject({
      socialImpressionsK: 1_000,
    });
    expect(levers("What if the HCP email click rate rises to 4.5%?")).toMatchObject({
      emailClickRatePct: 4.5,
    });
    expect(levers("What if the email click rate improves by 1%?")).toMatchObject({
      emailClickRatePct: 4.5,
    });
    expect(levers("What if social impressions fall 10% and search clicks rise to 5,000?")).toEqual({
      socialImpressionsK: 693,
      searchClicks: 5_000,
      emailClickRatePct: 3.5,
    });
    expect(parseMarketingWhatIf("How are our emails performing?", nation)).toBeNull();
    expect(parseMarketingWhatIf("What if PA is 5 days faster?", nation)).toBeNull();
  });

  it("values added visits with the channel attribution grid", () => {
    const { revenuePerVisit } = attributionRules;
    const search = simulateMarketing(nation, { ...nation.levers, searchClicks: 6_020 });
    expect(search.deltaRevenuePerMonth).toBe(2_620 * revenuePerVisit.search);
    expect(search.deltaNetSales).toBe(2_620 * revenuePerVisit.search * 6);
    expect(search.roi).toBe(
      Math.round((search.deltaNetSales / search.deltaSpendSixMonths) * 10) / 10,
    );
    // Buying back clicks at today's cost per click returns the latest month's search ROI.
    expect(search.roi).toBe(searchStory.latestRoi);

    // HCP email is paid per send: a better click rate adds net sales with no ROI denominator.
    const email = simulateMarketing(nation, { ...nation.levers, emailClickRatePct: 4.5 });
    expect(email.deltaNetSales).toBeGreaterThan(0);
    expect(email.roi).toBeNull();

    const fewer = simulateMarketing(nation, { ...nation.levers, socialImpressionsK: 400 });
    expect(fewer.deltaNetSales).toBeLessThan(0);
    expect(fewer.roi).toBeNull();

    const today = simulateMarketing(nation, nation.levers);
    expect(today.deltaNetSales).toBe(0);
    expect(today.roi).toBeNull();
    for (const row of today.chart) expect(row.simulated).toBe(row.current);
  });

  it("answers marketing what-ifs with the simulator's own impact and ROI", () => {
    for (const question of marketingWhatIfQuestions) {
      const whatIf = marketingWhatIfFor(question, "Nation")!;
      expect(whatIf, question).not.toBeNull();
      const result = simulateMarketing(nation, whatIf.levers);
      expect(whatIf.answer.response, question).toContain(
        `$${result.simulatedNetSalesM.toFixed(1)}M |`,
      );
      if (result.roi !== null) {
        expect(whatIf.answer.response, question).toContain(`ROI about ${result.roi}x`);
      }
      expect(whatIf.answer.suggestions).not.toContain(question);
    }
  });
});
