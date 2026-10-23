import { describe, expect, it } from "vitest";
import {
  kpis,
  profiles,
  resolveDashboardAnswer,
  starterQuestionsFor,
  sum,
} from "@/lib/dashboard-data";
import {
  callMix,
  engagementFunnel,
  fieldByMonth,
  fieldKpis,
  fieldRegionalSummary,
  fieldRegionalTotal,
} from "@/lib/field-data";
import { tablesFromMarkdown } from "@/lib/table-export";

describe("Field Activity control totals", () => {
  it("adds calls by month, by type and by region to the same total", () => {
    expect(sum(fieldByMonth.map((row) => row.total))).toBe(fieldKpis.calls);
    expect(sum(callMix.map((row) => row.calls))).toBe(fieldKpis.calls);
    expect(fieldRegionalTotal.calls).toBe(fieldKpis.calls);
    for (const row of fieldByMonth)
      expect(row.total).toBe(row.faceToFace + row.virtual + row.phone);
  });

  it("adds every regional count up to the KPI cards", () => {
    expect(fieldRegionalTotal.targeted).toBe(fieldKpis.targeted);
    expect(fieldRegionalTotal.reached).toBe(fieldKpis.reached);
    expect(fieldRegionalTotal.prescribers).toBe(fieldKpis.prescribersSinceLaunch);
    expect(Math.round(fieldRegionalTotal.reachPct)).toBe(fieldKpis.reachPct);
    expect(fieldRegionalSummary).toHaveLength(4);
  });

  it("matches the Overview tab's prescriber counts", () => {
    expect(fieldKpis.prescribersSinceLaunch).toBe(kpis.prescribers.sinceLaunch);
    expect(fieldKpis.activePrescribers).toBe(kpis.prescribers.ordering);
    expect(fieldByMonth.at(-1)?.ordering).toBe(kpis.prescribers.ordering);
  });

  it("keeps the engagement funnel narrowing at every stage", () => {
    engagementFunnel.forEach((row, i) => {
      const previous = engagementFunnel[i - 1];
      if (previous) expect(row.hcps).toBeLessThanOrEqual(previous.hcps);
    });
    for (const row of fieldByMonth) expect(row.reached).toBeLessThanOrEqual(row.targeted);
  });

  it("splits call types into whole percentages that add to 100", () => {
    expect(sum(callMix.map((row) => row.pct))).toBe(100);
    expect(callMix[0]?.pct).toBe(fieldKpis.faceToFacePct);
  });

  it("answers the Field Activity starter questions with the figures on the cards", () => {
    const questions = starterQuestionsFor("Field Activity");
    expect(questions).toHaveLength(5);
    const [reach, calls, mix, funnel, region] = questions.map(
      (question) => resolveDashboardAnswer(question).response,
    );
    expect(reach).toContain(`${fieldKpis.reached} of ${fieldKpis.targeted} targeted HCPs`);
    expect(reach).toContain(`(${fieldKpis.reachPct}%)`);
    expect(calls).toContain(`${fieldKpis.calls} calls`);
    expect(calls).toContain(`| ${fieldKpis.callsPerHcp} |`);
    expect(calls).toContain(`| ${fieldKpis.callsPerDay} |`);
    expect(mix).toContain(`${fieldKpis.faceToFacePct}% of calls are face-to-face`);
    for (const row of callMix)
      expect(mix).toContain(`| ${row.label} | ${row.calls} | ${row.pct}% |`);
    for (const row of engagementFunnel) expect(funnel).toContain(`| ${row.stage} | ${row.hcps} |`);
    for (const row of fieldRegionalSummary) {
      expect(region).toContain(
        `| ${row.region} | ${row.targeted} | ${row.reached} | ${Math.round(row.reachPct)}% | ${row.calls} | ${row.prescribers} |`,
      );
    }
    for (const response of [reach, calls, mix, funnel, region]) {
      expect(tablesFromMarkdown(response ?? "").length).toBeGreaterThan(0);
    }
  });

  it("keeps Field Activity answers inside profile access", () => {
    const jeff = profiles.find((profile) => profile.name === "Jeff")!;
    expect(
      resolveDashboardAnswer("How many calls has the field team made?", jeff.panels).response,
    ).toContain("isn't part of your access");
    expect(resolveDashboardAnswer("Which region is performing best?").title).toBe(
      "Marketing by region",
    );
  });
});
