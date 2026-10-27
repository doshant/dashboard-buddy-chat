import { Lightbulb } from "lucide-react";
import type { JSX } from "react";
import type { ExtraProps } from "streamdown";

// Answers end with their recommended next step as a markdown blockquote ("> ..."); the chat shows
// it as a highlighted suggestion.
export function ChatSuggestion({
  children,
  node: _node,
  className: _className,
  ...props
}: JSX.IntrinsicElements["blockquote"] & ExtraProps) {
  return (
    <blockquote
      {...props}
      data-streamdown="suggestion"
      className="my-3 rounded-xl border-2 border-dashed border-primary bg-trend-up/10 px-3.5 py-2.5 text-sm text-foreground"
    >
      <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-primary">
        <Lightbulb size={14} strokeWidth={2.4} aria-hidden="true" />
        Suggestion
      </span>
      <div className="[&_p]:m-0">{children}</div>
    </blockquote>
  );
}
