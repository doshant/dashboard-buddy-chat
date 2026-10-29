import { describe, expect, it } from "vitest";
import { chartFollowUp, chatChartFor, isChartRequest } from "@/lib/chat-charts";
import { starterQuestionsFor } from "@/lib/dashboard-data";
import { searchByMonth, spendByMonth, visitsBySourceByMonth } from "@/lib/marketing-data";

describe("Charts as follow-ups to Clara's Marketing answers", () => {
  it("can chart every Marketing starter question's figures", () => {
    for (const question of starterQuestionsFor("Marketing")) {
      const chart = chatChartFor(question);
      expect(chart, question).not.toBeNull();
      expect(chart!.data.length, question).toBeGreaterThan(0);
    }
  });

  it("recognises chart follow-ups", () => {
    for (const question of [
      chartFollowUp,
      "Can you chart this?",
      "graph that",
      "Plot it",
      "visualize it",
    ]) {
      expect(isChartRequest(question), question).toBe(true);
    }
    expect(isChartRequest("How much have we spent on marketing?")).toBe(false);
    // A bare follow-up has no topic of its own, so the chat charts the previous answer.
    expect(chatChartFor(chartFollowUp)).toBeNull();
  });

  it("charts a topic named in the request directly", () => {
    expect(chatChartFor("Chart marketing spend by month")?.title).toBe("Marketing spend by month");
    expect(chatChartFor("Chart website visits by source")?.title).toBe("Website visits by source");
  });

  it("charts the dashboard's own figures", () => {
    expect(chatChartFor("How much have we spent on marketing?")!.data).toEqual(
      spendByMonth.map(({ month, email, social, search }) => ({ month, email, social, search })),
    );
    expect(
      chatChartFor("How is website traffic trending?")!.data.map((row) => row["month"]),
    ).toEqual(visitsBySourceByMonth.map((row) => row.month));
    expect(chatChartFor("What happened to paid search?")!.data.at(-1)).toEqual({
      month: "Sep",
      clicks: searchByMonth.at(-1)!.clicks,
      cpc: searchByMonth.at(-1)!.cpc,
    });
  });

  it("has nothing to chart for answers without chartable figures", () => {
    expect(chatChartFor("What is our fill rate?")).toBeNull();
    expect(chatChartFor("Where should we focus marketing next?")).toBeNull();
  });
});
