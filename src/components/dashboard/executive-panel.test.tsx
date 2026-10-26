import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ExecutivePanel } from "@/components/dashboard/executive-panel";

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

describe("Executive Summary panel", () => {
  it("opens one measure's detail row at a time", () => {
    render(<ExecutivePanel />);
    expect(screen.queryByText("Filled, of known outcomes")).toBeNull();

    const fill = screen.getByRole("button", { name: /Fill Rate/ });
    fireEvent.click(fill);
    expect(fill.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Filled, of known outcomes")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Abandonment Rate/ }));
    expect(screen.queryByText("Filled, of known outcomes")).toBeNull();
    expect(screen.getByText("Off therapy")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Abandonment Rate/ }));
    expect(screen.queryByText("Off therapy")).toBeNull();
  });

  it("shows the key performance indicators below the glance row", () => {
    render(<ExecutivePanel />);
    expect(screen.getByRole("heading", { name: "Key Performance Indicators" })).toBeTruthy();
    expect(screen.getByText("Median days, referral to first dose")).toBeTruthy();
    expect(screen.getByText("Avg patient cost per dose")).toBeTruthy();
  });

  it("switches the active patients chart between By Status and By Channel", () => {
    render(<ExecutivePanel />);
    expect(screen.getByRole("button", { name: "By Status" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByText(/loading \(doses 1–2\) vs maintenance/)).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /Show by status series/ }).textContent).toBe(
      "Overall",
    );

    fireEvent.click(screen.getByRole("button", { name: "By Channel" }));
    expect(screen.queryByText(/loading \(doses 1–2\) vs maintenance/)).toBeNull();
    expect(screen.queryByText(/Commercial is paid/)).toBeNull();
    expect(screen.getByText("Quick Start")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /Show by channel series/ }).textContent).toBe(
      "Overall",
    );
  });
});
