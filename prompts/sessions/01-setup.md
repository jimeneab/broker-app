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

## Prompts (continuacion)
### 2. Repo en GitHub y deploy en Vercel
> Perfecto ahora vamos a crear el repo en github y desplegarlo en vercel ta tienes aceeso al CLI de ambas herramientas ayudame a hacerlo

**Outcome:** Repo publico `jimeneab/broker-app`. Dos proyectos Vercel conectados al repo: `broker-app-web` (root `web/`) y `broker-app-api` (root `api/`, framework express). Env vars: `CORS_ORIGIN` (api) y `NEXT_PUBLIC_API_URL` (web).

### 3. Verificar deploys
> vamos aprobar que funcionan los deploys antes de arrancar a desarrollar algo

**Outcome:** Deploys de `main` en READY. Verificado: https://broker-app-web-nine.vercel.app muestra "Stock Insights"; https://broker-app-api.vercel.app/health → 200 `{"status":"ok"}`; rutas desconocidas → 404 con el shape de error; CORS permite el dominio de web.

## Decisions (continuacion)
- Monorepo = 2 proyectos Vercel desde el mismo repo, separados por Root Directory.
- `api/src/app.ts` exporta `default app`: Vercel zero-config Express lo detecta como entrypoint (se elimino `src/index.ts`).
- Deploys de `main` van a produccion (rama de produccion de Vercel); ramas distintas generan previews.
- En preview, `CORS_ORIGIN` apunta a localhost: ajustar cuando el web llame al API.

### 4. Brainstorming del plan
> Listo valide que estuvieran deployados, vamos a comenzar ahora si con el plan vamos a rebotar ideas y basado en un resultado final armamos el archivo PLAN.md, lo primero que debe tener esta aplicacion es un login con JWT, Como siguiente feature quiero una pagina home con informacion relevante para el usuario, siguiente feature quiero que tengamos una base de datos donde podamos guardar las interacciones del usuario y despues poder presentarle un carrusel personalizado en la pagina home, quiero que para empezar a abrir su usuario tengamos un formulario para saber su nivel de riesgo que esta dispuesto a manejar, quiero tambien que podamos tener un apartado donde podamos gestionar la libertad financiera del usuario, necesitamos tambien un analizador de carteras, un area de noticias, un area de learning, un area de analisis tecnico y por ultimo un simulador de trading, pro supuesto su parte donde ver la informacion de los stocks y una parte de stocks favoritos

> seguimos teniendo dos dias a partir de hoy

> correcto vamos con ese plan pero no dejes fuera lo del chat y MCP dejalo como siguientes pasos

> B  (PLAN.md detallado, con tablas/endpoints/pantallas por feature)

**Outcome:** PLAN.md con 15 features (F00–F14): Dia 1 nucleo (base, login, riesgo, stock, favoritos, noticias, home), Dia 2 (carrusel personalizado, analisis tecnico, simulador), si sobra tiempo (carteras, libertad financiera, learning), siguientes pasos (chat Claude, MCP).

## Decisions (plan)
- Priorizacion por dependencias y por el objetivo del reto ("ver datos de stocks").
- Recomendaciones con pgvector: vector de usuario = promedio ponderado de embeddings de los stocks con que interactua, sobre un catalogo curado de ~100 tickers; filtro por beta segun perfil.
- Indicadores tecnicos calculados en el API (no via Twelve Data) para ahorrar creditos.
- Analizador de carteras analiza la cartera del simulador.
- Learning como contenido Markdown estatico.

### 5. Arranque del flujo con agentes
> Aun no estan creados los creamos en cuanto sean necesarios vamos a comenzar con los que sigue usando los agentes por favor

> no, cometi un error ayudame a quitar ese estatus  (se quito "aceptada" del implementer)

**Outcome:** spec_author escribio la spec de F00 en los 3 specs. Respuestas del dueno a sus preguntas: existe pagina `/search` (se agrega a F03); las secciones del sidebar sin implementar se muestran deshabilitadas con "Proximamente". F00 → in_progress.

