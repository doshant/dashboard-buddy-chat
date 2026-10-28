import { useState } from "react";
import { Eye, Globe, Link, MailCheck, MailOpen, Target, Wallet } from "lucide-react";
import type { Series } from "@/components/dashboard/chart-theme";
import {
  DashboardPanel,
  RankedBars,
  StackedCategoryBars,
  StackedMonthlyBars,
  StatCard,
  ViewToggle,
} from "@/components/dashboard/primitives";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import {
  formatCount,
  formatDollars,
  formatRate,
  formatSpend,
  withRates,
} from "@/lib/marketing-data";

type RegionRow = ReturnType<typeof withRates>;

const spendSeries: Series[] = [
  { key: "email", label: "HCP email", color: "series-1" },
  { key: "social", label: "Social media", color: "series-2" },
  { key: "search", label: "Paid search", color: "series-3" },
];
const hcpSeries: Series[] = [{ key: "hcp", label: "HCP", color: "series-1" }];
const audienceSeries: Series[] = [
  { key: "hcp", label: "HCP", color: "series-1" },
  { key: "patient", label: "Patient", color: "series-2" },
];

const channelViews = [
  { key: "spend", label: "Spend" },
  { key: "impressions", label: "Impressions" },
] as const;

const dollarTick = (value: number) => (value ? `$${value / 1000}k` : "$0");

const regionColumns = [
  { label: "Website visits", value: (row: RegionRow) => formatCount(row.visits) },
  { label: "HVA rate", value: (row: RegionRow) => formatRate(row.hvaRate) },
  { label: "HCP open rate", value: (row: RegionRow) => formatRate(row.openRate) },
  { label: "HCP click rate", value: (row: RegionRow) => formatRate(row.clickRate) },
  { label: "Social engagement", value: (row: RegionRow) => formatRate(row.socialEngagementRate) },
  { label: "Search CTR", value: (row: RegionRow) => formatRate(row.searchCtr) },
  { label: "Spend", value: (row: RegionRow) => formatSpend(row.spend) },
];

