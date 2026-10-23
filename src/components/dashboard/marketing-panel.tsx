import { Eye, Globe, Link, MailCheck, MailOpen, MousePointerClick, Target } from "lucide-react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  axisTick,
  tooltipProps,
  valueLabel,
  type Series,
} from "@/components/dashboard/chart-theme";
import {
  DashboardPanel,
  RankedBars,
  StackedCategoryBars,
  StackedMonthlyBars,
  StatCard,
} from "@/components/dashboard/primitives";
import {
  emailByAudience,
  emailFunnel,
  engagementByMonth,
  formatCount,
  formatRate,
  highValueActions,
  impressionsByChannel,
  impressionsByMonth,
  marketingKpis,
  regionalSummary,
  regionalTotal,
  websiteVisitsByMonth,
} from "@/lib/marketing-data";

const channelSeries: Series[] = [
  { key: "display", label: "Display ads", color: "series-1" },
  { key: "video", label: "Pre-roll video", color: "series-2" },
  { key: "social", label: "Social media", color: "series-3" },
  { key: "search", label: "Paid search", color: "series-4" },
  { key: "other", label: "Other", color: "target" },
];

const audienceSeries: Series[] = [
  { key: "hcp", label: "HCP", color: "series-1" },
  { key: "patient", label: "Patient", color: "series-2" },
];

const regionColumns = [
  { label: "Impressions", value: (row: typeof regionalTotal) => formatCount(row.impressions) },
  {
    label: "Engagement rate",
    value: (row: typeof regionalTotal) => formatRate(row.engagementRate),
  },
  { label: "Website visits", value: (row: typeof regionalTotal) => formatCount(row.visits) },
  { label: "HVA rate", value: (row: typeof regionalTotal) => formatRate(row.hvaRate) },
  { label: "Delivered emails", value: (row: typeof regionalTotal) => formatCount(row.delivered) },
  { label: "Open rate", value: (row: typeof regionalTotal) => formatRate(row.openRate) },
  { label: "Click rate", value: (row: typeof regionalTotal) => formatRate(row.clickRate) },
];

