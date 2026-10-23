import { describe, expect, it } from "vitest";
import { kpis as nationalKpis } from "@/lib/dashboard-data";
import { executiveMetrics } from "@/lib/executive-data";
import { fieldKpis as nationalFieldKpis } from "@/lib/field-data";
import { marketAccessKpis as nationalMarketAccessKpis } from "@/lib/market-access-data";
import { marketingKpis as nationalMarketingKpis } from "@/lib/marketing-data";
import { regionalRaw } from "@/lib/regional-data";
import { buildDashboardData } from "@/lib/scoped-data";
import { allocate, regionNames, splitFlow, timePeriods, type TimePeriod } from "@/lib/scope";

const sumOf = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("Splitting rules", () => {
  it("allocates whole numbers that add up and respect the weights", () => {
    expect(allocate(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(sumOf(allocate(23, [12, 8, 7, 11]))).toBe(23);
    expect(allocate(4, [1, 0, 3, 0])).toEqual([1, 0, 3, 0]);
  });

  it("splits a monthly flow so each month adds up and regional totals hit their weights", () => {
    // 300 calls split 1 : 2 : 3 lands exactly on 50 / 100 / 150.
    const split = splitFlow([61, 73, 79, 87], [1, 2, 3]);
    [61, 73, 79, 87].forEach((value, m) => {
      expect(sumOf(split.map((region) => region[m] ?? 0))).toBe(value);
    });
    expect(split.map((region) => sumOf(region))).toEqual([50, 100, 150]);
  });
});

const views = (period: TimePeriod) => ({
  nation: buildDashboardData({ geography: "Nation", period }),
  regions: regionNames.map((geography) => buildDashboardData({ geography, period })),
});

describe("Regional views add up to the nation", () => {
  for (const period of timePeriods) {
    it(`for ${period}`, () => {
      const { nation, regions } = views(period);
      const total = (pick: (data: (typeof regions)[number]) => number) => sumOf(regions.map(pick));

      const exact: [string, (data: typeof nation) => number][] = [
        ["vials shipped", (d) => d.launch.kpis.vials.total],
        ["paid vials", (d) => d.launch.kpis.vials.paid],
        ["vial budget", (d) => d.launch.kpis.vials.budget],
        ["vial LE", (d) => d.launch.kpis.vials.le],
        ["active patients", (d) => d.launch.kpis.activePatients.total],
        ["paid patients", (d) => d.launch.kpis.activePatients.paid],
        ["loading patients", (d) => d.launch.kpis.activePatients.loading],
        ["new patients in period", (d) => d.launch.kpis.newPatients.inPeriod],
        ["pending", (d) => d.launch.kpis.pending.total],
        ["pending over 30 days", (d) => d.launch.kpis.pending.over30],
        ["ordering prescribers", (d) => d.launch.kpis.prescribers.ordering],
        ["prescribers since launch", (d) => d.launch.kpis.prescribers.sinceLaunch],
        ["referred", (d) => d.launch.funnel.referred],
        ["first doses", (d) => d.launch.funnel.firstDose],
        ["maintenance", (d) => d.launch.funnel.maintenance],
        ["doses administered", (d) => d.marketAccess.marketAccessKpis.administered.total],
        ["channel inventory", (d) => d.marketAccess.marketAccessKpis.inventory.total],
        ["discontinued", (d) => d.marketAccess.stops.discontinued],
        ["cancelled", (d) => d.marketAccess.stops.cancelled],
        ["calls", (d) => d.field.fieldKpis.calls],
        ["HCPs targeted", (d) => d.field.fieldKpis.targeted],
        ["HCPs reached", (d) => d.field.fieldKpis.reached],
        ["impressions", (d) => d.marketing.marketingKpis.impressions.total],
        ["website visits", (d) => d.marketing.marketingKpis.website.total],
        ["high value actions", (d) => d.marketing.marketingKpis.hva.total],
        ["emails delivered", (d) => d.marketing.marketingKpis.email.delivered],
        ["email opens", (d) => d.marketing.marketingKpis.email.opened],
      ];
      for (const [name, pick] of exact) expect(total(pick), name).toBe(pick(nation));

      // Net sales are rounded per region, so the regions can differ from the nation by cents.
      expect(total((d) => d.launch.kpis.netSales.ltd)).toBeCloseTo(
        nation.launch.kpis.netSales.ltd,
        0,
      );

      // The regional comparison tables add up to the national figures for the period.
      expect(nation.regional.field.total.calls).toBe(nation.field.fieldKpis.calls);
      expect(nation.regional.marketing.total.visits).toBe(
        nation.marketing.marketingKpis.website.total,
      );
    });
  }
});

describe("Every region stays internally consistent", () => {
  for (const region of regionNames) {
    it(region, () => {
      const raw = regionalRaw[region];
      const f = raw.launch.funnel;
      expect(f.referred).toBeGreaterThanOrEqual(f.benefitsVerified);
      expect(f.benefitsVerified).toBeGreaterThanOrEqual(f.paApproved);
      expect(f.paApproved).toBeGreaterThanOrEqual(f.firstDose);
      expect(f.firstDose).toBeGreaterThanOrEqual(f.secondDose);
      expect(f.secondDose).toBeGreaterThanOrEqual(f.maintenance);

      const data = buildDashboardData({ geography: region, period: "Launch to Date" });
      for (const value of Object.values(data.launch.cancelledByStep)) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
      for (const row of data.marketAccess.channelBalance)
        expect(row.onHand).toBeGreaterThanOrEqual(0);
      for (const row of data.marketAccess.vialsAdministered) {
        expect(row.paid).toBeGreaterThanOrEqual(0);
        expect(row.free).toBeGreaterThanOrEqual(0);
      }
      for (const row of data.marketAccess.administeredByPhase) {
        expect(row.nonEap).toBeGreaterThanOrEqual(0);
      }
      for (const row of data.launch.activePatientsTrend) {
        expect(row.maintenance).toBeGreaterThanOrEqual(0);
      }
      for (const row of data.field.fieldByMonth)
        expect(row.reached).toBeLessThanOrEqual(row.targeted);
      expect(data.launch.kpis.activePatients.total).toBe(
        data.launch.kpis.activePatients.paid + data.launch.kpis.activePatients.free,
      );
      expect(sumOf(raw.referrals.referralsByMonth)).toBe(f.referred);
      expect(data.marketAccess.marketAccessKpis.inventory.total).toBe(
        data.marketAccess.channelBalance.at(-1)?.onHand,
      );
    });
  }
});

describe("National launch-to-date view", () => {
  it("matches the figures the assistant answers from", () => {
    const nation = buildDashboardData({ geography: "Nation", period: "Launch to Date" });
    expect(nation.launch.kpis).toEqual(nationalKpis);
    expect(nation.field.fieldKpis).toEqual(nationalFieldKpis);
    expect(nation.marketAccess.marketAccessKpis).toEqual(nationalMarketAccessKpis);
    expect(nation.marketing.marketingKpis).toEqual(nationalMarketingKpis);
    expect(nation.executive.executiveMetrics).toEqual(executiveMetrics);
  });
});

describe("Time periods", () => {
  it("narrows period totals from launch to date, to Q3, to September", () => {
    const ltd = buildDashboardData({ geography: "Nation", period: "Launch to Date" });
    const qtd = buildDashboardData({ geography: "Nation", period: "QTD" });
    const month = buildDashboardData({ geography: "Nation", period: "Monthly" });
    expect(ltd.launch.kpis.vials.total).toBe(219);
    expect(qtd.launch.kpis.vials.total).toBe(95);
    expect(month.launch.kpis.vials.total).toBe(35);
    expect(qtd.launch.kpis.netSales.ltd).toBe(ltd.launch.attainment.netSales.qtd.actual);
    expect(month.field.fieldKpis.calls).toBe(128);
    expect(month.launch.monthlyVials.map((row) => row.month)).toEqual(["Sep"]);
    expect(qtd.launch.monthlyVials.map((row) => row.month)).toEqual(["Jul", "Aug", "Sep"]);
    // Point-in-time measures don't change with the period.
    expect(month.launch.kpis.activePatients.total).toBe(ltd.launch.kpis.activePatients.total);
  });
});
