import { describe, expect, it } from "vitest";
import {
  canAsk,
  marketingWhatIfQuestions,
  profiles,
  resolveDashboardAnswer,
  starterQuestionsFor,
} from "@/lib/dashboard-data";

const jenny = profiles.find((profile) => profile.name === "Jenny")!;
const tabs = ["Marketing", "Market Access"] as const;

describe("Suggested questions stay on their tab", () => {
  it("follows each Marketing and Market Access answer only with questions from the same tab", () => {
    for (const tab of tabs) {
      for (const question of starterQuestionsFor(tab, jenny.panels)) {
        const { suggestions } = resolveDashboardAnswer(question, jenny.panels);
        for (const suggestion of suggestions) {
          expect(canAsk(suggestion, [tab]), `${tab}: ${question} → ${suggestion}`).toBe(true);
        }
        // One level deeper, so following a suggestion doesn't drift either.
        for (const suggestion of suggestions) {
          for (const next of resolveDashboardAnswer(suggestion, jenny.panels).suggestions) {
            expect(canAsk(next, [tab]), `${tab}: ${suggestion} → ${next}`).toBe(true);
          }
        }
      }
    }
  });

  it("shows the What-If questions for the levers on screen", () => {
    const marketing = starterQuestionsFor("What-If Simulator", jenny.panels, "Marketing");
    const access = starterQuestionsFor("What-If Simulator", jenny.panels, "Market Access");
    expect(marketing).toEqual(marketingWhatIfQuestions);
    expect(access.some((question) => marketingWhatIfQuestions.includes(question))).toBe(false);
    expect(access.length).toBeGreaterThan(0);
  });
});
