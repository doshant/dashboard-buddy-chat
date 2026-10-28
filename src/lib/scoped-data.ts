import { buildExecutiveData } from "@/lib/executive-data";
import { buildFieldData, withFieldRates } from "@/lib/field-data";
import { buildLaunchData, sum } from "@/lib/launch-data";
import { buildMarketAccessData } from "@/lib/market-access-data";
import { buildMarketingData, sumRegionCounts, withRates } from "@/lib/marketing-data";
import { nationalRaw, regionalRaw, type DashboardRaw } from "@/lib/regional-data";
import { periodLabel, periodWindow, regionNames, type Geography, type Scope } from "@/lib/scope";

type PeriodScope = Pick<Scope, "period" | "month">;

// Everything the dashboard tabs show, for one geography and time period. The national view uses
// the national inputs; a region uses its share of them, so the same rules apply everywhere.

function buildFromRaw(raw: DashboardRaw, periodScope: PeriodScope) {
  const window = periodWindow(periodScope);
  const launch = buildLaunchData(raw.launch, window);
  const marketAccess = buildMarketAccessData(launch, raw.marketAccess, window);
  const field = buildFieldData(launch, raw.field, window);
  const marketing = buildMarketingData(raw.marketing, window);
  const executive = buildExecutiveData({
    launch,
    marketAccess,
    field,
    marketing,
    referrals: raw.referrals,
    window,
    label: periodLabel(periodScope),
    trendView:
      periodScope.period === "QTD"
        ? "quarterly"
        : periodScope.period === "Monthly"
          ? "none"
          : "monthly",
  });
  return { launch, marketAccess, field, marketing, executive };
}

const rawFor = (geography: Geography) =>
  geography === "Nation" ? nationalRaw : regionalRaw[geography];

// Regional comparison tables for a period, built from each region's own figures so the rows add
// up to the national totals for that period.
function regionalTables(periodScope: PeriodScope) {
  const builds = regionNames.map((region) => ({
    region,
    data: buildFromRaw(regionalRaw[region], periodScope),
  }));
  const fieldRows = builds.map(({ region, data }) =>
    withFieldRates({
      region,
      targeted: data.field.fieldKpis.targeted,
      reached: data.field.fieldKpis.reached,
      calls: data.field.fieldKpis.calls,
      prescribers: data.launch.kpis.prescribers.sinceLaunch,
    }),
  );
  const fieldTotal = withFieldRates({
    region: "Total",
    targeted: sum(fieldRows.map((row) => row.targeted)),
    reached: sum(fieldRows.map((row) => row.reached)),
    calls: sum(fieldRows.map((row) => row.calls)),
    prescribers: sum(fieldRows.map((row) => row.prescribers)),
  });
  const marketingRows = builds.map(({ region, data }) => data.marketing.summaryRow(region));
  const marketingTotal = withRates("Total", sumRegionCounts(marketingRows));
  return {
    field: { rows: fieldRows, total: fieldTotal },
    marketing: { rows: marketingRows, total: marketingTotal },
  };
}

const cache = new Map<string, ReturnType<typeof build>>();

function build(scope: Scope) {
  return {
    scope,
    period: periodLabel(scope),
    ...buildFromRaw(rawFor(scope.geography), scope),
    regional: regionalTables(scope),
  };
}

export function buildDashboardData(scope: Scope) {
  const key = `${scope.geography}|${scope.period}|${scope.period === "Monthly" ? (scope.month ?? "Sep") : ""}`;
  let data = cache.get(key);
  if (!data) {
    data = build(scope);
    cache.set(key, data);
  }
  return data;
}

export type DashboardData = ReturnType<typeof buildDashboardData>;
