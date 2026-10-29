import { sum } from "@/lib/launch-data";
import { attributionRules } from "@/lib/marketing-data";
import type { DashboardData } from "@/lib/scoped-data";
import { netPerVial } from "@/lib/simulator-data";

// Channel and tactic attribution: each month's net sales split across the tactics that drove them,
// so marketing ROI rests on revenue rather than on rules of thumb. Digital tactics earn revenue for
// the site visits they bring (a demo calibration: digital drives about 6% of net sales, typical
// for a rare-disease launch). The rest of each month's net sales is split between field
// promotion, access and patient services, and base demand in fixed shares. Every month's tactics
// add up to that month's net sales.

// The rules live with the marketing data, so modules that only need them avoid an import cycle.
export { attributionRules };

export const attributionTactics = [
  { key: "search", label: "Paid search", digital: true },
  { key: "social", label: "Social media", digital: true },
  { key: "email", label: "HCP email", digital: true },
  { key: "field", label: "Field promotion", digital: false },
  { key: "access", label: "Access & patient services", digital: false },
  { key: "base", label: "Base demand", digital: false },
] as const;

export type AttributionTactic = (typeof attributionTactics)[number]["key"];

// `data` should be a launch-to-date build so the grid covers every month since launch.
export function buildAttribution(data: DashboardData) {
  const { revenuePerVisit, otherShares } = attributionRules;
  const vials = data.launch.trend.monthlyVials;
  const { visitsBySourceByMonth, spendByMonth } = data.marketing;

  const months = vials.map((row, i) => {
    const visits = visitsBySourceByMonth[i];
    const netSales = row.paid * netPerVial;
    const search = (visits?.search ?? 0) * revenuePerVisit.search;
    const social = (visits?.social ?? 0) * revenuePerVisit.social;
    const email = (visits?.email ?? 0) * revenuePerVisit.email;
    const rest = Math.max(0, netSales - search - social - email);
    return {
      month: row.month,
      netSales,
      search,
      social,
      email,
      field: rest * otherShares.field,
      access: rest * otherShares.access,
      base: rest * otherShares.base,
      spend: {
        search: spendByMonth[i]?.search ?? 0,
        social: spendByMonth[i]?.social ?? 0,
        email: spendByMonth[i]?.email ?? 0,
      },
    };
  });

  const netSales = sum(months.map((row) => row.netSales));
  const tactics = attributionTactics.map(({ key, label, digital }) => {
    const revenue = sum(months.map((row) => row[key]));
    const spend = digital ? sum(months.map((row) => row.spend[key as "search"])) : null;
    const latest = months[months.length - 1];
    const latestSpend = digital ? (latest?.spend[key as "search"] ?? 0) : null;
    return {
      key,
      label,
      revenue,
      sharePct: netSales ? Math.round((revenue / netSales) * 1000) / 10 : 0,
      // Net sales per $1 of spend, launch to date and in the latest month.
      spend,
      roi: spend ? Math.round((revenue / spend) * 10) / 10 : null,
      latestRoi: latestSpend && latest ? Math.round((latest[key] / latestSpend) * 10) / 10 : null,
    };
  });
  const digital = tactics.filter(
    (row) => attributionTactics.find((t) => t.key === row.key)?.digital,
  );
  const digitalRevenue = sum(digital.map((row) => row.revenue));
  const digitalSpend = sum(digital.map((row) => row.spend ?? 0));

  return {
    months,
    tactics,
    netSales,
    digitalRevenue,
    digitalSharePct: netSales ? Math.round((digitalRevenue / netSales) * 1000) / 10 : 0,
    digitalRoi: digitalSpend ? Math.round((digitalRevenue / digitalSpend) * 10) / 10 : null,
  };
}

export type Attribution = ReturnType<typeof buildAttribution>;
