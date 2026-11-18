# Progreso

## Setup inicial (2026-11-18)
- **web/**: Next.js 16 (App Router, TypeScript, Tailwind 4). Pagina inicial placeholder "Stock Insights". Tests con Vitest + Testing Library.
- **api/**: Express 5 + TypeScript (ESM). Endpoint `GET /health`, 404 y error handler con forma `{ error: { code, message } }`, env validado con Zod, CORS configurable. Carpetas de capas creadas. Tests con Vitest + supertest.
- Verificado: `pnpm test`, `pnpm lint`, `pnpm build` y `pnpm dev` funcionan.
