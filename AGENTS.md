<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application architecture
- Film detail pages use the public catalogue query and typed film-ID navigation; the homepage carousel deduplicates films so multiple screenings do not repeat a slide.
- Keep friendship requests and call membership in RLS-protected records and expose profile lookup only through an exact shareable code; no public directory or email disclosure is needed.
- Private audio requires an activated relay provider and server-issued participant access; do not enable call controls or request microphones while the provider is unavailable.
- Store measured video duration in seconds alongside legacy minutes, and sign private uploaded media only after room authorization; this preserves short-video timing and prevents public film downloads.
- Compress local uploads with browser media codecs and keep the smaller output only; report unsupported codecs rather than silently dropping audio or video.
- Use public top-level catalogue routes with server-function reads and Query loaders; private administration lives under the client-only authenticated gate so refreshes preserve sessions.
- Enforce administrator permissions in database RLS and authenticated server functions; user-editable metadata must never grant roles.
- Reserve seats through the transactional register_screening RPC, which locks the screening row to prevent overbooking and duplicate registrations.
- Keep session identity in one root auth subscriber and reuse semantic design tokens and shared cinema controls throughout the application.
- Live rooms derive playback position from the scheduled start time (viewers cannot seek) and embed YouTube in-app; database checks gate entry and a per-screening chat switch.
- Keep translation keys and stored filter values stable; initialize locale in a root effect and subscribe rendered pages to language changes to avoid hydration mismatches.
- Administrator role changes use a database-validated RPC that prevents self-demotion and preserves an active administrator, preventing accidental lockout.
