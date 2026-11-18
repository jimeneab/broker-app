# Progreso

## Setup inicial (2026-11-18)
- **web/**: Next.js 16 (App Router, TypeScript, Tailwind 4). Pagina inicial placeholder "Stock Insights". Tests con Vitest + Testing Library.
- **api/**: Express 5 + TypeScript (ESM). Endpoint `GET /health`, 404 y error handler con forma `{ error: { code, message } }`, env validado con Zod, CORS configurable. Carpetas de capas creadas. Tests con Vitest + supertest.
- Verificado: `pnpm test`, `pnpm lint`, `pnpm build` y `pnpm dev` funcionan.
- Deploy: GitHub `jimeneab/broker-app` + Vercel (`broker-app-web` root `web/`, `broker-app-api` root `api/`). Produccion verificada: web muestra la home y `/health` del API responde ok.

## F00 — Base: Supabase, providers, cache, layout (2026-11-18) → `testing`

### Que se implemento
- **Base de datos:** `supabase/migrations/20261118120000_f00_base.sql` con la tabla `provider_cache` (RLS activo, sin policies) y la extension `vector`. No se ha aplicado: el proyecto de Supabase aun no existe.
- **API (`api/`):**
  - `lib/env.ts`: agrega las 5 variables nuevas (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FINNHUB_API_KEY`, `TWELVEDATA_API_KEY`) y exporta `envSchema`.
  - `lib/supabase.ts`: `adminClient()` (service role) y `userClient(jwt)` (anon key + JWT, para RLS).
  - `providers/`:
    - `types.ts` con la interfaz `MarketDataProvider`.
    - `http.ts` con `fetchJson`: timeout de 8 s, 429 → 503, cualquier otro fallo → 502, y validacion Zod.
    - Adaptadores `finnhub.ts` y `twelvedata.ts`, e `index.ts`, que exporta `marketData`.
    - Las API keys van en headers, nunca en la URL ni en los logs.
  - `services/cache.ts`: `getOrSet(key, ttl, fetcher)` y `CACHE_TTL` (quote 60 s, search 24 h, news 15 min, history 12 h, profile y metrics 7 dias).
  - `vitest.config.ts` con valores ficticios en `test.env`.
  - `.env.example` con placeholders que pasan la validacion.
- **Web (`web/`):**
  - `lib/env.ts` (Zod).
  - `lib/api.ts`: cliente tipado con `ApiError`, `request`, `api.health` y `errorMessage`.
  - `lib/supabase/server.ts` y `client.ts`.
  - Grupo de rutas `(app)/`:
    - `layout.tsx`: AppShell con sidebar, header, `<main>` y enlace "Saltar al contenido".
    - `error.tsx`: ErrorState con boton "Reintentar".
    - La Home placeholder, movida a este grupo.
  - `components/layout/`:
    - `nav-items.ts`: los 8 items; solo Home tiene `available: true`.
    - `Sidebar`, `SidebarLinks` (con `<Suspense>` y fallback sin item activo), `MobileNavToggle`, `Header` (con slot `data-slot="search"`) y `UserMenu`.
  - `components/states/`: `LoadingState`, `EmptyState` y `ErrorState`.
  - Tema en `globals.css` y `lang="es"`.
- **Dependencias:**
  - `api`: `@supabase/supabase-js`.
  - `web`: `@supabase/ssr`, `@supabase/supabase-js` y `zod`.

### Decisiones
- **Diseno (skill impeccable, modo "Operate"):**
  - Estilo sobrio y restringido.
  - Neutros frios en OKLCH, con una segunda capa de neutro para el sidebar.
  - Un solo acento azul tinta, reservado para el item activo, el foco y la seleccion.
  - Tokens semanticos `up`/`down` para F03.
  - Modo claro y oscuro segun `prefers-color-scheme`.
  - Una sola familia (Geist) con `tabular-nums` global, para que las cifras se alineen.
  - Iconos SVG inline de trazo 1.5, sin libreria nueva.
  - Contraste verificado por calculo: todos los pares texto/fondo entre 5.8:1 y 16.6:1, en ambos modos.
  - El detector de impeccable no reporto hallazgos.
  - No se creo `PRODUCT.md`/`DESIGN.md`: el agente no tenia como entrevistar al dueño y el contexto se tomo del brief y las specs.
- **Sidebar en movil:**
  - `Sidebar` sigue siendo Server Component.
  - `MobileNavToggle` (cliente) alterna el atributo `data-open` del `<aside id="app-sidebar">`.
  - El panel se cierra con `Escape` (y devuelve el foco al boton), al tocar el scrim (fuera del panel) o al hacer clic en un enlace.
  - Asi no se usa `usePathname` en el header y no hace falta otro `<Suspense>`.
- **Header sin `backdrop-blur`:** `backdrop-filter` vuelve al header el bloque contenedor de los `position: fixed` hijos y encerraria el scrim.
- **Textos de UI con acentos ortograficos** ("Próximamente", "respondió", "salió"). La spec los escribe sin acentos; se interpreto como limitacion de teclado y no como el texto deseado. Los tests usan el texto con acento.
- **`globals: true` en Vitest de `web/`:** Testing Library registra su `cleanup` automatico entre tests.
- **Alias `@`** agregado en `vitest.config.mts`, para que los tests resuelvan `@/...`.
- **Sin `import "server-only"`** en `lib/supabase/server.ts`: no es dependencia declarada; `next/headers` ya restringe el modulo al servidor.
- **Archivos de entorno locales:** se crearon `api/.env` y `web/.env.local` copiando los `.env.example`. Estan gitignored y solo tienen placeholders. Sin ellos, `pnpm dev:api` y `next build` fallan por la validacion Zod, que es el comportamiento pedido.

### Como quedo
- `pnpm test`:
  - api: 7 archivos, 42 tests.
  - web: 6 archivos, 30 tests.
- `pnpm lint` y `pnpm build`: sin errores.
- `pnpm dev`:
  - http://localhost:3000 responde 200, con el sidebar (Home con `aria-current="page"` y 7 items "Próximamente").
  - http://localhost:4000/health responde `{"status":"ok"}`.
- Pendiente:
  - La verificacion visual a 375 px no se hizo en navegador: no habia herramienta de captura en la sesion. Queda en las pruebas manuales.
  - Todo lo que requiere Supabase y las keys reales (ver PRUEBAS-MANUALES).
- **Correccion tras `rejected` (reviewer):** `web/.gitignore` ignoraba `web/.env.example` por la regla `.env*`; se agrego `!.env.example` justo despues y ahora el archivo es rastreable (`.env.local` y `api/.env` siguen ignorados).
- **Riesgo de deploy:** el proyecto de Vercel del API fallara al arrancar mientras no tenga las 5 variables nuevas, porque el env es requerido. Hay que configurarlas antes del siguiente deploy.

## F01 — Login con JWT (2026-11-18) → `testing`

### Que se implemento
- **Base de datos:** `supabase/migrations/20261118130000_f01_profiles.sql`, copiada tal cual de la spec:
  - Tabla `profiles` con sus CHECK.
  - Trigger `on_auth_user_created` (`handle_new_user`, `security definer`, `search_path = ''`).
  - RLS con `profiles_select_own` y `profiles_update_own`.
  - `revoke update` + `grant update (display_name)`.
  - No se aplico: queda en las pruebas manuales.
- **API (`api/`):**
  - `jose ^6` (unica dependencia nueva).
  - `lib/env.ts`: `SUPABASE_JWT_SECRET` opcional (`min(1)`), en `.env.example` comentada y en `vitest.config.ts` con un secreto de prueba.
  - `middlewares/auth.ts`:
    - `createRequireAuth({ supabaseUrl, jwtSecret, jwks })`, `requireAuth`, `supabaseAuthUrls` y `getAuth`.
    - Rama HS256 (solo con secreto) y rama JWKS (`ES256`/`RS256`), cada una con su lista fija de algoritmos.
    - `issuer`, `audience: "authenticated"`, `requiredClaims: ["exp","sub"]` y Zod (`sub` uuid, `email`).
    - Toda falla → `401 "Invalid or expired token"`; sin header → `401 "Missing bearer token"`. El token nunca se loguea.
    - JWKS perezoso por instancia (`jwks ??= createRemoteJWKSet(...)`), solo como optimizacion.
  - `GET /me`: `routes → controllers/meController.ts → services/profileService.ts → repositories/profileRepository.ts`. Usa `userClient(token)` (RLS), responde en camelCase con `email`; sin fila → `404 PROFILE_NOT_FOUND`; error de Supabase → 500.
  - `routes/index.ts`: `/health` publico; `router.use(requireAuth)` antes de `/me` y del 404.
- **Web (`web/`):**
  - `proxy.ts`: refresca la sesion con `getClaims()` y redirige (sin sesion → `/login`; con sesion en `/login`/`/signup` → `/`; sin `onboarded_at` → `/onboarding`; error al consultar → pasa). Las redirecciones copian las cookies.
  - `lib/auth/schemas.ts` (Zod) y `lib/auth/actions.ts` (`login`, `signup`, `logout`, con los mensajes de la tabla de la spec y `redirect` fuera de `try`).
  - Grupo `(auth)/`: `layout.tsx` (tarjeta centrada, sin sidebar), `login`, `signup` y el placeholder `onboarding`.
  - `components/auth/`: `LoginForm`, `SignupForm` (`useActionState`, `noValidate`) y `AuthField.tsx` con `AuthField`, `FormAlert` y `SubmitButton`.
  - `UserMenu` (Server, async, `<details>` sin JS) con el email y "Cerrar sesión"; `Header` lo envuelve en `<Suspense fallback={<UserMenuFallback/>}>`.
  - `lib/api.ts`: `api.me`, tipo `Me` y mensajes de `UNAUTHORIZED` y `PROFILE_NOT_FOUND`.
- **Tests:**
  - api: `middlewares/auth.test.ts` (ES256 con JWKS local y HS256, todos los casos de la tabla), `services/profileService.test.ts`, `app.test.ts` actualizado (`/nope` sin token → 401, con token → 404) y `lib/env.test.ts`.
  - web: `lib/auth/schemas.test.ts`, `lib/auth/actions.test.ts`, `proxy.test.ts` (entorno node, incluye el regex del matcher), `LoginForm.test.tsx`, `SignupForm.test.tsx`, `UserMenu.test.tsx`, `(auth)/auth-pages.test.tsx` y `lib/api.test.ts` actualizado.

### Decisiones
- **Diseno (skill impeccable, extension del sistema de F00, modo "Operate"):**
  - Mismos tokens OKLCH, sin tokens nuevos. Tarjeta `surface` con borde y sombra suave, marca de F00 (icono de barras en azul tinta) arriba.
  - El boton principal es `foreground` sobre `background` (no azul): F00 reservo el acento para el item activo, el foco y la seleccion.
  - Errores de campo en `text-down`, borde del input en `down` con `aria-invalid`; error del formulario en un `role="alert"` con icono.
  - El agente corrio como subagente sin forma de entrevistar al dueño: la direccion se tomo de F00 y de la spec. El detector de impeccable no reporto hallazgos.
- **Componente compartido `AuthField.tsx`** (no esta en el arbol de la spec): evita duplicar el cableado de `aria-invalid`/`aria-describedby` entre los dos formularios.
- **`UserMenuFallback` es un `<span>`, no un `<button>`:** un boton que no hace nada no es accesible. Solo se ve mientras carga la sesion o sin sesion.
- **Test extra `(auth)/auth-pages.test.tsx`:** las paginas y el layout son codigo nuevo y la regla pide test.
- La spec no tuvo errores bloqueantes.

### Como quedo
- `pnpm test`: api 9 archivos / 70 tests; web 13 archivos / 78 tests.
- `pnpm lint` y `pnpm build` sin errores. Build: `/login`, `/signup` y `/onboarding` estaticas, `/` con prerender parcial y `Proxy (Middleware)`.
- `pnpm dev`:
  - `/health` → 200; `/me` sin token → 401 "Missing bearer token"; con `Bearer abc` → 401 "Invalid or expired token".
  - `/login` → 200 con el titulo "Iniciar sesión"; `/signup` → 200; `/` y `/onboarding` sin sesion → 307 a `/login`.
- Pendiente:
  - Todo lo que requiere Supabase (migracion, "Confirm email", verificacion SQL del grant, prueba de humo): ver PRUEBAS-MANUALES.
  - Verificacion visual en navegador (375 px y modo oscuro): no hubo herramienta de captura en la sesion.
  - Despliegue junto con F02: no se hizo commit ni push.
- **Aviso:** `api/.env` ya tiene una `SUPABASE_URL` real y variables con nombres que el codigo no usa (`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`), mientras que `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` siguen con placeholder. El API usa `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` y deriva el JWKS de `SUPABASE_URL`; hay que copiar los valores a esos nombres cuando se pruebe con el proyecto real.

## F02 — Formulario de perfil de riesgo (2026-11-18) → `testing`

### Que se implemento
- **Base de datos:** `supabase/migrations/20261118140000_f02_risk_profile.sql`, copiada tal cual de la spec. Funcion `submit_risk_profile(int[])` (`security definer`, `search_path = ''`) que valida, suma, clasifica y escribe solo la fila de `auth.uid()`. Rehacer conserva el `onboarded_at` original. `execute` solo para `authenticated`. **No se aplico:** la aplica el leader tras la revision.
- **API (`api/`):**
  - `@electric-sql/pglite ^0.5.16` como devDependency (unica dependencia nueva).
  - `repositories/profileRepository.ts`: `submitRiskProfile(client, answers)` → `rpc("submit_risk_profile")`; `P0002` → `null`, otro error → throw, fila validada con `profileRowSchema`.
  - `services/profileService.ts`: `riskProfileInputSchema` (solo la forma), `submitMyRiskProfile(user, token, input: unknown)` con `userClient(token)` y el helper privado `toMe` (compartido con `getMyProfile`).
  - `controllers/meController.ts`: `putRiskProfile`. `routes/index.ts`: `PUT /me/risk-profile` (detras de `requireAuth`).
  - `middlewares/errorHandler.ts`: `entity.parse.failed` → `400 VALIDATION_ERROR "Malformed JSON body"`.
- **Web (`web/`):**
  - `lib/risk/questions.ts`: preguntas, perfiles y aviso, con los textos exactos de la spec. Sin umbrales ni sumas.
  - `lib/risk/actions.ts` (`"use server"`): `submitRiskProfile(answers)`. Valida con Zod, lee el token, llama `api.saveRiskProfile` y, si todo sale bien, hace `revalidatePath("/", "layout")`. Devuelve lo que calculo el servidor.
  - `lib/api.ts`: `api.saveRiskProfile` (PUT, reutiliza `meSchema`) y el mensaje de `VALIDATION_ERROR`.
  - `components/onboarding/RiskQuestionnaire.tsx` (cliente): wizard de 6 pasos y pantalla final. `OnboardingExit.tsx` (Server, async): "Volver a la app" o "Cerrar sesión".
  - `app/(auth)/onboarding/page.tsx`: reemplaza el placeholder; `OnboardingExit` va dentro de `<Suspense>`.
  - `components/layout/UserMenu.tsx`: enlace "Rehacer cuestionario" entre el separador y "Cerrar sesión".
- **Tests:**
  - api: `repositories/riskProfile.sql.test.ts` (nuevo, PGlite, 22 casos), `services/profileService.test.ts` y `app.test.ts` actualizados.
  - web: `lib/risk/questions.test.ts`, `lib/risk/actions.test.ts`, `components/onboarding/RiskQuestionnaire.test.tsx` y `OnboardingExit.test.tsx` (nuevos); `UserMenu.test.tsx`, `lib/api.test.ts` y `(auth)/auth-pages.test.tsx` actualizados.

### Decisiones
- **PGlite soporto todo lo que pide la spec:** `create role`, `set local role`, `alter default privileges`, grants por columna, RLS y `auth.uid()` simulado con `request.jwt.claims`. El test ejecuta el preludio de la spec y las migraciones reales de F01 y F02, leidas del disco. No hizo falta ninguna verificacion manual de reemplazo; la verificacion en Supabase real sigue en PRUEBAS-MANUALES.
- **Diseno (skill impeccable, extension del sistema de F00/F01, modo "Operate"):**
  - Sin tokens nuevos.
  - Las opciones son filas completas con borde. La elegida usa `accent` y `accent-soft` (seleccion). El foco del teclado se dibuja en la fila (`has-focus-visible`), con el mismo anillo azul global.
  - La barra de progreso es fina y neutra (`foreground` sobre `border`): el azul queda solo para la seleccion y el foco.
  - "Siguiente" y "Ir a la app" usan el boton principal de F01 (`foreground`); "Atrás" usa el boton secundario con borde.
  - El pie de salida es un enlace de texto discreto, para no competir con el cuestionario.
  - Corrio como subagente, sin forma de entrevistar al dueño: la direccion se tomo de F00/F01 y de la spec. No existe `PRODUCT.md`. El detector de impeccable no reporto hallazgos.
- **Foco:** un `useEffect` sobre `step`/`result` enfoca el `<h2 tabIndex={-1}>` de la pantalla, excepto en el primer render. El `h2` no tiene contorno, porque no es un control.
- **`answers as number[]`** al enviar: no se puede avanzar sin responder, y la action y el API vuelven a validar.
- La spec no tuvo errores bloqueantes.

### Como quedo
- `pnpm test`: api 10 archivos / 111 tests; web 17 archivos / 99 tests.
- `pnpm lint` y `pnpm build` sin errores. En el build, `/onboarding` queda con prerender parcial (◐), porque solo `OnboardingExit` es dinamico.
- `pnpm dev`: `/health` → 200; `PUT /me/risk-profile` sin token → 401; con JSON mal formado → 400 `VALIDATION_ERROR "Malformed JSON body"`; `/onboarding` sin sesion → 307 a `/login`. Los puertos 3000 y 4000 quedaron libres.
- Pendiente:
  - Aplicar la migracion y correr la verificacion SQL/PostgREST y el flujo en navegador (ver PRUEBAS-MANUALES).
  - Verificacion visual a 375 px y en modo oscuro: no hubo herramienta de captura en la sesion.
  - Despliegue conjunto de F01 + F02: no se hizo commit ni push.
