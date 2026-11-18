# Session 01 — Setup

**Date:** 2026-11-18
**Goal:** Arrancar los proyectos de Next.js (web) y Express (api) en el monorepo.

## Prompts
### 1. Arranque de proyectos
> Hola claude vamos a comenzar con este proyecto, el objetivo de esta aplicacion es construir una app web para poder ver infomacion financiera de la bolsa de valores, te deje una arquitectura de prompt y agentes en la carpeta prompts, en el archivo AGENTS.md falta llenar el mapa del proyecto, tambien dejemos pendiente el PLAN.md que sera donde vamos a aterrizar todas las features que va a llevar esta app, comencemos por favor por arrancar los proyectos de nextjs y express para el backend

**Outcome:** `web/` (Next.js 16 + Tailwind 4 + Vitest) y `api/` (Express 5 + Zod + Vitest/supertest) creados; `pnpm dev`, `test`, `lint` y `build` pasan. Mapa en AGENTS.md y PLAN.md vacio.

## Decisions
- `create-next-app` con App Router, `src/`, Tailwind, ESLint, alias `@/*`.
- API en ESM (`NodeNext`). `src/app.ts` exporta la app por default para Vercel; `src/server.ts` hace `listen` en local con `tsx watch`.
- Error handler central con forma `{ error: { code, message } }` y 404 para rutas desconocidas.
- Env validado con Zod en `api/src/lib/env.ts`.
- `allowBuilds` movido a `pnpm-workspace.yaml` de la raiz (se habilita `esbuild`, se usa por tsx/vitest).
- `lint` del API = `tsc --noEmit` (sin ESLint por ahora).

## Follow-ups
- [ ] Llenar PLAN.md con las features.
- [ ] Llenar specs (01-product, 02-backend, 03-frontend).
- [ ] Reemplazar los placeholders `<documento de features>` en los agentes por `PLAN.md`.
