import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-context";
import { ExecutivePanel } from "@/components/dashboard/executive-panel";
import { FieldPanel } from "@/components/dashboard/field-panel";
import { MarketAccessPanel } from "@/components/dashboard/market-access-panel";
import { MarketingPanel } from "@/components/dashboard/marketing-panel";
import { formatCount } from "@/lib/marketing-data";
import { buildDashboardData } from "@/lib/scoped-data";
import type { Scope } from "@/lib/scope";

// jsdom has no ResizeObserver; the charts only need it to exist.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
afterEach(cleanup);

const nation: Scope = { geography: "Nation", period: "Launch to Date" };
const northeastQtd: Scope = { geography: "Northeast", period: "QTD" };

const renderTab = (Tab: () => React.JSX.Element, scope: Scope) =>
  render(
    <DashboardDataProvider value={buildDashboardData(scope)}>
      <Tab />
    </DashboardDataProvider>,
  );

const cardValue = (title: string | RegExp) => {
  const heading = screen.getByRole("heading", { name: title });
  return heading.closest("section")?.querySelector("p.text-\\[26px\\]")?.textContent ?? "";
};

describe("Tabs follow the geography and time period filters", () => {
  it("Performance Snapshot", () => {
    for (const scope of [nation, northeastQtd]) {
      const data = buildDashboardData(scope);
      renderTab(ExecutivePanel, scope);
      const sales = data.executive.executiveMetrics.find((metric) => metric.key === "sales")!;
      expect(screen.getByText(sales.caption)).toBeTruthy();
      expect(screen.getAllByText(sales.value).length).toBeGreaterThan(0);
      cleanup();
    }
    expect(buildDashboardData(nation).executive.executiveMetrics[0]?.caption).toBe(
      "Net sales (LTD) vs forecast",
    );
    expect(buildDashboardData(northeastQtd).executive.executiveMetrics[0]?.caption).toBe(
      "Net sales (QTD) vs forecast",
    );
  });

  it("Market Access", () => {
    for (const scope of [nation, northeastQtd]) {
      const { marketAccess } = buildDashboardData(scope);
      renderTab(MarketAccessPanel, scope);
      expect(cardValue(/^Vials Administered ·/)).toBe(
        `${marketAccess.marketAccessKpis.administered.total}`,
      );
      cleanup();
    }
  });

  it("Marketing", () => {
    for (const scope of [nation, northeastQtd]) {
      const { marketing } = buildDashboardData(scope);
      renderTab(MarketingPanel, scope);
      expect(cardValue("Website Visits")).toBe(formatCount(marketing.marketingKpis.website.total));
      cleanup();
    }
  });

  it("Field Activity", () => {
    for (const scope of [nation, northeastQtd]) {
      const { field } = buildDashboardData(scope);
      renderTab(FieldPanel, scope);
      expect(cardValue("Total Calls Made")).toBe(field.fieldKpis.calls.toLocaleString("en-US"));
      expect(cardValue("HCPs Targeted")).toBe(`${field.fieldKpis.targeted}`);
      cleanup();
    }
  });

  it("draws the Field Activity card trends by month, by quarter, or not at all", () => {
    const trendLines = () =>
      screen.queryAllByRole("img").map((el) => el.getAttribute("aria-label") ?? "");

    renderTab(FieldPanel, nation);
    expect(trendLines().filter((label) => label.endsWith("by month"))).toHaveLength(8);
    expect(trendLines()).toContain("HCPs targeted by month");
    cleanup();

    renderTab(FieldPanel, { geography: "Nation", period: "QTD" });
    expect(trendLines().filter((label) => label.endsWith("by quarter"))).toHaveLength(8);
    const targeted = screen.getByRole("img", { name: "HCPs targeted by quarter" });
    expect(
      targeted.querySelectorAll("polyline")[0]?.getAttribute("points")?.split(" "),
    ).toHaveLength(3);
    cleanup();

    renderTab(FieldPanel, { geography: "Nation", period: "Monthly", month: "Mar" });
    expect(trendLines().filter((label) => /by (month|quarter)$/.test(label))).toHaveLength(0);
  });

  it("shows different numbers for different scopes", () => {
    const a = buildDashboardData(nation);
    const b = buildDashboardData(northeastQtd);
    expect(b.field.fieldKpis.calls).toBeLessThan(a.field.fieldKpis.calls);
    expect(b.marketing.marketingKpis.website.total).toBeLessThan(
      a.marketing.marketingKpis.website.total,
    );
    expect(b.marketAccess.marketAccessKpis.administered.total).toBeLessThan(
      a.marketAccess.marketAccessKpis.administered.total,
    );
  });
});
