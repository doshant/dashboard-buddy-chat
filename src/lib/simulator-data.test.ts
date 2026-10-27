import { describe, expect, it } from "vitest";
import { buildAssistantContext } from "@/lib/assistant-context";
import { profiles } from "@/lib/dashboard-data";
import { buildDashboardData } from "@/lib/scoped-data";
import { regionNames, type Geography } from "@/lib/scope";
import {
  leverRanges,
  simulate,
  simulatorBaseline,
  parseWhatIf,
  simulatorPresets,
  whatIfFor,
  whatIfQuestions,
  withPaDays,
} from "@/lib/simulator-data";

const baselineFor = (geography: Geography) =>
  simulatorBaseline(buildDashboardData({ geography, period: "Launch to Date" }));
const nation = baselineFor("Nation");

describe("What-If Simulator", () => {
  it("starts from the Market Access KPIs", () => {
    expect(nation.levers).toEqual({
      referralToPaidPct: 54,
      paDays: 15,
      firstDoseDays: 29,
      oopPerDose: 295,
    });
  });

  it("matches the current trajectory when no lever moves", () => {
    const result = simulate(nation, nation.levers);
    expect(result.deltaNetSalesM).toBe(0);
    expect(result.incrementalPatients).toBe(0);
    expect(result.copayRoi).toBeNull();
    for (const row of result.chart) expect(row.simulated).toBe(row.current);
  });

  it("applies the out-of-pocket rule: 10% lower cost, 12% more new paid patients", () => {
    const result = simulate(nation, { ...nation.levers, oopPerDose: 295 * 0.9 });
    expect(result.paidStartsPerMonth / result.baselinePaidStartsPerMonth).toBeCloseTo(1.12, 1);
    expect(result.deltaNetSalesM).toBeGreaterThan(0);
    expect(result.copaySupportCost).toBeGreaterThan(0);
    expect(result.copayRoi).toBeGreaterThan(1);
  });

  it("moves time to first dose with PA approval, keeping scheduling time", () => {
    const faster = withPaDays(nation.levers, 10, 49);
    expect(faster.firstDoseDays).toBe(24);
    const slower = withPaDays({ ...nation.levers, firstDoseDays: 20 }, 18, 49);
    expect(slower.firstDoseDays).toBe(23);
  });

  it("lowers sales when a lever gets worse", () => {
    const result = simulate(nation, { ...nation.levers, paDays: 25, firstDoseDays: 39 });
    expect(result.deltaNetSalesM).toBeLessThan(0);
    expect(result.incrementalPatients).toBeLessThan(0);
  });

  it("credits copay support only with the sales its own lever adds", () => {
    const copayOnly = simulate(nation, { ...nation.levers, oopPerDose: 250 });
    const withPa = simulate(nation, { ...withPaDays(nation.levers, 10, 49), oopPerDose: 250 });
    expect(withPa.deltaNetSalesM).toBeGreaterThan(copayOnly.deltaNetSalesM);
    // More paid doses also cost more copay support, so the return can only fall.
    expect(withPa.copayRoi!).toBeLessThanOrEqual(copayOnly.copayRoi!);
  });

  it("keeps every geography's baseline and presets inside the slider ranges", () => {
    for (const geography of ["Nation", ...regionNames] as Geography[]) {
      const baseline = baselineFor(geography);
      const ranges = leverRanges(baseline);
      for (const { levers } of [{ levers: baseline.levers }, ...simulatorPresets(baseline)]) {
        for (const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
          expect(levers[key], `${geography} ${key}`).toBeGreaterThanOrEqual(ranges[key].min);
          expect(levers[key], `${geography} ${key}`).toBeLessThanOrEqual(ranges[key].max);
        }
      }
      for (const preset of simulatorPresets(baseline)) {
        expect(
          simulate(baseline, preset.levers).deltaNetSalesM,
          preset.label,
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("gives the live assistant the scenarios only for profiles with the tab", () => {
    const scope = { geography: "Nation", period: "Launch to Date" } as const;
    for (const profile of profiles) {
      const context = buildAssistantContext(scope, profile.panels);
      expect("whatIfSimulator" in context, profile.name).toBe(
        profile.panels.includes("What-If Simulator"),
      );
    }
  });

  it("reads what-if questions into slider values, from today's values", () => {
    const levers = (question: string) => parseWhatIf(question, nation)?.levers;
    expect(levers("What if out-of-pocket cost is 20% lower?")).toMatchObject({ oopPerDose: 235 });
    expect(levers("What if we reduce OOP by $50?")).toMatchObject({ oopPerDose: 245 });
    expect(levers("What if copay drops to $200?")).toMatchObject({ oopPerDose: 200 });
    expect(levers("What if PA approval is 5 days faster?")).toMatchObject({
      paDays: 10,
      firstDoseDays: 24,
    });
    expect(levers("What if PA takes 20 days?")).toMatchObject({ paDays: 20, firstDoseDays: 34 });
    expect(levers("What if time to first dose was 22 days?")).toMatchObject({
      paDays: 15,
      firstDoseDays: 22,
    });
    expect(levers("What if Referral → Paid rises to 65%?")).toMatchObject({
      referralToPaidPct: 65,
    });
    expect(levers("What if we improve referral to paid by 5 points?")).toMatchObject({
      referralToPaidPct: 59,
    });
    expect(levers("What if we cut out-of-pocket by 10% and PA is 3 days faster?")).toEqual({
      referralToPaidPct: 54,
      paDays: 12,
      firstDoseDays: 26,
      oopPerDose: 265,
    });
  });

  it("leaves ordinary questions to the assistant", () => {
    expect(parseWhatIf("What is our PA approval rate?", nation)).toBeNull();
    expect(parseWhatIf("How long does it take to get to first dose?", nation)).toBeNull();
    expect(parseWhatIf("What if we did better?", nation)).toBeNull();
  });

  it("caps values at the slider range and says so", () => {
    const parsed = parseWhatIf("What if PA took 2 days?", nation)!;
    expect(parsed.levers.paDays).toBe(5);
    expect(parsed.capped).toEqual(["paDays"]);
    expect(whatIfFor("What if PA took 2 days?", "Nation")!.answer.response).toContain(
      "capped at the slider range",
    );
  });

  it("answers with the simulator's own figures", () => {
    for (const question of whatIfQuestions) {
      const whatIf = whatIfFor(question, "Nation")!;
      const result = simulate(nation, whatIf.levers);
      expect(whatIf.answer.response, question).toContain(
        `$${Math.abs(result.deltaNetSalesM).toFixed(1)}M`,
      );
      expect(whatIf.answer.response).toContain(`| $${result.simulatedNetSalesM.toFixed(1)}M |`);
      expect(whatIf.answer.suggestions).not.toContain(question);
    }
    const southeast = whatIfFor("What if out-of-pocket cost is 20% lower?", "Southeast")!;
    expect(southeast.answer.response).toContain("(Southeast)");
  });
});
