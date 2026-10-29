import { describe, expect, it } from "vitest";
import { attributionRules, buildAttribution } from "@/lib/attribution-data";
import { sum } from "@/lib/launch-data";
import { regionNames, type Geography } from "@/lib/scope";
import { buildDashboardData } from "@/lib/scoped-data";

const nation = buildAttribution(
  buildDashboardData({ geography: "Nation", period: "Launch to Date" }),
);
const tactic = (key: string) => nation.tactics.find((row) => row.key === key)!;

describe("Channel and tactic attribution", () => {
  it("splits every month's net sales across the tactics, in every geography", () => {
    for (const geography of ["Nation", ...regionNames] as Geography[]) {
      const attribution = buildAttribution(
        buildDashboardData({ geography, period: "Launch to Date" }),
      );
      for (const row of attribution.months) {
        const tactics = row.search + row.social + row.email + row.field + row.access + row.base;
        expect(tactics, `${geography} ${row.month}`).toBeCloseTo(row.netSales, 2);
        expect(row.field, `${geography} ${row.month}`).toBeGreaterThan(0);
      }
      expect(sum(attribution.tactics.map((row) => row.revenue))).toBeCloseTo(
        attribution.netSales,
        0,
      );
    }
  });

  it("matches launch-to-date net sales", () => {
    expect(nation.netSales).toBe(24_480_000);
  });

  it("values digital tactics by the visits they bring, at a realistic share of net sales", () => {
    expect(nation.digitalSharePct).toBeGreaterThan(3);
    expect(nation.digitalSharePct).toBeLessThan(10);
    const sep = nation.months[nation.months.length - 1]!;
    expect(sep.search).toBe(3_400 * attributionRules.revenuePerVisit.search);
  });

  it("derives each digital tactic's ROI from attributed net sales and spend", () => {
    for (const key of ["search", "social", "email"]) {
      const row = tactic(key);
      expect(row.spend, key).toBeGreaterThan(0);
      expect(row.roi, key).toBe(Math.round((row.revenue / row.spend!) * 10) / 10);
      expect(row.roi!, key).toBeGreaterThan(1);
      expect(row.roi!, key).toBeLessThan(15);
    }
    expect(tactic("field").roi).toBeNull();
    // The competitor squeeze: search returns less per dollar now than over the launch.
    expect(tactic("search").latestRoi!).toBeLessThan(tactic("search").roi!);
  });
});
