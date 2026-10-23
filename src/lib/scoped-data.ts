import { buildExecutiveData } from "@/lib/executive-data";
import { buildFieldData, withFieldRates } from "@/lib/field-data";
import { buildLaunchData, sum } from "@/lib/launch-data";
import { buildMarketAccessData } from "@/lib/market-access-data";
import { buildMarketingData, withRates } from "@/lib/marketing-data";
import { nationalRaw, regionalRaw, type DashboardRaw } from "@/lib/regional-data";
import {
  periodLabels,
  regionNames,
  windowStart,
  type Geography,
  type Scope,
  type TimePeriod,
} from "@/lib/scope";

// Everything the dashboard tabs show, for one geography and time period. The national view uses
// the national inputs; a region uses its share of them, so the same rules apply everywhere.

function buildFromRaw(raw: DashboardRaw, period: TimePeriod) {
  const start = windowStart(period);
  const launch = buildLaunchData(raw.launch, start);
  const marketAccess = buildMarketAccessData(launch, raw.marketAccess, start);
  const field = buildFieldData(launch, raw.field, start);
  const marketing = buildMarketingData(raw.marketing, start);
  const executive = buildExecutiveData({
    launch,
    marketAccess,
    field,
    marketing,
    referrals: raw.referrals,
    period,
  });
  return { launch, marketAccess, field, marketing, executive };
}

const rawFor = (geography: Geography) =>
  geography === "Nation" ? nationalRaw : regionalRaw[geography];

// Regional comparison tables for a period, built from each region's own figures so the rows add
// up to the national totals for that period.
function regionalTables(period: TimePeriod) {
  const builds = regionNames.map((region) => ({
    region,
    data: buildFromRaw(regionalRaw[region], period),
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
  const marketingTotal = withRates("Total", {
    impressionsK: sum(marketingRows.map((row) => row.impressionsK)),
    clicks: sum(marketingRows.map((row) => row.clicks)),
    videoViews: sum(marketingRows.map((row) => row.videoViews)),
    visits: sum(marketingRows.map((row) => row.visits)),
    hvas: sum(marketingRows.map((row) => row.hvas)),
    delivered: sum(marketingRows.map((row) => row.delivered)),
    opens: sum(marketingRows.map((row) => row.opens)),
    emailClicks: sum(marketingRows.map((row) => row.emailClicks)),
  });
  return {
    field: { rows: fieldRows, total: fieldTotal },
    marketing: { rows: marketingRows, total: marketingTotal },
  };
}

const cache = new Map<string, ReturnType<typeof build>>();

function build(scope: Scope) {
  return {
    scope,
    period: periodLabels[scope.period],
    ...buildFromRaw(rawFor(scope.geography), scope.period),
    regional: regionalTables(scope.period),
  };
}

export function buildDashboardData(scope: Scope) {
  const key = `${scope.geography}|${scope.period}`;
  let data = cache.get(key);
  if (!data) {
    data = build(scope);
    cache.set(key, data);
  }
  return data;
}

export type DashboardData = ReturnType<typeof buildDashboardData>;
