import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Streamdown } from "streamdown";
import { ChatTableCell, ResizableHeaderCell } from "@/components/chat-table";
import { dashboardAnswers } from "@/lib/dashboard-data";

afterEach(cleanup);

const renderReply = (markdown: string) =>
  render(
    <Streamdown
      controls={{ table: false }}
      components={{ th: ResizableHeaderCell, td: ChatTableCell }}
    >
      {markdown}
    </Streamdown>,
  );

const alignOf = (text: string) =>
  (screen.getByText(text).closest("th, td") as HTMLElement).style.textAlign;

describe("Assistant reply tables", () => {
  it("centres values and left-aligns text", () => {
    renderReply(dashboardAnswers.payerMix.response);
    expect(alignOf("Payer")).toBe("left");
    expect(alignOf("Referred patients")).toBe("center");
    expect(alignOf("Medicare FFS")).toBe("left");
    expect(alignOf("22")).toBe("center");
    expect(alignOf("52")).toBe("center");
    // Text wraps; values stay on one line.
    const kindOf = (text: string) =>
      screen.getByText(text).closest("th, td")?.getAttribute("data-kind");
    expect(kindOf("Medicare FFS")).toBe("text");
    expect(kindOf("Payer")).toBe("text");
    expect(kindOf("52")).toBe("value");
    expect(kindOf("Referred patients")).toBe("value");
  });

  it("centres values even in columns not marked as numeric", () => {
    renderReply(
      "| Metric | Value |\n| --- | --- |\n| Net sales | $24.5M |\n| Paid / free | 160 / 59 |",
    );
    expect(alignOf("Net sales")).toBe("left");
    expect(alignOf("$24.5M")).toBe("center");
    expect(alignOf("160 / 59")).toBe("center");
  });

  describe("resizing", () => {
    // jsdom has no layout: give each column 100px inside a 200px container.
    beforeEach(() => {
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(100);
      vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(200);
    });
    afterEach(() => vi.restoreAllMocks());

    const setup = () => {
      renderReply("| Metric | Value |\n| --- | ---: |\n| Net sales | $24.5M |");
      const [first, last] = screen.getAllByRole("separator", { name: "Resize column" });
      const table = first!.closest("table")!;
      const widths = () =>
        Array.from(table.querySelectorAll("th")).map((cell) => parseFloat(cell.style.width));
      return { first: first!, last: last!, table, widths };
    };

    it("trades width with the next column so the table keeps its size", () => {
      const { first, table, widths } = setup();
      fireEvent.keyDown(first, { key: "ArrowRight" });
      expect(widths()).toEqual([116, 84]);
      expect(table.style.width).toBe("200px");
      expect(table.style.tableLayout).toBe("fixed");
    });

    it("never squeezes a neighbour below the minimum width", () => {
      const { first, widths } = setup();
      for (let i = 0; i < 10; i++) fireEvent.keyDown(first, { key: "ArrowRight" });
      expect(widths()).toEqual([152, 48]);
    });

    it("lets the last column widen the table but not shrink it below its container", () => {
      const { last, table, widths } = setup();
      fireEvent.keyDown(last, { key: "ArrowRight" });
      expect(widths()).toEqual([100, 116]);
      expect(table.style.width).toBe("216px");
      for (let i = 0; i < 5; i++) fireEvent.keyDown(last, { key: "ArrowLeft" });
      expect(widths()).toEqual([100, 100]);
      expect(table.style.width).toBe("200px");
    });

    it("resets to the default layout on double-click", () => {
      const { first, table } = setup();
      fireEvent.keyDown(first, { key: "ArrowRight" });
      fireEvent.doubleClick(first);
      expect(table.hasAttribute("data-resized")).toBe(false);
      expect(table.style.width).toBe("");
      expect(table.querySelector("th")!.style.width).toBe("");
    });
  });
});
