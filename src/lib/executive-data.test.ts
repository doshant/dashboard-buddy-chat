import { describe, expect, it } from "vitest";
import {
  funnel,
  kpis,
  panelLabels,
  resolveDashboardAnswer,
  starterQuestionsFor,
  sum,
} from "@/lib/dashboard-data";
import {
  executiveInsights,
  executiveKpis,
  executiveMetrics,
  fillAndAbandonByMonth,
  kpiGroups,
  referralsByMonth,
} from "@/lib/executive-data";
import { fieldKpis } from "@/lib/field-data";
import { stops } from "@/lib/market-access-data";

const metric = (key: string) => {
  const found = executiveMetrics.find((item) => item.key === key);
  if (!found) throw new Error(`Missing metric ${key}`);
  return found;
};

describe("Performance Snapshot", () => {
  it("is the first tab", () => {
    expect(panelLabels[0]).toBe("Performance Snapshot");
  });

  it("always shows fill and abandonment rates in the top row", () => {
    expect(executiveMetrics.map((item) => item.key)).toEqual(
      expect.arrayContaining(["fill", "abandonment"]),
    );
    expect(executiveMetrics.length).toBeLessThanOrEqual(6);
  });

  it("derives fill and abandonment from the referral funnel", () => {
    expect(sum(referralsByMonth)).toBe(funnel.referred);
    expect(executiveKpis.fillPct).toBe(
      Math.round((funnel.firstDose / funnel.referred) * 1000) / 10,
    );
    expect(executiveKpis.abandonPct).toBe(2.5);
    expect(executiveKpis.cancelled).toBe(stops.cancelled);
    expect(fillAndAbandonByMonth.at(-1)?.fillPct).toBe(executiveKpis.fillPct);
    expect(fillAndAbandonByMonth.at(-1)?.abandonPct).toBe(executiveKpis.abandonPct);
    expect(metric("fill").value).toBe("86%");
    expect(metric("abandonment").value).toBe("2.5%");
  });

  it("re-uses the figures shown on the other tabs", () => {
    expect(metric("sales").value).toBe(`${kpis.netSales.attainmentPct}%`);
    expect(metric("demand").value).toBe(`${kpis.vials.lePct}%`);
    expect(metric("hcp").value).toBe(`${fieldKpis.reachPct}%`);
    expect(metric("patients").value).toBe(`${kpis.activePatients.total}`);
    for (const item of executiveMetrics) {
      expect(item.trend).toHaveLength(9);
      expect(item.detail.submetrics.length).toBeGreaterThan(0);
    }
  });

  it("flags sales for watching and names it in the insights", () => {
    expect(metric("sales").status).toBe("Watch");
    expect(metric("fill").status).toBe("On track");
    expect(metric("abandonment").status).toBe("On track");
    expect(executiveInsights.headline).toContain("Sales Performance needs watching");
  });

  it("answers the Performance Snapshot starter questions", () => {
    const questions = starterQuestionsFor("Performance Snapshot");
    expect(questions).toHaveLength(5);
    for (const question of questions) {
      expect(resolveDashboardAnswer(question).title).not.toBe("Clara");
    }
    expect(resolveDashboardAnswer("What is our fill rate?").response).toContain("86% of referrals");
    expect(resolveDashboardAnswer("What is our abandonment rate?").response).toContain(
      "2.5% of referrals",
    );
  });
});

describe("Performance Snapshot KPIs", () => {
  it("covers six distinct areas, each with a trend and three supporting metrics", () => {
    expect(kpiGroups.map((group) => group.title)).toEqual([
      "Sales & Demand",
      "Patient Journey",
      "Adherence & Persistence",
      "Payer & Affordability",
      "Prescriber Adoption",
      "Marketing Reach",
    ]);
    for (const group of kpiGroups) {
      expect(group.trend.length).toBeGreaterThan(1);
      expect(group.submetrics).toHaveLength(3);
    }
  });

  it("quotes the same figures as the tabs they come from", () => {
    const kpi = (key: string) => kpiGroups.find((group) => group.key === key)!;
    expect(kpi("sales").value).toBe(`$${kpis.netSales.ltd}M`);
    expect(kpi("journey").value).toBe("29d");
    expect(kpi("adherence").value).toBe(
      `${Math.round((funnel.maintenance / funnel.firstDose) * 100)}%`,
    );
    expect(kpi("payer").value).toBe("143");
    expect(kpi("prescribers").value).toBe(`${kpis.prescribers.new}`);
    expect(kpi("marketing").value).toBe("4.7%");
  });
});
