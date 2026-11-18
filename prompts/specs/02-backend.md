# 02 — Backend

## Stack

- Express 5 + TypeScript (`strict`, ESM, `module: NodeNext` → imports relativos con extension `.js`).
- Desplegado en Vercel: `api/src/app.ts` exporta `default app` (entrypoint serverless); `api/src/server.ts` solo para local.
- Validacion con Zod 4 (`zod`).
- Supabase con `@supabase/supabase-js` (cliente HTTP, sin conexiones persistentes).
- Tests con Vitest + supertest. `fetch` nativo de Node 22 (sin SDKs de vendors).

## Layers

`routes → controllers → services → providers / repositories` (ver `prompts/system/rules.md`).

- `providers/` son los unicos que hablan con Finnhub / Twelve Data. Los services usan `marketData` (de `providers/index.ts`), nunca un adaptador concreto.
- `services/cache.ts` envuelve las llamadas a providers; la cache vive en Supabase (`provider_cache`), nunca en memoria.
- Errores: se lanza `AppError(status, code, message)` de `middlewares/errorHandler.ts`; el handler central responde `{ error: { code, message } }`.

Codigos de error definidos hasta ahora:

| status | code | origen |
|---|---|---|
| 404 | `NOT_FOUND` | ruta inexistente (ya existe) |
| 500 | `INTERNAL_ERROR` | error no controlado (ya existe) |
| 502 | `PROVIDER_ERROR` | F00: el proveedor fallo o respondio algo invalido |
| 503 | `PROVIDER_RATE_LIMITED` | F00: el proveedor devolvio limite de uso |
| 401 | `UNAUTHORIZED` | F01: falta el token o es invalido/expirado |
| 404 | `PROFILE_NOT_FOUND` | F01: el usuario autenticado no tiene fila en `profiles` |
| 400 | `VALIDATION_ERROR` | F02: body, params o query invalidos (Zod) o JSON mal formado |

## Market data providers

Ver F00. Finnhub (`https://finnhub.io/api/v1`) para search, quote, profile, metrics y news; Twelve Data (`https://api.twelvedata.com`) solo para `time_series`. Los indicadores tecnicos se calculan en el API (F08).

## REST endpoints

| Metodo | Ruta | Auth | Feature |
|---|---|---|---|
| GET | `/health` | no | existente |
| GET | `/me` | si | F01 |
| PUT | `/me/risk-profile` | si | F02 |

F00 no agrega endpoints.

## Data model

| Tabla | Acceso | Feature |
|---|---|---|
| `provider_cache` | solo service role (RLS sin policies) | F00 |
| `profiles` | usuario: select de su fila y update solo de `display_name` (RLS + grant por columna); el perfil de riesgo solo via la funcion `submit_risk_profile` | F01, F02 |

## Embeddings

Extension `vector` habilitada en F00. Uso en F07.

## MCP tools

Pendiente (F14).

---

## F00 — Base

**Estatus:** ready

### Requisitos

1. CUANDO se aplica la migracion de F00, EL sistema DEBE crear la tabla `public.provider_cache` con RLS activado y sin policies, y habilitar la extension `vector`.
2. CUANDO el API arranca sin alguna de las variables de entorno requeridas, EL sistema DEBE fallar al iniciar con un error de Zod que nombre la variable.
3. CUANDO un service pide un dato a `getOrSet` y existe una fila con esa key y `expires_at > now()`, EL sistema DEBE devolver el `payload` guardado sin llamar al `fetcher`.
4. CUANDO no hay fila o esta expirada, EL sistema DEBE llamar al `fetcher`, guardar el resultado con `expires_at = now + ttl` (upsert por key) y devolverlo.
5. CUANDO el `fetcher` lanza un error, EL sistema DEBE propagar el error sin escribir en la cache.
6. CUANDO falla la lectura o escritura de la cache en Supabase, EL sistema DEBE loguear el error y continuar (leer del proveedor / devolver el valor), sin romper la peticion.
7. CUANDO un proveedor responde HTTP 429 (o Twelve Data responde cuerpo con `code: 429`), EL sistema DEBE lanzar `AppError(503, "PROVIDER_RATE_LIMITED", "Market data provider rate limit reached, try again in a minute")`.
8. CUANDO un proveedor falla por red, timeout (8 s), HTTP no-2xx distinto de 429, JSON invalido o una respuesta que no pasa su esquema Zod, EL sistema DEBE lanzar `AppError(502, "PROVIDER_ERROR", "Market data provider error")` y loguear el detalle (proveedor, endpoint, causa) sin la API key.
9. CUANDO se consulta un simbolo inexistente, EL provider DEBE devolver `null` (quote, profile, metrics, history) para que F03 lo traduzca a `404 SYMBOL_NOT_FOUND`.

### Migracion

Archivo: `supabase/migrations/20261118120000_f00_base.sql`

```sql
-- F00: base. Cache de respuestas de proveedores y extension vector (usada en F07).
create extension if not exists vector with schema extensions;

create table public.provider_cache (
  key        text primary key,
  payload    jsonb not null,
  expires_at timestamptz not null
);

-- Solo el service role (que ignora RLS) accede a esta tabla: RLS activo y sin policies.
alter table public.provider_cache enable row level security;
```

No se purgan filas expiradas: el upsert por key las sobrescribe. (Gancho futuro: un cron de limpieza si la tabla crece.)

### Dependencias nuevas (`api/`)

- `@supabase/supabase-js` (dependency).
- Nada mas. `jose` llega en F01.

### Variables de entorno

`api/src/lib/env.ts` agrega al esquema (todas requeridas, `z.string().min(1)` salvo la URL):

| Variable | Validacion | Uso |
|---|---|---|
| `SUPABASE_URL` | `z.url()` | ambos clientes |
| `SUPABASE_ANON_KEY` | `z.string().min(1)` | `userClient` |
| `SUPABASE_SERVICE_ROLE_KEY` | `z.string().min(1)` | `adminClient` (secreta) |
| `FINNHUB_API_KEY` | `z.string().min(1)` | provider finnhub (secreta) |
| `TWELVEDATA_API_KEY` | `z.string().min(1)` | provider twelvedata (secreta) |

