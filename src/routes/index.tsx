import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Activity,
  Bot,
  Check,
  Gauge,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  LayoutDashboard,
  Lock,
  MapPinned,
  Megaphone,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { ChatTableCell, ResizableHeaderCell } from "@/components/chat-table";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-context";
import { ExecutivePanel } from "@/components/dashboard/executive-panel";
import { FieldPanel } from "@/components/dashboard/field-panel";
import { MarketAccessPanel } from "@/components/dashboard/market-access-panel";
import { MarketingPanel } from "@/components/dashboard/marketing-panel";
import { OverviewPanel } from "@/components/dashboard/overview-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  accessSummary,
  dataThrough,
  filters,
  profiles,
  resolveDashboardAnswer,
  starterQuestionsFor,
  type PanelLabel,
} from "@/lib/dashboard-data";
import { attentionSignalsFor } from "@/lib/outlook-data";
import { buildDashboardData } from "@/lib/scoped-data";
import {
  latestMonth,
  monthNames,
  type Geography,
  type MonthName,
  type TimePeriod,
} from "@/lib/scope";
import { downloadCsv, downloadXlsx, exportFileName, tablesFromMarkdown } from "@/lib/table-export";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Launch Tracker" },
      {
        name: "description",
        content:
          "Track the launch: patient funnel, ex-factory vials and net sales, forecast attainment, market access, payer mix, and channel inventory.",
      },
      { property: "og:title", content: "Launch Tracker" },
      {
        property: "og:description",
        content:
          "An interactive launch tracking demo for patients, vials, net sales, and market access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LaunchTracker,
});

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  title?: string;
  suggestions?: string[];
};

// The assistant can be dragged wider from its left edge; it reopens at the default width.
const chatWidthDefault = 520;
const chatWidthMin = 380;
const chatWidthMax = 960;

// Assistant reply tables: resizable column headers; values centred, text left-aligned.
const chatTableComponents = { th: ResizableHeaderCell, td: ChatTableCell };

// Preset replies are "thought about" briefly, then typed out a word at a time.
const replyThinkingMs = 2000;
const replyWordMs = 28;

function wordEnds(text: string) {
  return Array.from(text.matchAll(/\S+\s*/g), (match) => match.index + match[0].length);
}

function clampChatWidth(width: number) {
  const viewportMax = typeof window === "undefined" ? chatWidthMax : window.innerWidth - 48;
  return Math.round(Math.max(chatWidthMin, Math.min(width, chatWidthMax, viewportMax)));
}

// `hidden` keeps a tab's page and data in the app but leaves it out of the tab bar.
const panels: {
  label: PanelLabel;
  icon: typeof LayoutDashboard;
  Content?: ComponentType;
  hidden?: boolean;
  // Which header filters the tab's data responds to; unsupported ones are greyed out.
  filters?: { geography: boolean; period: boolean };
}[] = [
  { label: "Executive Summary", icon: Gauge, Content: ExecutivePanel },
  {
    label: "Overview",
    icon: LayoutDashboard,
    Content: OverviewPanel,
    hidden: true,
    filters: { geography: false, period: false },
  },
  { label: "Market Access", icon: ShieldCheck, Content: MarketAccessPanel },
  { label: "Marketing", icon: Megaphone, Content: MarketingPanel },
  { label: "Field Activity", icon: MapPinned, Content: FieldPanel },
];

