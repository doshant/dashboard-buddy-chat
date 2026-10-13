import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardList,
  FileChartColumn,
  Info,
  MessageCircle,
  MessageSquareText,
  PenLine,
  RotateCcw,
  Send,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  callAttainment,
  claimStatus,
  dashboardAnswers,
  engagement,
  filters,
  monthlyShare,
  products,
  resolveDashboardAnswer,
  salesAttainment,
  starterQuestions,
} from "@/lib/dashboard-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Executive Summary | AUXO Analytics" },
      {
        name: "description",
        content:
          "Explore prescription, writer, unit sales, market share, engagement, and claim status in the AUXO Analytics Executive Summary demo.",
      },
      { property: "og:title", content: "Executive Summary | AUXO Analytics" },
      {
        property: "og:description",
        content:
          "An interactive executive analytics demo for prescription, sales, and market share trends.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExecutiveSummary,
});

type ChatMessage = { id: number; role: "user" | "assistant"; text: string };

const panels = [
  { label: "Executive Summary", icon: FileChartColumn },
  { label: "Performance", icon: BarChart3 },
  { label: "Engagement", icon: UsersRound },
  { label: "Claims", icon: ClipboardList },
];

function ExecutiveSummary() {
  const [geographyLevel, setGeographyLevel] = useState<string>("Nation");
  const [geographyName, setGeographyName] = useState<string>("Nation");
  const [timePeriod, setTimePeriod] = useState<string>("R13M");
  const [activePanel, setActivePanel] = useState("Executive Summary");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!chatOpen) return;
    textareaRef.current?.focus();
  }, [chatOpen, messages.length]);

  function sendQuestion(question: string) {
    const answer = resolveDashboardAnswer(question);
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", text: question },
      { id: Date.now() + 1, role: "assistant", text: answer.response },
    ]);
  }

  function handlePromptSubmit(
    { text }: { text: string },
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const question = text.trim();
    if (question) sendQuestion(question);
  }

  return (
    <main className="min-h-screen bg-background font-dashboard text-foreground">
      <div className="mx-auto min-h-screen max-w-[1800px] px-3 pb-24 pt-4 sm:px-5 sm:pb-20 sm:pt-5 xl:px-7">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-x-7 gap-y-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase text-muted-foreground">
                AUXO / Commercial analytics
              </p>
              <h1 className="text-[23px] font-bold leading-tight text-primary sm:text-[26px]">
                {activePanel}
              </h1>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-end gap-2.5 sm:w-auto sm:gap-4">
            <FilterSelect
              label="Geography Level"
              value={geographyLevel}
              values={filters.geographyLevels}
              onChange={setGeographyLevel}
            />
            <FilterSelect
              label="Geography Name"
              value={geographyName}
              values={filters.geographyNames}
              onChange={setGeographyName}
            />
            <FilterSelect
              label="Time Period"
              value={timePeriod}
              values={filters.timePeriods}
              onChange={setTimePeriod}
            />
            <div className="ml-1 hidden items-center gap-3 border-l border-border pl-4 sm:flex">
              <div className="flex items-center gap-2" aria-label="AUXO analytics">
                <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  X
                </span>
                <span className="text-lg font-bold text-primary">AUXO</span>
              </div>
              <div className="flex items-center gap-2.5 border-l border-border pl-3">
                <span className="grid size-8 place-items-center rounded-full bg-secondary text-lg" aria-hidden="true">
                  👩🏻‍💼
                </span>
                <span className="text-xs leading-[1.3]">
                  <span className="block font-bold">Welcome back,</span>
                  <span>Jenny</span>
                </span>
              </div>
              <Button variant="ghost" size="icon" aria-label="About this dashboard" title="About this dashboard" className="text-sky-700">
                <Info size={20} />
              </Button>
            </div>
          </div>
        </header>

        {activePanel === "Executive Summary" ? (
          <>
            <section aria-label="Executive KPIs" className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <KpiCard
                title="Total Prescription"
                Icon={ClipboardList}
                metrics={[
                  { product: "Rengene", current: "2,529", prior: "2,592", change: "−2%", direction: "down" },
                  { product: "Staquala", current: "6,563", prior: "5,787", change: "13%", direction: "up" },
                ]}
              />
              <KpiCard
                title="Total Writers"
                Icon={PenLine}
                metrics={[
                  { product: "Rengene", current: "472", prior: "562", change: "−16%", direction: "down" },
                  { product: "Staquala", current: "1,300", prior: "997", change: "30%", direction: "up" },
                ]}
              />
              <KpiCard
                title="Unit Sales"
                Icon={ChartNoAxesCombined}
                metrics={[
                  { product: "Rengene", current: "3,100", prior: "4,359", change: "−29%", direction: "down" },
                  { product: "Staquala", current: "9,961", prior: "5,833", change: "71%", direction: "up" },
                ]}
              />
            </section>

            <section aria-label="Executive charts" className="dashboard-chart-grid grid grid-cols-12 gap-4">
              <DashboardPanel title="Patient Market Share" className="col-span-12 lg:col-span-5">
                <div className="dashboard-chart h-[220px] sm:h-[236px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyShare} margin={{ top: 17, right: 12, bottom: 4, left: -16 }}>
                      <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} interval={1} />
                      <YAxis domain={[0, 40]} ticks={[0, 10, 20, 30, 40]} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Line dataKey="rengene" type="monotone" stroke="var(--color-rengene)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}>
                        <LabelList dataKey="rengene" position="top" formatter={(value) => `${value}%`} style={{ fontSize: 9, fill: "var(--color-foreground)" }} />
                      </Line>
                      <Line dataKey="staquala" type="monotone" stroke="var(--color-staquala)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}>
                        <LabelList dataKey="staquala" position="bottom" formatter={(value) => `${value}%`} style={{ fontSize: 9, fill: "var(--color-foreground)" }} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend items={[{ label: "Rengene", className: "bg-rengene" }, { label: "Staquala", className: "bg-staquala" }]} />
              </DashboardPanel>

              <DashboardPanel title="Attainment vs Forecast – Sales ($)" className="col-span-12 lg:col-span-4">
                <div className="dashboard-chart h-[220px] sm:h-[236px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesAttainment} margin={{ top: 19, right: 9, bottom: 2, left: -17 }} barGap={0}>
                      <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
                      <XAxis dataKey="product" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} />
                      <YAxis domain={[0, 4.5]} ticks={[0, 1, 2, 3, 4]} tickFormatter={(v) => `${v}M`} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} />
                      <Tooltip formatter={(value) => `$${Number(value).toFixed(1)}M`} />
                      <Bar dataKey="forecast" name="Forecast" fill="var(--color-muted)" radius={[2, 2, 0, 0]} maxBarSize={38}>
                        <LabelList dataKey="forecast" position="top" formatter={(v) => `$${Number(v).toFixed(1)}M`} style={{ fontSize: 9, fill: "var(--color-foreground)" }} />
                      </Bar>
                      <Bar dataKey="sales" name="Dollar Sales" fill="var(--color-primary)" radius={[2, 2, 0, 0]} maxBarSize={38}>
                        <LabelList dataKey="sales" position="top" formatter={(v) => `$${Number(v).toFixed(1)}M`} style={{ fontSize: 9, fill: "var(--color-foreground)" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend items={[{ label: "Forecast", className: "bg-muted-foreground/30" }, { label: "Dollar Sales", className: "bg-primary" }]} />
              </DashboardPanel>

              <DashboardPanel title="Call Attainment" className="col-span-12 lg:col-span-3">
                <div className="dashboard-chart h-[220px] sm:h-[236px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={callAttainment} layout="vertical" margin={{ top: 11, right: 33, bottom: 11, left: 3 }}>
                      <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="3 4" />
                      <XAxis type="number" domain={[0, 120]} ticks={[0, 50, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} />
                      <YAxis type="category" dataKey="product" tickLine={false} axisLine={false} width={62} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="attainment" name="Claim Attainment" radius={[0, 2, 2, 0]} maxBarSize={32}>
                        {callAttainment.map((entry, index) => <Cell key={entry.product} fill={index === 0 ? "var(--color-rengene)" : "var(--color-staquala)"} />)}
                        <LabelList dataKey="attainment" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 9, fill: "var(--color-foreground)" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="-mt-1 text-center text-[9px] text-muted-foreground">Claim Attainment %</p>
              </DashboardPanel>

              <DashboardPanel title="Digital HCP Engagement" className="col-span-12 lg:col-span-9" centeredTitle>
                <div className="grid h-[236px] grid-cols-1 gap-1 sm:grid-cols-2">
                  <EngagementPie values={engagement.rengene} product="Rengene" colors={["var(--color-pie-violet)", "var(--color-rengene)", "var(--color-pie-rose)", "var(--color-pie-ice)"]} />
                  <EngagementPie values={engagement.staquala} product="Staquala" colors={["var(--color-claim-base)", "var(--color-staquala)", "var(--color-chart-4)", "var(--color-pie-ice)"]} />
                </div>
              </DashboardPanel>

              <DashboardPanel title="Claim Status" className="col-span-12 lg:col-span-3">
                <div className="dashboard-chart h-[225px] sm:h-[236px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={claimStatus} margin={{ top: 5, right: 7, bottom: 2, left: -22 }} barGap={20}>
                      <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
                      <XAxis dataKey="product" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} />
                      <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fontSize: 8, fill: "var(--color-muted-foreground)" }} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="approved" name="% Approved" stackId="claim" fill="var(--color-claim-approved)" maxBarSize={51}>
                        <LabelList dataKey="approved" position="center" formatter={(v) => `${Number(v).toFixed(2)}%`} style={{ fontSize: 8, fill: "var(--color-primary-foreground)" }} />
                      </Bar>
                      <Bar dataKey="rejected" name="% Rejected" stackId="claim" fill="var(--color-claim-rejected)" maxBarSize={51}>
                        <LabelList dataKey="rejected" position="center" formatter={(v) => `${Number(v).toFixed(2)}%`} style={{ fontSize: 8, fill: "var(--color-primary-foreground)" }} />
                      </Bar>
                      <Bar dataKey="abandoned" name="% Abandoned" stackId="claim" fill="var(--color-claim-abandoned)" maxBarSize={51}>
                        <LabelList dataKey="abandoned" position="center" formatter={(v) => `${Number(v).toFixed(2)}%`} style={{ fontSize: 8, fill: "var(--color-primary-foreground)" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend items={[{ label: "% Approved", className: "bg-claim-approved" }, { label: "% Rejected", className: "bg-claim-rejected" }, { label: "% Abandoned", className: "bg-claim-abandoned" }]} />
              </DashboardPanel>
            </section>
          </>
        ) : (
          <section className="dashboard-panel flex min-h-[420px] flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
              {activePanel === "Performance" ? <BarChart3 size={26} /> : activePanel === "Engagement" ? <UsersRound size={26} /> : <ClipboardList size={26} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">{activePanel}</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">This section is a placeholder in the demo.</p>
            </div>
          </section>
        )}
      </div>

      <nav aria-label="Dashboard navigation" className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex h-[64px] max-w-[1800px] items-center gap-1 overflow-x-auto">
          {panels.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              onClick={() => setActivePanel(label)}
              aria-current={activePanel === label ? "page" : undefined}
              className={`h-full shrink-0 rounded-none border-b-2 px-3 text-xs sm:px-5 ${activePanel === label ? "border-primary bg-secondary/60 font-semibold text-primary" : "border-transparent text-muted-foreground"}`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {label !== "Executive Summary" && <span className="sr-only">, placeholder</span>}
            </Button>
          ))}
          <div className="ml-auto hidden items-center gap-2 pr-2 text-[11px] text-muted-foreground sm:flex">
            <span className="size-2 rounded-full bg-staquala" />
            Demo data · {geographyName} · {timePeriod}
          </div>
        </div>
      </nav>

      {chatOpen ? (
        <aside aria-label="Dashboard Assistant" className="fixed bottom-[74px] right-3 z-40 flex h-[min(690px,calc(100dvh-96px))] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl sm:bottom-6 sm:right-6">
          <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <Bot size={19} />
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Dashboard Assistant</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="size-1.5 rounded-full bg-staquala" />Ready to help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Clear conversation" title="Clear conversation" onClick={() => { setMessages([]); textareaRef.current?.focus(); }}>
                <RotateCcw size={16} />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Close chat" title="Close chat" onClick={() => setChatOpen(false)}>
                <X size={17} />
              </Button>
            </div>
          </header>

          <Conversation className="chat-transcript min-h-0 flex-1">
            <ConversationContent className="gap-5 px-4 py-4">
              <AssistantMessage text={"Hi! I'm your Dashboard Assistant. What would you like to know?"} />
              {messages.map((message) => (
                <Message key={message.id} from={message.role} className="max-w-full gap-1.5">
                  <MessageContent className={message.role === "user" ? "max-w-[92%] rounded-md bg-primary px-3.5 py-2.5 text-primary-foreground" : "max-w-full px-0 py-0"}>
                    <MessageResponse>{message.text}</MessageResponse>
                  </MessageContent>
                  {message.role === "assistant" && <QuestionSuggestions questions={resolveSuggestionsFor(message.text)} onQuestion={sendQuestion} compact />}
                </Message>
              ))}
            </ConversationContent>
          </Conversation>

          {messages.length === 0 && (
            <div className="shrink-0 px-4 pb-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                <Sparkles size={13} className="text-primary" /> Suggested questions
              </p>
              <QuestionSuggestions questions={starterQuestions} onQuestion={sendQuestion} />
            </div>
          )}

          <div className="shrink-0 border-t border-border bg-card px-3.5 py-3">
            <PromptInput onSubmit={handlePromptSubmit}>
              <PromptInputTextarea ref={textareaRef} aria-label="Ask the dashboard assistant" placeholder="Ask about this dashboard…" className="min-h-11 px-3 py-3 text-sm" />
              <PromptInputFooter className="justify-between border-t border-border px-2 py-1.5">
                <span className="text-[10px] text-muted-foreground">Dashboard demo · preset replies</span>
                <PromptInputSubmit className="size-8 rounded-md" aria-label="Send message"><Send size={15} /></PromptInputSubmit>
              </PromptInputFooter>
            </PromptInput>
          </div>
        </aside>
      ) : (
        <Button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Open Dashboard Assistant"
          title="Open Dashboard Assistant"
          className="fixed bottom-[79px] right-4 z-30 size-12 rounded-full shadow-lg sm:bottom-6 sm:right-6"
        >
          <MessageCircle size={21} />
          <span className="sr-only">Dashboard Assistant</span>
        </Button>
      )}
    </main>
  );
}

