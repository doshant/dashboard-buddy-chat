import { describe, expect, it } from "vitest";
import {
  breakEvenPoints,
  marginalRoi,
  marketingBaselineFor,
  marketingLeverRanges,
  marketingResponseCurve,
  searchWinBack,
  simulateMarketing,
  type MarketingLevers,
} from "@/lib/marketing-simulator-data";

const baseline = marketingBaselineFor("Nation");
const ranges = marketingLeverRanges(baseline);
const breakEven = breakEvenPoints(baseline);
const run = (change: Partial<MarketingLevers>) =>
  simulateMarketing(baseline, { ...baseline.levers, ...change });
const steps = (key: "socialImpressionsK" | "searchClicks") => {
  const from = baseline.levers[key];
  return Array.from({ length: 21 }, (_, i) =>
    Math.round(from + ((ranges[key].max - from) * i) / 20),
  );
};

describe("Marketing ROI curve: net sales level off, ROI falls", () => {
  it("keeps paid search at full value up to its best month", () => {
    // Winning back the July peak is the demo story's fix: about $346k at 6.2x.
    const winBack = searchWinBack(baseline);
    expect(winBack.addedNetSalesSixMonths).toBe(345840);
    expect(winBack.roi).toBe(6.2);
  });

  it("never lowers projected net sales as spend rises, even with every lever at its maximum", () => {
    for (const key of ["socialImpressionsK", "searchClicks"] as const) {
      const sales = steps(key).map((value) => run({ [key]: value }).deltaNetSales);
      sales.forEach((value) => expect(value, key).toBeGreaterThanOrEqual(0));
      sales.slice(1).forEach((value, i) => expect(value, key).toBeGreaterThanOrEqual(sales[i]!));
    }
    const allMax = run({
      socialImpressionsK: ranges.socialImpressionsK.max,
      searchClicks: ranges.searchClicks.max,
      emailClickRatePct: ranges.emailClickRatePct.max,
    });
    expect(allMax.deltaNetSales).toBeGreaterThan(0);
  });

  it("raises ROI to a peak and then lowers it as spend rises", () => {
    for (const key of ["socialImpressionsK", "searchClicks"] as const) {
      const roi = steps(key)
        .slice(1)
        .map((value) => run({ [key]: value }).roi!);
      const peak = roi.indexOf(Math.max(...roi));
      expect(peak, key).toBeGreaterThan(0);
      expect(peak, key).toBeLessThan(roi.length - 1);
      roi.slice(1, peak + 1).forEach((value, i) => expect(value, key).toBeGreaterThanOrEqual(roi[i]!));
      roi.slice(peak + 1).forEach((value, i) => expect(value, key).toBeLessThanOrEqual(roi[peak + i]!));
    }
  });

  it("peaks paid search ROI at winning back its best month", () => {
    const peakRoi = searchWinBack(baseline).roi!;
    for (const clicks of steps("searchClicks").slice(1)) {
      expect(run({ searchClicks: clicks }).roi!).toBeLessThanOrEqual(peakRoi);
    }
  });

  it("passes break-even (the next dollar returns under $1) within each slider", () => {
    for (const key of ["socialImpressionsK", "searchClicks"] as const) {
      expect(breakEven[key], key).toBeLessThan(ranges[key].max);
      const channel = key === "socialImpressionsK" ? "social" : "search";
      const before = marginalRoi(baseline, { ...baseline.levers, [key]: breakEven[key] * 0.95 });
      const after = marginalRoi(baseline, { ...baseline.levers, [key]: breakEven[key] * 1.05 });
      expect(before[channel], key).toBeGreaterThan(1);
      expect(after[channel], key).toBeLessThan(1);
    }
  });

  it("charts net ROI on the next dollar turning negative for both channels", () => {
    const curve = marketingResponseCurve(baseline);
    expect(curve[0]).toMatchObject({ spendK: 0, breakEven: 0, search: 266 });
    expect(curve.some((row) => row.social !== null && row.social < 0)).toBe(true);
    expect(curve.some((row) => row.search !== null && row.search < 0)).toBe(true);
    // Extra spend still adds some net sales, so it never loses the whole dollar.
    expect(curve.every((row) => (row.social ?? 0) > -100 && (row.search ?? 0) > -100)).toBe(true);
  });
});