function LaunchTracker() {
  const [geographyLevel, setGeographyLevel] = useState<string>("Nation");
  const [geographyName, setGeographyName] = useState<string>("Nation");
  const [timePeriod, setTimePeriod] = useState<string>("Launch to Date");
  const [month, setMonth] = useState<MonthName>(latestMonth);
  // Figures for the selected geography and period; every tab reads them from context.
  const dashboardData = useMemo(
    () =>
      buildDashboardData({
        geography: geographyName as Geography,
        period: timePeriod as TimePeriod,
        month,
      }),
    [geographyName, timePeriod, month],
  );
  const [profileId, setProfileId] = useState(profiles[0]!.id);
  const [activePanel, setActivePanel] = useState<PanelLabel>("Executive Summary");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatWidth, setChatWidth] = useState(chatWidthDefault);
  // The assistant message being revealed: 0 characters shown means it is still "thinking".
  const [reply, setReply] = useState<{ id: number; shown: number } | null>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => clearTimeout(replyTimer.current), []);

  function resizeChat(width: number) {
    setChatWidth(clampChatWidth(width));
  }

  function closeChat() {
    setChatOpen(false);
    setChatWidth(chatWidthDefault);
  }

  function startChatResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = chatWidth;
    const onMove = (move: PointerEvent) => resizeChat(startWidth + startX - move.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }

  function handleChatResizeKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") resizeChat(chatWidth + 40);
    else if (event.key === "ArrowRight") resizeChat(chatWidth - 40);
    else return;
    event.preventDefault();
  }

  useEffect(() => {
    if (!chatOpen) return;
    textareaRef.current?.focus();
  }, [chatOpen, messages.length]);

  const profile = profiles.find((item) => item.id === profileId) ?? profiles[0]!;
  const shownPanels = panels.filter((item) => !item.hidden);
  const visiblePanels = shownPanels.filter((item) => profile.panels.includes(item.label));
  const panel =
    visiblePanels.find((item) => item.label === activePanel) ?? visiblePanels[0] ?? panels[0]!;
  const PanelIcon = panel.icon;
  const panelFilters = panel.filters ?? { geography: true, period: true };
  const starterQuestions = starterQuestionsFor(panel.label);
  const attentionSignals = attentionSignalsFor(panel.label, profile.panels);
  const isRestricted = visiblePanels.length < shownPanels.length;

  function switchProfile(id: string) {
    const next = profiles.find((item) => item.id === id);
    if (!next || next.id === profile.id) return;
    setProfileId(next.id);
    // The transcript may quote data the next profile can't see, so it doesn't carry over.
    clearChat();
    if (!next.panels.includes(panel.label)) setActivePanel(next.panels[0] ?? "Overview");
  }

  // Ends any reply in progress, leaving its full text visible.
  function finishReply() {
    clearTimeout(replyTimer.current);
    setReply(null);
  }

  function clearChat() {
    finishReply();
    setMessages([]);
  }

  function typeReply(id: number, ends: number[], step: number) {
    if (step >= ends.length) {
      setReply(null);
      return;
    }
    setReply({ id, shown: ends[step]! });
    replyTimer.current = setTimeout(() => typeReply(id, ends, step + 1), replyWordMs);
  }

  function sendQuestion(question: string) {
    finishReply();
    const answer = resolveDashboardAnswer(question, profile.panels);
    const id = Date.now();
    setMessages((current) => [
      ...current,
      { id, role: "user", text: question },
      {
        id: id + 1,
        role: "assistant",
        text: answer.response,
        title: answer.title,
        suggestions: answer.suggestions,
      },
    ]);
    setReply({ id: id + 1, shown: 0 });
    const ends = wordEnds(answer.response);
    replyTimer.current = setTimeout(() => typeReply(id + 1, ends, 0), replyThinkingMs);
  }

  function handlePromptSubmit({ text }: { text: string }, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = text.trim();
    if (question) sendQuestion(question);
  }

  return (
    <main className="min-h-screen bg-background font-dashboard text-foreground">
      <div className="mx-auto min-h-screen max-w-[1800px] px-3 pb-36 pt-4 sm:px-5 sm:pt-5 xl:px-7">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-x-7 gap-y-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase text-muted-foreground">
                Launch tracker · Data through {dataThrough}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-[23px] font-bold leading-tight text-primary sm:text-[26px]">
                  {panel.label}
                </h1>
                {isRestricted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                    <Lock size={12} aria-hidden="true" />
                    Limited access · {accessSummary(profile.panels)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-end gap-2.5 sm:w-auto sm:gap-4">
            <FilterSelect
              label="Geography Level"
              value={geographyLevel}
              values={filters.geographyLevels}
              disabledReason={
                panelFilters.geography ? undefined : `${panel.label} shows national figures only`
              }
              onChange={(level) => {
                setGeographyLevel(level);
                setGeographyName(level === "Region" ? filters.regionNames[0] : "Nation");
              }}
            />
            {geographyLevel === "Region" ? (
              <FilterSelect
                label="Geography Name"
                value={geographyName}
                values={filters.regionNames}
                disabledReason={
                  panelFilters.geography ? undefined : `${panel.label} shows national figures only`
                }
                onChange={setGeographyName}
              />
            ) : (
              <div className="grid min-w-[98px] flex-1 gap-1 text-[11px] leading-none text-foreground sm:min-w-[120px] sm:flex-none">
                <span>Geography Name</span>
                <span className="flex h-8 items-center border border-border bg-secondary/50 px-2 text-xs text-muted-foreground">
                  Nation
                </span>
              </div>
            )}
            <FilterSelect
              label="Time Period"
              value={timePeriod}
              values={filters.timePeriods}
              disabledReason={
                panelFilters.period ? undefined : `${panel.label} shows launch-to-date figures only`
              }
              onChange={setTimePeriod}
            />
            {timePeriod === "Monthly" && (
              <FilterSelect
                label="Month"
                value={month}
                values={monthNames}
                disabledReason={
                  panelFilters.period
                    ? undefined
                    : `${panel.label} shows launch-to-date figures only`
                }
                onChange={(value) => setMonth(value as MonthName)}
              />
            )}
            <div className="ml-1 hidden items-center gap-3 border-l border-border pl-4 sm:flex">
              <span
                role="img"
                aria-label="AUXO"
                className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
              >
                X
              </span>
            </div>
            <ProfileSwitcher activeId={profile.id} onSwitch={switchProfile} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="About this dashboard"
              title="About this dashboard"
              className="hidden text-brand-bright-blue sm:inline-flex"
            >
              <Info size={20} />
            </Button>
          </div>
        </header>

        {panel.Content ? (
          <DashboardDataProvider value={dashboardData}>
            <panel.Content />
          </DashboardDataProvider>
        ) : (
          <section className="dashboard-panel flex min-h-[420px] flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
              <PanelIcon size={26} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">{panel.label}</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                This section is a placeholder in the demo.
              </p>
            </div>
          </section>
        )}
      </div>

      <nav
        aria-label="Dashboard navigation"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-3 backdrop-blur-md sm:px-6"
      >
        <div className="mx-auto flex h-[64px] max-w-[1800px] items-center gap-1 overflow-x-auto">
          {visiblePanels.map(({ label, icon: Icon, Content }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              onClick={() => setActivePanel(label)}
              aria-current={panel.label === label ? "page" : undefined}
              className={`h-full shrink-0 rounded-none border-b-2 px-3 text-xs sm:px-5 ${panel.label === label ? "border-primary bg-secondary/60 font-semibold text-primary" : "border-transparent text-muted-foreground"}`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {!Content && <span className="sr-only">, placeholder</span>}
            </Button>
          ))}
          <div className="ml-auto hidden items-center gap-2 pr-2 text-[11px] text-muted-foreground sm:flex">
            <span className="size-2 rounded-full bg-series-2" />
            Demo data · {profile.name} · {geographyName} ·{" "}
            {timePeriod === "Monthly" ? month : timePeriod}
          </div>
        </div>
      </nav>

      {chatOpen ? (
        <aside
          aria-label="Dashboard Assistant"
          style={{ width: `min(${chatWidth}px, calc(100vw - 24px))` }}
          className="fixed bottom-20 right-3 z-40 flex h-[min(690px,calc(100dvh-100px))] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl sm:right-6"
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize assistant"
            aria-valuenow={chatWidth}
            aria-valuemin={chatWidthMin}
            aria-valuemax={chatWidthMax}
            title="Drag to resize · double-click to reset"
            tabIndex={0}
            onPointerDown={startChatResize}
            onDoubleClick={() => resizeChat(chatWidthDefault)}
            onKeyDown={handleChatResizeKey}
            className="absolute inset-y-0 left-0 z-10 hidden w-1.5 cursor-ew-resize transition-colors hover:bg-primary/30 focus-visible:bg-primary/30 focus-visible:outline-none sm:block"
          />
          <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <Bot size={19} />
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Dashboard Assistant</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-series-2" />
                  Ready to help
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear conversation"
                title="Clear conversation"
                onClick={() => {
                  clearChat();
                  textareaRef.current?.focus();
                }}
              >
                <RotateCcw size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close chat"
                title="Close chat"
                onClick={closeChat}
              >
                <X size={17} />
              </Button>
            </div>
          </header>

          <Conversation className="chat-transcript min-h-0 flex-1">
            <ConversationContent className="gap-5 px-4 py-4">
              <AssistantMessage
                text={"Hi! I'm your Dashboard Assistant. What would you like to know?"}
              />
              {messages.map((message) => {
                const revealing = reply?.id === message.id ? reply : null;
                return (
                  <Message key={message.id} from={message.role} className="max-w-full gap-1.5">
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "max-w-[92%] rounded-md bg-primary px-3.5 py-2.5 text-primary-foreground"
                          : "max-w-full px-0 py-0"
                      }
                    >
                      {revealing?.shown === 0 ? (
                        <TypingDots />
                      ) : (
                        <MessageResponse
                          controls={{ table: false }}
                          components={chatTableComponents}
                          isAnimating={Boolean(revealing)}
                        >
                          {revealing ? message.text.slice(0, revealing.shown) : message.text}
                        </MessageResponse>
                      )}
                    </MessageContent>
                    {message.role === "assistant" && !revealing && (
                      <ReplyDownload text={message.text} title={message.title ?? ""} />
                    )}
                    {message.role === "assistant" && !revealing && (
                      <QuestionSuggestions
                        questions={message.suggestions ?? starterQuestions.slice(0, 3)}
                        onQuestion={sendQuestion}
                        compact
                      />
                    )}
                  </Message>
                );
              })}
            </ConversationContent>
          </Conversation>

          {messages.length === 0 && (
            <div className="shrink-0 px-4 pb-3">
              {attentionSignals.length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    <TriangleAlert size={13} className="text-watch" /> Flagged in the data
                  </p>
                  <div className="grid gap-1.5">
                    {attentionSignals.map((signal) => (
                      <button
                        key={signal.question}
                        type="button"
                        onClick={() => sendQuestion(signal.question)}
                        className="rounded-md border border-watch/30 bg-watch/5 px-2.5 py-2 text-left leading-snug transition-colors hover:bg-watch/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block text-[11px] font-medium text-foreground">
                          {signal.question}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {signal.reason}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                <Sparkles size={13} className="text-primary" /> Suggested questions
              </p>
              <QuestionSuggestions questions={starterQuestions} onQuestion={sendQuestion} />
            </div>
          )}

          <div className="shrink-0 border-t border-border bg-card px-3.5 py-3">
            <PromptInput onSubmit={handlePromptSubmit}>
              <PromptInputTextarea
                ref={textareaRef}
                aria-label="Ask the dashboard assistant"
                placeholder="Ask about this dashboard…"
                className="min-h-11 px-3 py-3 text-sm"
              />
              <PromptInputFooter className="justify-between border-t border-border px-2 py-1.5">
                <span className="text-[10px] text-muted-foreground">
                  Dashboard demo · preset replies
                </span>
                <PromptInputSubmit className="size-8 rounded-md" aria-label="Send message">
                  <Send size={15} />
                </PromptInputSubmit>
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
          className="chat-launcher fixed bottom-20 z-30 size-12 rounded-full shadow-lg"
        >
          <MessageCircle size={21} />
          <span className="sr-only">Dashboard Assistant</span>
        </Button>
      )}
    </main>
  );
}

function ProfileSwitcher({
  activeId,
  onSwitch,
}: {
  activeId: string;
  onSwitch: (id: string) => void;
}) {
  const active = profiles.find((item) => item.id === activeId) ?? profiles[0]!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Signed in as ${active.name}. Switch profile`}
          className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:border-l sm:border-border sm:pl-3"
        >
          <span
            className="grid size-8 place-items-center rounded-full bg-secondary text-lg"
            aria-hidden="true"
          >
            {active.avatar}
          </span>
          <span className="text-xs leading-[1.3]">
            <span className="block font-bold">Welcome back,</span>
            <span>{active.name}</span>
          </span>
          <ChevronDown size={14} className="text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[11px] font-semibold uppercase text-muted-foreground">
          Switch profile (demo)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profiles.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onSelect={() => onSwitch(item.id)}
            className="items-start gap-2.5 py-2"
          >
            <span
              className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-base"
              aria-hidden="true"
            >
              {item.avatar}
            </span>
            <span className="min-w-0 flex-1 text-xs leading-snug">
              <span className="block font-semibold">{item.name}</span>
              <span className="block text-muted-foreground">{item.role}</span>
              <span className="block text-[11px] text-muted-foreground">
                Access: {accessSummary(item.panels)}
              </span>
            </span>
            {item.id === active.id && (
              <Check size={14} className="mt-0.5 text-primary" aria-label="Current profile" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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

function ReplyDownload({ text, title }: { text: string; title: string }) {
  const tables = tablesFromMarkdown(text);
  if (!tables.length) return null;
  const fileName = exportFileName(title);
  const label = tables.length > 1 ? `Download ${tables.length} tables` : "Download table";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download size={13} />
          {label}
          <ChevronDown size={12} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onSelect={() => void downloadXlsx(tables, fileName)}>
          <FileSpreadsheet size={15} className="text-series-2" />
          Excel (.xlsx)
          {tables.length > 1 && (
            <span className="ml-auto text-[10px] text-muted-foreground">1 sheet each</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadCsv(tables, fileName)}>
          <FileText size={15} className="text-muted-foreground" />
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TypingDots() {
  return (
    <div className="typing-dots" role="status" aria-label="Assistant is typing">
      <span />
      <span />
      <span />
      <span />
    </div>
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
  disabledReason,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
  // When set, the filter doesn't apply to the current tab: it is greyed out and says why.
  disabledReason?: string | undefined;
}) {
  const disabled = Boolean(disabledReason);
  return (
    <label
      title={disabledReason}
      className={`grid min-w-[98px] flex-1 gap-1 text-[11px] leading-none text-foreground sm:min-w-[120px] sm:flex-none ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span>{label}</span>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-8 rounded-none border-border bg-card px-2 text-xs shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {values.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
