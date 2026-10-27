import { describe, expect, it } from "vitest";
import {
  funnel,
  kpis,
  newPatients,
  resolveDashboardAnswer,
  starterQuestionsFor,
  sum,
} from "@/lib/dashboard-data";
import {
  administeredByPhase,
  averageOopPerDose,
  channelBalance,
  conversion,
  inventory,
  marketAccessKpis,
  newPatientsByGoods,
  payerMixPaidDoses,
  payerMixReferred,
  priorAuth,
  referralOutcomes,
  stopReasons,
  stops,
  vialsAdministered,
} from "@/lib/market-access-data";

const { administered } = marketAccessKpis;

describe("Market Access control totals", () => {
  it("accounts for every referral exactly once", () => {
    expect(sum(referralOutcomes.map((row) => row.patients))).toBe(funnel.referred);
    expect(sum(payerMixReferred.map((row) => row.patients))).toBe(funnel.referred);
    expect(conversion.started).toBe(funnel.firstDose);
  });

  it("matches new patients by goods type to Overview new patients, month by month", () => {
    newPatientsByGoods.forEach((row, i) => {
      const overview = newPatients[i];
      expect(overview?.month).toBe(row.month);
      expect(row.total).toBe((overview?.eapTransition ?? 0) + (overview?.newToBrand ?? 0));
    });
    expect(sum(newPatientsByGoods.map((row) => row.total))).toBe(kpis.newPatients.sinceLaunch);
  });

  it("splits administered doses consistently by payment, phase and program", () => {
    expect(administered.paid + administered.free).toBe(administered.total);
    expect(sum(administeredByPhase.map((row) => row.total))).toBe(administered.total);
    expect(administered.loading).toBe(funnel.firstDose + funnel.secondDose);
    for (const row of administeredByPhase) expect(row.eap).toBeGreaterThanOrEqual(0);
    expect(sum(payerMixPaidDoses.map((row) => row.doses))).toBe(administered.paid);
  });

  it("never administers more vials than were shipped", () => {
    for (const row of channelBalance) expect(row.onHand).toBeGreaterThanOrEqual(0);
    expect(sum(vialsAdministered.map((row) => row.total))).toBeLessThanOrEqual(kpis.vials.total);
  });

  it("reconciles channel inventory to shipped minus administered, for paid and free", () => {
    expect(sum(inventory.map((row) => row.paid))).toBe(kpis.vials.paid - administered.paid);
    expect(sum(inventory.map((row) => row.free))).toBe(kpis.vials.free - administered.free);
    expect(channelBalance.at(-1)?.onHand).toBe(marketAccessKpis.inventory.total);
  });

  it("ties PA outcomes to the patient funnel", () => {
    expect(priorAuth.approved + priorAuth.denied + priorAuth.pending).toBe(priorAuth.submitted);
    expect(priorAuth.approvalPct).toBe(95);
  });

  it("rolls cancellations, discontinuations and restarts up to active patients", () => {
    expect(stops.cancelled).toBe(funnel.referred - funnel.firstDose - kpis.pending.total);
    expect(funnel.firstDose - stops.discontinued + stops.restarted).toBe(kpis.activePatients.total);
    for (const row of stopReasons) expect(row.total).toBe(row.cancelled + row.discontinued);
  });

  it("weights out-of-pocket cost by paid doses", () => {
    expect(averageOopPerDose).toBe(295);
  });

  it("answers the Market Access starter questions with the visible figures", () => {
    const answers = starterQuestionsFor("Market Access").map(
      (question) => resolveDashboardAnswer(question).response,
    );
    expect(answers).toHaveLength(6);
    expect(answers[0]).toContain("95%");
    expect(answers[1]).toContain("8 of 10 Q3 denials");
    expect(answers[2]).toContain("29 days");
    expect(answers[3]).toContain("143 paid doses");
    expect(answers[4]).toContain("62 remain active");
    expect(answers[5]).toContain("23 vials");
  });
});