**F00 — implementer:** completo y en `testing`. api 42 tests, web 30 tests; lint y build pasan; dev verificado (Home activo, 7 items "Proximamente"). Desviaciones documentadas en PROGRESO.md (acentos en UI, menu movil con `data-open`, sin PRODUCT.md de impeccable). Pendiente: todo lo que requiere Supabase/keys. Riesgo: las 5 variables nuevas son obligatorias, el proximo deploy falla si no se configuran en Vercel antes del push.

**F00 — reviewer:** primera revision `rejected` (`web/.env.example` ignorado por `web/.gitignore`); implementer agrego `!.env.example`; segunda revision `ready`. Observaciones abiertas: revisar layout a 375 px en navegador; `error.tsx` muestra mensaje generico en prod; configurar las 5 variables en Vercel antes del push.

### 6. Spec de F01
> Si contunua mientras  (spec_author de F01 mientras el dueno crea Supabase y keys)

**Outcome:** spec de F01 escrita. Respuestas del dueno: (1) cerrar el hueco de seguridad — `authenticated` solo puede actualizar `display_name`; risk_score/risk_profile/onboarded_at los escribira una funcion `security definer` en F02. (2) F01 y F02 se despliegan juntas (commit de F01 sin push hasta que F02 este ready).

### 7. Credenciales reales
> Revisa si la informacion que pase de supabase es suficiente

**Outcome:** credenciales validas (Supabase publishable/secret 200, JWKS ES256, Finnhub y Twelve Data OK; los headers `X-Finnhub-Token` y `Authorization: apikey` confirmados). Las keys nuevas `sb_publishable_`/`sb_secret_` se mapearon a `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` en los `.env` locales. Pendiente del dueno: desactivar "Confirm email" y decidir como aplicar migraciones.

**F01 — implementer:** en `testing`. api 70 tests, web 78; lint/build OK; dev: `/me` sin token 401, `/` sin sesion → `/login`.

**F01 — reviewer:** `ready` sin hallazgos bloqueantes (JWT con algoritmos fijos, iss/aud/exp validados, `alg:none` y HS256 forjado → 401; RLS + grant solo `display_name`; sin secretos commiteables). Estatus de specs F00/F01 sincronizados a `ready`.

### 8. Conexion a la base de datos
> Ya te pase el url y ya desactive el confirm email

**Outcome:** "Confirm email" desactivado (verificado: `mailer_autoconfirm: true`). `SUPABASE_DB_URL` en `api/.env` esta mal formada (prefijo duplicado y URL truncada); se pidio al dueno corregirla con el Session pooler.

> Prueba d enuevo / Listo

**Outcome:** `SUPABASE_DB_URL` corregida (la contrasena tenia `%` y `,` sin codificar; se codifico con `encodeURIComponent`). Migraciones F00 y F01 aplicadas con `supabase db push --db-url`. Prueba E2E con usuario temporal (borrado al final): signup 200 con sesion; `GET /me` 200 con el profile creado por el trigger; PATCH `display_name` 204; PATCH `risk_score/risk_profile/onboarded_at` 403 `42501`; `provider_cache` como usuario → `[]` (RLS sin policies).

### 9. Spec de F02
**Outcome:** spec_author eligio funcion SQL `submit_risk_profile` security definer (calcula con `auth.uid()`, llamada por `rpc` con `userClient`). Respuestas del dueno: si a PGlite como devDependency para testear el SQL; al rehacer se conserva el `onboarded_at` original; textos del cuestionario aprobados. PLAN.md actualizado (el calculo vive en la funcion SQL). F02 → in_progress.

**F02 — implementer:** en `testing`. api 111 tests (incluye 22 casos SQL con PGlite sobre las migraciones reales: limites 6/11/12/18/19/24, rehacer conserva onboarded_at, aislamiento, 8 respuestas invalidas, anon sin execute, update directo → 42501), web 99 tests; lint/build OK; dev: PUT sin token 401, JSON mal formado 400.

**F02 — reviewer:** `ready` sin hallazgos bloqueantes. Observaciones: foco del h2 al montar en dev por StrictMode; h2 enfocado sin outline. Leader aplico la migracion F02 y probo E2E contra Supabase real con usuario temporal (borrado): PUT 12 pts → moderado; rehacer 23 → agresivo conservando onboarded_at; respuestas invalidas 400; rpc como anon 401/42501; rpc con argumento extra `risk_score` → 404 PGRST202 (no existe esa firma); PATCH directo de risk_score 403/42501.
