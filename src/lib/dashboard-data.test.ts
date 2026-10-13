import { describe, expect, it } from "vitest";
import {
  callAttainment,
  claimStatus,
  monthlyShare,
  resolveDashboardAnswer,
  salesAttainment,
} from "@/lib/dashboard-data";

describe("dashboard reference data", () => {
  it("keeps the visible prescription and writer figures in its preset answers", () => {
    expect(resolveDashboardAnswer("What is driving the decline in prescriptions?").response).toContain("2,529");
    expect(resolveDashboardAnswer("Which product has the highest growth in writers?").response).toContain("30%");
  });

  it("keeps the screenshot's product sales and sales-versus-forecast values", () => {
    expect(salesAttainment).toEqual([
      { product: "Rengene", forecast: 3.9, sales: 1.5 },
      { product: "Staquala", forecast: 3.4, sales: 3.4 },
    ]);
    expect(resolveDashboardAnswer("Compare unit sales across products.").response).toContain("9,961");
  });

  it("keeps the visible patient market share endpoints", () => {
    expect(monthlyShare[0]).toMatchObject({ rengene: 18, staquala: 14 });
    expect(monthlyShare.at(-1)).toMatchObject({ rengene: 10, staquala: 37 });
  });

  it("keeps the call attainment and claim status figures", () => {
    expect(callAttainment).toEqual([
      { product: "Rengene", attainment: 93 },
      { product: "Staquala", attainment: 108 },
    ]);
    expect(claimStatus[0]).toMatchObject({ approved: 60.43, rejected: 32.45, abandoned: 7.12 });
  });

  it("offers a friendly fallback for messages outside the preset topics", () => {
    expect(resolveDashboardAnswer("Tell me a joke").response).toBe(
      "I'm still learning! Please try one of the suggested questions.",
    );
  });
});