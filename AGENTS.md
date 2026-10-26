<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Dashboard prototype

- Keep the dashboard's reference metrics and the assistant's preset replies in browser-safe data modules, with chart rendering and transient chat state in the page, so the dashboard itself stays deterministic.
- The Dashboard Assistant answers through the `/api/chat` server route, grounded only on those data modules (filtered to the user's profile access and selected scope). In local development, `ASSISTANT_BACKEND=claude-code` in `.env.local` uses the Claude Code CLI with the presenter's own subscription; that path is dev-only and excluded from production builds. Deployed builds (Vercel) use the Claude API only if `ANTHROPIC_API_KEY` is set server-side, and otherwise the preset replies.
