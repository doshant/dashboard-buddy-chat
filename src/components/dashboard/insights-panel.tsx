import { useState } from "react";
import { ChevronDown, Lightbulb, MessageSquareText } from "lucide-react";
import type { Insight, InsightKind } from "@/lib/insights-data";

const kindStyle: Record<InsightKind, { badge: string; border: string }> = {
  Risk: { badge: "bg-trend-down/10 text-trend-down", border: "border-l-trend-down" },
  Watch: { badge: "bg-watch/10 text-watch", border: "border-l-watch" },
  Opportunity: { badge: "bg-trend-up/10 text-trend-up", border: "border-l-trend-up" },
};

// Signals surfaced for the signed-in persona on this tab, each with a recommended action and the
// questions to explore next. A question opens Clara with it.
export function InsightsPanel({
  name,
  role,
  insights,
  onAsk,
}: {
  name: string;
  role: string;
  insights: Insight[];
  onAsk: (question: string) => void;
}) {
  const [open, setOpen] = useState(true);
  if (!insights.length) return null;
  return (
    <section aria-label="Insights & Recommendations" className="dashboard-panel mb-4 p-3 sm:p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-primary">
            <Lightbulb size={16} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-bold leading-snug text-primary">
              Insights & Recommendations
            </h2>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Tailored for {name}, {role} · what the data is signalling and what to explore next
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-secondary"
        >
          {open ? "Hide" : `Show ${insights.length}`}
          <ChevronDown
            size={13}
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((insight) => (
            <article
              key={insight.signal}
              className={`flex flex-col gap-1.5 rounded-lg border border-l-4 border-border bg-card p-3 ${kindStyle[insight.kind].border}`}
            >
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${kindStyle[insight.kind].badge}`}
              >
                {insight.kind}
              </span>
              <p className="text-sm font-semibold leading-snug">{insight.signal}</p>
              <p className="text-xs leading-snug text-muted-foreground">{insight.evidence}</p>
              <p className="text-xs leading-snug">
                <span className="font-semibold">Recommended: </span>
                {insight.recommendation}
              </p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1.5">
                {insight.questions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => onAsk(question)}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-left text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <MessageSquareText size={12} aria-hidden="true" className="shrink-0" />
                    {question}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
