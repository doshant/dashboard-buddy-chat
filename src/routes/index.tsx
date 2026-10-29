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
  LayoutDashboard,
  Lock,
  MapPinned,
  SlidersHorizontal,
  Megaphone,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
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
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { InputGroupAddon } from "@/components/ui/input-group";
import { ChatSuggestion } from "@/components/chat-suggestion";
import { ChatTableCell, ResizableHeaderCell } from "@/components/chat-table";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-context";
import { ExecutivePanel } from "@/components/dashboard/executive-panel";
import { FieldPanel } from "@/components/dashboard/field-panel";
import {
  SimulatorLeversContext,
  SimulatorPanel,
  previewScenarios,
  simulatorScenarios,
  type SimulatorScenario,
} from "@/components/dashboard/simulator-panel";
import { marketingWhatIfFor, type MarketingLevers } from "@/lib/marketing-simulator-data";
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
import { whatIfFor, type SimulatorLevers } from "@/lib/simulator-data";
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
  // Assistant answers come from Claude; "preset" marks the offline fallback answer.
  source?: "claude" | "preset";
  // Set when a live answer was expected but failed, so the preset answer is labelled.
  fallback?: boolean;
};

// Earlier turns sent with each question so Claude can follow up on them.
const chatHistoryTurns = 10;

// On wide screens the assistant is a pane docked to the right: a quarter of the screen by default
// (at least 320px), draggable from its left edge up to half the screen, and collapsible to a
// slim rail. On narrow screens it is a pop-up opened from a button. Either way it reopens at the
// default width.
const dockedQuery = "(min-width: 1024px)";
const dockedWidthDefault = "max(320px, 25vw)";
const collapsedRailWidth = 48;
const popupWidthDefault = 520;
const chatWidthMin = 320;

// Assistant reply tables: resizable column headers; values centred, text left-aligned.
// Side gutters between the window edge and the dashboard panels.
const pageGutter = "px-3 sm:px-5 xl:px-7";

const chatTableComponents = {
  th: ResizableHeaderCell,
  td: ChatTableCell,
  blockquote: ChatSuggestion,
};

// Every reply, live or preset, is "thought about" for at least this long, then typed out a word at
// a time at a steady pace, with a short beat at each new line. A live answer keeps arriving while it
// types; if the typing catches up, it waits for the next words.
const replyThinkingMs = 2500;
const replyWordMs = 40;
const replyLineMs = 120;

// Where the next whole word after `from` ends, or null if there isn't one yet. While text is still
// arriving, the last word may be cut off, so it waits.
function nextWordEnd(text: string, from: number, complete: boolean) {
  const word = /\S+\s*/g;
  word.lastIndex = from;
  const match = word.exec(text);
  if (!match) return null;
  const end = match.index + match[0].length;
  return end === text.length && !complete ? null : { end, newLine: match[0].includes("\n") };
}

