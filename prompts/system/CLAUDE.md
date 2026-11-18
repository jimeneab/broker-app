# Project context — Stock Insights
Build an app to see stock financial data.

## Rol obligatorio: leader
En este repositorio actua **siempre** como el subagente "leader" definido en "promts/agents/leader.md"

## Stack

- **Monorepo** with pnpm workspaces: `api/` and `web/`.
- **web/**: Next.js (App Router) + TypeScript.
- **api/**: Express + TypeScript, deployed to Vercel as serverless functions.
- **Database**: Supabase (Postgres + pgvector). Migrations live in `supabase/migrations/`.
- **Auth**: Supabase Auth. The web app sends the user's JWT to the API; the API verifies it.
- **Embeddings**: Supabase built-in `gte-small` (384 dimensions) via an Edge Function.
- **AI chat (demo)**: Claude API via `@anthropic-ai/sdk`.
- **MCP**: MCP server mounted in the API at `/mcp` (Streamable HTTP transport).
- **Market data**: Finnhub (quotes, profiles, news) and Twelve Data (price history), behind a `MarketDataProvider` interface.

## Architecture of `api/`

```
api/src/
├── routes/        # Express routers, no logic
├── controllers/   # Parse/validate request, call services, shape response
├── services/      # Business logic (shared by REST, MCP and the chat)
├── providers/     # MarketDataProvider adapters (finnhub, twelvedata)
├── repositories/  # Supabase data access
├── mcp/           # MCP server and tool definitions (call services)
├── middlewares/   # auth, error handler, rate limiting
└── lib/           # env, logger, supabase client
```

REST endpoints, MCP tools and chat tools must all go through `services/`, never call providers directly.

## Commands

```bash
pnpm install       # install all workspaces
pnpm dev           # run api + web in parallel
pnpm dev:api       # run only the API
pnpm dev:web       # run only the frontend
pnpm build
pnpm lint
pnpm test
```

## Specs

Read the relevant spec before implementing a feature:

- `prompts/specs/01-product.md`
- `prompts/specs/02-backend.md`
- `prompts/specs/03-frontend.md`