- Exportar tambien `envSchema` para poder testear la validacion sin depender de `process.env`.
- `api/.env.example` agrega las 5 variables con placeholders que pasen la validacion (p. ej. `SUPABASE_URL=https://your-project-ref.supabase.co`, `FINNHUB_API_KEY=your-finnhub-key`), para que `pnpm dev:api` arranque con `/health` aunque aun no existan las credenciales reales.
- Crear `api/vitest.config.ts` con `test.env` con valores ficticios de las 5 variables, para que `app.test.ts` y el resto de tests pasen sin `.env`.

### `api/src/lib/supabase.ts`

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Service role: ignora RLS. Solo para provider_cache y stock_catalog. */
export function adminClient(): SupabaseClient;

/** Anon key + JWT del usuario en `Authorization`, asi aplica RLS (F01+). */
export function userClient(jwt: string): SupabaseClient;
```

- Ambos con `auth: { persistSession: false, autoRefreshToken: false }`.
- `userClient` pasa `global: { headers: { Authorization: \`Bearer ${jwt}\` } }`.
- Se crea un cliente por llamada (es HTTP, barato; no hay estado entre requests en serverless).
- Sin tipos generados de la BD por ahora (`SupabaseClient` sin generico).

### Interfaz `MarketDataProvider`

`api/src/providers/types.ts`:

```ts
export interface SymbolSearchResult { symbol: string; name: string; type: string }

export interface Quote {
  symbol: string;
  price: number;           // c
  change: number | null;   // d
  changePercent: number | null; // dp
  high: number;            // h
  low: number;             // l
  open: number;            // o
  previousClose: number;   // pc
  timestamp: number;       // t (unix s)
}

export interface CompanyProfile {
  symbol: string;          // ticker
  name: string;
  logoUrl: string | null;  // logo ("" → null)
  industry: string | null; // finnhubIndustry (lo que la UI llama "sector")
  country: string | null;
  website: string | null;  // weburl
  exchange: string | null;
  currency: string | null;
  marketCapMillions: number | null; // marketCapitalization (Finnhub lo da en millones)
}

export interface CompanyMetrics {
  peRatio: number | null;        // metric.peTTM ?? metric.peBasicExclExtraTTM
  beta: number | null;           // metric.beta
  week52High: number | null;     // metric["52WeekHigh"]
  week52Low: number | null;      // metric["52WeekLow"]
  dividendYieldPercent: number | null; // metric.dividendYieldIndicatedAnnual
  marketCapMillions: number | null;    // metric.marketCapitalization
}

export interface NewsItem {
  id: number;
  headline: string;
  source: string;
  summary: string;
  url: string;
  imageUrl: string | null; // image ("" → null)
  publishedAt: string;     // datetime (unix s) → ISO 8601
  related: string | null;  // related ("" → null)
}

export interface Candle {
  date: string; // "YYYY-MM-DD"
  open: number; high: number; low: number; close: number;
  volume: number | null;
}

export type HistoryInterval = "1day" | "1week";

export interface MarketDataProvider {
  search(query: string): Promise<SymbolSearchResult[]>;
  quote(symbol: string): Promise<Quote | null>;
  profile(symbol: string): Promise<CompanyProfile | null>;
  metrics(symbol: string): Promise<CompanyMetrics | null>;
  /** from/to: "YYYY-MM-DD" */
  companyNews(symbol: string, from: string, to: string): Promise<NewsItem[]>;
  marketNews(category: "general"): Promise<NewsItem[]>;
  /** Velas en orden ascendente por fecha. */
  history(symbol: string, interval: HistoryInterval, outputSize: number): Promise<Candle[] | null>;
}
```

#### Mapeo a endpoints

| Metodo | Usado por | Endpoint | `null` / vacio cuando |
|---|---|---|---|
| `search` | F03 | Finnhub `GET /search?q={query}` | `result: []` → `[]` |
| `quote` | F03, F04, F06, F09 | Finnhub `GET /quote?symbol={S}` | `t === 0` (Finnhub responde todo en 0 para simbolos desconocidos) |
| `profile` | F03 | Finnhub `GET /stock/profile2?symbol={S}` | respuesta `{}` (sin `ticker`) |
| `metrics` | F03, F07 | Finnhub `GET /stock/metric?symbol={S}&metric=all` | `metric` vacio `{}` |
| `companyNews` | F05 | Finnhub `GET /company-news?symbol={S}&from={from}&to={to}` | `[]` |
| `marketNews` | F05, F06 | Finnhub `GET /news?category=general` | `[]` |
| `history` | F03, F08 | Twelve Data `GET /time_series?symbol={S}&interval={interval}&outputsize={n}&order=asc` | cuerpo `{ status: "error", code: 400 \| 404 }` |

- El adaptador no recorta ni filtra (p. ej. "maximo 10 resultados", "ultimas 20 noticias", mapeo de rango → `outputSize`): eso es logica de services en F03/F05.
- Simbolos se envian en mayusculas (`symbol.toUpperCase()`); los parametros se construyen con `URLSearchParams`.
- Auth por header para que la key no aparezca en URLs ni logs: Finnhub `X-Finnhub-Token: {FINNHUB_API_KEY}`, Twelve Data `Authorization: apikey {TWELVEDATA_API_KEY}`.

#### Esquemas Zod de respuesta (solo los campos usados; Zod descarta el resto)

```ts
// Finnhub
const searchSchema = z.object({ result: z.array(z.object({
  symbol: z.string(), description: z.string(), type: z.string() })) });
const quoteSchema = z.object({ c: z.number(), d: z.number().nullable(), dp: z.number().nullable(),
  h: z.number(), l: z.number(), o: z.number(), pc: z.number(), t: z.number() });
const profileSchema = z.object({ ticker: z.string(), name: z.string(), logo: z.string(),
  finnhubIndustry: z.string(), country: z.string(), weburl: z.string(), exchange: z.string(),
  currency: z.string(), marketCapitalization: z.number() }).partial(); // {} = no encontrado
const n = z.number().nullish(); // Finnhub omite o manda null segun el simbolo
const metricSchema = z.object({ metric: z.object({ peTTM: n, peBasicExclExtraTTM: n,
  beta: n, "52WeekHigh": n, "52WeekLow": n, dividendYieldIndicatedAnnual: n, marketCapitalization: n }) });
const newsSchema = z.array(z.object({ id: z.number(), headline: z.string(), source: z.string(),
  summary: z.string(), url: z.string(), image: z.string(), datetime: z.number(), related: z.string() }));

// Twelve Data (numeros llegan como string)
const timeSeriesSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), values: z.array(z.object({ datetime: z.string(),
    open: z.coerce.number(), high: z.coerce.number(), low: z.coerce.number(), close: z.coerce.number(),
    volume: z.coerce.number().optional() })) }),
  z.object({ status: z.literal("error"), code: z.number(), message: z.string() }),
]);
```

En `metrics` cada campo se normaliza a `number | null` (`?? null`); "metric vacio" = ningun campo con valor. Un `profile` con `ticker` presente pero campos faltantes o `""` → esos campos `null`.

#### Estructura de archivos

```
api/src/providers/
├── types.ts        # interfaz y tipos de dominio (arriba)
├── http.ts         # fetchJson(provider, url, headers, schema): fetch + timeout + mapeo de errores + Zod
├── finnhub.ts      # createFinnhubProvider(apiKey): Omit<MarketDataProvider, "history">
├── twelvedata.ts   # createTwelveDataProvider(apiKey): Pick<MarketDataProvider, "history">
└── index.ts        # export const marketData: MarketDataProvider = { ...finnhub, history } (lee env)
```

- `fetchJson` usa `fetch(url, { headers, signal: AbortSignal.timeout(8000) })`. Mapeo: `res.status === 429` → 503; `!res.ok` → 502; `res.json()` falla → 502; `schema.safeParse` falla → 502; `fetch` rechaza (red/abort) → 502.
- Twelve Data responde HTTP 200 con `{ status: "error", code }`: `twelvedata.ts` mapea `code === 429` → 503, `400 | 404` → `null`, otro → 502.
- Las factories reciben la key como argumento (no leen `env`), asi se testean sin env. Solo `index.ts` importa `env`.

### `api/src/services/cache.ts`

```ts
export const CACHE_TTL = {
  quote: 60,
  search: 86_400,
  news: 900,
  history: 43_200,
  profile: 604_800,
  metrics: 604_800,
} as const; // segundos

export async function getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T>;
```

- Usa `adminClient()`: `select("payload, expires_at").eq("key", key).maybeSingle()`; hit si `new Date(expires_at) > new Date()`.
- Escritura: `upsert({ key, payload, expires_at }, { onConflict: "key" })`.
- Si el `fetcher` devuelve `null` o `undefined` no se guarda (simbolo inexistente; evita filas basura).
- El `payload` leido se devuelve como `T` (ya fue validado con Zod antes de guardarse; comentario del "por que" en el cast).
- Errores de Supabase (campo `error` del resultado o excepcion) → `console.error` y seguir (req. 6).

Convencion de keys: `{provider}:{tipo}:{parametros separados por ":"}`, simbolos en mayusculas, query de busqueda en minusculas y `trim()`.

| Tipo | Key | TTL |
|---|---|---|
| search | `finnhub:search:{q}` | `CACHE_TTL.search` |
| quote | `finnhub:quote:{S}` | `CACHE_TTL.quote` |
| profile | `finnhub:profile:{S}` | `CACHE_TTL.profile` |
| metrics | `finnhub:metrics:{S}` | `CACHE_TTL.metrics` |
| companyNews | `finnhub:company-news:{S}:{from}:{to}` | `CACHE_TTL.news` |
| marketNews | `finnhub:market-news:general` | `CACHE_TTL.news` |
| history | `twelvedata:history:{S}:{interval}:{outputSize}` | `CACHE_TTL.history` |

Gancho para F03+: cada service hace `getOrSet(key, CACHE_TTL.x, () => marketData.x(...))`. F00 no crea esos services.

### Estrategia de tests

Ninguno requiere credenciales ni red: `fetch` se mockea con `vi.stubGlobal("fetch", vi.fn())` y Supabase con `vi.mock("../lib/supabase.js")`.

| Archivo | Casos |
|---|---|
| `lib/env.test.ts` | `envSchema` acepta un objeto completo; rechaza si falta cada variable nueva o si `SUPABASE_URL` no es URL. |
| `lib/supabase.test.ts` | con `@supabase/supabase-js` mockeado: `adminClient` usa la service role key; `userClient("jwt")` usa la anon key y el header `Authorization: Bearer jwt`. |
| `providers/http.test.ts` | 429 → `AppError` 503 `PROVIDER_RATE_LIMITED`; 500 → 502; JSON invalido → 502; esquema invalido → 502; `fetch` rechaza → 502; respuesta valida → objeto parseado. |
| `providers/finnhub.test.ts` | por metodo: URL + query + header `X-Finnhub-Token` correctos y mapeo de fixture realista a tipo de dominio; `quote` con `t: 0` → `null`; `profile` `{}` → `null`; `metrics` vacio → `null`; `image: ""` → `imageUrl: null`; `datetime` → ISO. |
| `providers/twelvedata.test.ts` | URL + header `Authorization: apikey ...`; strings → numeros; orden ascendente; `{status:"error",code:429}` → 503; `code:404` → `null`; otro `code` → 502. |
| `services/cache.test.ts` | con un fake del query builder: miss → llama `fetcher` y hace upsert con `expires_at ≈ now + ttl`; hit vigente → no llama `fetcher`; expirado → llama `fetcher`; **dos llamadas seguidas con la misma key → `fetcher` se llama 1 vez** (el fake guarda lo upserted); `fetcher` lanza → propaga y no hay upsert; `fetcher` devuelve `null` → no hay upsert; error de lectura → llama `fetcher`; error de escritura → devuelve el valor. |
| `app.test.ts` (existente) | sigue pasando con el `test.env` de `vitest.config.ts`. |

### Pasos manuales pendientes (proyecto de Supabase y keys aun no existen)

Para cuando existan (anotar en `PRUEBAS-MANUALES.md`):

1. Crear proyecto en Supabase; aplicar la migracion (`supabase link` + `supabase db push`, o pegar el SQL en el SQL Editor).
2. Verificar en el dashboard: tabla `provider_cache` con RLS "enabled" y 0 policies; extension `vector` activa.
3. Crear API keys de Finnhub y Twelve Data.
4. Poner las 5 variables en `api/.env` y en el proyecto de Vercel del API (Production y Preview).
5. Prueba de humo: con un script o ruta temporal local llamar `getOrSet("finnhub:quote:AAPL", 60, () => marketData.quote("AAPL"))` dos veces y ver una sola fila en `provider_cache` (la verificacion completa por HTTP llega con F03).

---

## F01 — Login con JWT

**Estatus:** ready

### Requisitos

1. CUANDO se aplica la migracion de F01, EL sistema DEBE crear `public.profiles` (con sus CHECK), el trigger que inserta un profile por cada usuario nuevo de `auth.users`, y RLS con policies de select y update solo sobre la propia fila.
2. CUANDO llega una peticion a cualquier ruta distinta de `/health` sin header `Authorization: Bearer <token>`, EL sistema DEBE responder `401 { error: { code: "UNAUTHORIZED", message: "Missing bearer token" } }`.
3. CUANDO el token no se puede verificar (firma, `alg` no permitido, `iss`, `aud`, `exp`, o claims `sub`/`email` invalidos), EL sistema DEBE responder `401 { error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } }`, sin revelar la causa y sin loguear el token.
4. CUANDO el token es valido, EL sistema DEBE dejar `req.user = { id, email }` y `req.accessToken = <token>` y continuar.
5. CUANDO el token usa `alg: HS256` y `SUPABASE_JWT_SECRET` no esta configurada, EL sistema DEBE responder `401` (no hay con que verificarlo).
6. CUANDO un usuario autenticado llama `GET /me`, EL sistema DEBE leer su fila de `profiles` con `userClient(accessToken)` (aplica RLS) y responder `200` con el profile en camelCase mas su `email`.
7. CUANDO la fila no existe (o RLS no la deja ver), EL sistema DEBE responder `404 { error: { code: "PROFILE_NOT_FOUND", message: "Profile not found" } }`.
8. CUANDO Supabase devuelve error al leer el profile, EL sistema DEBE propagarlo como `500 INTERNAL_ERROR` (handler central).
9. CUANDO se pide una ruta inexistente sin token, EL sistema DEBE responder `401` (el auth corre antes del 404); con token valido, `404 NOT_FOUND`.

### Migracion

Archivo nuevo: `supabase/migrations/20261118130000_f01_profiles.sql` (no se toca el de F00).

```sql
-- F01: profile 1:1 con auth.users. Lo crea un trigger al registrarse; F02 llena el perfil de riesgo.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  risk_score   int null check (risk_score between 6 and 24),
  risk_profile text null check (risk_profile in ('conservador', 'moderado', 'agresivo')),
  onboarded_at timestamptz null,
  created_at   timestamptz not null default now(),
  -- F02 guarda puntaje, perfil y fecha juntos: o estan los tres o ninguno.
  constraint profiles_onboarding_consistent check (
    (risk_score is null and risk_profile is null and onboarded_at is null)
    or (risk_score is not null and risk_profile is not null and onboarded_at is not null)
  )
);

-- security definer: el insert en auth.users lo hace el rol de Auth, que no pasa RLS de public.profiles.
-- search_path vacio: evita que un objeto con el mismo nombre en otro schema secuestre la funcion.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 50)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Sin policies de insert/delete: insert lo hace el trigger, delete el cascade de auth.users.
-- El usuario solo puede cambiar su nombre. risk_score, risk_profile y onboarded_at no se pueden escribir
-- con su JWT (evita saltarse el calculo del servidor); los escribira una funcion security definer de F02.
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;
```

- `(select auth.uid())` en vez de `auth.uid()`: Postgres lo evalua una vez por consulta, no por fila (recomendacion de Supabase para RLS).
- `display_name` sale de `raw_user_meta_data.display_name` (lo manda el signup del web en `options.data`); si falta, la parte local del email. `left(..., 50)` evita que un signup hecho fuera del web falle por el CHECK.

### Dependencias nuevas (`api/`)

- `jose` (dependency, `^6`). Nada mas.

### Variables de entorno

`api/src/lib/env.ts` agrega:

| Variable | Validacion | Uso |
|---|---|---|
| `SUPABASE_JWT_SECRET` | `z.string().min(1).optional()` | solo proyectos con el secreto HS256 legacy (secreta) |

`api/.env.example` agrega (comentada, para que una linea vacia no rompa la validacion):

```
# Only for Supabase projects that still sign JWTs with the legacy HS256 secret
# (Project Settings > JWT Keys > Legacy JWT Secret). Leave commented when the project uses JWT signing keys (JWKS).
# SUPABASE_JWT_SECRET=your-legacy-jwt-secret
```

`api/vitest.config.ts` agrega en `test.env`: `SUPABASE_JWT_SECRET: "test-jwt-secret-with-at-least-32-characters"` (lo usa `app.test.ts` para firmar tokens HS256 sin red).

### Verificacion del JWT (`api/src/middlewares/auth.ts`)

Datos de Supabase (con `SUPABASE_URL` sin `/` final):

| Que | Valor |
|---|---|
| JWKS | `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` |
| `issuer` (`iss`) | `${SUPABASE_URL}/auth/v1` |
| `audience` (`aud`) | `"authenticated"` (los tokens de la anon/service key no la tienen, asi que se rechazan) |
| Algoritmos con JWKS | `["ES256", "RS256"]` |
| Algoritmo legacy | `["HS256"]` con `SUPABASE_JWT_SECRET` |

```ts
import type { Request, RequestHandler } from "express";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTVerifyGetKey } from "jose";

export interface AuthUser { id: string; email: string }

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;        // lo pone requireAuth
      accessToken?: string;   // JWT crudo, para userClient(jwt)
    }
  }
}

export function supabaseAuthUrls(supabaseUrl: string): { issuer: string; jwksUrl: URL };

export function createRequireAuth(opts: {
  supabaseUrl: string;
  jwtSecret?: string;        // fallback HS256 legacy
  jwks?: JWTVerifyGetKey;    // inyectable en tests; por defecto createRemoteJWKSet(jwksUrl)
}): RequestHandler;

export const requireAuth = createRequireAuth({
  supabaseUrl: env.SUPABASE_URL,
  jwtSecret: env.SUPABASE_JWT_SECRET,
});

/** Para controllers: devuelve user y token o lanza AppError(401) si requireAuth no corrio. */
export function getAuth(req: Request): { user: AuthUser; token: string };
```

Flujo de `requireAuth`:

1. Leer `req.get("authorization")` y extraer con `/^Bearer\s+(\S+)$/i`. Si no hay match → `AppError(401, "UNAUTHORIZED", "Missing bearer token")`.
2. `decodeProtectedHeader(token).alg` (si lanza → 401 invalido).
3. Si `alg === "HS256"`: sin `jwtSecret` → 401; con secreto → key `new TextEncoder().encode(jwtSecret)`, `algorithms: ["HS256"]`. Si no: key = JWKS, `algorithms: ["ES256", "RS256"]`. La lista de algoritmos va fija por rama: evita la confusion de algoritmos (firmar HS256 con la llave publica) y `alg: none`.
4. `jwtVerify(token, key, { issuer, audience: "authenticated", algorithms, requiredClaims: ["exp", "sub"] })`.
5. Validar el payload con Zod: `z.object({ sub: z.uuid(), email: z.string() })`. Falla → 401.
6. `req.user = { id: sub, email }`, `req.accessToken = token`, `next()`.
7. Cualquier excepcion de los pasos 2–5 → `AppError(401, "UNAUTHORIZED", "Invalid or expired token")`. Express 5 propaga el rechazo de middlewares `async` al handler central.

**Cache del JWKS:** el JWKS se crea con `createRemoteJWKSet(jwksUrl)` una sola vez por instancia, de forma perezosa en la primera peticion autenticada (`jwks ??= createRemoteJWKSet(...)` en el closure de la factory). `jose` guarda las llaves en memoria (`cacheMaxAge` 10 min por defecto) y vuelve a pedirlas si llega un `kid` desconocido (rotacion, con `cooldownDuration` 30 s). Es aceptable en Vercel serverless porque es **solo una optimizacion, no estado requerido**: si la instancia es nueva o se recicla, el primer request hace un `GET` al JWKS y sigue igual de correcto; ninguna peticion depende de lo que dejo otra. Cumple la regla "sin estado en memoria que deba sobrevivir entre requests".

**Proyectos con HS256 legacy:** los proyectos de Supabase con "JWT signing keys" (los nuevos, por defecto) firman con ES256 y publican la llave en el JWKS. Los proyectos que siguen con el secreto legacy firman con HS256 y su JWKS no trae llaves utiles. El fallback configurable cubre ambos: con `SUPABASE_JWT_SECRET` definida se aceptan tokens HS256 verificados con ese secreto; sin ella solo se aceptan tokens asimetricos. Recomendado: migrar el proyecto a signing keys y no definir la variable.

### Rutas

`api/src/routes/index.ts`:

```ts
router.get("/health", getHealth);
router.use(requireAuth);      // todo lo que sigue requiere auth (PLAN: todas excepto /health)
router.get("/me", getMe);
```

Las features siguientes agregan sus rutas debajo de `router.use(requireAuth)`. El preflight `OPTIONS` lo resuelve `cors()` antes del router, asi que no pide token.

### `GET /me`

Capas: `routes → controllers/meController.ts → services/profileService.ts → repositories/profileRepository.ts`.

- `repositories/profileRepository.ts`:
  - `findProfileById(client: SupabaseClient, id: string): Promise<ProfileRow | null>`.
  - `client.from("profiles").select("id, display_name, risk_score, risk_profile, onboarded_at, created_at").eq("id", id).maybeSingle()`.
  - `error` → `throw new Error(...)` (→ 500). Fila → validar con Zod (`risk_profile` como `z.enum([...]).nullable()`).
  - Gancho F02: `risk_score`, `risk_profile` y `onboarded_at` no son escribibles por `authenticated` (solo `display_name`). F02 las escribira con una funcion SQL `security definer` (que se especifica en F02), llamada desde el repository via `rpc`.
- `services/profileService.ts`:
  - `getMyProfile(user: AuthUser, token: string): Promise<Me>`.
  - Crea `userClient(token)` (anon key + JWT del usuario, asi aplica RLS; **no** `adminClient`).
  - `null` → `AppError(404, "PROFILE_NOT_FOUND", "Profile not found")`.
- `controllers/meController.ts`: `const { user, token } = getAuth(req); res.json(await getMyProfile(user, token));`.

Respuesta `200`:

```json
{
  "id": "5f0c…-uuid",
  "email": "ana@example.com",
  "displayName": "Ana",
  "riskScore": null,
  "riskProfile": null,
  "onboardedAt": null,
  "createdAt": "2026-11-18T12:00:00.000Z"
}
```

`riskProfile`: `"conservador" | "moderado" | "agresivo" | null`. `onboardedAt`/`createdAt`: string ISO tal como la devuelve Supabase. El web usa `onboardedAt` para saber si falta el onboarding (gancho F02).

### Estrategia de tests (sin Supabase real ni red)

- JWT de prueba: `generateKeyPair("ES256")` de `jose` en `beforeAll`, `exportJWK(publicKey)` con `kid` y `alg`, y `createLocalJWKSet({ keys: [jwk] })` pasado como `jwks` a `createRequireAuth`. Tokens con `new SignJWT({ email }).setProtectedHeader({ alg: "ES256", kid }).setSubject(uuid).setIssuer(iss).setAudience("authenticated").setExpirationTime("1h").sign(privateKey)`.
- No hay `fetch` al JWKS en ningun test: el `jwks` se inyecta; el default se prueba solo via `supabaseAuthUrls`.
- Supabase: `vi.mock("../lib/supabase.js")` con un fake del query builder (como en F00).

| Archivo | Casos |
|---|---|
| `middlewares/auth.test.ts` | mini app Express con `createRequireAuth({ supabaseUrl, jwtSecret, jwks })` + `errorHandler`, via supertest: sin header → 401 "Missing bearer token"; `Basic x` → 401; `Bearer basura` → 401; ES256 valido → 200 con `req.user` y `req.accessToken`; expirado → 401; `iss` distinto → 401; `aud` distinto/ausente → 401; firmado con otro par de llaves → 401; `sub` no uuid → 401; sin `email` → 401; `alg: none` → 401; HS256 con el secreto correcto → 200; HS256 con otro secreto → 401; HS256 sin `jwtSecret` configurado → 401; todas las respuestas 401 con shape `{ error: { code: "UNAUTHORIZED", message } }`. `supabaseAuthUrls("https://x.supabase.co/")` → issuer `https://x.supabase.co/auth/v1` y JWKS `.../auth/v1/.well-known/jwks.json`. `getAuth` sin `req.user` → lanza 401. |
| `services/profileService.test.ts` | `userClient` llamado con el token (nunca `adminClient`); fila → `Me` en camelCase con `email` del user; `null` → `AppError` 404 `PROFILE_NOT_FOUND`; error de Supabase → lanza; fila con `risk_profile` fuera del enum → lanza. |
| `app.test.ts` (actualizar) | `/health` sin token → 200; `/me` sin token → 401; `/me` con token HS256 firmado con el `SUPABASE_JWT_SECRET` de `vitest.config.ts` y `userClient` mockeado → 200 con el shape de arriba; `/me` con profile inexistente → 404 `PROFILE_NOT_FOUND`; el test existente de `/nope` cambia: sin token → 401, con token valido → 404 `NOT_FOUND`. |
| `lib/env.test.ts` (actualizar) | `SUPABASE_JWT_SECRET` es opcional (acepta ausente y rechaza `""`). |

La migracion no tiene test automatico (no hay Postgres en CI); se verifica en los pasos manuales, incluida esta verificacion SQL de columnas protegidas (SQL Editor, simulando al usuario):

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<uuid-del-usuario>","role":"authenticated"}', true);
update public.profiles set display_name = 'Nuevo' where id = '<uuid-del-usuario>';   -- OK, 1 fila
update public.profiles set risk_score = 24 where id = '<uuid-del-usuario>';          -- ERROR: permission denied for table profiles
rollback;
```

Repetir el segundo `update` con `risk_profile = 'agresivo'` y con `onboarded_at = now()`: los tres deben fallar con `permission denied`.

Criterio de aceptacion: un update directo de `risk_score`, `risk_profile` u `onboarded_at` con el JWT del usuario falla; uno de `display_name` sobre su propia fila funciona.

### Pasos manuales pendientes (cuando exista el proyecto de Supabase)

Anotar en `PRUEBAS-MANUALES.md`:

1. Aplicar la migracion (`supabase db push` o pegar el SQL en el SQL Editor) despues de la de F00.
2. En el dashboard: `profiles` con RLS "enabled" y 2 policies (`profiles_select_own`, `profiles_update_own`); trigger `on_auth_user_created` en `auth.users`.
3. Authentication > Providers > Email: dejar Email habilitado y **desactivar "Confirm email"**.
4. Project Settings > JWT Keys: ver si el proyecto usa signing keys (ES256). Si sigue en el secreto legacy, poner `SUPABASE_JWT_SECRET` en `api/.env` y en Vercel (Production y Preview) del API. Redeploy.
5. Prueba de humo contra el API desplegado: `curl {API}/me` → 401 `UNAUTHORIZED`; con el `access_token` de un usuario registrado (DevTools o `supabase.auth.getSession()`) → 200 con su profile; con el token alterado en un caracter → 401.
6. Registrar un usuario y confirmar en Table Editor que aparece su fila en `profiles` con `display_name` y el resto en `null`.
7. Correr la verificacion SQL de columnas protegidas (arriba) con el uuid de ese usuario. Opcional, por PostgREST con su JWT: `PATCH {SUPABASE_URL}/rest/v1/profiles?id=eq.<uuid>` con `apikey: <anon>`, `Authorization: Bearer <access_token>` y body `{"risk_score":24}` → error `42501` (permission denied).
8. Despliegue: F01 y F02 se despliegan juntas. F01 se commitea pero **no se hace push** hasta que F02 este `ready`; la prueba de humo en produccion se hace con las dos.

---

## F02 — Formulario de perfil de riesgo

**Estatus:** ready

### Decision: como se escribe el perfil sin reabrir el hueco de F01

F01 dejo a `authenticated` sin grant de update sobre `risk_score`, `risk_profile` y `onboarded_at`. Se evaluaron dos caminos:

| | (a) Funcion SQL `security definer` llamada con `userClient` | (b) `adminClient` filtrando por `req.user.id` |
|---|---|---|
| Camino directo del usuario | Puede llamar la funcion por PostgREST, pero la funcion calcula todo desde las respuestas y `auth.uid()`: solo obtiene lo mismo que con el cuestionario. Fijar valores arbitrarios es imposible. | Ninguno (sin grant ni RPC). |
| Si el API tiene un bug | La BD sigue garantizando "solo tu fila, solo valores calculados". | `service_role` ignora RLS: un filtro mal hecho escribe en la fila de otro. |
| Decisiones vigentes | Cumple "el API usa el JWT del usuario; `service_role` solo para `provider_cache` y `stock_catalog`" (PLAN) y el gancho ya aprobado en F01 ("funcion `security definer` llamada via `rpc`"). | Rompe esa regla de PLAN. |
| Fuente de verdad del calculo | La funcion SQL (unica). | El service en TS (unica). |
| Tests en CI | Con PGlite (Postgres en WASM, sin servidor), ejecutando las migraciones reales. | Vitest puro. |

**Elegida: (a).** Defensa en profundidad (la regla vive en la BD y no depende de que el API filtre bien) y respeta las decisiones ya aprobadas. Su costo (probar SQL) se resuelve con PGlite.

**Una sola fuente de verdad:** la suma y los umbrales (≤ 11, 12–18, ≥ 19) existen **solo** en `submit_risk_profile`. El service valida la forma de la entrada con Zod (para responder `400` antes de ir a la BD), pero no suma ni clasifica; el web solo muestra lo que devuelve el API. Esto precisa el PLAN ("el calculo vive en el service"): el calculo vive del lado del servidor, en la funcion que el service invoca, nunca en el cliente.

### Requisitos

1. CUANDO un usuario autenticado llama `PUT /me/risk-profile` con `{ "answers": [a1..a6] }` (6 enteros de 1 a 4), EL sistema DEBE llamar `submit_risk_profile` con `userClient(token)` y responder `200` con el profile actualizado (mismo shape que `GET /me`).
2. CUANDO el body no es un objeto con `answers` como arreglo de exactamente 6 enteros entre 1 y 4, EL sistema DEBE responder `400 { error: { code: "VALIDATION_ERROR", message: "answers must be an array of 6 integers between 1 and 4" } }` sin llamar a Supabase.
3. CUANDO el body no es JSON valido, EL sistema DEBE responder `400 { error: { code: "VALIDATION_ERROR", message: "Malformed JSON body" } }` (hoy `express.json()` lo convierte en `500`). `express.json()` corre antes del router, asi que esto pasa aun sin token.
4. CUANDO `submit_risk_profile` se ejecuta, EL sistema DEBE sumar las respuestas, asignar `conservador` si el puntaje es ≤ 11, `moderado` si es de 12 a 18 y `agresivo` si es ≥ 19, y guardar `risk_score`, `risk_profile` y `onboarded_at` solo en la fila de `auth.uid()`.
5. CUANDO el usuario ya tenia perfil (rehacer), EL sistema DEBE sobrescribir `risk_score` y `risk_profile` y conservar el `onboarded_at` original. No se guarda historial (pertenece a F07).
6. CUANDO la funcion recibe respuestas invalidas (nulo, distinto de 6 elementos, algun nulo, fuera de 1–4, arreglo de 2 dimensiones), EL sistema DEBE lanzar `22023` sin modificar nada.
7. CUANDO se llama la funcion sin usuario (`auth.uid()` nulo) o con el rol `anon`, EL sistema DEBE rechazarla (`42501`).
8. CUANDO la fila del usuario no existe, EL sistema DEBE responder `404 PROFILE_NOT_FOUND`.
9. CUANDO Supabase devuelve cualquier otro error, EL sistema DEBE responder `500 INTERNAL_ERROR` (handler central).
10. `GET /me` no cambia.

### Migracion

Archivo nuevo: `supabase/migrations/20261118140000_f02_risk_profile.sql` (no se tocan F00 ni F01).

```sql
-- F02: unica via para escribir el perfil de riesgo. Calcula puntaje y perfil desde las respuestas y escribe
-- solo la fila de auth.uid(): llamarla directo por PostgREST no permite nada que el cuestionario no permita.
-- Unica fuente de verdad del calculo (el API solo valida la forma de la entrada).
create function public.submit_risk_profile(answers int[])
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := (select auth.uid());
  v_score int;
  v_row   public.profiles;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if answers is null
     or array_ndims(answers) <> 1
     or cardinality(answers) <> 6
     or array_position(answers, null) is not null
     or exists (select 1 from unnest(answers) as a(v) where v not between 1 and 4) then
    raise exception 'answers must be 6 integers between 1 and 4' using errcode = '22023';
  end if;

  select sum(v)::int into v_score from unnest(answers) as a(v);

  update public.profiles
     set risk_score   = v_score,
         risk_profile = case when v_score <= 11 then 'conservador'
                             when v_score <= 18 then 'moderado'
                             else 'agresivo' end,
         -- Rehacer conserva la fecha del primer onboarding; el historial es de F07.
         onboarded_at = coalesce(onboarded_at, now())
   where id = v_user
  returning * into v_row;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

-- Postgres da EXECUTE a PUBLIC y Supabase a anon/authenticated por default privileges: se deja solo authenticated.
revoke execute on function public.submit_risk_profile(int[]) from public, anon;
grant execute on function public.submit_risk_profile(int[]) to authenticated;
```

- Los grants de columnas de F01 no cambian: `authenticated` sigue sin poder hacer `update` de `risk_score`, `risk_profile` ni `onboarded_at`.
- `security definer` + `set search_path = ''`: mismo patron que `handle_new_user` (F01). Todo va calificado (`public.`, `auth.`); las funciones de `pg_catalog` siempre se resuelven.
- `array_position(answers, null)` detecta nulos (`v not between 1 and 4` con `v` nulo no es verdadero).
- `returns public.profiles`: PostgREST devuelve la fila como objeto JSON y el repository la valida con el mismo `profileRowSchema` de F01.

### Dependencias nuevas (`api/`)

- `@electric-sql/pglite` (devDependency, ultima `0.x` estable): Postgres real en WASM para probar las migraciones en Vitest sin servidor ni red. Si resulta que no soporta algo necesario (`create role`, `set role`, `alter default privileges`, RLS), el implementador se detiene y lo reporta; no se sustituye por un test que no ejecute el SQL.

Variables de entorno: ninguna nueva.

### Capas

`routes → controllers/meController.ts → services/profileService.ts → repositories/profileRepository.ts → rpc`.

- `repositories/profileRepository.ts` agrega:
  ```ts
  export async function submitRiskProfile(client: SupabaseClient, answers: number[]): Promise<ProfileRow | null>;
  ```
  - `client.rpc("submit_risk_profile", { answers })`.
  - `error.code === "P0002"` → `null`; otro `error` → `throw new Error(...)` (→ 500); si no → `profileRowSchema.parse(data)`.
- `services/profileService.ts` agrega:
  ```ts
  export const riskProfileInputSchema = z.object({
    answers: z.array(z.number().int().min(1).max(4)).length(6),
  });

  export async function submitMyRiskProfile(user: AuthUser, token: string, input: unknown): Promise<Me>;
  ```
  - `safeParse(input)`; si falla → `AppError(400, "VALIDATION_ERROR", "answers must be an array of 6 integers between 1 and 4")`.
  - `submitRiskProfile(userClient(token), answers)` (**nunca** `adminClient`); `null` → `AppError(404, "PROFILE_NOT_FOUND", "Profile not found")`.
  - El mapeo fila → `Me` se extrae a un helper privado `toMe(row, email)` que usan `getMyProfile` y `submitMyRiskProfile`.
  - Recibe `unknown` para que REST, MCP y chat validen igual.
- `controllers/meController.ts` agrega:
  ```ts
  export const putRiskProfile: RequestHandler = async (req, res) => {
    const { user, token } = getAuth(req);
    res.json(await submitMyRiskProfile(user, token, req.body));
  };
  ```
- `routes/index.ts`: `router.put("/me/risk-profile", putRiskProfile);` debajo de `router.get("/me", getMe)`.
- `middlewares/errorHandler.ts`: antes del `500`, un error con `type === "entity.parse.failed"` (el que lanza `express.json()`) → `400 VALIDATION_ERROR "Malformed JSON body"`.

### `PUT /me/risk-profile`

Request:

```json
{ "answers": [3, 2, 3, 2, 3, 2] }
```

`answers[i]` es la opcion elegida en la pregunta `i + 1` (1–4), en el orden de `01-product.md`. Los campos extra se ignoran (mandar `risk_score` en el body no tiene efecto).

Respuesta `200` (mismo shape que `GET /me`):

```json
{
  "id": "5f0c…-uuid",
  "email": "ana@example.com",
  "displayName": "Ana",
  "riskScore": 15,
  "riskProfile": "moderado",
  "onboardedAt": "2026-11-18T14:00:00.000Z",
  "createdAt": "2026-11-18T12:00:00.000Z"
}
```

Errores: `401 UNAUTHORIZED` (F01), `400 VALIDATION_ERROR`, `404 PROFILE_NOT_FOUND` y `500 INTERNAL_ERROR`.

### Estrategia de tests (sin Supabase real ni red)

- Service y endpoint: `vi.mock("../lib/supabase.js")` con un fake cuyo `rpc` es `vi.fn()` (como en F01).
- SQL: PGlite en memoria ejecuta un preludio que imita lo que Supabase trae de fabrica y luego las migraciones reales de F01 y F02, leidas del disco. La de F00 no hace falta (usa la extension `vector`).

Preludio (vive en el test, no es una migracion):

```sql
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
```

Helper del test: "ejecutar como usuario" = transaccion con `set local role authenticated` y `select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true)`. Los usuarios A y B se crean con `insert into auth.users` (el trigger de F01 crea sus profiles).

| Archivo | Casos |
|---|---|
| `repositories/riskProfile.sql.test.ts` (nuevo, PGlite) | **Limites**, como A: `[1,1,1,2,3,3]` (11) → `conservador`; `[2,2,2,2,2,2]` (12) → `moderado`; `[3,3,3,3,3,3]` (18) → `moderado`; `[4,3,3,3,3,3]` (19) → `agresivo`; `[1,1,1,1,1,1]` (6) → `conservador`; `[4,4,4,4,4,4]` (24) → `agresivo`; la fila devuelta tiene el `id` de A y `onboarded_at` no nulo. **Rehacer:** la segunda llamada cambia puntaje y perfil y conserva `onboarded_at`. **Aislamiento:** tras la llamada de A, el profile de B sigue en `null`. **Invalidas** (`22023`, fila sin cambios): 5 y 7 elementos, con `0`, con `5`, con un `null`, `'{{1,2,3},{4,1,2}}'`, `null` y `'{}'`. Sin claims → `42501`. Como `anon` → `permission denied for function`. **Saltarse el calculo:** como A, `update public.profiles set risk_score = 24`, `set risk_profile = 'agresivo'` y `set onboarded_at = now()` → `permission denied` (42501); `set display_name = 'Nuevo'` → 1 fila (regresion de F01). |
| `services/profileService.test.ts` (actualizar) | `rpc` llamado con `("submit_risk_profile", { answers })` sobre `userClient(token)`, nunca `adminClient`; fila → `Me` en camelCase; invalidas → `AppError` 400 `VALIDATION_ERROR` sin llamar a `rpc`: `undefined`, `{}`, `{ answers: "1,2" }`, 5 y 7 elementos, `0`, `5`, `1.5`, `"2"` y `null` como elemento; un `risk_score` extra se ignora (no llega al `rpc`); `P0002` → 404 `PROFILE_NOT_FOUND`; otro error → lanza; fila con `risk_profile` fuera del enum → lanza. |
| `app.test.ts` (actualizar) | `PUT /me/risk-profile` sin token → 401; con token y body invalido → 400 con shape `{ error: { code: "VALIDATION_ERROR", message } }`; JSON mal formado (`Content-Type: application/json`, body `{`) → 400 `VALIDATION_ERROR`; valido con `rpc` mockeado → 200 con el shape de arriba. |

### Verificacion manual en Supabase (no se puede saltar el calculo)

En el SQL Editor, con el uuid de un usuario registrado. Correr cada bloque por separado, porque tras un error la transaccion queda abortada:

```sql
-- prefijo de cada bloque
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true);

-- bloque 1: OK → 12 | moderado | fecha
select risk_score, risk_profile, onboarded_at from public.submit_risk_profile(array[2,2,2,2,2,2]);
-- bloque 2: ERROR permission denied for table profiles
update public.profiles set risk_score = 24, risk_profile = 'agresivo' where id = '<uuid>';
-- bloque 3: ERROR answers must be 6 integers between 1 and 4
select public.submit_risk_profile(array[4,4,4,4,4,4,4]);

-- sufijo de cada bloque
rollback;
```

Por PostgREST (siempre con `apikey: <anon>`):

- `POST {SUPABASE_URL}/rest/v1/rpc/submit_risk_profile` sin `Authorization` de usuario y body `{"answers":[4,4,4,4,4,4]}` → error `42501`.
- Lo mismo con `Authorization: Bearer <access_token>` y 7 respuestas → `400` (`22023`).
- `PATCH {SUPABASE_URL}/rest/v1/profiles?id=eq.<uuid>` con el JWT y `{"risk_score":24}` → `42501`.

### Pasos manuales pendientes

Anotar en `PRUEBAS-MANUALES.md`:

1. Aplicar la migracion de F02 despues de la de F01.
2. En el dashboard, Database > Functions muestra `submit_risk_profile` (security definer).
3. Correr la verificacion manual de arriba.
4. Prueba de humo contra el API: `PUT {API}/me/risk-profile` con el `access_token` y `{"answers":[3,2,3,2,3,2]}` → 200 con `riskScore: 15` y `riskProfile: "moderado"`; con 5 respuestas → 400 `VALIDATION_ERROR`; sin token → 401.
5. Despliegue conjunto de F01 + F02 (ver F01): push solo cuando F02 este `ready`.
