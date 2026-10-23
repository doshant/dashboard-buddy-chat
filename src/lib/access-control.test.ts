import { describe, expect, it } from "vitest";
import {
  panelLabels,
  profiles,
  resolveDashboardAnswer,
  starterQuestionsFor,
} from "@/lib/dashboard-data";

const byName = (name: string) => {
  const profile = profiles.find((item) => item.name === name);
  if (!profile) throw new Error(`Missing profile ${name}`);
  return profile;
};

const overviewQuestion = "How are we tracking against forecast?";
const marketAccessQuestion = "What is our PA approval rate?";
const marketingQuestion = "How are our emails performing?";
const fieldQuestion = "How many calls has the field team made?";

describe("Demo profile access", () => {
  it("gives Jenny every tab, and Bob and Jeff the Executive Summary plus their own tab", () => {
    expect(byName("Jenny").panels).toEqual(panelLabels);
    expect(byName("Bob").panels).toEqual(["Executive Summary", "Market Access"]);
    expect(byName("Jeff").panels).toEqual(["Executive Summary", "Marketing"]);
  });

  it("gives every profile the Executive Summary, and answers its questions for everyone", () => {
    for (const profile of profiles) {
      expect(profile.panels).toContain("Executive Summary");
      for (const question of starterQuestionsFor("Executive Summary")) {
        expect(resolveDashboardAnswer(question, profile.panels).response).not.toContain(
          "isn't part of your access",
        );
      }
    }
  });

  it("lets Jenny's assistant answer from any tab", () => {
    const { panels } = byName("Jenny");
    for (const question of [overviewQuestion, marketAccessQuestion, marketingQuestion]) {
      expect(resolveDashboardAnswer(question, panels).response).not.toContain(
        "isn't part of your access",
      );
    }
  });

  it("stops the assistant from revealing data outside a profile's tabs", () => {
    const bob = byName("Bob").panels;
    expect(resolveDashboardAnswer(marketAccessQuestion, bob).response).toContain("95%");
    expect(resolveDashboardAnswer(fieldQuestion, bob).response).toBe(
      "That question draws on Field Activity data, which isn't part of your access. You can ask about Executive Summary, Market Access.",
    );
    expect(resolveDashboardAnswer(marketingQuestion, bob).response).not.toContain("67.4k");

    const jeff = byName("Jeff").panels;
    expect(resolveDashboardAnswer(marketingQuestion, jeff).response).toContain("67.4k");
    expect(resolveDashboardAnswer(marketAccessQuestion, jeff).response).toContain(
      "isn't part of your access",
    );
  });

  it("only suggests follow-up questions the profile is allowed to ask", () => {
    for (const profile of profiles) {
      const asked = profile.panels.flatMap((panel) => starterQuestionsFor(panel));
      for (const question of [...asked, overviewQuestion, "Tell me a joke"]) {
        const { suggestions } = resolveDashboardAnswer(question, profile.panels);
        expect(suggestions.length).toBeGreaterThan(0);
        for (const suggestion of suggestions) {
          expect(resolveDashboardAnswer(suggestion, profile.panels).response).not.toContain(
            "isn't part of your access",
          );
        }
      }
    }
  });
});