function resolveSuggestionsFor(response: string) {
  const matching = Object.values(dashboardAnswers).find((answer) => answer.response === response);
  return matching?.suggestions ?? starterQuestions.slice(0, 3);
}

function AssistantMessage({ text }: { text: string }) {
  return (
    <Message from="assistant" className="max-w-full gap-1.5">
      <MessageContent className="px-0 py-0">
        <MessageResponse>{text}</MessageResponse>
      </MessageContent>
    </Message>
  );
}

function QuestionSuggestions({
  questions,
  onQuestion,
  compact = false,
}: {
  questions: string[];
  onQuestion: (question: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "mt-1" : ""}`}>
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onQuestion(question)}
          className="max-w-full rounded-md border border-border bg-background px-2.5 py-2 text-left text-[11px] leading-snug text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {question}
        </button>
      ))}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-[98px] flex-1 gap-1 text-[11px] leading-none text-foreground sm:min-w-[120px] sm:flex-none">
      <span>{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 rounded-none border-border bg-card px-2 text-xs shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {values.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

function KpiCard({
  title,
  Icon,
  metrics,
}: {
  title: string;
  Icon: typeof ClipboardList;
  metrics: { product: string; current: string; prior: string; change: string; direction: "up" | "down" }[];
}) {
  return (
    <section className="dashboard-panel flex min-h-[114px] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary">
        <Icon size={21} strokeWidth={2.1} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="mb-2 text-sm font-bold text-primary">{title}</h2>
        <div className="grid grid-cols-2 divide-x divide-border">
          {metrics.map((metric) => {
            const UpIcon = metric.direction === "up" ? ArrowUpRight : ArrowDownRight;
            return (
              <div key={metric.product} className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-4">
                <p className="truncate text-xs text-muted-foreground">{metric.product}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">{metric.current}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] tabular-nums">
                  <span>{metric.prior}</span>
                  <span className={`inline-flex items-center gap-0.5 whitespace-nowrap font-medium ${metric.direction === "up" ? "text-trend-up" : "text-trend-down"}`}>
                    {metric.change}<UpIcon size={12} strokeWidth={2.7} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DashboardPanel({
  title,
  className,
  centeredTitle = false,
  children,
}: {
  title: string;
  className: string;
  centeredTitle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`dashboard-panel p-3 sm:p-3.5 ${className}`}>
      <h2 className={`mb-1.5 text-sm font-bold leading-snug text-primary ${centeredTitle ? "text-center" : ""}`}>{title}</h2>
      {children}
    </section>
  );
}

function ChartLegend({
  items,
}: {
  items: { label: string; className: string }[];
}) {
  return (
    <div className="flex min-h-4 flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          <span className={`size-2 rounded-full ${item.className}`} />{item.label}
        </span>
      ))}
    </div>
  );
}

function EngagementPie({
  values,
  product,
  colors,
}: {
  values: { name: string; value: number }[];
  product: string;
  colors: string[];
}) {
  return (
    <div className="relative min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 14, right: 22, bottom: 18, left: 22 }}>
          <Tooltip formatter={(value) => `${value}%`} />
          <Pie data={values} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="67%" labelLine={{ stroke: "var(--color-muted-foreground)", strokeWidth: 0.8 }} label={({ name, value }) => `${name} ${value}%`}>
            {values.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} stroke="var(--color-card)" strokeWidth={1} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <p className="absolute inset-x-0 bottom-0 text-center text-xs font-bold text-primary">{product}</p>
    </div>
  );
}