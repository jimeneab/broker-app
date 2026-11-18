# Rules

## General

- TypeScript `strict` mode everywhere. No `any` unless justified in a comment.
- Validate all external input (HTTP bodies, query params, provider responses, MCP tool args) with Zod.
- Never commit secrets. The repo is public. Every new env var goes into the matching `.env.example`.
- Keep changes small and focused on the current task. Do not add features that are not in the specs.
- Prefer clear names over comments. Comment only the "why".
- Create manual tests in the document PRUEBAS-MANUALES.md to be tested by me after the sessions.
- All newly generated code must be accompanied by its automated test.

## Backend (`api/`)

- Layering: `routes → controllers → services → providers / repositories`. No skipping layers.
- Providers implement the `MarketDataProvider` interface; services never import a vendor SDK directly.
- Cache provider responses in Supabase to protect free-tier rate limits.
- Errors go through a central error-handling middleware with a consistent JSON shape: `{ error: { code, message } }`.
- Must run on Vercel serverless: no long-lived connections, no in-memory state that must survive between requests.

## Frontend (`web/`)

- App Router. Server Components by default; Client Components only when interactivity is needed.
- All API calls go through a single typed client module.
- Handle loading, empty and error states on every data view.
- Use server side rendering to improve the performance when neccesary

## Database (`supabase/`)

- Every schema change is a new SQL migration file. Never edit an applied migration.
- Enable Row Level Security on every user-owned table.

## AI / prompts

- Log every working session in `prompts/sessions/`.
- Update the relevant spec in `prompts/specs/` when a decision changes it.