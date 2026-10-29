import { describe, expect, it } from "vitest";
import { canAsk, profiles, resolveDashboardAnswer } from "@/lib/dashboard-data";
import { insightsFor } from "@/lib/insights-data";
import { searchStory } from "@/lib/outlook-data";

const persona = (name: string) => profiles.find((profile) => profile.name === name)!;

describe("Insights & Recommendations", () => {
  it("gives every persona insights on each tab they can open", () => {
    for (const profile of profiles) {
      for (const panel of profile.panels) {
        // The What-If Simulator follows its levers; Overview is a hidden tab.
        if (panel === "What-If Simulator" || panel === "Overview") continue;
        expect(insightsFor(profile.id, panel).length, `${profile.name} ${panel}`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it("only suggests questions Clara can answer for that persona", () => {
    for (const profile of profiles) {
      for (const panel of profile.panels) {
        for (const insight of insightsFor(profile.id, panel)) {
          for (const question of insight.questions) {
            const label = `${profile.name} ${panel}: ${question}`;
            expect(canAsk(question, profile.panels), label).toBe(true);
            expect(resolveDashboardAnswer(question, profile.panels).title, label).not.toBe("Clara");
          }
        }
      }
    }
  });

  it("tailors the same tab to the persona's role", () => {
    const jeff = insightsFor("jeff", "Performance Snapshot").map((row) => row.signal);
    const bob = insightsFor("bob", "Performance Snapshot").map((row) => row.signal);
    expect(jeff.some((signal) => signal.includes("Website visits"))).toBe(true);
    expect(bob.some((signal) => signal.includes("PA approval"))).toBe(true);
    expect(jeff.some((signal) => bob.includes(signal))).toBe(false);
    expect(persona("Jeff").role).toBe("Marketing Manager");
  });

  it("quotes the data's own figures", () => {
    const [search] = insightsFor("jeff", "Marketing");
    expect(search!.signal).toContain(`${Math.abs(searchStory.clicksChangePct)}%`);
    expect(search!.evidence).toContain(`${searchStory.cpcChangePct}%`);
  });

  it("leaves the What-If Simulator to its levers", () => {
    for (const profile of profiles)
      expect(insightsFor(profile.id, "What-If Simulator")).toEqual([]);
  });
});
