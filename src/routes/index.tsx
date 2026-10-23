import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ComponentType, type FormEvent } from "react";
import {
  Activity,
  Bot,
  Check,
  ChevronDown,
  Hospital,
  Info,
  LayoutDashboard,
  Lock,
  MapPinned,
  Megaphone,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
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
  brand,
  dataThrough,
  filters,
  profiles,
  resolveDashboardAnswer,
  starterQuestionsFor,
  type PanelLabel,
} from "@/lib/dashboard-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ulefnersen Launch Tracker | AUXO Analytics" },
      {
        name: "description",
        content:
          "Track the Ulefnersen launch: patient funnel, ex-factory vials and net sales, forecast attainment, market access, payer mix, and channel inventory.",
      },
      { property: "og:title", content: "Ulefnersen Launch Tracker | AUXO Analytics" },
      {
        property: "og:description",
        content:
          "An interactive launch tracking demo for Ulefnersen patients, vials, net sales, and market access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LaunchTracker,
});

type ChatMessage = { id: number; role: "user" | "assistant"; text: string; suggestions?: string[] };

const panels: { label: PanelLabel; icon: typeof LayoutDashboard; Content?: ComponentType }[] = [
  { label: "Overview", icon: LayoutDashboard, Content: OverviewPanel },
  { label: "Market Access", icon: ShieldCheck, Content: MarketAccessPanel },
  { label: "Site of Care", icon: Hospital },
  { label: "Field Activity", icon: MapPinned },
  { label: "Enrollment & Dispense Mix", icon: PackageCheck },
  { label: "Marketing", icon: Megaphone, Content: MarketingPanel },
];

function LaunchTracker() {
  const [geographyLevel, setGeographyLevel] = useState<string>("Nation");
  const [geographyName, setGeographyName] = useState<string>("Nation");
  const [timePeriod, setTimePeriod] = useState<string>("Launch to Date");
  const [profileId, setProfileId] = useState(profiles[0]!.id);
  const [activePanel, setActivePanel] = useState<PanelLabel>("Overview");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!chatOpen) return;
    textareaRef.current?.focus();
  }, [chatOpen, messages.length]);

  const profile = profiles.find((item) => item.id === profileId) ?? profiles[0]!;
  const visiblePanels = panels.filter((item) => profile.panels.includes(item.label));
  const panel = visiblePanels.find((item) => item.label === activePanel) ?? visiblePanels[0] ?? panels[0]!;
  const PanelIcon = panel.icon;
  const starterQuestions = starterQuestionsFor(panel.label);
  const isRestricted = visiblePanels.length < panels.length;

  function switchProfile(id: string) {
    const next = profiles.find((item) => item.id === id);
    if (!next || next.id === profile.id) return;
    setProfileId(next.id);
    // The transcript may quote data the next profile can't see, so it doesn't carry over.
    setMessages([]);
    if (!next.panels.includes(panel.label)) setActivePanel(next.panels[0] ?? "Overview");
  }

  function sendQuestion(question: string) {
    const answer = resolveDashboardAnswer(question, profile.panels);
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", text: question },
      { id: Date.now() + 1, role: "assistant", text: answer.response, suggestions: answer.suggestions },
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
                AUXO / {brand} launch tracker · Data through {dataThrough}
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
            </div>
            <ProfileSwitcher activeId={profile.id} onSwitch={switchProfile} />
            <Button variant="ghost" size="icon" aria-label="About this dashboard" title="About this dashboard" className="hidden text-sky-700 sm:inline-flex">
              <Info size={20} />
            </Button>
          </div>
        </header>

        {panel.Content ? (
          <panel.Content />
        ) : (
          <section className="dashboard-panel flex min-h-[420px] flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
              <PanelIcon size={26} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">{panel.label}</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">This section is a placeholder in the demo.</p>
            </div>
          </section>
        )}
      </div>

      <nav aria-label="Dashboard navigation" className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-3 backdrop-blur-md sm:px-6">
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
            Demo data · {profile.name} · {geographyName} · {timePeriod}
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
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="size-1.5 rounded-full bg-series-2" />Ready to help</p>
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
                  {message.role === "assistant" && <QuestionSuggestions questions={message.suggestions ?? starterQuestions.slice(0, 3)} onQuestion={sendQuestion} compact />}
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

function ProfileSwitcher({ activeId, onSwitch }: { activeId: string; onSwitch: (id: string) => void }) {
  const active = profiles.find((item) => item.id === activeId) ?? profiles[0]!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Signed in as ${active.name}. Switch profile`}
          className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:border-l sm:border-border sm:pl-3"
        >
          <span className="grid size-8 place-items-center rounded-full bg-secondary text-lg" aria-hidden="true">
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
          <DropdownMenuItem key={item.id} onSelect={() => onSwitch(item.id)} className="items-start gap-2.5 py-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-base" aria-hidden="true">
              {item.avatar}
            </span>
            <span className="min-w-0 flex-1 text-xs leading-snug">
              <span className="block font-semibold">{item.name}</span>
              <span className="block text-muted-foreground">{item.role}</span>
              <span className="block text-[11px] text-muted-foreground">Access: {accessSummary(item.panels)}</span>
            </span>
            {item.id === active.id && <Check size={14} className="mt-0.5 text-primary" aria-label="Current profile" />}
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
