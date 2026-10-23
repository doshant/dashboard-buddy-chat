import { describe, expect, it } from "vitest";
import {
  activeByStatus,
  activePatientsTrend,
  attainment,
  funnel,
  kpis,
  monthlyNetSales,
  monthlyVials,
  newPatients,
  patientFunnel,
  resolveDashboardAnswer,
  sum,
} from "@/lib/dashboard-data";

describe("Launch reference data", () => {
  it("keeps patient volumes between 20 and 80", () => {
    expect(kpis.activePatients.total).toBeGreaterThanOrEqual(20);
    expect(kpis.activePatients.total).toBeLessThanOrEqual(80);
    for (const row of patientFunnel) expect(row.patients).toBeLessThanOrEqual(80);
    expect(kpis.newPatients.sinceLaunch).toBeLessThanOrEqual(80);
  });

  it("keeps launch-to-date net sales between $10M and $100M", () => {
    expect(kpis.netSales.ltd).toBeGreaterThanOrEqual(10);
    expect(kpis.netSales.ltd).toBeLessThanOrEqual(100);
  });

  it("derives net sales from paid vials × WAC less GTN", () => {
    expect(monthlyNetSales.at(-1)?.actual).toBe(4.44);
    expect(attainment.netSales.ltd).toEqual({ actual: 24.5, target: 26 });
  });

  it("reconciles active patients across the phase and status views", () => {
    activePatientsTrend.forEach((row, i) => {
      const status = activeByStatus[i];
      expect(status).toBeDefined();
      if (!status) return;
      expect(row.loading + row.maintenance).toBe(status.commercial + status.quickStart + status.bridge + status.pap);
    });
    expect(kpis.activePatients).toMatchObject({ total: 62, paid: 44, free: 18 });
  });

  it("reconciles referrals with first doses, pending and the funnel", () => {
    expect(sum(newPatients.map((row) => row.eapTransition + row.newToBrand))).toBe(funnel.firstDose);
    expect(funnel.referred - funnel.firstDose).toBeGreaterThanOrEqual(kpis.pending.total);
  });

  it("keeps vial totals consistent with paid and free", () => {
    for (const row of monthlyVials) expect(row.total).toBe(row.paid + row.free);
    expect(kpis.vials).toMatchObject({ total: 219, paid: 160, free: 59 });
  });

  it("keeps the visible figures in the preset answers", () => {
    expect(resolveDashboardAnswer("How are we tracking against forecast?").response).toContain("$24.5M");
    expect(resolveDashboardAnswer("How many patients are active right now?").response).toContain("62 patients");
    expect(resolveDashboardAnswer("Why are patients still pending?").response).toContain("9 patients");
    expect(resolveDashboardAnswer("How many new prescribers did we add?").response).toContain("38 HCPs");
  });

  it("offers a friendly fallback for messages outside the preset topics", () => {
    expect(resolveDashboardAnswer("Tell me a joke").response).toBe(
      "I'm still learning! Please try one of the suggested questions.",
    );
  });
});