function clampChatWidth(width: number, docked: boolean) {
  const viewport = typeof window === "undefined" ? 1440 : window.innerWidth;
  const max = docked ? viewport * 0.5 : viewport - 48;
  return Math.round(Math.max(chatWidthMin, Math.min(width, max)));
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
  { label: "Performance Snapshot", icon: Gauge, Content: ExecutivePanel },
  {
    label: "Overview",
    icon: LayoutDashboard,
    Content: OverviewPanel,
    hidden: true,
    filters: { geography: false, period: false },
  },
  {
    label: "What-If Simulator",
    icon: SlidersHorizontal,
    Content: SimulatorPanel,
    filters: { geography: true, period: false },
  },
  { label: "Marketing", icon: Megaphone, Content: MarketingPanel },
  { label: "Market Access", icon: ShieldCheck, Content: MarketAccessPanel },
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
  // What-If Simulator: which levers it shows (Marketing first) and their values; null means
  // today's values. Each profile gets the scenarios for the tabs it can open. A new geography
  // starts over.
  const [simulatorLevers, setSimulatorLevers] = useState<SimulatorLevers | null>(null);
  const [marketingLevers, setMarketingLevers] = useState<MarketingLevers | null>(null);
  const [chosenScenario, setScenario] = useState<SimulatorScenario>("Marketing");
  const scenarios = useMemo<SimulatorScenario[]>(() => {
    const allowed = profiles.find((item) => item.id === profileId)?.panels ?? [];
    return [...simulatorScenarios.filter((item) => allowed.includes(item)), ...previewScenarios];
  }, [profileId]);
  const scenario = scenarios.includes(chosenScenario)
    ? chosenScenario
    : (scenarios[0] ?? "Market Access");
  const simulatorState = useMemo(
    () => ({
      scenarios,
      scenario,
      setScenario,
      levers: simulatorLevers,
      setLevers: setSimulatorLevers,
      marketingLevers,
      setMarketingLevers,
    }),
    [scenarios, scenario, simulatorLevers, marketingLevers],
  );
  useEffect(() => {
    setSimulatorLevers(null);
    setMarketingLevers(null);
  }, [geographyName]);
  const [activePanel, setActivePanel] = useState<PanelLabel>("Performance Snapshot");
  // Wide screens start with the assistant docked open; narrow screens start with it closed.
  const [docked, setDocked] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // null means the default width; a number is a width the user dragged to, in pixels.
  const [chatWidth, setChatWidth] = useState<number | null>(null);
  const chatPaneRef = useRef<HTMLElement>(null);
  const chatOpenedByUser = useRef(false);

  useEffect(() => {
    const query = window.matchMedia(dockedQuery);
    setDocked(query.matches);
    if (!query.matches) setChatOpen(false);
    const update = () => {
      setDocked(query.matches);
      setChatWidth(null);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  // Whether the server answers live (Claude Code locally, or the Claude API) or with presets.
  const [assistantMode, setAssistantMode] = useState<"unknown" | "live" | "preset">("unknown");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat")
      .then((response) => (response.ok ? response.json() : { mode: "preset" }))
      .then((body: { mode?: string }) => {
        if (!cancelled) setAssistantMode(body.mode === "preset" ? "preset" : "live");
      })
      .catch(() => {
        if (!cancelled) setAssistantMode("preset");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Lets the server get ready for questions in this profile and scope, so the first answer starts
  // sooner. A failed warm-up changes nothing.
  useEffect(() => {
    if (assistantMode !== "live") return;
    fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        warmUp: true,
        profileId,
        scope: {
          geography: geographyName,
          period: timePeriod,
          ...(timePeriod === "Monthly" && { month }),
        },
      }),
    }).catch(() => {});
  }, [assistantMode, profileId, geographyName, timePeriod, month]);
  // The assistant message being revealed: 0 characters shown means it is still "thinking".
  const [reply, setReply] = useState<{ id: number; shown: number } | null>(null);
  // The reply's text received so far, and whether all of it has arrived.
  const replyText = useRef<{ id: number; text: string; complete: boolean } | undefined>(undefined);
  const replyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const replyRequest = useRef<AbortController | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(
    () => () => {
      clearTimeout(replyTimer.current);
      replyRequest.current?.abort();
    },
    [],
  );

  function resizeChat(width: number) {
    setChatWidth(clampChatWidth(width, docked));
  }

  const currentChatWidth = () => chatWidth ?? chatPaneRef.current?.offsetWidth ?? popupWidthDefault;

  function openChat() {
    chatOpenedByUser.current = true;
    setChatOpen(true);
  }

  function closeChat() {
    setChatOpen(false);
    setChatWidth(null);
  }

  function startChatResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = currentChatWidth();
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
    if (event.key === "ArrowLeft") resizeChat(currentChatWidth() + 40);
    else if (event.key === "ArrowRight") resizeChat(currentChatWidth() - 40);
    else return;
    event.preventDefault();
  }

  // Focus the question box when the user opens the assistant or a reply arrives, but not when the
  // docked pane simply appears on page load.
  useEffect(() => {
    if (!chatOpen || (!chatOpenedByUser.current && messages.length === 0)) return;
    textareaRef.current?.focus();
  }, [chatOpen, messages.length]);

  const dockedPaneWidth = chatWidth === null ? dockedWidthDefault : `min(${chatWidth}px, 50vw)`;

  const profile = profiles.find((item) => item.id === profileId) ?? profiles[0]!;
  const shownPanels = panels.filter((item) => !item.hidden);
  const visiblePanels = shownPanels.filter((item) => profile.panels.includes(item.label));
  const panel =
    visiblePanels.find((item) => item.label === activePanel) ?? visiblePanels[0] ?? panels[0]!;
  const PanelIcon = panel.icon;
  const panelFilters = panel.filters ?? { geography: true, period: true };
  const starterQuestions = starterQuestionsFor(panel.label, profile.panels, scenario);
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

  // Ends any reply in progress, leaving the text received so far visible.
  function finishReply() {
    clearTimeout(replyTimer.current);
    replyRequest.current?.abort();
    replyRequest.current = undefined;
    replyText.current = undefined;
    setReply(null);
  }

  const updateMessage = (id: number, change: Partial<ChatMessage>) =>
    setMessages((current) =>
      current.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );

  // Streams Claude's answer into the message. "unconfigured" means the server is in preset mode;
  // "failed" means a live answer was expected but didn't arrive. Either way the caller shows the
  // preset answer.
  async function streamLiveAnswer(
    id: number,
    history: { role: "user" | "assistant"; content: string }[],
    signal: AbortSignal,
  ): Promise<"answered" | "unconfigured" | "failed"> {
    let response: Response;
    try {
      response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          scope: {
            geography: geographyName,
            period: timePeriod,
            ...(timePeriod === "Monthly" && { month }),
          },
          messages: history,
        }),
        signal,
      });
    } catch {
      return "failed";
    }
    if (response.status === 503) return "unconfigured";
    if (!response.ok || !response.body) return "failed";

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        updateMessage(id, { text, source: "claude" });
        if (replyText.current?.id === id) replyText.current.text = text;
      }
    } catch {
      // A dropped stream keeps whatever arrived; with nothing yet, fall back.
    }
    if (!text) return "failed";
    if (replyText.current?.id === id) replyText.current.complete = true;
    return "answered";
  }

  function showPresetAnswer(id: number, response: string, fallback: boolean) {
    updateMessage(id, { text: response, source: "preset", fallback });
    if (replyText.current?.id === id) replyText.current = { id, text: response, complete: true };
  }

  function clearChat() {
    finishReply();
    setMessages([]);
  }

  function typeReply(id: number, shown: number) {
    const incoming = replyText.current;
    if (incoming?.id !== id) return;
    const next = nextWordEnd(incoming.text, shown, incoming.complete);
    if (!next) {
      if (incoming.complete) {
        replyText.current = undefined;
        setReply(null);
      } else {
        replyTimer.current = setTimeout(() => typeReply(id, shown), replyWordMs);
      }
      return;
    }
    setReply({ id, shown: next.end });
    replyTimer.current = setTimeout(
      () => typeReply(id, next.end),
      next.newLine ? replyLineMs : replyWordMs,
    );
  }

  function sendQuestion(question: string) {
    finishReply();
    // A what-if question sets the simulator's sliders and is answered from the same model, so the
    // reply always matches the tab. It uses the levers of the profile's own tabs.
    const can = (label: PanelLabel) =>
      profile.panels.includes("What-If Simulator") && profile.panels.includes(label);
    const accessWhatIf = can("Market Access")
      ? whatIfFor(question, geographyName as Geography)
      : null;
    const marketingWhatIf =
      !accessWhatIf && can("Marketing")
        ? marketingWhatIfFor(question, geographyName as Geography)
        : null;
    const whatIf = accessWhatIf ?? marketingWhatIf;
    // The preset answer supplies the download title and follow-up suggestions, and is the
    // fallback text when no live answer is available.
    const preset = whatIf?.answer ?? resolveDashboardAnswer(question, profile.panels);
    const id = Date.now();
    const replyId = id + 1;
    const earlier = messages
      .filter((item) => item.text)
      .slice(-chatHistoryTurns)
      .map((item) => ({ role: item.role, content: item.text }));
    while (earlier[0]?.role === "assistant") earlier.shift();
    const history = [...earlier, { role: "user" as const, content: question }];

    setMessages((current) => [
      ...current,
      { id, role: "user", text: question },
      {
        id: replyId,
        role: "assistant",
        text: "",
        title: preset.title,
        suggestions: preset.suggestions,
      },
    ]);
    setReply({ id: replyId, shown: 0 });
    replyText.current = { id: replyId, text: "", complete: false };
    replyTimer.current = setTimeout(() => typeReply(replyId, 0), replyThinkingMs);

    if (whatIf) {
      if (accessWhatIf) {
        setSimulatorLevers(accessWhatIf.levers);
        setScenario("Market Access");
      } else if (marketingWhatIf) {
        setMarketingLevers(marketingWhatIf.levers);
        setScenario("Marketing");
      }
      setActivePanel("What-If Simulator");
      showPresetAnswer(replyId, preset.response, false);
      return;
    }
    if (assistantMode === "preset") {
      showPresetAnswer(replyId, preset.response, false);
      return;
    }
    const request = new AbortController();
    replyRequest.current = request;
    void streamLiveAnswer(replyId, history, request.signal).then((outcome) => {
      if (outcome === "answered" || request.signal.aborted) return;
      if (outcome === "unconfigured") setAssistantMode("preset");
      showPresetAnswer(replyId, preset.response, outcome === "failed");
    });
  }

  function handlePromptSubmit({ text }: { text: string }, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = text.trim();
    if (question) sendQuestion(question);
  }

  // The docked assistant takes its width from the right of the page; the dashboard and the tab
  // bar fit beside it, so the tabs line up with the panels above them.
  const besideAssistant = docked
    ? { paddingRight: chatOpen ? dockedPaneWidth : `${collapsedRailWidth}px` }
    : undefined;

  return (
    <main
      className="min-h-screen bg-background font-dashboard text-foreground"
      style={besideAssistant}
    >
      <div className={`mx-auto min-h-screen max-w-[1800px] pb-36 pt-4 sm:pt-5 ${pageGutter}`}>
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
            <span className="hidden h-8 w-px self-end bg-border sm:block" aria-hidden="true" />
            <ProfileSwitcher activeId={profile.id} onSwitch={switchProfile} />
          </div>
        </header>

        {panel.Content ? (
          <DashboardDataProvider value={dashboardData}>
            <SimulatorLeversContext.Provider value={simulatorState}>
              <panel.Content />
            </SimulatorLeversContext.Provider>
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
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur-md"
      >
        {/* The tabs line up with the panels, beside the assistant; the status sits at the far right. */}
        <div style={besideAssistant}>
          <div
            className={`mx-auto flex h-[64px] max-w-[1800px] items-center gap-1 overflow-x-auto ${pageGutter}`}
          >
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
                {/* The bold copy reserves the active label's width, so tabs don't shift when selected. */}
                <span className="grid">
                  <span
                    aria-hidden="true"
                    className="invisible col-start-1 row-start-1 font-semibold"
                  >
                    {label}
                  </span>
                  <span className="col-start-1 row-start-1">{label}</span>
                </span>
                {!Content && <span className="sr-only">, placeholder</span>}
              </Button>
            ))}
          </div>
        </div>
        <div
          className={`absolute inset-y-0 right-0 hidden items-center gap-2 text-[11px] text-muted-foreground lg:flex ${pageGutter}`}
        >
          <span className="size-2 rounded-full bg-series-2" />
          Demo data · {profile.name} · {geographyName} ·{" "}
          {timePeriod === "Monthly" ? month : timePeriod}
        </div>
      </nav>

      {chatOpen ? (
        <aside
          ref={chatPaneRef}
          aria-label="Clara, launch assistant"
          style={{
            width: docked
              ? dockedPaneWidth
              : `min(${chatWidth ?? popupWidthDefault}px, calc(100vw - 24px))`,
          }}
          className={
            docked
              ? "fixed bottom-[64px] right-0 top-0 z-30 flex flex-col overflow-hidden border-l border-border bg-card"
              : "fixed bottom-20 right-3 z-40 flex h-[min(690px,calc(100dvh-100px))] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl sm:right-6"
          }
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize assistant"
            aria-valuenow={chatPaneRef.current?.offsetWidth ?? chatWidth ?? undefined}
            aria-valuemin={chatWidthMin}
            title="Drag to resize · double-click to reset"
            tabIndex={0}
            onPointerDown={startChatResize}
            onDoubleClick={() => setChatWidth(null)}
            onKeyDown={handleChatResizeKey}
            className="absolute inset-y-0 left-0 z-10 hidden w-1.5 cursor-ew-resize transition-colors hover:bg-primary/30 focus-visible:bg-primary/30 focus-visible:outline-none sm:block"
          />
          <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <Bot size={19} />
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Clara</p>
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
                aria-label={docked ? "Collapse assistant" : "Close chat"}
                title={docked ? "Collapse assistant" : "Close chat"}
                onClick={closeChat}
              >
                {docked ? <PanelRightClose size={17} /> : <X size={17} />}
              </Button>
            </div>
          </header>

          <Conversation className="chat-transcript min-h-0 flex-1">
            <ConversationContent className="gap-5 px-4 py-4">
              <AssistantMessage text={"Hi! I'm Clara. What would you like to know?"} />
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
                          {revealing && revealing.shown > 0
                            ? message.text.slice(0, revealing.shown)
                            : message.text}
                        </MessageResponse>
                      )}
                    </MessageContent>
                    {message.fallback && !revealing && (
                      <p className="text-[10px] text-muted-foreground">
                        Preset answer · live answers are unavailable right now
                      </p>
                    )}
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
              {starterQuestions.length > 0 && (
                <>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    <Sparkles size={13} className="text-primary" /> Suggested questions
                  </p>
                  <QuestionSuggestions questions={starterQuestions} onQuestion={sendQuestion} />
                </>
              )}
            </div>
          )}

          <div className="shrink-0 border-t border-border bg-card px-3.5 py-3">
            <PromptInput onSubmit={handlePromptSubmit}>
              <PromptInputTextarea
                ref={textareaRef}
                aria-label="Ask Clara"
                placeholder="Ask Clara about this dashboard…"
                className="min-h-11 px-3 py-3 text-sm"
              />
              {/* The send button sits beside the text and stays at the bottom as it grows. */}
              <InputGroupAddon align="inline-end" className="self-end pb-1.5">
                <PromptInputSubmit className="size-8 rounded-md" aria-label="Send message">
                  <Send size={15} />
                </PromptInputSubmit>
              </InputGroupAddon>
            </PromptInput>
          </div>
        </aside>
      ) : docked ? (
        <aside
          aria-label="Clara (collapsed)"
          style={{ width: collapsedRailWidth }}
          className="fixed bottom-[64px] right-0 top-0 z-30 flex flex-col items-center gap-3 border-l border-border bg-card pt-4"
        >
          <Button
            type="button"
            size="icon"
            onClick={openChat}
            aria-label="Expand Clara"
            title="Expand Clara"
          >
            <PanelRightOpen size={18} />
          </Button>
          <button
            type="button"
            onClick={openChat}
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground [writing-mode:vertical-rl] hover:text-primary"
          >
            Ask Clara
          </button>
        </aside>
      ) : (
        <Button
          type="button"
          onClick={openChat}
          aria-label="Open Clara"
          title="Open Clara"
          className="chat-launcher fixed bottom-20 z-30 size-12 rounded-full shadow-lg"
        >
          <MessageCircle size={21} />
          <span className="sr-only">Clara</span>
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
        {/* The header row aligns to the bottom of the 32px filter boxes; this 40px button is
            nudged down 4px so its centre lines up with theirs. */}
        <button
          type="button"
          aria-label={`Signed in as ${active.name}. Switch profile`}
          className="-mb-1 flex items-center gap-2.5 rounded-lg border border-border bg-linear-to-b from-card to-secondary/70 py-1 pl-1 pr-2.5 text-left shadow-[inset_0_1px_0_rgb(255_255_255/0.8),0_1px_2px_rgb(15_23_42/0.08)] transition-colors hover:border-primary/30 hover:to-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className="grid size-8 place-items-center rounded-full bg-card text-lg ring-1 ring-border"
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
    <div className="typing-dots" role="status" aria-label="Clara is typing">
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
