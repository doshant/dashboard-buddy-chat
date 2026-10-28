import { describe, expect, it } from "vitest";
import {
  forwardQuestionList,
  profiles,
  questionKind,
  resolveDashboardAnswer,
  starterQuestionsFor,
} from "@/lib/dashboard-data";
import {
  fieldActions,
  hvaActions,
  marketingActions,
  mediaOutlook,
  monthsToCloseGapWithFirstAction,
  projectAhead,
  reachOutlook,
  salesActions,
  salesActionsTotal,
  salesOutlook,
  supplyOutlook,
  timeToDoseActions,
  searchStory,
  trafficOutlook,
} from "@/lib/outlook-data";
import { formatCount } from "@/lib/marketing-data";
import { attentionSignalsFor } from "@/lib/outlook-data";
import { tablesFromMarkdown } from "@/lib/table-export";

const answer = (question: string) => resolveDashboardAnswer(question).response;
const visibleTabs = ["Executive Summary", "Market Access", "Marketing", "Field Activity"];

describe("Predictive and prescriptive questions", () => {
  it("starts every tab with descriptive questions only", () => {
    for (const panel of visibleTabs) {
      for (const question of starterQuestionsFor(panel)) {
        expect(questionKind(question)).toBe("Descriptive");
      }
    }
  });

  it("follows each descriptive starter with a predictive and a prescriptive question", () => {
    for (const panel of visibleTabs) {
      for (const question of starterQuestionsFor(panel)) {
        const kinds = resolveDashboardAnswer(question).suggestions.map(questionKind);
        expect(kinds, question).toContain("Predictive");
        expect(kinds, question).toContain("Prescriptive");
      }
    }
  });

  it("has a detailed set of predictive and prescriptive follow-ups", () => {
    const kinds = forwardQuestionList.map(questionKind);
    expect(kinds.filter((kind) => kind === "Predictive").length).toBeGreaterThanOrEqual(9);
    expect(kinds.filter((kind) => kind === "Prescriptive").length).toBeGreaterThanOrEqual(9);
    expect(kinds).not.toContain("Descriptive");
  });

  it("routes each forward-looking question to its own answer with a downloadable table", () => {
    const titles = forwardQuestionList.map((question) => {
      const response = answer(question);
      expect(tablesFromMarkdown(response).length, question).toBeGreaterThan(0);
      return resolveDashboardAnswer(question).title;
    });
    expect(new Set(titles).size).toBe(forwardQuestionList.length);
    expect(titles).not.toContain("Clara");
    expect(titles).toEqual(
      expect.arrayContaining(["Net sales outlook", "Inventory risk", "Growing repeat prescribers"]),
    );
  });

  it("projects with the last three months' average change", () => {
    expect(projectAhead([10, 13, 16, 19])).toEqual([22, 25, 28]);
  });

  it("quotes the computed projections", () => {
    const sales = answer("What will net sales be by year end?");
    expect(sales).toContain(`$${salesOutlook.q4NetSalesM}M in Q4`);
    expect(sales).toContain(`$${salesOutlook.yearEndNetSalesM}M by year end`);
    for (const row of salesOutlook.months) expect(sales).toContain(`$${row.netSalesM}M`);

    const supply = answer("How many vials will we need next quarter?");
    expect(supply).toContain(`About ${supplyOutlook.q4ShipmentsNeeded} vials`);
    expect(supply).toContain(`**${supplyOutlook.q4Doses}**`);
    expect(supply).toContain(`| − On hand today | ${supplyOutlook.onHand} |`);

    const traffic = answer("What will website traffic be next quarter?");
    expect(traffic).toContain(`${formatCount(trafficOutlook.q4Visits)} in Q4`);
    for (const row of trafficOutlook.months) expect(traffic).toContain(formatCount(row.visits));

    const media = answer("How many impressions will we deliver next quarter?");
    expect(media).toContain(`about ${formatCount(mediaOutlook.q4ImpressionsK * 1000)} impressions`);
    expect(media).toContain(`Q3's ${formatCount(mediaOutlook.q3ImpressionsK * 1000)}`);
    expect(media).toContain(`about ${formatCount(mediaOutlook.q4Clicks)} site visits`);
    expect(media).toContain(`today's ${mediaOutlook.latestCtr}% click-through rate`);
    for (const row of mediaOutlook.months) {
      expect(media).toContain(
        `| ${row.month} | ${formatCount(row.impressionsK * 1000)} | ${formatCount(row.clicks)} |`,
      );
    }

    const hva = answer("How do we turn website visits into rep requests?");
    expect(hva).toContain(`Only ${hvaActions.repRequests} of`);
    expect(hva).toContain(`(${hvaActions.repRequestSharePct}%) are rep requests`);
    expect(hva).toContain(`about ${hvaActions.repRequestsPer1kHcpVisits} for every 1,000`);

    const reach = answer("How many HCPs will we reach by year end?");
    expect(reach).toContain(
      `${reachOutlook.decemberReached} of ${reachOutlook.targeted} targeted HCPs (${reachOutlook.decemberReachPct}%)`,
    );
    expect(reach).toContain(`${reachOutlook.q4Calls} calls in Q4`);
  });

  it("sizes the recommendations from the data", () => {
    const sales = answer("What should we do to close the sales gap?");
    expect(sales).toContain(`$${salesActions.gapM}M launch-to-date gap`);
    expect(sales).toContain(`about ${monthsToCloseGapWithFirstAction} months`);
    for (const row of salesActions.actions) {
      expect(sales).toContain(`| ${row.action} | ${row.patients} | $${row.monthlyNetSalesM}M |`);
    }
    expect(sales).toContain(`**$${salesActionsTotal.monthlyNetSalesM}M**`);

    const dose = answer("How can we speed up time to first dose?");
    expect(dose).toContain(
      `${timeToDoseActions.lpDays} of the ${timeToDoseActions.firstDoseDays} days`,
    );
    expect(dose).toContain(`(${timeToDoseActions.lpShare}%)`);

    const marketing = answer("Where should we focus marketing next?");
    expect(marketing).toContain(`${marketingActions.hcpOpenRate.toFixed(1)}%`);
    expect(marketing).toContain(`${marketingActions.hcpOpensPerPoint} more HCP opens`);
    expect(marketing).toContain(`Close the ${marketingActions.weakestRegion} gap`);
    expect(marketing).toContain(`about ${searchStory.lostHvas} high value actions`);

    const field = answer("Which HCPs should the field team prioritize?");
    expect(field).toContain(`${fieldActions.unreached} targeted HCPs not yet reached`);
    expect(field).toContain(`${fieldActions.reachedNotPrescribing} reached HCPs`);
    for (const row of fieldActions.unreachedByRegion) {
      expect(field).toContain(
        `| ${row.region} | ${row.unreached} | ${row.reachPct}% | ${row.conversionPct}% |`,
      );
    }
  });

  it("only offers forward-looking follow-ups the profile can open", () => {
    for (const profile of profiles) {
      // What-if questions are answered by the simulator, which has its own tests.
      for (const panel of profile.panels.filter((item) => item !== "What-If Simulator")) {
        for (const question of starterQuestionsFor(panel, profile.panels)) {
          const { suggestions } = resolveDashboardAnswer(question, profile.panels);
          expect(
            suggestions.some((item) => questionKind(item) !== "Descriptive"),
            question,
          ).toBe(true);
          for (const suggestion of suggestions) {
            expect(resolveDashboardAnswer(suggestion, profile.panels).response).not.toContain(
              "isn't part of your access",
            );
          }
        }
      }
    }
    const jeff = profiles.find((profile) => profile.name === "Jeff")!;
    expect(
      resolveDashboardAnswer("How can we speed up time to first dose?", jeff.panels).response,
    ).toContain("isn't part of your access");
  });
});

describe("Signals flagged when the assistant opens", () => {
  it("flags the sales gap on the Executive Summary while sales trail forecast", () => {
    const jenny = profiles.find((profile) => profile.name === "Jenny")!;
    const signals = attentionSignalsFor("Executive Summary", jenny.panels);
    expect(signals.map((signal) => signal.question)).toContain(
      "What should we do to close the sales gap?",
    );
    expect(signals.map((signal) => signal.reason)).toContain(
      "Net sales at 94% of forecast launch to date",
    );
  });

  it("only flags questions each profile can open, and every flag has an answer", () => {
    for (const profile of profiles) {
      for (const panel of profile.panels) {
        for (const signal of attentionSignalsFor(panel, profile.panels)) {
          const { title, response } = resolveDashboardAnswer(signal.question, profile.panels);
          expect(response).not.toContain("isn't part of your access");
          expect(title).not.toBe("Clara");
          expect(questionKind(signal.question)).not.toBe("Descriptive");
        }
      }
    }
  });
});
