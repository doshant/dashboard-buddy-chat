import { describe, expect, it } from "vitest";
import { dashboardAnswers, resolveDashboardAnswer } from "@/lib/dashboard-data";
import {
  excelValue,
  exportFileName,
  sheetNames,
  tablesFromMarkdown,
  tablesToCsv,
} from "@/lib/table-export";

describe("Assistant table export", () => {
  it("reads every table in a reply, without bold markers or separator rows", () => {
    const tables = tablesFromMarkdown(dashboardAnswers.active.response);
    expect(tables.map((table) => table.headers)).toEqual([
      ["Payment", "Patients"],
      ["Therapy phase", "Patients"],
    ]);
    expect(tables[0]!.rows[0]).toEqual(["Commercial (paid)", "44"]);

    const payer = tablesFromMarkdown(dashboardAnswers.payerMix.response)[0]!;
    expect(payer.rows.at(-1)).toEqual(["Total", "80", "143"]);
  });

  it("finds a table in every reply that has numbers to download", () => {
    for (const [topic, answer] of Object.entries(dashboardAnswers)) {
      if (topic === "unrecognized") continue;
      expect(tablesFromMarkdown(answer.response).length, topic).toBeGreaterThan(0);
    }
    expect(tablesFromMarkdown(dashboardAnswers.unrecognized.response)).toEqual([]);
  });

  it("writes CSV with quoting and a blank line between tables", () => {
    const csv = tablesToCsv([
      { headers: ["Metric", "Value"], rows: [["Sales, Q3", "$11.9M"]] },
      { headers: ["Note"], rows: [['Say "hi"']] },
    ]);
    expect(csv).toBe('Metric,Value\r\n"Sales, Q3",$11.9M\r\n\r\nNote\r\n"Say ""hi"""');
  });

  it("keeps formatted figures as text but turns plain counts into numbers", () => {
    expect(excelValue("44")).toBe(44);
    expect(excelValue("$24.5M")).toBe("$24.5M");
    expect(excelValue("94%")).toBe("94%");
  });

  it("names sheets and files safely", () => {
    const table = { headers: ["Days from referral to first PA approval / time"], rows: [] };
    expect(sheetNames([table, table])).toEqual([
      "Days from referral to first",
      "Days from referral to first 2",
    ]);
    expect(exportFileName("Payer mix")).toBe("Payer mix");
    expect(exportFileName("Sales / vials: Q3?")).toBe("Sales vials Q3");
    expect(exportFileName("")).toBe("Clara");
  });

  it("titles every reply that has a table after what it shows", () => {
    for (const [topic, answer] of Object.entries(dashboardAnswers)) {
      if (tablesFromMarkdown(answer.response).length) expect(answer.title, topic).toBeTruthy();
    }
    expect(resolveDashboardAnswer("What does the payer mix look like?").title).toBe("Payer mix");
  });
});
