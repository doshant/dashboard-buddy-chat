import { describe, expect, it } from "vitest";
import { shapeRate, shapeTrend } from "@/lib/trend";

const months = [1, 2, 3, 4, 5, 6, 7, 8, 9];

describe("Small trend charts", () => {
  it("reads by month, quarter over quarter, or not at all", () => {
    expect(shapeTrend(months, "sum", "monthly")).toEqual(months);
    expect(shapeTrend(months, "sum", "quarterly")).toEqual([6, 15, 24]);
    expect(shapeTrend(months, "last", "quarterly")).toEqual([3, 6, 9]);
    expect(shapeTrend(months, "sum", "none")).toEqual([]);
  });

  it("builds quarterly rates from the quarter's own totals", () => {
    const calls = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const days = [10, 10, 20, 10, 10, 10, 10, 10, 10];
    expect(shapeRate(calls, days, "monthly")).toEqual([1, 2, 1.5, 4, 5, 6, 7, 8, 9]);
    // Q1: 60 calls over 40 days, not the average of 1, 2 and 1.5.
    expect(shapeRate(calls, days, "quarterly")).toEqual([1.5, 5, 8]);
    expect(shapeRate([1, 1], [2, 2], "quarterly", 100)).toEqual([50]);
  });
});
