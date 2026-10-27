import { describe, expect, it } from "vitest";
import { profiles, resolveDashboardAnswer } from "@/lib/dashboard-data";
import { attentionSignalsFor } from "@/lib/outlook-data";
import { nationalPaRaw, paFunnel, paRawFor } from "@/lib/pa-data";
import { regionalRaw } from "@/lib/regional-data";
import { buildDashboardData } from "@/lib/scoped-data";
import { regionNames } from "@/lib/scope";

const nation = buildDashboardData({ geography: "Nation", period: "Launch to Date" });

describe("PA denial scenario data", () => {
  it("reconciles with the referral funnel, nationally and in every region", () => {
    const national = paFunnel(nationalPaRaw);
    expect(national).toEqual({ submitted: 77, approved: 73, pending: 3, cancelled: 1 });
    expect(nation.launch.funnel.benefitsVerified).toBe(national.submitted);
    expect(nation.launch.funnel.paApproved).toBe(national.approved);

    for (const region of regionNames) {
      const pa = paFunnel(paRawFor(region));
      const funnel = regionalRaw[region].launch.funnel;
      expect(funnel.benefitsVerified, region).toBe(pa.submitted);
      expect(funnel.paApproved, region).toBe(pa.approved);
      expect(funnel.firstDose, region).toBeLessThanOrEqual(pa.approved);
    }
  });

  it("shows first-pass approval falling in Q3, driven by documentation, MA and three sites", () => {
    const pa = nation.marketAccess.paAnalysis;
    expect(pa.firstPassH1).toBe(94);
    expect(pa.firstPassQ3).toBe(58);
    const q3 = buildDashboardData({ geography: "Nation", period: "QTD" }).marketAccess.paAnalysis;
    expect(q3.denied).toBe(10);
    expect(q3.documentationDenials).toBe(9);
    expect(q3.denialsByPayer[0]).toEqual({ label: "Medicare Advantage", value: 8 });
    expect(pa.q3SitesWithoutPreReview).toMatchObject({ sites: 3, denied: 8, firstPassPct: 11 });
    expect(pa.q3SitesWithPreReview.firstPassPct).toBe(87);
    expect(pa.appeals).toMatchObject({ overturned: 11, upheld: 1, pending: 1, decided: 12, overturnedOfDecidedPct: 92 });
  });

  it("follows the region filter: the Southeast carries half of Q3's denials", () => {
    const southeast = buildDashboardData({ geography: "Southeast", period: "QTD" }).marketAccess;
    expect(southeast.paAnalysis.denied).toBe(5);
    expect(southeast.paAnalysis.firstPassPct).toBe(38);
    const regions = regionNames.map(
      (geography) =>
        buildDashboardData({ geography, period: "QTD" }).marketAccess.paAnalysis.denied,
    );
    expect(regions.reduce((a, b) => a + b, 0)).toBe(10);
  });
});

describe("PA denial demo questions", () => {
  const titleOf = (question: string) => resolveDashboardAnswer(question).title;

  it("answers the questions a presenter is likely to ask", () => {
    expect(titleOf("Why is our PA approval rate dropping?")).toBe("PA first-pass denials");
    expect(titleOf("Why are PAs being rejected?")).toBe("PA first-pass denials");
    expect(titleOf("What can we do about PA denials?")).toBe("Actions to reduce PA denials");
    expect(titleOf("How do we reduce PA rejections?")).toBe("Actions to reduce PA denials");
    expect(titleOf("Which sites are driving PA denials?")).toBe("PA denials by site");
    expect(titleOf("What is our PA approval rate?")).toBe("Prior authorization");
  });

  it("flags the drop when the assistant opens on Market Access", () => {
    const jenny = profiles.find((profile) => profile.name === "Jenny")!;
    const [first] = attentionSignalsFor("Market Access", jenny.panels);
    expect(first?.question).toBe("Why is our PA approval rate dropping?");
    expect(first?.reason).toBe("First-pass PA approval fell from 94% in H1 to 58% in Q3");
  });
});