export function MarketingPanel() {
  const { impressions, engagement, website, hva, email } = marketingKpis;
  const funnelRows = emailFunnel.map((row, i) => {
    const previous = emailFunnel[i - 1];
    return {
      ...row,
      step: previous
        ? `${Math.round((row.total / previous.total) * 1000) / 10}% of ${previous.stage.toLowerCase()}`
        : "—",
    };
  });
  const [hcpEmail, patientEmail] = emailByAudience;

  return (
    <>
      <section
        aria-label="Marketing KPIs"
        className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7"
      >
        <StatCard
          title="Media Impressions"
          Icon={Eye}
          value={formatCount(impressions.total)}
          detail="Display, pre-roll video, social and paid search"
          comparison={{
            text: `${formatCount(impressions.latestMonth)} in M9, up from ${formatCount(impressions.firstMonth)} in M1`,
            direction: "up",
          }}
        />
        <StatCard
          title="Click & Video Engagement"
          Icon={MousePointerClick}
          value={formatRate(engagement.rate)}
          detail={`${formatCount(engagement.clicks)} clicks + ${formatCount(engagement.videoViews)} video views`}
          comparison={{
            text: `${formatRate(engagement.latestMonthRate)} in M9 vs ${formatRate(engagement.firstMonthRate)} in M1`,
            direction: "up",
          }}
        />
        <StatCard
          title="Website Visits"
          Icon={Globe}
          value={formatCount(website.total)}
          detail={`HCP ${formatCount(website.hcp)} · Patient ${formatCount(website.patient)}`}
          comparison={{ text: `+${website.growthVsPriorPct}% in M9 vs M8`, direction: "up" }}
        />
        <StatCard
          title="HVA Rate"
          Icon={Target}
          value={formatRate(hva.rate)}
          detail={`${formatCount(hva.total)} high value actions from ${formatCount(website.total)} visits`}
          comparison={{ text: "Rep requests, support sign-ups, downloads" }}
        />
        <StatCard
          title="Delivered Emails"
          Icon={MailCheck}
          value={formatCount(email.delivered)}
          detail={`${formatCount(email.sent)} sent less ${formatCount(email.bounced)} bounces`}
          comparison={{
            text: `HCP ${formatCount(hcpEmail?.delivered ?? 0)} · Patient ${formatCount(patientEmail?.delivered ?? 0)}`,
          }}
        />
        <StatCard
          title="Email Open Rate"
          Icon={MailOpen}
          value={formatRate(email.openRate)}
          detail={`${formatCount(email.opened)} unique opens of ${formatCount(email.delivered)} delivered`}
          comparison={{ text: `Click-to-open ${formatRate(email.clickToOpenRate)}` }}
        />
        <StatCard
          title="Email Click Rate"
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
          title="Media Impressions"
          subtitle="Monthly paid media impressions (k) by channel · M1 = Jan 2026"
          className="col-span-12 xl:col-span-8"
        >
          <StackedMonthlyBars data={impressionsByMonth} series={channelSeries} />
        </DashboardPanel>

        <DashboardPanel
          title="Impressions by Channel"
          subtitle={`${formatCount(impressions.total)} impressions since launch (k) · share of total`}
          className="col-span-12 md:col-span-6 xl:col-span-4"
        >
          <RankedBars
            unit="Impressions (k)"
            categoryWidth={92}
            formatValue={(value) => value.toLocaleString("en-US")}
            data={impressionsByChannel}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Website Traffic Trend"
          subtitle="Monthly sessions on the HCP and patient brand websites"
          className="col-span-12 md:col-span-6 xl:col-span-6"
        >
          <StackedMonthlyBars
            data={websiteVisitsByMonth}
            series={audienceSeries}
            formatValue={formatCount}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Click & Video Engagement Rate"
          subtitle="(Ad clicks + video views) ÷ media impressions, by month"
          className="col-span-12 md:col-span-6 xl:col-span-6"
        >
          <div className="dashboard-chart h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={engagementByMonth}
                margin={{ top: 22, right: 16, bottom: 2, left: -20 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="3 4"
                />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis
                  domain={[0, 10]}
                  tickLine={false}
                  axisLine={false}
                  tick={axisTick}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  {...tooltipProps}
                  cursor={{ stroke: "var(--color-border)" }}
                  formatter={(value) => [`${value}%`, "Engagement rate"]}
                />
                <Line
                  dataKey="rate"
                  name="Engagement rate"
                  type="monotone"
                  stroke="var(--series-1)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--series-1)" }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="rate"
                    position="top"
                    style={valueLabel}
                    formatter={(v: unknown) => formatRate(Number(v))}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Email Performance Funnel"
          subtitle="Delivered → opened → clicked → converted (HVA), HCP and patient campaigns"
          className="col-span-12 md:col-span-6 xl:col-span-7"
        >
          <StackedCategoryBars
            data={emailFunnel}
            categoryKey="stage"
            categoryWidth={96}
            height={212}
            series={audienceSeries}
            formatValue={formatCount}
          />
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {funnelRows.slice(1).map((row) => (
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
          title="High Value Actions"
          subtitle={`${hva.total.toLocaleString("en-US")} visits completing an HVA · ${formatRate(hva.rate)} of visits`}
          className="col-span-12 md:col-span-6 xl:col-span-5"
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
          subtitle="Marketing KPIs by region · totals match the cards above"
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
                      className="px-3 py-2 text-right font-semibold"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regionalSummary.map((row) => (
                  <tr key={row.region} className="border-b border-border/60">
                    <th scope="row" className="py-2 pr-3 font-semibold">
                      {row.region}
                    </th>
                    {regionColumns.map((column) => (
                      <td key={column.label} className="px-3 py-2 text-right">
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
                    <td key={column.label} className="px-3 py-2 text-right">
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
