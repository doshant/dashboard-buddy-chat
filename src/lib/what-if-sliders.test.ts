import { describe, expect, it } from "vitest";
import { marketingWhatIfQuestions, starterQuestionsFor } from "@/lib/dashboard-data";
import {
  marketingBaselineFor,
  marketingPresets,
  parseMarketingWhatIf,
} from "@/lib/marketing-simulator-data";
import { parseWhatIf, simulatorBaselineFor, simulatorPresets } from "@/lib/simulator-data";

// What Clara sets from a question is what the What-If sliders show: the change asked for lands
// exactly on the slider, not a rounded neighbour (e.g. +20% of 770k is 924k, shown as +20%).
const percentChange = (value: number, today: number) => Math.round(((value - today) / today) * 100);
const marketing = marketingBaselineFor("Nation");
const access = simulatorBaselineFor("Nation");

describe("What-If sliders follow Clara's questions exactly", () => {
  it("sets every suggested marketing what-if without capping or rounding it away", () => {
    for (const question of marketingWhatIfQuestions) {
      const parsed = parseMarketingWhatIf(question, marketing)!;
      expect(parsed, question).not.toBeNull();
      expect(parsed.capped, question).toEqual([]);
    }
  });

  it("sets every suggested Market Access what-if without capping or rounding it away", () => {
    for (const question of starterQuestionsFor("What-If Simulator", undefined, "Market Access")) {
      const parsed = parseWhatIf(question, access)!;
      expect(parsed, question).not.toBeNull();
      expect(parsed.capped, question).toEqual([]);
    }
  });

  it("shows the percentage asked for on the slider", () => {
    const social = (question: string) =>
      percentChange(
        parseMarketingWhatIf(question, marketing)!.levers.socialImpressionsK,
        marketing.levers.socialImpressionsK,
      );
    expect(social("What if social impressions rise 20%?")).toBe(20);
    expect(social("What if social impressions fall 10%?")).toBe(-10);
    expect(social("What if social impressions rise 35%?")).toBe(35);

    const clicks = parseMarketingWhatIf("What if search clicks rise 15%?", marketing)!.levers;
    expect(percentChange(clicks.searchClicks, marketing.levers.searchClicks)).toBe(15);

    const oop = (question: string) =>
      percentChange(parseWhatIf(question, access)!.levers.oopPerDose, access.levers.oopPerDose);
    expect(oop("What if out-of-pocket cost is 20% lower?")).toBe(-20);
    expect(oop("What if we cut out-of-pocket by 10% and PA is 3 days faster?")).toBe(-10);
  });

  it("matches each preset button's label", () => {
    const socialPreset = marketingPresets(marketing).find(
      (preset) => preset.label === "Social +20%",
    )!;
    expect(
      percentChange(socialPreset.levers.socialImpressionsK, marketing.levers.socialImpressionsK),
    ).toBe(20);
    const oopPreset = simulatorPresets(access).find((preset) => preset.label.includes("20%"))!;
    expect(percentChange(oopPreset.levers.oopPerDose, access.levers.oopPerDose)).toBe(-20);
  });
});