export function MarketingPanel() {
  const { marketing, regional, scope, period } = useDashboardData();
  const {
    emailFunnel,
    highValueActions,
    impressionsByChannel,
    marketingKpis,
    spendByChannel,
    spendByMonth,
    websiteVisitsByMonth,
  } = marketing;
  const { rows: regionalSummary, total: regionalTotal } = regional.marketing;
  const { spend, website, hva, email, social, search, paidMedia } = marketingKpis;
  const { firstMonthLabel: firstMonth, latestMonthLabel: latestMonth } = marketingKpis;
  const [channelView, setChannelView] = useState<(typeof channelViews)[number]["key"]>("spend");
  const funnelSteps = emailFunnel.slice(1).map((row, i) => {
    const previous = emailFunnel[i]!;
    return {
      ...row,
      step: `${Math.round((row.total / previous.total) * 1000) / 10}% of ${previous.stage.toLowerCase()}`,
    };
  });

  return (
    <>
      <section
        aria-label="Marketing KPIs"
        className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7"
      >
        <StatCard
          title="Total Marketing Spend"
          Icon={Wallet}
          value={formatSpend(spend.total)}
          detail={`HCP email ${formatSpend(spend.email)} · Social ${formatSpend(spend.social)} · Search ${formatSpend(spend.search)}`}
          comparison={{
            text: `${formatSpend(spend.latestMonth)} in ${latestMonth}, up from ${formatSpend(spend.firstMonth)} in ${firstMonth}`,
            direction: "up",
          }}
        />
        <StatCard
          title="Total Impressions"
          Icon={Eye}
          value={formatCount(paidMedia.impressions)}
          detail={`Social ${formatCount(social.impressions)} · Search ${formatCount(search.impressions)}`}
          comparison={{ text: `${formatDollars(paidMedia.cpm)} per 1,000 impressions` }}
        />
        <StatCard
          title="Website Visits"
          Icon={Globe}
          value={formatCount(website.total)}
          detail={`HCP ${formatCount(website.hcp)} · Patient ${formatCount(website.patient)}`}
          comparison={{
            text: `${website.growthVsPriorPct > 0 ? "+" : ""}${website.growthVsPriorPct}% in ${latestMonth} vs prior month`,
            direction: website.growthVsPriorPct >= 0 ? "up" : "down",
          }}
        />
        <StatCard
          title="HVA Rate"
          Icon={Target}
          value={formatRate(hva.rate)}
          detail={`${formatCount(hva.total)} high value actions from ${formatCount(website.total)} visits`}
          comparison={{ text: "Rep requests, support sign-ups, downloads" }}
        />
        <StatCard
          title="HCP Emails Delivered"
          Icon={MailCheck}
          value={formatCount(email.delivered)}
          detail={`${formatCount(email.sent)} sent less ${formatCount(email.bounced)} bounces`}
          comparison={{ text: "HCP campaigns only" }}
        />
        <StatCard
          title="HCP Email Open Rate"
          Icon={MailOpen}
          value={formatRate(email.openRate)}
          detail={`${formatCount(email.opened)} unique opens of ${formatCount(email.delivered)} delivered`}
          comparison={{ text: `Click-to-open ${formatRate(email.clickToOpenRate)}` }}
        />
        <StatCard
          title="HCP Email Click Rate"
          Icon={Link}
          value={formatRate(email.clickRate)}
          detail={`${formatCount(email.clicked)} unique clicks of ${formatCount(email.delivered)} delivered`}
          comparison={{ text: `${email.converted} converted to an HVA` }}
        />
      </section>

      <section
        aria-label="Marketing charts"
        className="dashboard-chart-grid grid grid-cols-12 gap-4"
      >
        <DashboardPanel
          title="Marketing Spend by Month"
          subtitle="HCP email, social media and paid search spend · Jan–Sep 2026"
          className="col-span-12 xl:col-span-8"
        >
          <StackedMonthlyBars
            data={spendByMonth}
            series={spendSeries}
            formatValue={formatSpend}
            formatTick={dollarTick}
          />
        </DashboardPanel>

        <DashboardPanel
          title={channelView === "spend" ? "Spend by Channel" : "Impressions by Channel"}
          subtitle={
            channelView === "spend"
              ? `${formatSpend(spend.total)} spent ${period.long} · share of total`
              : `${formatCount(paidMedia.impressions)} impressions ${period.long} (k) · share of total`
          }
          className="col-span-12 md:col-span-6 xl:col-span-4"
          action={
            <ViewToggle
              label="Channel view"
              options={channelViews}
              value={channelView}
              onChange={setChannelView}
            />
          }
        >
          {channelView === "spend" ? (
            <RankedBars
              unit="Spend"
              categoryWidth={96}
              formatValue={formatSpend}
              data={spendByChannel}
            />
          ) : (
            <RankedBars
              unit="Impressions (k)"
              categoryWidth={96}
              formatValue={(value) => value.toLocaleString("en-US")}
              data={impressionsByChannel}
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="HCP Email Funnel"
          subtitle="Delivered → opened → clicked → converted (HVA)"
          className="col-span-12 md:col-span-6 xl:col-span-4"
        >
          <StackedCategoryBars
            data={emailFunnel}
            categoryKey="stage"
            categoryWidth={96}
            height={180}
            series={hcpSeries}
            formatValue={formatCount}
          />
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {funnelSteps.map((row) => (
              <div key={row.stage} className="rounded-md bg-secondary/60 px-2 py-1.5">
                <dt className="text-[10px] text-muted-foreground">{row.stage}</dt>
                <dd className="text-sm font-semibold tabular-nums">
                  {row.total.toLocaleString("en-US")}
                </dd>
                <dd className="text-[10px] tabular-nums text-muted-foreground">{row.step}</dd>
              </div>
            ))}
          </dl>
        </DashboardPanel>

        <DashboardPanel
          title="Website Traffic Trend"
          subtitle="Monthly sessions on the HCP and patient brand websites"
          className="col-span-12 md:col-span-6 xl:col-span-4"
        >
          <StackedMonthlyBars
            data={websiteVisitsByMonth}
            series={audienceSeries}
            formatValue={formatCount}
          />
        </DashboardPanel>

        <DashboardPanel
          title="High Value Actions"
          subtitle={`${formatCount(hva.total)} visits completing an HVA · ${formatRate(hva.rate)} of visits`}
          className="col-span-12 md:col-span-6 xl:col-span-4"
        >
          <RankedBars
            unit="HVAs"
            color="series-3"
            categoryWidth={112}
            formatValue={(value) => value.toLocaleString("en-US")}
            data={highValueActions}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Regional Marketing Summary"
          subtitle={`Marketing KPIs by region, ${period.long} · ${scope.geography === "Nation" ? "totals match the cards above" : `${scope.geography} highlighted; totals are national`}`}
          className="col-span-12"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs tabular-nums">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Region
                  </th>
                  {regionColumns.map((column) => (
                    <th
                      key={column.label}
                      scope="col"
                      className="px-3 py-2 text-center font-semibold"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regionalSummary.map((row) => (
                  <tr
                    key={row.region}
                    className={`border-b border-border/60 ${row.region === scope.geography ? "bg-secondary/70" : ""}`}
                  >
                    <th scope="row" className="py-2 pr-3 font-semibold">
                      {row.region}
                    </th>
                    {regionColumns.map((column) => (
                      <td key={column.label} className="px-3 py-2 text-center">
                        {column.value(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold text-primary">
                  <th scope="row" className="py-2 pr-3">
                    {regionalTotal.region}
                  </th>
                  {regionColumns.map((column) => (
                    <td key={column.label} className="px-3 py-2 text-center">
                      {column.value(regionalTotal)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </DashboardPanel>
      </section>
    </>
  );
}
