# 03 — Frontend

## Stack

- Next.js 16.4 (App Router, `src/` dir) + React 19.3 + TypeScript `strict`.
- Tailwind CSS 4 (via `@tailwindcss/turbopack`).
- `next.config.ts` ya tiene `cacheComponents: true` y `partialPrefetching: true` (ver Conventions: impacto en `cookies()` y `usePathname()`).
- Supabase Auth en el navegador/servidor con `@supabase/ssr` + `@supabase/supabase-js` (F00).
- Zod para validar env publico y respuestas del API (F00).
- Graficas con `lightweight-charts` (F03/F08).
- Tests: Vitest + Testing Library (jsdom), archivos `*.test.ts(x)` junto al codigo.
- Diseno visual: skill `impeccable` durante la implementacion.

## Pages

| Ruta | Grupo | Feature |
|---|---|---|
| `/` | `(app)` | F00 placeholder → F06 Home |
| `/login`, `/signup` | fuera de `(app)` | F01 |
| `/onboarding` | fuera de `(app)` | F02 |
| `/stocks/[symbol]` | `(app)` | F03 |
| `/search`, `/favorites`, `/news`, `/simulator`, `/portfolio`, `/financial-freedom`, `/learning` | `(app)` | F03–F12 (enlazadas desde el sidebar en F00) |

`(app)` es un route group con el layout de la app (sidebar + header). Las paginas de auth/onboarding quedan fuera para no mostrar la navegacion.

## Conventions

- **Server Components por defecto.** `"use client"` solo para interactividad (toggle del sidebar, enlace activo, formularios).
- **Un solo cliente del API:** toda llamada al Express pasa por `web/src/lib/api.ts`. Nunca `fetch` directo al API desde componentes.
- **Sesion:** leer `cookies()` es async y, con Cache Components, leerlo fuera de un `<Suspense>` es error de build (verificado en `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` y `02-guides/authentication-with-cache-components.md`). Todo componente que lea la sesion o llame al API con el JWT va dentro de `<Suspense>`. No usar `"use cache"` en datos por usuario.
- **Estados en cada vista de datos:**
  - Loading: `<Suspense fallback={<LoadingState />}>` alrededor del Server Component que trae datos (o `loading.tsx` por segmento).
  - Empty: `<EmptyState title description action? />` cuando la respuesta es lista vacia o `null`.
  - Error: el Server Component atrapa `ApiError` y renderiza `<ErrorState message />` inline con `errorMessage(err)`. No relanzar: en produccion `error.tsx` recibe un mensaje generico para errores de Server Components (verificado en `03-file-conventions/error.md`). `app/(app)/error.tsx` queda solo como red de seguridad.
- **Idioma de la UI:** espanol (`<html lang="es">`).
- **Env publico:** solo variables `NEXT_PUBLIC_*`, leidas con referencias estaticas `process.env.NEXT_PUBLIC_X` (se inlinean en build; los accesos dinamicos no, segun `02-guides/environment-variables.md`).

---

## F00 — Base

**Estatus:** ready

### Verificado en la documentacion de Next 16 (`web/node_modules/next/dist/docs/01-app/`)

- `03-api-reference/03-file-conventions/proxy.md`: `middleware` esta deprecado y renombrado a `proxy`; se exporta `export function proxy(request: NextRequest)`; corre en Node.js y no acepta `runtime`.
- `03-api-reference/03-file-conventions/src-folder.md`: con `src/`, el proxy va en `web/src/proxy.ts`. **F00 no crea `proxy.ts`**; lo crea F01 (refresco de sesion y redirecciones).
- `03-api-reference/04-functions/cookies.md`: `cookies()` es async; no se pueden escribir cookies durante el render de un Server Component (solo en Server Functions / Route Handlers / proxy).
- `03-api-reference/04-functions/use-pathname.md`: con `cacheComponents`, `usePathname()` suspende en rutas con params dinamicos sin `generateStaticParams` (p. ej. `/stocks/[symbol]`), y un sidebar con enlaces activos en el layout rompe el build si no esta dentro de `<Suspense>`.
- `03-api-reference/03-file-conventions/error.md`: `error.tsx` es Client Component y recibe `{ error, retry }` (`retry()` preferido sobre `reset()`).
- `03-api-reference/03-file-conventions/layout.md`: `LayoutProps<'/ruta'>` es global, sin import.

### Requisitos

1. CUANDO se renderiza cualquier ruta del grupo `(app)`, EL sistema DEBE mostrar el sidebar con los 8 enlaces (Home `/`, Buscar `/search`, Favoritos `/favorites`, Noticias `/news`, Simulador `/simulator`, Cartera `/portfolio`, Libertad financiera `/financial-freedom`, Learning `/learning`) y el header con un slot de buscador y el menu de usuario. Los items cuya feature aun no existe (`available: false` en `nav-items.ts`) DEBEN mostrarse deshabilitados (sin `href`, `aria-disabled="true"`) con la etiqueta "Proximamente"; cada feature cambia su item a `available: true` al implementarse. En F00 solo Home es `available: true`.
2. CUANDO la ruta actual coincide con un enlace (exacta para `/`, por prefijo para el resto), EL sistema DEBE marcarlo con `aria-current="page"` y estilo activo.
3. CUANDO el viewport es menor a 768 px, EL sistema DEBE ocultar el sidebar y mostrar en el header un boton (`aria-expanded`, `aria-controls`) que lo abre como panel; DEBE cerrarse al navegar, con `Escape` y al tocar fuera.
4. CUANDO un componente llama al API, EL sistema DEBE usar `lib/api.ts`, que adjunta `Authorization: Bearer <access_token>` si se le pasa token.
5. CUANDO el API responde no-2xx con `{ error: { code, message } }`, EL cliente DEBE lanzar `ApiError` con `status`, `code` y `message` de la respuesta.
6. CUANDO el API responde no-2xx sin ese shape, EL cliente DEBE lanzar `ApiError(status, "UNKNOWN_ERROR", ...)`; CUANDO `fetch` rechaza, `ApiError(0, "NETWORK_ERROR", ...)`; CUANDO una respuesta 2xx no pasa su esquema Zod, `ApiError(status, "INVALID_RESPONSE", ...)`.
7. CUANDO falta una variable publica requerida, EL sistema DEBE fallar al cargar `lib/env.ts` con un error de Zod que la nombre.

### Dependencias nuevas (`web/`)

`@supabase/ssr`, `@supabase/supabase-js`, `zod`.

### Variables de entorno (`web/.env.example`)

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

`web/src/lib/env.ts`:

```ts
export const publicEnv = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
}).parse({
  // referencias estaticas: Next solo inlinea process.env.NEXT_PUBLIC_X literal
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
```

`web/vitest.config.mts` agrega `test.env` con valores ficticios de las 3 variables.

### Estructura de archivos

```
web/src/
├── app/
│   ├── layout.tsx              # root: <html lang="es">, fuentes, globals.css (sin chrome)
│   ├── globals.css             # tokens del tema (impeccable)
│   └── (app)/
│       ├── layout.tsx          # AppShell: Sidebar + Header + <main>{children}</main>
│       ├── error.tsx           # red de seguridad: ErrorState + boton retry()
│       ├── page.tsx            # Home placeholder (movido desde app/page.tsx)
│       └── page.test.tsx       # movido desde app/page.test.tsx
├── components/
│   ├── layout/
│   │   ├── nav-items.ts        # [{ href, label, icon, available }] los 8 items, fuente unica
│   │   ├── Sidebar.tsx         # Server: <nav aria-label="Principal"> + <Suspense><SidebarLinks/></Suspense>
│   │   ├── SidebarLinks.tsx    # "use client": usePathname() → aria-current
│   │   ├── MobileNavToggle.tsx # "use client": abre/cierra el sidebar en movil
│   │   ├── Header.tsx          # Server: toggle movil + <div data-slot="search"/> + <UserMenu/>
│   │   └── UserMenu.tsx        # F00: boton con avatar generico, sin opciones (F01 agrega email y logout)
│   └── states/
│       ├── LoadingState.tsx    # skeleton/spinner con aria-busy
│       ├── EmptyState.tsx      # { title, description?, action?: ReactNode }
│       └── ErrorState.tsx      # { message, action?: ReactNode } con role="alert"
└── lib/
    ├── env.ts
    ├── api.ts
    └── supabase/
        ├── server.ts
        └── client.ts
```

- El `fallback` del `<Suspense>` de `SidebarLinks` renderiza los mismos enlaces sin estado activo (sin salto de layout).
- Slot del buscador: `Header` deja un contenedor vacio con ancho reservado; F03 monta ahi el autocompletado.
- Iconos: SVG inline o set elegido con impeccable; no agregar una libreria de iconos solo para 8 iconos sin decidirlo en la fase de diseno.

### `web/src/lib/api.ts`

```ts
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

type RequestOptions = {
  token?: string | null;              // access_token de Supabase
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;                     // se envia como JSON
  signal?: AbortSignal;
};

export async function request<T>(path: string, schema: z.ZodType<T>, opts?: RequestOptions): Promise<T>;

/** Endpoints tipados. Cada feature agrega los suyos aqui. */
export const api = {
  health: (opts?: RequestOptions) => request("/health", z.object({ status: z.literal("ok") }), opts),
};

/** Mensaje en espanol para la UI segun ApiError.code. */
export function errorMessage(err: unknown): string;
```

- URL: `${publicEnv.NEXT_PUBLIC_API_URL}${path}`. Headers: `Accept: application/json`; `Content-Type: application/json` solo si hay `body`; `Authorization: Bearer ${token}` solo si hay token.
- Respuesta `204` → `undefined` (el esquema del endpoint debe ser `z.undefined()`).
- Esquema de error: `z.object({ error: z.object({ code: z.string(), message: z.string() }) })`.
- `errorMessage`: `PROVIDER_RATE_LIMITED` → "Demasiadas solicitudes al proveedor de datos. Intenta de nuevo en un minuto."; `PROVIDER_ERROR` → "El proveedor de datos no respondio correctamente."; `NETWORK_ERROR` → "No se pudo conectar con el servidor."; cualquier otro → "Algo salio mal. Intenta de nuevo.". Cada feature agrega sus codigos (p. ej. `SYMBOL_NOT_FOUND` en F03).
- Obtencion del token (no la hace `api.ts`, la hace quien llama): en servidor `getServerAccessToken()`, en navegador `getBrowserAccessToken()` (abajo). El API verifica el JWT (F01), por eso basta con leer la sesion de la cookie sin revalidarla en el web.
- Gancho F01: manejo de `401` (redirigir a `/login`) se agrega en F01.

### `web/src/lib/supabase/`

`server.ts` (solo servidor):

```ts
export async function createSupabaseServerClient(): Promise<SupabaseClient>;
// createServerClient(url, anonKey, { cookies: {
//   getAll: () => cookieStore.getAll(),
//   setAll: (list) => { try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
//                       catch { /* llamado desde un Server Component: el refresco lo hace proxy.ts (F01) */ } },
// } }) con cookieStore = await cookies()

export async function getServerAccessToken(): Promise<string | null>; // (await client.auth.getSession()).data.session?.access_token ?? null
```

`client.ts` (`"use client"` no requerido; solo se importa desde Client Components):

```ts
export function createSupabaseBrowserClient(): SupabaseClient; // createBrowserClient(url, anonKey)
export async function getBrowserAccessToken(): Promise<string | null>;
```

### Diseno visual

Lo define el implementador con la skill `impeccable` al construir el layout: tema base (tokens de color, tipografia, espaciado, modo claro/oscuro) en `globals.css`, y el estilo de sidebar, header y componentes de estados. Requisitos minimos no negociables: contraste AA, foco visible, sin scroll horizontal a 375 px, colores de subida/bajada definidos como tokens (los usa F03).

### Tests (Vitest, sin credenciales)

| Archivo | Casos |
|---|---|
| `lib/api.test.ts` | `fetch` mockeado: adjunta `Authorization` con token y lo omite sin token; 2xx valido → datos tipados; error con shape → `ApiError` con `code`/`message`; error sin shape (HTML) → `UNKNOWN_ERROR`; `fetch` rechaza → `NETWORK_ERROR`; 2xx que no pasa el esquema → `INVALID_RESPONSE`; `errorMessage` para cada codigo conocido y uno desconocido. |
| `lib/supabase/supabase.test.ts` | `@supabase/ssr` y `next/headers` mockeados: los clientes se crean con la URL y anon key de `publicEnv`; `getServerAccessToken` devuelve el token o `null`. |
| `components/layout/SidebarLinks.test.tsx` | `next/navigation` mockeado: renderiza los items `available` como enlaces con su `href` y los no disponibles deshabilitados con "Proximamente" (sin `href`); en `/news` y `/news/x` solo Noticias tiene `aria-current="page"`; en `/stocks/AAPL` ninguno; Home solo activo en `/` exacto. |
| `components/layout/MobileNavToggle.test.tsx` | alterna `aria-expanded`; `Escape` cierra. |
| `components/states/*.test.tsx` | `EmptyState` muestra titulo y accion; `ErrorState` tiene `role="alert"` y el mensaje; `LoadingState` tiene `aria-busy`. |
| `app/(app)/page.test.tsx` | el test existente, movido. |

### Criterios de aceptacion

- [ ] `pnpm --filter web build`, `lint` y `test` pasan sin `.env.local` real (con los placeholders del ejemplo).
- [ ] La Home muestra sidebar y header; "Home" tiene `aria-current="page"`.
- [ ] A 375 px el sidebar se abre/cierra con el boton y no hay scroll horizontal.
- [ ] No existe ningun `fetch` al API fuera de `lib/api.ts`.
- [ ] `web/.env.example` tiene las 3 variables.

### Pasos manuales pendientes

Cuando exista el proyecto de Supabase: poner `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `web/.env.local` y en el proyecto de Vercel del web, y `NEXT_PUBLIC_API_URL` con la URL del API desplegado (redeploy necesario: se inlinean en build).

---

## F01 — Login con JWT

**Estatus:** ready

### Verificado en la documentacion de Next 16 (`web/node_modules/next/dist/docs/01-app/`)

- `03-api-reference/03-file-conventions/proxy.md`:
  - Exporta `proxy` (o default) y opcionalmente `config.matcher`; los valores del matcher deben ser constantes.
  - Sin matcher corre en todo, incluidos `_next/static`, `_next/image` y `public/`; se excluyen con un negative lookahead.
  - Cookies: `request.cookies` (`get`, `getAll`, `set`, `delete`) y `response.cookies.set(...)`. Para redirigir: `NextResponse.redirect(new URL(path, request.url))`.
  - Corre en Node.js; `runtime` no se acepta.
  - Las Server Functions son POST a la ruta donde se usan, asi que pasan por el proxy de esa ruta; la doc pide no confiar solo en el proxy para autorizar.
- `03-api-reference/04-functions/redirect.md`: `redirect()` lanza `NEXT_REDIRECT`, se llama **fuera** del `try/catch`; en una Server Action hace navegacion de cliente (303 sin JS).
- `02-guides/forms.md`: validacion en servidor con Zod (`safeParse`) y errores mostrados con `useActionState(action, initialState)`; la action recibe `(prevState, formData)` y `pending` sirve para deshabilitar el boton.
- `03-api-reference/04-functions/cookies.md`: se pueden escribir cookies en Server Actions y Route Handlers, no en el render de un Server Component (por eso el refresco de sesion va en el proxy).
- `02-guides/authentication-with-cache-components.md`: con `cacheComponents`, leer la sesion fuera de `<Suspense>` es error de build; la UI de usuario va detras de un boundary.

### Requisitos

1. CUANDO un usuario sin sesion pide cualquier ruta distinta de `/login` y `/signup`, EL proxy DEBE redirigir a `/login`.
2. CUANDO un usuario con sesion pide `/login` o `/signup`, EL proxy DEBE redirigir a `/`.
3. CUANDO un usuario con sesion pide una ruta distinta de `/onboarding` y su `profiles.onboarded_at` es `null` (o no hay fila), EL proxy DEBE redirigir a `/onboarding`.
4. CUANDO la consulta del profile falla en el proxy, EL proxy DEBE dejar pasar la peticion (no bloquear la app por un error transitorio; la pagina maneja su propio error).
5. CUANDO el access token expiro y hay refresh token, EL proxy DEBE refrescar la sesion y escribir las cookies nuevas, tambien en las respuestas de redireccion.
6. CUANDO se envia el formulario de login o signup, EL sistema DEBE validar con Zod en la Server Action y, si falla, mostrar el error bajo cada campo sin llamar a Supabase y conservando el email (y nombre) escrito.
7. CUANDO el login es correcto, EL sistema DEBE guardar la sesion en cookies y navegar a `/`; CUANDO el signup es correcto, a `/onboarding`.
8. CUANDO Supabase rechaza el login o el signup, EL sistema DEBE mostrar un mensaje en espanol (tabla abajo) en un `role="alert"`.
9. CUANDO el usuario pulsa "Cerrar sesión" en el menu de usuario, EL sistema DEBE cerrar la sesion de este dispositivo y navegar a `/login`.
10. CUANDO el API responde `401 UNAUTHORIZED` a una vista, EL sistema DEBE mostrar `ErrorState` con "Tu sesión expiró. Inicia sesión de nuevo." (sin redirigir desde el componente, para no crear ciclos con el proxy).

### Dependencias nuevas (`web/`)

Ninguna. Variables de entorno: ninguna nueva.

### Estructura de archivos

```
web/src/
├── proxy.ts                         # refresco de sesion + redirecciones (nuevo)
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx               # tarjeta centrada con el nombre de la app, sin sidebar ni header
│   │   ├── login/page.tsx           # Server: titulo "Iniciar sesión" + <LoginForm/>
│   │   ├── signup/page.tsx          # Server: titulo "Crear cuenta" + <SignupForm/>
│   │   └── onboarding/page.tsx      # placeholder de F01 (URL /onboarding), F02 lo reemplaza
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx            # "use client": useActionState(login)
│   │   └── SignupForm.tsx           # "use client": useActionState(signup)
│   └── layout/
│       ├── Header.tsx               # envuelve UserMenu en <Suspense fallback={<UserMenuFallback/>}>
│       └── UserMenu.tsx             # Server async: email + "Cerrar sesión"
└── lib/
    ├── api.ts                       # + api.me y codigos de error de F01
    └── auth/
        ├── schemas.ts               # Zod de login y signup
        └── actions.ts               # "use server": login, signup, logout
```

### `lib/auth/schemas.ts`

```ts
export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Ingresa un email válido.")),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export const signupSchema = z.object({
  displayName: z.string().trim().min(1, "Ingresa tu nombre.").max(50, "Máximo 50 caracteres."),
  email: z.string().trim().pipe(z.email("Ingresa un email válido.")),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72, "Máximo 72 caracteres."),
});
```

`72`: limite de bcrypt en Supabase Auth. `displayName` 1–50 coincide con el CHECK de `profiles`.

### `lib/auth/actions.ts` (`"use server"`)

```ts
export type AuthFormState = {
  fieldErrors?: Partial<Record<"displayName" | "email" | "password", string>>; // primer error por campo
  formError?: string;
  values?: { displayName?: string; email?: string };  // para no vaciar el form (nunca la contraseña)
};

export async function login(prev: AuthFormState, formData: FormData): Promise<AuthFormState>;
export async function signup(prev: AuthFormState, formData: FormData): Promise<AuthFormState>;
export async function logout(): Promise<void>;
```

- Cliente: `createSupabaseServerClient()` de F00 (en una Server Action su `setAll` si puede escribir cookies).
- `login`: `safeParse` → `auth.signInWithPassword({ email, password })` → si OK `redirect("/")`.
- `signup`: `safeParse` → `auth.signUp({ email, password, options: { data: { display_name: displayName } } })` (el trigger de la BD lo copia a `profiles.display_name`) → si `data.session` existe `redirect("/onboarding")`; si no hay sesion (alguien dejo "Confirm email" activo) → `formError: "Tu cuenta requiere confirmar el email. Revisa tu bandeja."`.
- `logout`: `auth.signOut({ scope: "local" })` → `redirect("/login")`.
- `redirect` siempre fuera de cualquier `try`.

Mensajes por `AuthError.code`:

| Accion | `code` | Mensaje |
|---|---|---|
| login | `invalid_credentials` | "Email o contraseña incorrectos." |
| login | otro | "No se pudo iniciar sesión. Intenta de nuevo." |
| signup | `user_already_exists`, `email_exists` | "Ya existe una cuenta con ese email." |
| signup | `weak_password` | "La contraseña es demasiado débil." |
| signup | otro | "No se pudo crear la cuenta. Intenta de nuevo." |

### Formularios (`LoginForm`, `SignupForm`)

- `const [state, formAction, pending] = useActionState(login, {})`; `<form action={formAction} noValidate>` (los mensajes los da Zod, no el navegador).
- Campos con `<label>` visible: Nombre (`name="displayName"`, `autoComplete="name"`, solo signup), Email (`type="email"`, `autoComplete="email"`), Contraseña (`type="password"`, `autoComplete="current-password"` / `"new-password"`).
- `defaultValue` desde `state.values`.
- Error de campo: `<p id="{campo}-error">` y en el input `aria-invalid="true"` + `aria-describedby="{campo}-error"`.
- `state.formError` en `<p role="alert">`.
- Boton submit "Entrar" / "Crear cuenta", `disabled={pending}` y texto "Entrando…" / "Creando…".
- Enlace cruzado: login → "¿No tienes cuenta? Crear cuenta" (`/signup`); signup → "¿Ya tienes cuenta? Iniciar sesión" (`/login`).
- Estilo con los tokens de F00 (skill `impeccable`); a 375 px sin scroll horizontal.
- Las paginas no leen sesion ni `searchParams`, asi que son estaticas y no necesitan `<Suspense>`.

### `proxy.ts`

```ts
export async function proxy(request: NextRequest): Promise<NextResponse>;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
```

Flujo:

1. `let response = NextResponse.next({ request })`.
2. `createServerClient(url, anonKey, { cookies: { getAll: () => request.cookies.getAll(), setAll: (list) => { list.forEach(c => request.cookies.set(c.name, c.value)); response = NextResponse.next({ request }); list.forEach(c => response.cookies.set(c.name, c.value, c.options)); } } })` (patron de `@supabase/ssr` para proxy/middleware; no se reusa `lib/supabase/server.ts` porque ese usa `next/headers`).
3. `const { data } = await supabase.auth.getClaims()` — verifica el JWT (JWKS, o `getUser` si el proyecto es HS256 legacy) y refresca la sesion. **No** usar `getSession()` aqui: no verifica el token. `userId = data?.claims.sub`.
4. `isAuthPage = pathname === "/login" || pathname === "/signup"`.
   - Sin `userId`: `isAuthPage` → `response`; si no → redirect `/login`.
   - Con `userId` y `isAuthPage` → redirect `/`.
   - Con `userId` y `pathname !== "/onboarding"`: `supabase.from("profiles").select("onboarded_at").eq("id", userId).maybeSingle()`; sin `error` y `!data?.onboarded_at` → redirect `/onboarding`; con `error` → `response`.
   - Si no → `response`.
5. Toda redireccion se crea con `NextResponse.redirect(new URL(path, request.url))` y **copia las cookies** de `response` (`response.cookies.getAll().forEach(c => redirect.cookies.set(c))`), para no perder un refresco de sesion.

- La consulta de `onboarded_at` va directo a Supabase (con RLS, sesion del usuario) y no al API: el proxy corre en cada navegacion y un salto extra al Express agregaria latencia y cold starts. Es lectura de sesion, no una vista de datos; las vistas siguen usando `lib/api.ts`.
- Gancho F02: el proxy no redirige fuera de `/onboarding` a un usuario ya onboarded; eso lo decide la pagina de F02.

### `app/(auth)/onboarding/page.tsx` (placeholder)

Dentro del grupo `(auth)` para reutilizar su layout centrado (la URL es `/onboarding`). Contenido: titulo "Completa tu perfil de riesgo", texto "El cuestionario estará disponible muy pronto." y el boton "Cerrar sesión" (form con `logout`). F02 reemplaza esta pagina completa; F01 no define el cuestionario.

### `UserMenu`

- `Header.tsx`: `<Suspense fallback={<UserMenuFallback />}><UserMenu /></Suspense>` (lee cookies; con `cacheComponents` es obligatorio). `UserMenuFallback` = el avatar generico actual.
- `UserMenu` (Server, async): `email = (await (await createSupabaseServerClient()).auth.getClaims()).data?.claims.email`. Sin email → `UserMenuFallback`.
- Markup sin JS con `<details>`: `<summary aria-label="Menú de usuario">` con el avatar; panel con el email (`truncate`, `title` con el email completo) y `<form action={logout}><button type="submit">Cerrar sesión</button></form>`.
- Gancho F02: debajo del email va el enlace "Rehacer cuestionario" (lo agrega F02).

### `lib/api.ts`

```ts
const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  riskScore: z.number().int().nullable(),
  riskProfile: z.enum(["conservador", "moderado", "agresivo"]).nullable(),
  onboardedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Me = z.infer<typeof meSchema>;

// en `api`:
me: (opts?: RequestOptions) => request("/me", meSchema, opts),
```

`errorMessage` agrega: `UNAUTHORIZED` → "Tu sesión expiró. Inicia sesión de nuevo."; `PROFILE_NOT_FOUND` → "No encontramos tu perfil.". En F01 ninguna vista llama `api.me`; lo usan F02 y F06.

### Tests (Vitest, sin Supabase real)

`@supabase/ssr` se mockea con `vi.mock` (como en F00): `createServerClient` devuelve un fake con `auth.getClaims`, `auth.signInWithPassword`, `auth.signUp`, `auth.signOut` y `from().select().eq().maybeSingle()`. `next/headers` mockeado como en F00. `next/navigation`: `redirect` mockeado con `vi.fn(() => { throw new Error("NEXT_REDIRECT") })`.

| Archivo | Casos |
|---|---|
| `lib/auth/schemas.test.ts` | email invalido, password vacia (login), password de 7 y 73 caracteres (signup), nombre vacio/solo espacios y de 51 caracteres → mensaje esperado; datos validos → `success` con email y nombre recortados. |
| `lib/auth/actions.test.ts` | input invalido → `fieldErrors` y no se llama a Supabase; `values` conserva email/nombre y nunca la contraseña; login OK → `signInWithPassword` con los datos y `redirect("/")`; `invalid_credentials` → su mensaje; error desconocido → generico; signup OK → `signUp` con `options.data.display_name` y `redirect("/onboarding")`; `user_already_exists` y `weak_password` → sus mensajes; signup sin `session` → mensaje de confirmar email; logout → `signOut({ scope: "local" })` y `redirect("/login")`. |
| `proxy.test.ts` (`// @vitest-environment node`) | con `new NextRequest("http://localhost:3000/ruta")`: sin sesion en `/` → 307 a `/login`; sin sesion en `/login` y `/signup` → pasa; con sesion en `/login` → `/`; con sesion y `onboarded_at` null en `/` → `/onboarding`; sin fila de profile → `/onboarding`; onboarded → pasa; en `/onboarding` → pasa y no consulta `profiles`; error al consultar → pasa; cookies escritas por `setAll` aparecen en la respuesta de redireccion; `config.matcher[0]` no coincide con `/_next/static/x.js` ni `/logo.png` y si con `/` y `/stocks/AAPL` (probar el regex). |
| `components/auth/LoginForm.test.tsx` | `@/lib/auth/actions` mockeado: campos con label, tipos y `autoComplete`; enlace a `/signup`; al enviar con la action devolviendo `fieldErrors` → mensaje visible, `aria-invalid` y `aria-describedby`; `formError` → `role="alert"`. |
| `components/auth/SignupForm.test.tsx` | igual con el campo Nombre y enlace a `/login`. |
| `components/layout/UserMenu.test.tsx` | `@/lib/supabase/server` mockeado; renderizar `await UserMenu()`: con email → muestra el email y un boton "Cerrar sesión" dentro de un `<form>`; sin claims → solo el avatar. |
| `lib/api.test.ts` (actualizar) | `api.me` parsea el shape; `errorMessage` de `UNAUTHORIZED` y `PROFILE_NOT_FOUND`. |

### Criterios de aceptacion

- [ ] `pnpm --filter web build`, `lint` y `test` pasan sin Supabase real.
- [ ] Sin sesion, `/` redirige a `/login`; `/login` y `/signup` se ven sin sidebar.
- [ ] Errores de validacion visibles bajo cada campo y anunciados (`aria-invalid` + `aria-describedby`).
- [ ] El menu de usuario muestra el email y "Cerrar sesión" funciona.
- [ ] Ningun `fetch` al API fuera de `lib/api.ts`.

### Pasos manuales pendientes

Cuando exista el proyecto de Supabase (anotar en `PRUEBAS-MANUALES.md`):

1. Con la migracion aplicada y "Confirm email" desactivado (ver 02-backend), en local y en la app desplegada:
   - Abrir `/` sin sesion → termina en `/login`.
   - Crear cuenta con nombre, email y contraseña → termina en `/onboarding` (placeholder).
   - Ir a `/` → vuelve a `/onboarding` (aun no hay onboarding).
   - "Cerrar sesión" → `/login`; volver atras no muestra contenido protegido.
   - Entrar con la misma cuenta → `/onboarding`; contraseña incorrecta → "Email o contraseña incorrectos."; registrar el mismo email otra vez → "Ya existe una cuenta con ese email."
2. Para probar la app con un usuario onboarded antes de F02: en el SQL Editor `update profiles set risk_score = 15, risk_profile = 'moderado', onboarded_at = now() where id = '<uuid>';` → `/` muestra la Home con el email en el menu.
3. A 375 px: formularios sin scroll horizontal.
4. Despliegue conjunto: F01 se commitea pero no se hace push hasta que F02 este `ready`. El placeholder de `/onboarding` solo se ve en local; los pasos de "app desplegada" se ejecutan cuando F01 y F02 salgan juntas.

---

## F02 — Formulario de perfil de riesgo

**Estatus:** ready

### Verificado en la documentacion de Next 16 (`web/node_modules/next/dist/docs/01-app/`)

- `01-getting-started/07-mutating-data.md`:
  - Una Server Function se puede invocar desde un Client Component en un event handler, con `useTransition`/`startTransition` (secciones "Event Handlers" y `useTransition`).
  - "Server Functions are reachable via direct POST requests": se valida y autentica dentro de cada una.
  - `redirect` lanza una excepcion de control; si hace falta revalidar, se llama `revalidatePath` antes.
- `03-api-reference/04-functions/revalidatePath.md`:
  - En una Server Function "updates the UI immediately (if viewing the affected path)".
  - `revalidatePath('/', 'layout')` "will purge the Client Cache, and invalidate all cached data for revalidation on the next page visit".
  - No se puede llamar desde el proxy ni desde Client Components.
- `02-guides/server-actions.md`: cada action es un punto de entrada no confiable ("Treat every action as an untrusted entry point"); el gating en el render no es una barrera de seguridad.
- `03-api-reference/04-functions/refresh.md`: `refresh()` solo refresca el router del cliente; no hace falta porque `revalidatePath` ya refresca la ruta actual.

### Requisitos

1. CUANDO se abre `/onboarding`, EL sistema DEBE mostrar el titulo "Tu perfil de riesgo", una intro de una linea y el cuestionario en la pregunta 1.
2. CUANDO el cuestionario esta en la pregunta N, EL sistema DEBE mostrar "Pregunta N de 6", un `<progress value={N} max={6}>`, la pregunta y sus 4 opciones como radios (textos y orden de `01-product.md`; la opcion k vale k).
3. CUANDO la pregunta actual no tiene respuesta, "Siguiente" DEBE estar deshabilitado; en la pregunta 1, "Atrás" DEBE estar deshabilitado.
4. CUANDO el usuario pulsa "Atrás", EL sistema DEBE mostrar la pregunta anterior con su respuesta marcada.
5. CUANDO cambia la pantalla (pregunta o resultado), EL sistema DEBE mover el foco a su encabezado.
6. CUANDO el usuario confirma la pregunta 6 ("Ver mi perfil"), EL sistema DEBE llamar la Server Action `submitRiskProfile(answers)`; mientras espera, el boton DEBE estar deshabilitado con el texto "Calculando…".
7. CUANDO la action responde OK, EL sistema DEBE mostrar la pantalla final con los datos **que devolvio el API** (el web nunca suma ni clasifica): "Tu perfil es {Conservador|Moderado|Agresivo}", "Puntaje: {riskScore} de 24", la explicacion, el aviso y un enlace "Ir a la app" a `/`.
8. CUANDO la action responde error, EL sistema DEBE mostrar el mensaje en un `role="alert"`, quedarse en la pregunta 6 con todas las respuestas y permitir reintentar.
9. CUANDO la action guarda con exito, DEBE llamar `revalidatePath("/", "layout")` antes de devolver. Asi se purga el Client Cache (que pudo guardar `/` mientras el proxy redirigia) y la Home (F06) no muestra un perfil viejo tras rehacerlo.
10. CUANDO el usuario ya tiene perfil (`me.onboardedAt` no nulo), EL pie de `/onboarding` DEBE mostrar el enlace "Volver a la app" (`/`); CUANDO no lo tiene o `api.me` falla, DEBE mostrar el boton "Cerrar sesión" (form con `logout`). El fallo no bloquea el cuestionario.
11. CUANDO se abre el menu de usuario, DEBE haber un enlace "Rehacer cuestionario" a `/onboarding`, entre el email y "Cerrar sesión".

### Redireccion del proxy tras el onboarding

- `proxy.ts` **no cambia**. Consulta `profiles.onboarded_at` en Supabase en cada navegacion; no hay cookie ni flag que invalidar. En cuanto el RPC guarda, la siguiente peticion a `/` pasa.
- Lo unico que se invalida es el Client Cache del router, con `revalidatePath("/", "layout")` dentro de la Server Action (req. 9).
- Un usuario ya onboarded puede abrir `/onboarding` (el proxy lo deja pasar, como definio F01): asi funciona "Rehacer cuestionario". `/onboarding` no redirige a nadie.

### Dependencias nuevas (`web/`)

Ninguna. Variables de entorno: ninguna nueva.

### Estructura de archivos

```
web/src/
├── app/(auth)/onboarding/page.tsx        # reemplaza el placeholder de F01
├── components/
│   ├── onboarding/
│   │   ├── RiskQuestionnaire.tsx         # "use client": wizard + pantalla final
│   │   └── OnboardingExit.tsx            # Server async: "Volver a la app" o "Cerrar sesión"
│   └── layout/UserMenu.tsx               # + enlace "Rehacer cuestionario"
└── lib/
    ├── api.ts                            # + api.saveRiskProfile y VALIDATION_ERROR
    └── risk/
        ├── questions.ts                  # textos: preguntas, perfiles y aviso
        └── actions.ts                    # "use server": submitRiskProfile
```

### `lib/risk/questions.ts`

```ts
export type RiskProfile = "conservador" | "moderado" | "agresivo";

/** Las 6 preguntas en orden; options[k] vale k + 1 puntos. Textos exactos de 01-product.md. */
export const RISK_QUESTIONS: readonly { title: string; options: readonly [string, string, string, string] }[];

export const RISK_PROFILES: Record<RiskProfile, { label: string; description: string }>;
// label: "Conservador" | "Moderado" | "Agresivo"; description: la explicacion de 01-product.md

export const RISK_DISCLAIMER = "Este perfil es orientativo y no es una recomendación de inversión.";
```

Solo textos: aqui no hay umbrales ni sumas (la unica fuente del calculo es `submit_risk_profile`, ver 02-backend).

### `lib/api.ts`

```ts
// en `api`:
saveRiskProfile: (answers: number[], opts?: Omit<RequestOptions, "method" | "body">) =>
  request("/me/risk-profile", meSchema, { ...opts, method: "PUT", body: { answers } }),
```

- La respuesta reutiliza `meSchema` (mismo shape que `GET /me`). `api.me` y `meSchema` no cambian.
- `errorMessage` agrega `VALIDATION_ERROR` → "Revisa tus respuestas e intenta de nuevo.".

### `lib/risk/actions.ts` (`"use server"`)

```ts
export type SubmitRiskProfileResult =
  | { ok: true; riskScore: number; riskProfile: RiskProfile }
  | { ok: false; error: string };

export async function submitRiskProfile(answers: number[]): Promise<SubmitRiskProfileResult>;
```

1. `z.array(z.number().int().min(1).max(4)).length(6).safeParse(answers)`. Si falla → `{ ok: false, error: "Revisa tus respuestas e intenta de nuevo." }` sin llamar al API (es un endpoint publico; el API vuelve a validar).
2. `token = await getServerAccessToken()`. Si es `null` → `{ ok: false, error: "Tu sesión expiró. Inicia sesión de nuevo." }`.
3. `me = await api.saveRiskProfile(parsed.data, { token })` dentro de `try`; en el `catch` → `{ ok: false, error: errorMessage(err) }`.
4. Fuera del `try`: si `me.riskScore` o `me.riskProfile` vienen nulos (no deberia pasar) → `{ ok: false, error: errorMessage(null) }`. Si no, `revalidatePath("/", "layout")` y `return { ok: true, riskScore: me.riskScore, riskProfile: me.riskProfile }` (sin `!`).

No usa `redirect`: la pantalla final se muestra en la misma pagina.

### `RiskQuestionnaire` (`"use client"`)

- Estado: `step` (0–5), `answers: (number | null)[]` de 6, `result: { riskScore, riskProfile } | null`, `error: string | null`; `const [pending, startTransition] = useTransition()`.
- Pantalla de pregunta: `<form onSubmit>` (Enter avanza) con:
  - "Pregunta {step + 1} de 6" y `<progress value={step + 1} max={6} aria-label="Progreso del cuestionario">`.
  - `<fieldset>` con `<legend><h2 tabIndex={-1}>{title}</h2></legend>` y 4 `<label>` de fila completa con `<input type="radio" name="q{step + 1}" value={k + 1}>` (flechas del teclado nativas).
  - Botones: "Atrás" (`type="button"`, `disabled` en step 0) y "Siguiente" (`type="submit"`, `disabled` sin respuesta). En step 5 el submit dice "Ver mi perfil" y, con `pending`, "Calculando…" y `disabled`.
  - `error` en `<FormAlert>` (de `components/auth/AuthField.tsx`, ya tiene `role="alert"`).
- Al enviar el step 5: `startTransition(async () => { const r = await submitRiskProfile(answers as number[]); r.ok ? setResult(r) : setError(r.error); })`. Se limpia `error` al reintentar.
- Pantalla final: `<h2 tabIndex={-1}>Tu perfil es {label}</h2>`, "Puntaje: {riskScore} de 24", `description`, `RISK_DISCLAIMER` (texto `muted`) y `<Link href="/">Ir a la app</Link>` con el estilo del boton principal de F01.
- Foco: un `useEffect` sobre `step`/`result` enfoca el `<h2>` de la pantalla actual, salvo en el primer render (no robar el foco al cargar).
- Estilo con los tokens de F00/F01 (skill `impeccable`): la opcion elegida se marca con el acento (seleccion), a 375 px sin scroll horizontal.

### `app/(auth)/onboarding/page.tsx`

```tsx
export const metadata: Metadata = { title: "Tu perfil de riesgo · Stock Insights" };

export default function OnboardingPage() {
  // <h1>Tu perfil de riesgo</h1>
  // <p>Responde 6 preguntas rápidas. Usaremos tu perfil para personalizar la app.</p>
  // <RiskQuestionnaire />
  // <Suspense fallback={null}><OnboardingExit /></Suspense>   // lee cookies: obligatorio con cacheComponents
}
```

El shell (titulo y cuestionario) es estatico; solo `OnboardingExit` es dinamico.

### `OnboardingExit` (Server, async)

`token = await getServerAccessToken()`; `api.me({ token })` en `try/catch`. `onboardedAt` no nulo → `<Link href="/">Volver a la app</Link>`; si no, o si hay error → `<form action={logout}><button type="submit">Cerrar sesión</button></form>`. No muestra `ErrorState`: el fallo solo elige la salida mas segura y no debe tapar el cuestionario.

### `UserMenu`

Agrega `<Link href="/onboarding">Rehacer cuestionario</Link>` (mismo estilo de item que "Cerrar sesión") entre el separador y el form de logout. Nada mas cambia.

### Tests (Vitest, sin Supabase real)

Mocks como en F01: `@/lib/supabase/server` (`getServerAccessToken`), `next/cache` (`revalidatePath: vi.fn()`), `@/lib/risk/actions` en los tests de componentes.

| Archivo | Casos |
|---|---|
| `lib/risk/questions.test.ts` | 6 preguntas con titulo y 4 opciones no vacias; los 3 perfiles con `label` y `description`. |
| `lib/risk/actions.test.ts` | `api.saveRiskProfile` espiado: invalidas (5 elementos, `0`, `5`, `1.5`) → `ok: false` sin llamar al API; sin token → mensaje de sesion expirada sin llamar al API; OK → llamado con las 6 respuestas y `{ token }`, `revalidatePath("/", "layout")` y `{ ok: true, riskScore, riskProfile }` tal como los devolvio el API; `ApiError` `VALIDATION_ERROR` y `NETWORK_ERROR` → sus mensajes y **sin** `revalidatePath`. |
| `components/onboarding/RiskQuestionnaire.test.tsx` | Inicio: "Pregunta 1 de 6", `progress` con `value` 1 y `max` 6, el titulo de la pregunta 1 y 4 radios con sus textos; "Atrás" y "Siguiente" deshabilitados. Elegir → "Siguiente" se habilita; avanzar y volver conserva la seleccion; el foco va al `h2` de la nueva pregunta. En la 6 el boton dice "Ver mi perfil" y al enviar se llama la action con las 6 respuestas en orden. Mientras la promesa esta pendiente: "Calculando…" deshabilitado. OK → "Tu perfil es Agresivo", "Puntaje: 21 de 24", la explicacion, el aviso y el enlace "Ir a la app" a `/` (con respuestas que sumarian menos, para probar que la UI muestra lo del servidor). Error → `role="alert"` con el mensaje, sigue en la pregunta 6 con la respuesta marcada y reintentar vuelve a llamar la action. |
| `components/onboarding/OnboardingExit.test.tsx` | `api.me` espiado: `onboardedAt` con fecha → enlace "Volver a la app" a `/`; `null` → boton "Cerrar sesión" dentro de un `<form>`; `api.me` lanza → "Cerrar sesión". |
| `components/layout/UserMenu.test.tsx` (actualizar) | Con email: enlace "Rehacer cuestionario" con `href="/onboarding"`. |
| `lib/api.test.ts` (actualizar) | `saveRiskProfile` hace `PUT /me/risk-profile` con `Content-Type: application/json`, body `{"answers":[...]}` y `Authorization`, y parsea el `Me`; `errorMessage` de `VALIDATION_ERROR`. |
| `app/(auth)/auth-pages.test.tsx` (actualizar) | `/onboarding` muestra "Tu perfil de riesgo" y la pregunta 1 (con `OnboardingExit` mockeado); ya no muestra "muy pronto". |

`proxy.test.ts` no cambia.

### Criterios de aceptacion

- [ ] `pnpm --filter web build`, `lint` y `test` pasan sin Supabase real.
- [ ] El web no suma respuestas ni contiene los umbrales del perfil: la pantalla final muestra lo que devuelve el API (cubierto por el test de `RiskQuestionnaire`).
- [ ] El cuestionario se completa solo con teclado (Tab, flechas, Enter) y el foco se mueve al encabezado en cada paso.
- [ ] A 375 px, sin scroll horizontal.
- [ ] Ningun `fetch` al API fuera de `lib/api.ts`.

### Pasos manuales pendientes

Cuando la migracion de F02 este aplicada (anotar en `PRUEBAS-MANUALES.md`), en local y luego en la app desplegada:

1. Crear una cuenta → `/onboarding` con la pregunta 1; el pie dice "Cerrar sesión".
2. Abrir `/` a mano → vuelve a `/onboarding`.
3. Responder con "Atrás" de por medio (la respuesta se conserva) y terminar con las respuestas `3,2,3,2,3,2` → "Tu perfil es Moderado", "Puntaje: 15 de 24".
4. "Ir a la app" → Home, sin volver a `/onboarding`. Recargar → sigue en la Home.
5. Menu de usuario → "Rehacer cuestionario" → pregunta 1 vacia y el pie dice "Volver a la app" (que lleva a la Home sin cambiar el perfil).
6. Rehacer con todas las opciones 4 → "Agresivo", "24 de 24"; en Table Editor `risk_score = 24`, `risk_profile = agresivo` y `onboarded_at` igual al de la primera vez.
7. Con el API apagado, enviar la pregunta 6 → alerta "No se pudo conectar con el servidor." y las respuestas siguen ahi; con el API encendido, reintentar funciona.
8. Solo teclado y a 375 px (claro y oscuro): sin scroll horizontal y foco visible.

---

## F03 — Busqueda y detalle de stock

**Estatus:** ready

### Verificado en la documentacion de Next 16 (`web/node_modules/next/dist/docs/01-app/`)

- `03-api-reference/03-file-conventions/dynamic-routes.md` (lineas 148-163): `params` es una `Promise`. Con Cache Components y sin `generateStaticParams`, los params son runtime data: "Param access must be wrapped by Suspense fallback UI". Next genera un shell estatico y el contenido carga en cada request.
- `03-api-reference/03-file-conventions/page.md` (lineas 117-119): `searchParams` es una `Promise` y una Request-time API, asi que la pagina que la lee se renderiza en el request.
- `03-api-reference/04-functions/generate-metadata.md` ("With Cache Components"): si `generateMetadata` lee `params`, se difiere al request. Eso es valido cuando otras partes de la pagina tambien se difieren, como aqui. Si el resto fuera prerenderizable, el build exigiria una decision explicita.
- `03-api-reference/04-functions/not-found.md` (lineas 85-195): `notFound()` dentro de un `<Suspense>` que ya empezo a hacer streaming mantiene el status `200` (solo agrega `noindex`).
- `02-guides/lazy-loading.md` (lineas 66 y 94) y `02-guides/single-page-applications.md` (lineas 205-217): `ssr: false` solo funciona dentro de Client Components. Para librerias que dependen de `window`, la alternativa es cargarlas en un `useEffect`.
- `01-getting-started/07-mutating-data.md` (linea 207): las Server Functions "are designed for server-side mutations. The client dispatches and awaits them one at a time". Para leer datos se usan Server Components u otra via.
- `03-api-reference/02-components/form.md` (lineas 86-88): `<Form action="/search">` con `action` string se comporta como un `<form method="GET">`: pone los campos en la URL como search params y navega del lado del cliente. Sin JS funciona igual (progressive enhancement).
- `03-api-reference/04-functions/use-search-params.md` (lineas 82-88): `useSearchParams` obliga a un `<Suspense>` en rutas prerenderizadas. El buscador del header **no** lo usa, para no meter otro boundary en el layout.

### Requisitos

1. CUANDO se renderiza cualquier ruta de `(app)`, EL header DEBE montar `HeaderSearch` en el slot `data-slot="search"`.
2. CUANDO el usuario escribe en `HeaderSearch`, EL sistema DEBE llamar `api.searchStocks(q)` 300 ms despues de la ultima tecla, con `q` recortado y no vacio (y como maximo 50 caracteres). Cada tecla nueva cancela el timer pendiente y aborta la peticion en vuelo.
3. CUANDO llegan resultados, EL sistema DEBE mostrar una lista (hasta 10) con simbolo, nombre y tipo ("Acción" o "ETF"), siguiendo el patron ARIA combobox + listbox. CUANDO no hay resultados, "Sin resultados"; mientras carga, "Buscando…"; con error, el `errorMessage(err)`.
4. CUANDO el usuario pulsa Enter con una opcion activa (flechas) o hace clic en una opcion, EL sistema DEBE navegar a `/stocks/{SYMBOL}`, cerrar la lista y vaciar el input.
5. CUANDO el usuario pulsa Enter sin opcion activa, EL formulario DEBE navegar a `/search?q={texto}`.
6. CUANDO el usuario pulsa Escape o el foco sale del componente, la lista DEBE cerrarse.
7. CUANDO se abre `/search` sin `q` (o con `q` vacio), EL sistema DEBE mostrar el buscador de la pagina vacio y un `EmptyState` que invite a buscar, sin llamar al API. (F16 reemplaza el `EmptyState` por `SearchDiscovery`; ver F16.)
8. CUANDO se abre `/search?q=texto`, EL sistema DEBE renderizar en el servidor el buscador con `texto` y la lista de resultados: cada uno es un enlace a `/stocks/{SYMBOL}` con simbolo, nombre y tipo. Sin resultados → `EmptyState` "Sin resultados para «texto»". Con error → `ErrorState`.
9. CUANDO se abre `/stocks/{symbol}`, EL sistema DEBE normalizar el simbolo (`normalizeSymbol`). Si no es valido, DEBE mostrar el estado "no encontrado" sin llamar al API.
10. CUANDO el simbolo es valido, EL sistema DEBE renderizar en el servidor, dentro de un `<Suspense>`, el encabezado (`StockHeader`), las pestañas y las metricas (`StockMetrics`) con `api.stock`. La grafica (`PriceChart`) es un Client Component que pide su historico despues de hidratar.
11. CUANDO `api.stock` responde `404 SYMBOL_NOT_FOUND` o `400 VALIDATION_ERROR`, EL sistema DEBE mostrar `EmptyState` "No encontramos el símbolo {X}" con el enlace "Buscar «X»" a `/search?q={X}`. Se muestra inline y no con `notFound()`, porque despues del streaming el status seguiria siendo 200 (ver docs) y asi se conserva el layout con un siguiente paso util. Otros errores → `ErrorState` con `errorMessage(err)`.
12. CUANDO cambia el rango en `PriceChart`, EL sistema DEBE pedir `api.stockHistory(symbol, range)` solo si ese rango no esta ya en la memoria del componente, y actualizar la grafica. Una peticion anterior aun en vuelo se aborta.
13. CUANDO el historico esta cargando, viene vacio o falla, `PriceChart` DEBE mostrar `LoadingState`, `EmptyState` ("No hay histórico para este rango.") o `ErrorState` con el boton "Reintentar", en el mismo alto que la grafica (sin salto de layout).
14. CUANDO cambia `prefers-color-scheme`, la grafica DEBE volver a aplicar los colores del tema.
15. `nav-items.ts`: "Buscar" pasa a `available: true`. Se marca activo en `/search` por la regla de prefijo de F00; en `/stocks/*` no se marca ningun item.

### Dependencias nuevas (`web/`)

- `lightweight-charts` `^5` (dependency). Nada mas.

Variables de entorno: ninguna nueva.

### Estructura de archivos

```
web/src/
├── app/(app)/
│   ├── search/page.tsx                  # Server: h1 + <Suspense><SearchResults searchParams/></Suspense>
│   └── stocks/[symbol]/page.tsx         # Server: generateMetadata + <Suspense><StockOverview params/></Suspense>
├── components/
│   ├── layout/
│   │   ├── Header.tsx                   # monta <HeaderSearch/> dentro del slot
│   │   └── nav-items.ts                 # Buscar: available: true
│   └── stocks/
│       ├── HeaderSearch.tsx             # "use client": combobox con debounce
│       ├── SearchResults.tsx            # Server async: <Form> + lista de resultados
│       ├── StockOverview.tsx            # Server async: api.stock → StockHeader + StockTabs(StockMetrics, PriceChart)
│       ├── StockHeader.tsx              # Server: logo, nombre, precio, cambio con color, hora, slot favorito
│       ├── StockMetrics.tsx             # Server: tarjetas de metricas y datos de la empresa
│       ├── StockTabs.tsx                # Server: tablist (Resumen activa; Técnico y Noticias deshabilitadas)
│       └── PriceChart.tsx               # "use client": selector de rango + lightweight-charts
└── lib/
    ├── api.ts                           # + searchStocks, stock, stockHistory y SYMBOL_NOT_FOUND
    ├── format.ts                        # formatos es-MX
    └── stocks.ts                        # normalizeSymbol, STOCK_RANGES, DEFAULT_RANGE
```

### Frontera Server / Client

| Componente | Tipo | Por que |
|---|---|---|
| `SearchResults`, `StockOverview`, `StockHeader`, `StockMetrics`, `StockTabs` | Server | Datos con SSR: el encabezado y las metricas llegan en el HTML. No mandan JS al cliente. |
| `HeaderSearch` | Client | Teclado, debounce y estado de la lista. |
| `PriceChart` | Client | `lightweight-charts` dibuja en `<canvas>` y necesita `window`. |

- `lightweight-charts` **solo se importa dentro del `useEffect`** de `PriceChart` (`await import("lightweight-charts")`). Asi nunca se evalua en el servidor y queda en su propio chunk, que se descarga despues de hidratar. No hace falta `next/dynamic` con `ssr: false`, que ademas solo funciona dentro de un Client Component (ver docs). El HTML del servidor trae el selector de rango y el skeleton con el alto final.
- `StockTabs` es Server en F03, porque Técnico y Noticias estan deshabilitadas y no hay estado. F05/F08 lo convierten en Client cuando haya paneles que alternar.
- Nada de `"use cache"`: todos los datos van con el JWT del usuario (convencion de F00). La cache vive en el API.

### Carga del historico: cliente → API con el JWT

`PriceChart` llama `api.stockHistory(symbol, range, { token: await getBrowserAccessToken(), signal })` directo al Express.

| Opcion | Decision |
|---|---|
| **Cliente → API con JWT** (elegida) | Un solo salto. Se puede abortar con `AbortController` cuando el usuario cambia rapido de rango. No gasta una invocacion de funcion de Next en Vercel. El token ya esta en el navegador (sesion de `@supabase/ssr`). Requisito: `CORS_ORIGIN` del API incluye el dominio del web. En Production ya esta configurado (ver 02-backend). |
| Server Action | Descartada. Son para mutaciones y el cliente las despacha **una a la vez** (docs): los cambios de rango quedarian en cola, sin forma de abortar. Ademas suma el salto navegador → Next → API. |
| Route Handler en Next (BFF) | Descartada. Agrega un salto y un cold start, y duplica una ruta que el API ya expone con auth. |
| Pedirlo en el servidor con el render | Descartada. La grafica no se puede pintar en el servidor y gastaria 1 credito de Twelve Data en cada carga aunque el usuario no mire la grafica. Ademas haria mas pesado el HTML. |

- Al montar se pide solo `DEFAULT_RANGE` (`6M`); los demas rangos, solo cuando se eligen. Lo ya traido se guarda en un `useRef<Map<StockRange, Candle[]>>` del componente, para que volver a un rango no repita la llamada (el API igual lo tendria en cache).
- Una carrera entre respuestas se evita abortando la anterior. Un `AbortError` no se muestra como error.

### `HeaderSearch` (`"use client"`)

- Markup: `<Form action="/search" role="search">` (de `next/form`) con:
  - `<label className="sr-only" htmlFor="header-search">Buscar acciones o ETFs</label>`.
  - `<input id="header-search" name="q" type="search" role="combobox" aria-autocomplete="list" aria-expanded aria-controls="header-search-listbox" aria-activedescendant autoComplete="off" maxLength={50} placeholder="Buscar símbolo o empresa">`.
  - `<ul id="header-search-listbox" role="listbox">` con `<li role="option" id="header-search-opt-{i}" aria-selected>` por resultado.
- El Enter sin opcion activa lo resuelve el `<Form>`: navega a `/search?q=` y funciona sin JS. Con opcion activa, `onKeyDown` hace `preventDefault()` y `router.push(\`/stocks/${symbol}\`)`.
- Teclas: ArrowDown/ArrowUp mueven la opcion activa (con wrap) y abren la lista si hay resultados; Escape cierra.
- Clic en una opcion: `onMouseDown={e => e.preventDefault()}` (evita que el blur cierre la lista antes del clic) y `onClick` → `router.push`.
- Debounce: `useEffect` sobre el texto con `setTimeout(300)`; el cleanup hace `clearTimeout` y `controller.abort()`. Si el texto recortado esta vacio, se cierra la lista sin llamar al API.
- Un `<p role="status" className="sr-only">` anuncia "{n} resultados" o "Sin resultados".
- No usa `useSearchParams` ni `usePathname`: el `Header` (Server) lo monta sin `<Suspense>`.
- Estilo: input con los tokens de F00. La lista es un panel `surface` con borde, posicionado bajo el input con el ancho del slot, `max-h` con scroll y la opcion activa en `accent-soft`. El tipo va como badge neutro. A 375 px el input se encoge (`min-w-0`) sin empujar el menu de usuario.

### `/search`

```tsx
// app/(app)/search/page.tsx
export const metadata: Metadata = { title: "Buscar · Stock Insights" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  // <h1>Buscar</h1>
  // <Suspense fallback={<><SearchForm q="" /><LoadingState /></>}>
  //   <SearchResults searchParams={searchParams} />
  // </Suspense>
}
```

- `SearchResults` (Server, async):
  - `q` = primer valor si viene arreglo; luego `trim()` y `slice(0, 50)`.
  - Renderiza `<Form action="/search">`, con un input `name="q"`, `defaultValue={q}` y `key={q}` (para que el valor se actualice entre navegaciones), y el boton "Buscar".
  - Sin `q`: `EmptyState` "Busca una empresa o ETF" con la descripcion "Escribe un nombre o símbolo, por ejemplo Apple o AAPL.".
  - Con `q`: `api.searchStocks(q, { token })` en `try/catch`. El resultado es una lista `<ul>` de enlaces: simbolo en negrita, nombre (`truncate`) y badge "Acción" o "ETF".
- El formulario de la pagina es un componente local de `SearchResults.tsx` (se reutiliza en el fallback). No es `HeaderSearch`: aqui no hay autocompletado.

### `/stocks/[symbol]`

```tsx
// app/(app)/stocks/[symbol]/page.tsx
export async function generateMetadata({ params }: PageProps<"/stocks/[symbol]">): Promise<Metadata> {
  const symbol = normalizeSymbol((await params).symbol);
  return { title: `${symbol ?? "Stock"} · Stock Insights` }; // sin llamar al API: no gasta cuota
}

export default function StockPage({ params }: PageProps<"/stocks/[symbol]">) {
  // <Suspense fallback={<LoadingState label="Cargando stock…" rows={5} />}>
  //   <StockOverview params={params} />
  // </Suspense>
}
```

`StockOverview` (Server, async):

1. `symbol = normalizeSymbol((await params).symbol)`. Si es `null` → `<SymbolNotFound raw={...} />` sin llamar al API.
2. `token = await getServerAccessToken()`; `data = await api.stock(symbol, { token })` en `try/catch`. `ApiError` con `SYMBOL_NOT_FOUND` o `VALIDATION_ERROR` → `SymbolNotFound`; otro error → `ErrorState`.
3. Fuera del `try`: `<StockHeader data />`, y debajo `<StockTabs>` con el panel Resumen: `<PriceChart symbol />` y luego `<StockMetrics data />`.

`SymbolNotFound` es local de `StockOverview.tsx`: `EmptyState` con el titulo "No encontramos el símbolo {X}", la descripcion "Revisa que esté bien escrito o búscalo por nombre." y el enlace "Buscar «X»" a `/search?q={X}` (codificado).

### `StockHeader` (Server)

- Logo: `<img src={logoUrl} alt="" width={40} height={40}>`, solo si hay `logoUrl`. Un `<img>` normal y no `next/image`: el logo viene de un dominio externo y la optimizacion de imagenes no aporta en un icono de 40 px. Lleva un `eslint-disable-next-line @next/next/no-img-element` con ese motivo.
- `<h1>`: `profile?.name ?? symbol`. Debajo, el simbolo y `profile?.exchange` en `muted`.
- `<div data-slot="favorite" />` junto al titulo. Es el **gancho F04**: ahi ira la estrella. F03 lo deja vacio.
- Precio: `formatCurrency(quote.price)`, grande y con `tabular-nums`.
- Cambio: `▲ +2.31 (+1.23%)` en `text-up` si `change > 0`; `▼ -1.05 (-0.55%)` en `text-down` si `< 0`; `muted` y sin flecha si es `0` o `null`. La flecha es `aria-hidden`, con un `sr-only` "Sube" o "Baja": el color no es la unica señal.
- Debajo: "Precio al {formatQuoteTime(quote.timestamp)} (hora de Nueva York)".

### `StockMetrics` (Server)

`<dl>` en grilla de tarjetas: 2 columnas a 375 px, 3 en `md` y 4 en `lg`. Cada tarjeta lleva `<dt>` (`muted`, texto chico) y `<dd>` (valor). Un valor `null` se muestra como "—".

| Tarjeta | Valor |
|---|---|
| Apertura | `formatCurrency(quote.open)` |
| Cierre anterior | `formatCurrency(quote.previousClose)` |
| Máximo del día | `formatCurrency(quote.high)` |
| Mínimo del día | `formatCurrency(quote.low)` |
| Capitalización | `formatMarketCap(profile?.marketCapMillions ?? metrics?.marketCapMillions)` |
| P/E (TTM) | `formatNumber(metrics?.peRatio)` |
| Beta | `formatNumber(metrics?.beta)` |
| Máximo 52 semanas | `formatCurrency(metrics?.week52High)` |
| Mínimo 52 semanas | `formatCurrency(metrics?.week52Low)` |
| Rend. dividendo | `formatPercent(metrics?.dividendYieldPercent)` |

Bloque "Empresa" debajo: Sector (`industry`), País, Bolsa y Sitio web. El sitio web es un enlace con `target="_blank" rel="noopener noreferrer"` y muestra el hostname sin `www.`.

### `StockTabs` (Server)

- `<div role="tablist" aria-label="Secciones del stock">` con tres `<button role="tab">`:
  - "Resumen": `id="tab-resumen"`, `aria-selected="true"` y `aria-controls="panel-resumen"`.
  - "Técnico" y "Noticias": `aria-selected="false"`, `disabled` y `aria-disabled="true"`, cada uno con el badge "Próximamente" (mismo estilo que el sidebar de F00).
- `<div role="tabpanel" id="panel-resumen" aria-labelledby="tab-resumen">{children}</div>`.
- **Ganchos F05/F08:** habilitan su pestaña y convierten el componente en Client.

### `PriceChart` (`"use client"`)

- Props: `{ symbol: string }`. Estado: `range` (`DEFAULT_RANGE`) y `status` (`"loading" | "ready" | "empty" | "error"`).
- **Selector:** `<div role="group" aria-label="Rango de la gráfica">` con un boton por `STOCK_RANGES` (`1M`, `6M`, `1A`, `5A`) y `aria-pressed` en el activo (estilo de seleccion con `accent-soft`).
- **Contenedor:** un `<div>` siempre montado (alto fijo `h-72 md:h-96`) con `role="img"` y `aria-label="Gráfica de velas de {S}, {rango largo}"`. Los estados se pintan encima, en el mismo alto, y el canvas se oculta con `invisible` mientras no hay datos.
- **Ciclo de vida** (un `useEffect` al montar):
  1. `const { createChart, CandlestickSeries, HistogramSeries, ColorType } = await import("lightweight-charts")`. Si el componente se desmonto mientras tanto (flag `cancelled`), no crea nada.
  2. `createChart(el, { autoSize: true, ...theme })`.
  3. `chart.addSeries(CandlestickSeries, { upColor, downColor, wickUpColor, wickDownColor, borderVisible: false })`.
  4. `chart.addSeries(HistogramSeries, { priceScaleId: "", priceFormat: { type: "volume" } })` con `priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })`, para que el volumen quede abajo.
  5. Cleanup: `chart.remove()`.
- **Datos:** `api.stockHistory` → `candles`, ya ascendentes y sin repetidos (los garantiza el API). Se mapean asi:
  - Velas: `{ time: c.date, open, high, low, close }`. `time` va como string `"YYYY-MM-DD"` (business day de lightweight-charts), sin convertir a timestamp.
  - Volumen: solo las velas con `volume !== null` → `{ time: c.date, value: c.volume, color }`, donde `color` es `up` o `down` con 40 % de opacidad segun `close >= open`.
  - Luego `setData(...)` en las dos series y `chart.timeScale().fitContent()`.
- **Tema:** el tema de F00 es solo `prefers-color-scheme` (no hay toggle manual).
  - `readChartTheme()` lee `--surface`, `--muted`, `--border`, `--up` y `--down` con `getComputedStyle(document.documentElement)`.
  - Los convierte a `rgb()` pintandolos en un canvas 2D de 1×1 (`fillStyle` + `getImageData`). Los tokens estan en `oklch` y no se debe depender de que la libreria lo parsee. Si no hay contexto 2D (jsdom), se usa el valor crudo.
  - Se aplican asi: `layout.background` = `{ type: ColorType.Solid, color: surface }`, `layout.textColor` = `muted`, `grid.vertLines`/`horzLines` = `border`, velas y volumen con `up`/`down`.
  - Un listener de `matchMedia("(prefers-color-scheme: dark)")` `change` vuelve a leer el tema y llama `chart.applyOptions` y `series.applyOptions`; se quita en el cleanup.
  - `layout.attributionLogo` se deja en su valor por defecto: la licencia de lightweight-charts pide atribuir a TradingView.
- **Estados:** loading → `LoadingState` con la etiqueta "Cargando gráfica…"; `[]` → `EmptyState` con "No hay histórico para este rango."; error → `ErrorState` con `errorMessage(err)` y un boton "Reintentar" que repite el rango actual.

### `lib/stocks.ts`

```ts
// Mismo formato que symbolSchema del API (02-backend, F03).
export const SYMBOL_PATTERN = /^[A-Z]{1,5}(\.[A-Z])?$/;
export function normalizeSymbol(raw: string): string | null; // trim + toUpperCase; null si no cumple el patron

export type StockRange = "1M" | "6M" | "1Y" | "5Y";
export const STOCK_RANGES: readonly { value: StockRange; label: string; long: string }[] = [
  { value: "1M", label: "1M", long: "1 mes" },
  { value: "6M", label: "6M", long: "6 meses" },
  { value: "1Y", label: "1A", long: "1 año" },
  { value: "5Y", label: "5A", long: "5 años" },
];
export const DEFAULT_RANGE: StockRange = "6M";
```

### `lib/format.ts`

Locale `es-MX`: la UI esta en español y usa punto decimal y coma de miles, igual que las cotizaciones de US. Valores verificados con `Intl` en Node 24:

| Funcion | Entrada → salida |
|---|---|
| `formatCurrency(v, currency = "USD")` | `189.84` → `"$189.84"`; `1234567.891` → `"$1,234,567.89"` (`style: "currency"`, `currencyDisplay: "narrowSymbol"`) |
| `formatChange(v)` | `2.31` → `"+2.31"`; `-1.05` → `"-1.05"`; `0` → `"0.00"` (`signDisplay: "exceptZero"`, 2 decimales) |
| `formatPercent(points, { signed })` | recibe puntos porcentuales: `1.23` con `signed` → `"+1.23%"`; `-0.45` → `"-0.45%"`; `0.51` sin `signed` → `"0.51%"` (`style: "percent"` sobre `points / 100`) |
| `formatMarketCap(millions)` | `2_950_000` → `"2.95 T"`; `3_400` → `"3.4 B"`; `812` → `"812 M"`. Umbrales: ≥ 1 000 000 M → T, ≥ 1 000 M → B, si no M. Numero con `es-MX` y maximo 2 decimales. |
| `formatNumber(v)` | P/E y beta: `29.4` → `"29.40"` (2 decimales) |
| `formatQuoteTime(unixSeconds)` | `"18 nov 2026, 1:33 p.m."` (`dateStyle: "medium"`, `timeStyle: "short"`, `timeZone: "America/New_York"`) |

- `null` o `undefined` → `"—"` en todas.
- No se usa `notation: "compact"`: en `es-MX` produce `"2.95 B"` (billón español) y `"3400 M"`, que confunden.
- Las fechas van en la zona horaria del mercado y no en la del navegador: los Server Components formatean en el servidor (UTC en Vercel), y asi la salida es determinista.

### `lib/api.ts`

```ts
const quoteSchema = z.object({ symbol: z.string(), price: z.number(), change: z.number().nullable(),
  changePercent: z.number().nullable(), high: z.number(), low: z.number(), open: z.number(),
  previousClose: z.number(), timestamp: z.number() });
const profileSchema = z.object({ symbol: z.string(), name: z.string(), logoUrl: z.string().nullable(),
  industry: z.string().nullable(), country: z.string().nullable(), website: z.string().nullable(),
  exchange: z.string().nullable(), currency: z.string().nullable(), marketCapMillions: z.number().nullable() });
const metricsSchema = z.object({ peRatio: z.number().nullable(), beta: z.number().nullable(),
  week52High: z.number().nullable(), week52Low: z.number().nullable(),
  dividendYieldPercent: z.number().nullable(), marketCapMillions: z.number().nullable() });

const stockSearchSchema = z.object({ query: z.string(), results: z.array(z.object({
  symbol: z.string(), name: z.string(), type: z.enum(["stock", "etf"]) })) });
const stockDetailSchema = z.object({ symbol: z.string(), quote: quoteSchema,
  profile: profileSchema.nullable(), metrics: metricsSchema.nullable() });
const candleSchema = z.object({ date: z.string(), open: z.number(), high: z.number(), low: z.number(),
  close: z.number(), volume: z.number().nullable() });
const stockHistorySchema = z.object({ symbol: z.string(), range: z.enum(["1M", "6M", "1Y", "5Y"]),
  interval: z.enum(["1day", "1week"]), candles: z.array(candleSchema) });

export type StockSearchResult = z.infer<typeof stockSearchSchema>["results"][number];
export type StockDetail = z.infer<typeof stockDetailSchema>;
export type Candle = z.infer<typeof candleSchema>;

// en `api`:
searchStocks: (q: string, opts?: RequestOptions) =>
  request(`/stocks/search?${new URLSearchParams({ q })}`, stockSearchSchema, opts),
stock: (symbol: string, opts?: RequestOptions) =>
  request(`/stocks/${encodeURIComponent(symbol)}`, stockDetailSchema, opts),
stockHistory: (symbol: string, range: StockRange, opts?: RequestOptions) =>
  request(`/stocks/${encodeURIComponent(symbol)}/history?range=${range}`, stockHistorySchema, opts),
```

`errorMessage` agrega `SYMBOL_NOT_FOUND` → "No encontramos ese símbolo.".

### Tests (Vitest, sin red ni Supabase real)

Mocks: `@/lib/api` (espiar `api.*`), `@/lib/supabase/server` (`getServerAccessToken`), `@/lib/supabase/client` (`getBrowserAccessToken`), `next/navigation` (`useRouter` → `{ push: vi.fn() }`), `next/form` (renderiza un `<form>` con `action`) y `lightweight-charts`. Este ultimo es un fake de `createChart` que devuelve `{ addSeries → { setData, applyOptions, priceScale }, applyOptions, timeScale → { fitContent }, remove }`. `vi.mock` tambien intercepta el `import()` dinamico.

| Archivo | Casos |
|---|---|
| `lib/format.test.ts` | Cada fila de la tabla de formatos, incluido `null` → `"—"` y los tres umbrales de `formatMarketCap`. |
| `lib/stocks.test.ts` | `"aapl"` → `"AAPL"`; `" brk.b "` → `"BRK.B"`; `"AAPL1"`, `"TOOLONG"`, `"AAPL.MX"`, `"BRK-B"` y `""` → `null`. `STOCK_RANGES` tiene 4 rangos y `DEFAULT_RANGE` es `"6M"`. |
| `lib/api.test.ts` (actualizar) | `searchStocks("s&p")` pide `/stocks/search?q=s%26p` con `Authorization`; `stock("BRK.B")` pide `/stocks/BRK.B`; `stockHistory("AAPL", "1Y")` pide `/stocks/AAPL/history?range=1Y`. Los tres parsean el shape de 02-backend, y un `type` desconocido → `INVALID_RESPONSE`. `errorMessage` de `SYMBOL_NOT_FOUND`. |
| `components/stocks/HeaderSearch.test.tsx` | Con fake timers: escribir "a", "ap", "app" seguido → ninguna llamada antes de 300 ms y una sola con `"app"` despues. Espacios solos → sin llamada. Los resultados se ven como `option` con "Acción"/"ETF" y `aria-expanded="true"`. ArrowDown + Enter → `push("/stocks/AAPL")` y el input se vacia. Clic en una opcion → `push`. El form tiene `action="/search"` y el input `name="q"`. Escape → `aria-expanded="false"`. `[]` → "Sin resultados". `ApiError` `PROVIDER_RATE_LIMITED` → su mensaje. Una tecla nueva aborta la peticion anterior (`signal.aborted`). |
| `components/stocks/SearchResults.test.tsx` | `await SearchResults({ searchParams: Promise.resolve({ q: "apple" }) })`: enlaces a `/stocks/AAPL` con nombre y badges "Acción"/"ETF". Sin `q` → `EmptyState` "Busca una empresa o ETF" y sin llamada al API. `q: ["a", "b"]` → busca `"a"`. `[]` → "Sin resultados para «zzz»". `ApiError` → `role="alert"`. El input tiene `defaultValue` igual a `q`. |
| `components/stocks/StockOverview.test.tsx` | (`PriceChart` mockeado) `params` `{ symbol: "aapl" }` → `api.stock("AAPL", { token })`. Se ven `h1` "Apple Inc", "$189.84" y "+2.31 (+1.23%)" con la clase `text-up` y "Sube" para lectores. Un cambio negativo → `text-down` y "Baja". Las tarjetas muestran "2.95 T" y "0.51%". `profile: null` → `h1` con el simbolo y "—" en sector y capitalizacion (la capitalizacion sale de metrics si existe). Existe `[data-slot="favorite"]`. Las pestañas Técnico y Noticias estan `disabled` con "Próximamente" y Resumen tiene `aria-selected="true"`. 404 `SYMBOL_NOT_FOUND` → "No encontramos el símbolo ZZZZZ" con un enlace a `/search?q=ZZZZZ`. `"AAPL1"` → el mismo estado sin llamar al API. `PROVIDER_ERROR` → `role="alert"`. |
| `components/stocks/PriceChart.test.tsx` | Al montar: `getBrowserAccessToken` y `stockHistory("AAPL", "6M", { token, signal })` una vez. `setData` de velas con `{ time: "2026-05-19", open, high, low, close }` y de volumen sin las velas con `volume: null`. `fitContent` llamado. Clic en "1A" → llamada con `"1Y"` y `aria-pressed="true"`. Volver a "6M" → sin llamada nueva. Cambiar de rango con una peticion pendiente → la anterior queda abortada y su respuesta no pinta. `[]` → "No hay histórico para este rango.". Error → `role="alert"`, y "Reintentar" vuelve a pedir. El evento `change` del `matchMedia` mockeado → `chart.applyOptions` llamado de nuevo. Al desmontar → `remove()`. |
| `components/layout/SidebarLinks.test.tsx` (actualizar) | "Buscar" es un enlace a `/search` con `aria-current="page"` en `/search`. En `/stocks/AAPL` sigue sin item activo. |
| `app/(app)/stocks/[symbol]/page.test.tsx` | `generateMetadata({ params: Promise.resolve({ symbol: "nvda" }) })` → titulo `"NVDA · Stock Insights"`; con un simbolo invalido → `"Stock · Stock Insights"`; no llama al API. |

### Criterios de aceptacion

- [ ] `pnpm --filter web build`, `lint` y `test` pasan sin Supabase real. El build no falla por acceso a `params`/`searchParams` fuera de `<Suspense>`.
- [ ] El HTML de `/stocks/AAPL` (ver codigo fuente) ya trae el precio y las metricas. La grafica llega despues.
- [ ] `lightweight-charts` no aparece en el bundle del servidor ni en el chunk inicial (solo en el `import()` del `useEffect`).
- [ ] La grafica respeta el modo claro y oscuro, y cambia al alternar el tema del sistema sin recargar.
- [ ] Ningun `fetch` al API fuera de `lib/api.ts`.
- [ ] A 375 px: el header con el buscador, `/search` y `/stocks/[symbol]` sin scroll horizontal; las metricas en 2 columnas.

### Pasos manuales pendientes

Anotar en `PRUEBAS-MANUALES.md` (en local y en la app desplegada):

1. En el header escribir "apple": tras una pausa breve aparecen sugerencias con AAPL y el tipo "Acción". Con flechas + Enter se abre `/stocks/AAPL`.
2. Escribir "spy" y pulsar Enter sin elegir → `/search?q=spy`, solo con SPY marcado como "ETF". "Buscar" esta resaltado en el sidebar.
3. Buscar "berkshire" → aparece BRK.A o BRK.B y su enlace abre la ficha. Buscar "baba" → BABA aparece una sola vez, como "Acción".
4. Abrir `/search` sin `q` → buscador vacio y la invitacion a buscar.
5. En `/stocks/AAPL`:
   - Precio, cambio en verde o rojo con flecha, y la hora de Nueva York.
   - Tarjetas con valores (capitalizacion tipo "2.95 T").
   - Pestañas Técnico y Noticias deshabilitadas con "Próximamente".
6. Grafica: carga en 6M. Cambiar a 1M, 1A y 5A actualiza las velas (5A con velas semanales). En DevTools > Network, volver a un rango ya visto no hace una peticion nueva y no hay errores de CORS.
7. `/stocks/zzzzz` → "No encontramos el símbolo ZZZZZ" con el enlace a Buscar. `/stocks/aapl` (minusculas) funciona.
8. Cambiar el tema del sistema a oscuro con la ficha abierta: la grafica cambia de colores sin recargar.
9. A 375 px y solo con teclado (Tab, flechas, Enter, Escape): todo es usable, el foco es visible y no hay scroll horizontal.

---

## F06 — Home

**Estatus:** ready

### Requisitos

1. CUANDO se renderiza `/` (`app/(app)/page.tsx`), EL sistema DEBE componer, en orden: `Greeting`, el buscador (`SearchForm q=""` + `PopularSymbols`), "Mercado hoy", "Ideas para tu perfil" y `ComingSoon`. La pagina es un Server Component sincrono: lo que no depende de datos queda en el shell estatico y cada parte con datos va en su propio `<Suspense>`.
2. CUANDO `api.me` responde, `Greeting` DEBE mostrar el `<h1>` "Hola, {displayName}" y, si `riskProfile` no es `null`: un badge con `RISK_PROFILES[riskProfile].label`, la `description`, "Puntaje {riskScore} de 24" (solo si `riskScore` no es `null`) y el enlace "Rehacer cuestionario" a `/onboarding`.
3. CUANDO `api.me` falla (cualquier error), `Greeting` DEBE mostrar solo el `<h1>` "Hola", sin badge, sin `ErrorState` y sin relanzar. CUANDO `displayName` esta vacio, el `<h1>` dice "Hola" (sin coma) pero el bloque del perfil (badge, descripcion, puntaje y "Rehacer cuestionario") se muestra igual si `riskProfile` no es `null`.
4. "Mercado hoy" DEBE renderizar las 3 entradas de `MARKET_INDEXES`, cada una con `<Suspense fallback={<QuoteCardSkeleton />}>` y un `QuoteCard` propio.
5. "Ideas para tu perfil" DEBE leer el perfil (mismo `getMe` deduplicado que `Greeting`), elegir `ideasFor(riskProfile)` y renderizar 4 `QuoteCard` con `showCompany`, cada uno en su `<Suspense>`. Si `/me` falla, usa `ideasFor(null)` (moderado) y el subtitulo sin perfil.
6. `QuoteCard` DEBE llamar `api.stock(symbol, { token })` en el servidor. Con datos: `Link` a `/stocks/{symbol}` con nombre, simbolo, `formatCurrency(quote.price)` y el cambio con `Trend`. CUANDO la llamada falla con cualquier error, DEBE mostrar "No disponible" en `text-muted`, del mismo tamaño, sin `role="alert"` y sin relanzar.
7. EL componente `Trend` privado de `StockHeader.tsx` DEBE moverse a `components/stocks/Trend.tsx` (exportado) sin cambiar su markup; `StockHeader` lo importa y se ve igual.
8. `ComingSoon` DEBE mostrar 3 tarjetas sin enlaces ni botones.
9. Ninguna llamada al API fuera de `lib/api.ts`; sin `"use cache"` (datos por usuario); sin Client Components nuevos.

### Dependencias nuevas (`web/`)

Ninguna. Variables de entorno: ninguna nueva.

### Estructura de archivos

```
web/src/
├── app/(app)/
│   └── page.tsx                      # Server sincrono: compone la Home (reemplaza el placeholder)
├── components/
│   ├── home/
│   │   ├── Greeting.tsx              # Server async: saludo + perfil (o solo "Hola")
│   │   ├── MarketToday.tsx           # Server: h2 + grilla de 3 <Suspense><QuoteCard/></Suspense>
│   │   ├── ProfileIdeas.tsx          # Server async: lee el perfil → subtitulo + 4 <Suspense><QuoteCard showCompany/></Suspense>
│   │   ├── QuoteCard.tsx             # Server async: QuoteCard + QuoteCardSkeleton
│   │   └── ComingSoon.tsx            # Server: 3 tarjetas no clicables
│   └── stocks/
│       ├── PopularSymbols.tsx        # Server: chips "Populares" (componente compartido)
│       ├── Trend.tsx                 # Trend + changeTone, extraidos de StockHeader
│       └── StockHeader.tsx           # importa Trend y changeTone; mismo render
└── lib/
    ├── home.ts                       # MARKET_INDEXES, IDEAS_BY_PROFILE, ideasFor
    └── me.ts                         # getMe: React cache() de api.me con el token del servidor
```

### Frontera Server / Client

Todo es Server Component. Ninguna parte de la Home necesita estado ni eventos: el buscador es el `<Form>` de `next/form` que ya usa `/search` y los chips y tarjetas son `Link`. No se manda JS nuevo al cliente.

### Composicion de `page.tsx`

```tsx
export const metadata: Metadata = { title: "Home · Stock Insights" };

export default function Home() {
  // <div className="mx-auto max-w-5xl flex flex-col gap-10">
  //   <Suspense fallback={<GreetingSkeleton />}><Greeting /></Suspense>
  //   <section aria-label="Buscar"><SearchForm q="" /><PopularSymbols /></section>
  //   <MarketToday />                                          // sus Suspense van por tarjeta
  //   <Suspense fallback={<IdeasSkeleton />}><ProfileIdeas /></Suspense>
  //   <ComingSoon />
  // </div>
}
```

- `Greeting` y `ProfileIdeas` leen la sesion, asi que van dentro de `<Suspense>` (convencion de cookies con Cache Components). `GreetingSkeleton` ocupa el alto del saludo con perfil; `IdeasSkeleton` es el `h2`, una linea de subtitulo y 4 `QuoteCardSkeleton`.
- `MarketToday` no lee la sesion: es sincrono y cada `QuoteCard` dentro de su `<Suspense>` lee el token.
- Los esqueletos son locales de cada archivo (no se exportan salvo `QuoteCardSkeleton`).

### `lib/me.ts`

```ts
import { cache } from "react";
/** Un solo GET /me por request aunque Greeting y ProfileIdeas lo pidan. Devuelve null si falla. */
export const getMe = cache(async (): Promise<Me | null> => {
  try { return await api.me({ token: await getServerAccessToken() }); } catch { return null; }
});
```

- `cache` de React deduplica dentro del mismo render del servidor; no persiste entre requests (no es `"use cache"`).
- Devuelve `null` en vez de lanzar: los dos consumidores tratan la falla igual que "sin perfil".

### `lib/home.ts`

```ts
export const MARKET_INDEXES = [
  { symbol: "SPY", name: "S&P 500" },
  { symbol: "QQQ", name: "Nasdaq 100" },
  { symbol: "DIA", name: "Dow Jones" },
] as const;

// F07 reemplaza esta lista estática por recomendaciones personalizadas
export const IDEAS_BY_PROFILE: Record<RiskProfile, readonly string[]> = {
  conservador: ["KO", "JNJ", "PG", "VTI"],
  moderado: ["AAPL", "MSFT", "V", "QQQ"],
  agresivo: ["NVDA", "TSLA", "AMD", "META"],
};

export function ideasFor(profile: RiskProfile | null): readonly string[]; // null → moderado
```

El comentario `// F07 reemplaza esta lista estática por recomendaciones personalizadas` es obligatorio y va exactamente asi sobre `IDEAS_BY_PROFILE`.

### `Greeting` (Server, async)

- `me = await getMe()`.
- `<h1 className="text-2xl font-semibold tracking-tight">`: `me?.displayName ? \`Hola, ${me.displayName}\` : "Hola"`.
- Si `me?.riskProfile`: junto al `h1`, badge con `RISK_PROFILES[me.riskProfile].label` (mismo estilo neutro que `TypeBadge`); debajo, `<p className="text-muted max-w-[65ch]">` con la `description`; luego "Puntaje {riskScore} de 24" (si no es `null`) y el `Link` secundario "Rehacer cuestionario" a `/onboarding` (texto chico, `text-muted`, subrayado en hover, como los enlaces de `OnboardingExit`).
- Sin perfil o con `/me` fallido: solo el `h1`. No se muestra error: el saludo es decorativo y la pagina sigue.

### `PopularSymbols` (Server)

- `export const POPULAR_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "SPY"] as const;`
- `<nav aria-label="Populares">` con un texto visible "Populares" (`text-sm text-muted`) y una lista de chips: cada uno `<Link href={\`/stocks/${s}\`}>` con el simbolo, en una fila que hace wrap (`flex flex-wrap gap-2`), con foco visible. Compartido para que F03/F07 lo puedan reutilizar (p. ej. en el `EmptyState` de `/search`); F06 solo lo monta en la Home.

### `Trend` (`components/stocks/Trend.tsx`)

- Se mueve tal cual desde `StockHeader.tsx`: el `<svg>` del triangulo (`aria-hidden`, `rotate-180` si baja) y el `sr-only` "Sube"/"Baja".
- Tambien se mueve la regla del color a una funcion exportada: `changeTone(change: number | null): "text-up" | "text-down" | "text-muted"` (`> 0` → up, `< 0` → down, `0` o `null` → muted). `StockHeader` y `QuoteCard` la usan; no se duplica.
- `StockHeader` solo cambia sus imports; su render y sus tests (`StockOverview.test.tsx`) no cambian.

### `QuoteCard` (Server, async)

Props: `{ symbol: string; name?: string; showCompany?: boolean }`.

1. `token = await getServerAccessToken()`; `data = await api.stock(symbol, { token })` en `try/catch`. Cualquier error → estado "No disponible".
2. Con datos, la tarjeta completa es un `<Link href={\`/stocks/${symbol}\`}>` (borde, `surface`, `rounded-lg`, padding, foco visible, hover sutil):
   - Encabezado: si `showCompany` y hay `profile?.logoUrl`, `<img>` de 32 px (`size-8`, `width={32} height={32}`, `alt=""`, mismas clases que el logo de `StockHeader` y el mismo `eslint-disable-next-line @next/next/no-img-element` con su motivo). Titulo: `name` (mercado) o `profile?.name ?? symbol` (ideas), `truncate`. Debajo, el simbolo en `text-muted`.
   - Precio: `formatCurrency(quote.price)`, `text-xl font-semibold tabular-nums`.
   - Cambio: `<span className={changeTone(quote.change)}>` con `<Trend up />` si `change` no es `0` ni `null`, y `{formatChange(change)} ({formatPercent(changePercent, { signed: true })})`.
3. Sin datos: el mismo contenedor y alto, con el titulo (`name ?? symbol`) y el simbolo, y en lugar del precio `<p className="text-sm text-muted">No disponible</p>`. Sigue siendo un `Link` a la ficha (la ficha muestra su propio estado de error o "no encontrado").
4. `QuoteCardSkeleton`: mismo contenedor, alto y padding, con 3 barras `bg-skeleton motion-safe:animate-pulse` y un `sr-only` "Cargando…". Así no hay salto de layout al llegar los datos.

### `MarketToday` (Server)

- `<section aria-labelledby="market-today">` con `<h2 id="market-today">Mercado hoy</h2>`.
- Grilla: 1 columna a 375 px, 3 en `sm` (`grid gap-3 sm:grid-cols-3`).
- `MARKET_INDEXES.map(({ symbol, name }) => <Suspense key={symbol} fallback={<QuoteCardSkeleton />}><QuoteCard symbol={symbol} name={name} /></Suspense>)`.

### `ProfileIdeas` (Server, async)

- `me = await getMe()`; `profile = me?.riskProfile ?? null`; `symbols = ideasFor(profile)`.
- `<section aria-labelledby="profile-ideas">` con `<h2 id="profile-ideas">Ideas para tu perfil</h2>` y el subtitulo `text-sm text-muted`:
  - con perfil: "Selección de ejemplo según tu perfil {RISK_PROFILES[profile].label}. No es recomendación de inversión."
  - sin perfil: "Selección de ejemplo. No es recomendación de inversión."
- Grilla: 1 columna a 375 px, 2 en `sm`, 4 en `lg`. Cada simbolo en su `<Suspense fallback={<QuoteCardSkeleton />}>` con `<QuoteCard symbol showCompany />`.

### `ComingSoon` (Server)

- `<section aria-labelledby="coming-soon">` con `<h2 id="coming-soon">Próximamente</h2>`, en tono discreto (texto chico, `text-muted`, tarjetas con borde punteado o `bg-transparent`).
- 3 tarjetas `<div>` (nunca `Link`, `a` ni `button`), cada una con titulo, descripcion de una linea y el badge "Próximamente" (mismo estilo que el sidebar y `StockTabs`):

| Titulo | Descripcion |
|---|---|
| Favoritos | Guarda stocks para seguirlos de cerca. |
| Noticias | Noticias del mercado y de tus empresas. |
| Simulador | Practica con dinero ficticio y precios reales. |

### Costo en el proveedor

Cada `QuoteCard` hace un `GET /stocks/:symbol` (quote + profile + metrics en el API). Son 7 tarjetas: hasta 21 llamadas a Finnhub sin cache y 7 por Home cuando los quotes (60 s) vencieron. Ver "Presupuesto de llamadas" de F06 en 02-backend. Si el proveedor llega a su limite, las tarjetas muestran "No disponible" y la Home no se rompe.

### Tests (Vitest, sin red ni Supabase real)

Mocks: `@/lib/api` (espiar `api.me` y `api.stock`), `@/lib/supabase/server` (`getServerAccessToken` → `"tok"`), `next/form` (como en F03). Los Server Components async se prueban como en F03: `render(await Componente(props))`. Para los que anidan componentes async (`MarketToday`, `ProfileIdeas`, `page.tsx`), se mockea `@/components/home/QuoteCard` con un fake sincrono que renderiza `<div data-testid="quote-card" data-symbol data-show-company>`. `react` `cache` se usa tal cual; cada test llama a `vi.resetModules()` o mockea `@/lib/me` para que no se arrastre el valor entre tests.

| Archivo | Casos |
|---|---|
| `lib/home.test.ts` | `ideasFor("conservador")` → `["KO","JNJ","PG","VTI"]`; `"moderado"` → `["AAPL","MSFT","V","QQQ"]`; `"agresivo"` → `["NVDA","TSLA","AMD","META"]`; `null` → lista de moderado. `MARKET_INDEXES` son SPY/S&P 500, QQQ/Nasdaq 100 y DIA/Dow Jones, en ese orden. |
| `lib/me.test.ts` | Llama `api.me` con `{ token: "tok" }` y devuelve el `Me`. Si `api.me` rechaza (`ApiError` o `Error`) → `null`, sin lanzar. |
| `components/stocks/Trend.test.tsx` | `up` → svg sin `rotate-180` y "Sube" en `sr-only`; `up={false}` → `rotate-180` y "Baja". `changeTone`: `2.31` → `text-up`, `-1.05` → `text-down`, `0` y `null` → `text-muted`. |
| `components/stocks/StockOverview.test.tsx` (sin cambios) | Debe seguir pasando igual: es la prueba de que la extraccion de `Trend` no cambio `StockHeader` (`text-up` + "Sube", `text-down` + "Baja"). |
| `components/stocks/PopularSymbols.test.tsx` | `nav` con nombre "Populares"; 7 enlaces en orden AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, SPY, cada uno a `/stocks/{S}`. |
| `components/home/Greeting.test.tsx` (`@/lib/me` mockeado) | `Me` moderado con `displayName: "Ana"` y `riskScore: 15` → `h1` "Hola, Ana", badge "Moderado", la descripcion de moderado, "Puntaje 15 de 24" y un enlace "Rehacer cuestionario" a `/onboarding`. `getMe` → `null` → `h1` "Hola", sin "Moderado"/"Conservador"/"Agresivo", sin "Rehacer cuestionario" y sin `role="alert"`. `riskProfile: null` → "Hola, Ana" sin badge ni puntaje. `displayName: ""` → `h1` "Hola" y, aun asi, badge "Moderado", la descripcion, "Puntaje 15 de 24" y el enlace "Rehacer cuestionario" a `/onboarding`. |
| `components/home/QuoteCard.test.tsx` | `api.stock` llamado con `("SPY", { token: "tok" })`. Con `name="S&P 500"`: enlace a `/stocks/SPY` que contiene "S&P 500", "SPY", "$189.84" y "+2.31 (+1.23%)" con `text-up` y "Sube". Cambio negativo → `text-down` y "Baja". `change: 0` o `null` → `text-muted` sin "Sube"/"Baja". `showCompany` con `profile.logoUrl` → `img` con ese `src` y 32 px, y el titulo es `profile.name`. `showCompany` con `profile: null` → titulo = simbolo y sin `img`. `api.stock` rechaza con `ApiError` 503, con 404 `SYMBOL_NOT_FOUND` y con `Error` generico → "No disponible" con `text-muted`, sin `role="alert"`, sin lanzar. `QuoteCardSkeleton` tiene "Cargando…" para lectores. |
| `components/home/MarketToday.test.tsx` (QuoteCard mockeado) | `h2` "Mercado hoy"; 3 tarjetas con `data-symbol` SPY, QQQ y DIA en orden y `name` S&P 500, Nasdaq 100 y Dow Jones. |
| `components/home/ProfileIdeas.test.tsx` (QuoteCard y `@/lib/me` mockeados) | `agresivo` → tarjetas NVDA, TSLA, AMD, META con `showCompany` y el subtitulo "Selección de ejemplo según tu perfil Agresivo. No es recomendación de inversión."; `conservador` → KO, JNJ, PG, VTI; `riskProfile: null` → AAPL, MSFT, V, QQQ con "Selección de ejemplo. No es recomendación de inversión."; `getMe` → `null` → lista de moderado y el mismo subtitulo, sin `role="alert"`. |
| `components/home/ComingSoon.test.tsx` | `h2` "Próximamente"; textos Favoritos, Noticias y Simulador con su descripcion; 3 badges "Próximamente"; `queryAllByRole("link")` y `queryAllByRole("button")` vacios. |
| `app/(app)/page.test.tsx` (reescribir: el placeholder desaparece) | Con `Greeting`, `ProfileIdeas` y `QuoteCard` mockeados: hay un `role="search"` con `action="/search"` y un input `name="q"` vacio; el `nav` "Populares"; los `h2` "Mercado hoy" y "Próximamente". `metadata.title` es `"Home · Stock Insights"`. |

### Criterios de aceptacion

- [ ] `pnpm --filter web build`, `lint` y `test` pasan. El build no falla por leer cookies fuera de `<Suspense>`.
- [ ] El HTML de `/` ya trae el buscador, Populares y Próximamente aunque el API tarde (shell estatico); cada tarjeta llega por streaming.
- [ ] Una tarjeta que falla no afecta a las demas ni al saludo.
- [ ] `StockHeader` se ve igual que antes en `/stocks/AAPL`.
- [ ] Ningun `fetch` al API fuera de `lib/api.ts`; ningun `"use client"` nuevo.
- [ ] A 375 px: sin scroll horizontal, mercado en 1 columna e ideas en 1 columna; modo claro y oscuro.

### Pasos manuales pendientes

Anotar en `PRUEBAS-MANUALES.md` (en local y en la app desplegada, con sesion y onboarding hecho):

1. Abrir `/`: "Hola, {tu nombre}", badge con tu perfil, su descripcion, "Puntaje n de 24" y "Rehacer cuestionario" (abre `/onboarding`).
2. Escribir "apple" en el buscador de la Home y pulsar "Buscar" → `/search?q=apple`. Cada chip de "Populares" abre su ficha.
3. "Mercado hoy": S&P 500 (SPY), Nasdaq 100 (QQQ) y Dow Jones (DIA) con precio y cambio en verde o rojo con triangulo. Clic → abre la ficha. Al recargar, los esqueletos tienen el mismo tamaño que las tarjetas (sin saltos).
4. "Ideas para tu perfil": 4 tarjetas con logo y nombre de empresa segun tu perfil, y el subtitulo con "No es recomendación de inversión.". Rehacer el cuestionario con otro resultado y volver: la lista cambia (conservador KO, JNJ, PG, VTI; moderado AAPL, MSFT, V, QQQ; agresivo NVDA, TSLA, AMD, META).
5. "Próximamente": Favoritos, Noticias y Simulador sin enlaces (el cursor no cambia y Tab no las enfoca).
6. Con el API apagado: la Home carga, el saludo dice solo "Hola", las tarjetas dicen "No disponible" y el buscador, Populares y Próximamente siguen funcionando.
7. `/stocks/AAPL`: el triangulo y los colores del cambio se ven igual que antes de F06.
8. A 375 px y solo con teclado: todo usable, foco visible, sin scroll horizontal; repetir en modo oscuro.

---

## F15 — Documentacion OpenAPI (Swagger) del API

**Estatus:** ready

F15 no cambia el web: `/docs` y `/openapi.json` viven en el API (ver 02-backend). El web sigue usando solo `lib/api.ts`.

---

## F16 — Pagina de busqueda enriquecida

**Estatus:** ready

### Que se ve con y sin `q` (comportamiento actual verificado en `SearchResults.tsx`)

Hoy `SearchResults` siempre renderiza `SearchForm q={q}` y debajo un `body`: sin `q` → `EmptyState` "Busca una empresa o ETF"; con `q` y error → `ErrorState`; con `q` y `[]` → `EmptyState` "Sin resultados para «q»"; con resultados → "{n} resultados para «q»" + `ResultList`.

| Bloque | `/search` (sin `q` o `q` vacio) | `/search?q=texto` |
|---|---|---|
| `SearchForm` | si (vacio) | si (con `texto`) |
| `SearchHint` (linea de ayuda) | si | si |
| `EmptyState` "Busca una empresa o ETF" | **se elimina** | — |
| Resultados / "Sin resultados para «texto»" / `ErrorState` | — | si, sin cambios |
| `SearchDiscovery` (recientes, populares, indices, sectores) | si | no |

### Requisitos

1. `SearchResults` DEBE renderizar `<SearchForm q={q} />` seguido de `<SearchHint />` en todos los casos. Sin `q`, el `body` DEBE ser `<SearchDiscovery />` en lugar del `EmptyState`; con `q`, el `body` no cambia.
2. `SearchHint` DEBE ser un `<p className="text-sm text-muted">` con el texto exacto "Busca por nombre (Apple) o por símbolo (AAPL). Solo acciones y ETFs de EE. UU.". Se exporta de `SearchResults.tsx` y el fallback de `search/page.tsx` lo monta debajo de `SearchForm`, para que el texto no salte al resolver el `Suspense`. La Home (F06) no lo monta.
3. `SearchDiscovery` DEBE componer, en orden: `<RecentSymbols />`, `<PopularSymbols />`, `<MarketToday title="Índices de referencia" />` y `<SectorExplorer />`.
4. `MarketToday` DEBE aceptar `title?: string` (por defecto "Mercado hoy") y usarlo en su `h2`. La Home no pasa la prop y se ve igual. El `id="market-today"` del `h2` se mantiene: cada pagina monta un solo `MarketToday`, asi que el id es unico por pagina.
5. `StockOverview` DEBE montar `<TrackRecentSymbol symbol={data.symbol} />` solo en el camino feliz (despues de que `api.stock` respondio). En `SymbolNotFound` (simbolo invalido o 404/400) y en `ErrorState` no se monta.
6. `RecentSymbols` y `TrackRecentSymbol` DEBEN leer y escribir `localStorage` solo dentro de `useEffect` o de un handler, cada acceso en `try/catch`. El HTML del servidor y el primer render del cliente de `RecentSymbols` son `null`: sin errores de hidratacion.
7. `SectorExplorer` NO DEBE importar `@/lib/api` ni leer la sesion: es sincrono, sin `<Suspense>`, y su HTML va en el shell.
8. Ninguna llamada al API fuera de `lib/api.ts`; sin `"use cache"`; los unicos `"use client"` nuevos son `RecentSymbols` y `TrackRecentSymbol`.

### Dependencias nuevas (`web/`)

Ninguna. Variables de entorno: ninguna nueva.

### Estructura de archivos

```
web/src/
├── app/(app)/search/page.tsx            # fallback: SearchForm + SearchHint + LoadingState
├── components/
│   ├── home/
│   │   └── MarketToday.tsx              # + prop title (default "Mercado hoy")
│   └── stocks/
│       ├── SearchResults.tsx            # + SearchHint; sin q → <SearchDiscovery/>
│       ├── SearchDiscovery.tsx          # Server: los 4 bloques en orden
│       ├── RecentSymbols.tsx            # "use client": chips desde localStorage + "Borrar"
│       ├── TrackRecentSymbol.tsx        # "use client": render null, guarda el simbolo en useEffect
│       ├── SectorExplorer.tsx           # Server sincrono: tarjetas por sector, sin API
│       ├── PopularSymbols.tsx           # exporta SYMBOL_CHIP_CLASS (la clase de sus chips)
│       └── StockOverview.tsx            # + <TrackRecentSymbol/> en el camino feliz
└── lib/
    ├── recent.ts                        # RECENT_KEY, RECENT_MAX, addRecent, parseRecent (puras)
    └── sectors.ts                       # SECTORS (catalogo estatico)
```

### Frontera Server / Client

| Componente | Tipo | Por que |
|---|---|---|
| `SearchDiscovery`, `SectorExplorer`, `MarketToday` | Server | Sin estado ni eventos. `SectorExplorer` es HTML estatico. |
| `RecentSymbols` | Client | `localStorage` solo existe en el navegador y "Borrar" es un evento. |
| `TrackRecentSymbol` | Client | Escribe `localStorage` al montar la ficha. No renderiza nada: no agrega HTML ni hidrata markup. |

`SearchDiscovery` vive dentro del `<Suspense>` que ya envuelve `SearchResults` (lee `searchParams`). Las `QuoteCard` de `MarketToday` leen el token dentro de su propio `<Suspense>` (F06), asi que no hay cookies fuera de un boundary.

### Composicion de `SearchDiscovery` (Server)

```tsx
export function SearchDiscovery() {
  // <div className="flex flex-col gap-10">
  //   <RecentSymbols />
  //   <PopularSymbols />
  //   <MarketToday title="Índices de referencia" />
  //   <SectorExplorer />
  // </div>
}
```

Cada bloque falla solo: `RecentSymbols` atrapa todo error de storage y devuelve `null`; cada `QuoteCard` ya muestra "No disponible" (F06); `PopularSymbols` y `SectorExplorer` no tienen datos que fallen.

### `lib/recent.ts` (funciones puras, sin `window`)

```ts
export const RECENT_KEY = "si:recent-symbols";
export const RECENT_MAX = 8;

/** Pone `symbol` al frente, sin duplicados, y corta a `max`. Un simbolo invalido devuelve la lista igual. */
export function addRecent(list: readonly string[], symbol: string, max = RECENT_MAX): string[];

/** JSON de localStorage → simbolos validos. Nunca lanza. */
export function parseRecent(raw: string | null): string[];
```

- `addRecent`: `s = normalizeSymbol(symbol)`; si es `null` → `[...list]`. Si no → `[s, ...list.filter(x => x !== s)].slice(0, max)`.
- `parseRecent`: `null` o JSON invalido → `[]`. Si lo parseado no es un arreglo → `[]`. De un arreglo se quedan solo los `string` que pasan `normalizeSymbol` (normalizados), sin duplicados (queda la primera aparicion) y cortado a `RECENT_MAX`.

### `TrackRecentSymbol` (`"use client"`)

```tsx
export function TrackRecentSymbol({ symbol }: { symbol: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(addRecent(parseRecent(localStorage.getItem(RECENT_KEY)), symbol)));
    } catch {
      // storage bloqueado o lleno: los recientes son opcionales
    }
  }, [symbol]);
  return null;
}
```

Idempotente: el doble `useEffect` de Strict Mode en desarrollo deja la misma lista.

### `RecentSymbols` (`"use client"`)

- Estado `symbols: string[]`, inicial `[]`. En `useEffect(() => …, [])`: `try { setSymbols(parseRecent(localStorage.getItem(RECENT_KEY))) } catch {}`. Si la regla `react-hooks/set-state-in-effect` lo marca, se permite un `eslint-disable-next-line` con el motivo "lee un sistema externo (localStorage) solo despues de hidratar".
- `symbols.length === 0` → `return null`.
- Markup, con la misma forma que `PopularSymbols`:
  - `<nav aria-label="Vistos recientemente" className="flex flex-wrap items-center gap-x-3 gap-y-2">`.
  - `<span className="text-sm text-muted">Vistos recientemente</span>`.
  - `<ul className="flex flex-wrap gap-2">` con un `<Link href={\`/stocks/${s}\`} className={SYMBOL_CHIP_CLASS}>` por simbolo.
  - `<button type="button" aria-label="Borrar vistos recientemente" className="text-sm text-muted underline-offset-2 hover:underline">Borrar</button>`. El nombre accesible empieza con el texto visible (label-in-name).
- "Borrar": `try { localStorage.removeItem(RECENT_KEY) } catch {}`; luego `setSymbols([])` siempre (si el storage falla, al menos se oculta en esta vista). Como el boton desaparece, el foco pasa a `document.getElementById("search-page-q")?.focus()` para que el usuario de teclado no quede en `body`.
- `SYMBOL_CHIP_CLASS` se exporta de `PopularSymbols.tsx` (la cadena actual de sus chips, sin cambiarla), para que los dos bloques no diverjan.
- La lista no se sincroniza entre pestañas (sin listener de `storage`): se lee al montar.

### `MarketToday` (Server)

```tsx
export function MarketToday({ title = "Mercado hoy" }: { title?: string }) // h2#market-today = {title}
```

Solo cambia el texto del `h2`; la grilla y los `<Suspense>` por tarjeta quedan igual.

### `lib/sectors.ts`

```ts
import type { StockSearchResult } from "./api";

export type SectorEntry = { symbol: string; name: string; type: StockSearchResult["type"] };
export type Sector = { id: string; title: string; entries: readonly SectorEntry[] };

export const SECTORS: readonly Sector[] = [/* ... */];
```

| `id` | `title` | Entradas (`symbol` — `name`), en orden |
|---|---|---|
| `tech` | Tecnología | AAPL — Apple; MSFT — Microsoft; NVDA — NVIDIA; GOOGL — Alphabet; META — Meta Platforms |
| `finance` | Finanzas | JPM — JPMorgan Chase; V — Visa; MA — Mastercard; BAC — Bank of America; GS — Goldman Sachs |
| `health` | Salud | JNJ — Johnson & Johnson; UNH — UnitedHealth; LLY — Eli Lilly; PFE — Pfizer; ABBV — AbbVie |
| `consumer` | Consumo | KO — Coca-Cola; PG — Procter & Gamble; WMT — Walmart; MCD — McDonald's; NKE — Nike |
| `energy` | Energía | XOM — Exxon Mobil; CVX — Chevron; COP — ConocoPhillips |
| `etf` | ETFs | SPY — SPDR S&P 500 ETF Trust; QQQ — Invesco QQQ Trust; DIA — SPDR Dow Jones Industrial Average ETF Trust; VTI — Vanguard Total Stock Market ETF; VOO — Vanguard S&P 500 ETF |

Las entradas de `etf` llevan `type: "etf"`; las demas, `"stock"`. Total: 28 filas. El `id` solo sirve para `key`.

### `SectorExplorer` (Server, sincrono)

- **Decision: tarjetas simples, sin `<details>`.** `<summary>` se expone como un control (rol tipo boton) y en varios lectores de pantalla sus hijos pierden la semantica: un `<h3>` dentro de `<summary>` deja de aparecer en la navegacion por encabezados. Como el pedido era usar `<details>` solo si seguia accesible, y las 6 tarjetas caben abiertas, se usan tarjetas con `h3` real.
- `<section aria-labelledby="sector-explorer" className="flex flex-col gap-4">` con `<h2 id="sector-explorer" className="text-lg font-semibold tracking-tight">Explorar por sector</h2>` (mismo estilo que el `h2` de `MarketToday`).
- Grilla `grid gap-3 md:grid-cols-2` (1 columna en movil, 2 en escritorio). Cada sector es un `<div className="rounded-lg border border-border bg-surface">` (sin `aria-labelledby`: no esta permitido en un `div` sin rol; el `h3` ya da la estructura) con:
  - `<h3 className="px-4 pt-3 pb-2 text-sm font-semibold">{title}</h3>`.
  - `<ul className="divide-y divide-border">` con un `<li>` por entrada. Cada fila es un `<Link href={\`/stocks/${symbol}\`}>` con las clases de fila de `ResultList` (`flex min-h-12 items-center gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-border/40 focus-visible:-outline-offset-2`):
    - `<span className="w-16 shrink-0 font-semibold">{symbol}</span>`;
    - `<span className="min-w-0 flex-1 truncate text-muted">{name}</span>`;
    - `<TypeBadge type={type} />`.
- Debajo de la grilla: `<p className="text-sm text-muted">Lista de ejemplo para explorar; no es recomendación de inversión.</p>`.
- El nombre en `truncate` evita scroll horizontal a 375 px.

### Costo en el proveedor

Solo "Índices de referencia" llama al API: 3 `GET /stocks/:symbol` con los mismos simbolos y keys de cache que la Home (ver 02-backend, F16). Recientes y sectores: 0 llamadas.

### Tests (Vitest, sin red ni Supabase real)

Mocks: los de F06 (`@/lib/api`, `@/lib/supabase/server`, `next/form` y el fake sincrono de `@/components/home/QuoteCard`). `localStorage` es el de jsdom: se limpia en `beforeEach` (`localStorage.clear()`), y para simular fallas se usa `vi.spyOn(Storage.prototype, "getItem" | "setItem" | "removeItem").mockImplementation(() => { throw new Error("blocked") })`, restaurado en `afterEach`.

| Archivo | Casos |
|---|---|
| `lib/recent.test.ts` | `addRecent([], "aapl")` → `["AAPL"]`. `addRecent(["NVDA","AAPL"], "AAPL")` → `["AAPL","NVDA"]` (sin duplicado, al frente). Con 8 elementos, agregar uno nuevo → 8 y se cae el ultimo. `max` personalizado (`3`) respeta el corte. Simbolo invalido (`"AAPL1"`, `""`) → la lista igual y una copia (no la misma referencia). `parseRecent(null)` → `[]`; `"no-json"` → `[]`; `"{}"`, `"42"`, `"\"AAPL\""`, `"null"` (no arreglos) → `[]`; `'["aapl", 3, null, "BAD!", "NVDA", "AAPL"]'` → `["AAPL","NVDA"]`; un arreglo de 12 validos → los primeros 8. `RECENT_KEY` es `"si:recent-symbols"`. |
| `lib/sectors.test.ts` | 6 sectores con titulos Tecnología, Finanzas, Salud, Consumo, Energía y ETFs, en orden. 28 entradas en total con los simbolos de la tabla en orden. Cada `symbol` cumple `normalizeSymbol(symbol) === symbol`. Ningun sector repite un simbolo. Cada `name` no esta vacio. Los 5 del sector ETFs tienen `type: "etf"` y todos los demas `"stock"`. Los `id` son unicos. |
| `components/stocks/RecentSymbols.test.tsx` | Con `localStorage` `'["AAPL","NVDA"]'`: tras el efecto (`findByRole`), `nav` "Vistos recientemente" con enlaces AAPL y NVDA en orden a `/stocks/{S}`. Storage vacio → `container` vacio. Storage con basura (`"{oops"`) → vacio. `getItem` lanza → vacio y sin excepcion. Clic en "Borrar" → `localStorage.getItem(RECENT_KEY)` es `null`, el `nav` desaparece y el foco va al input `#search-page-q` (renderizado en el test). `removeItem` lanza → el `nav` igual desaparece. |
| `components/stocks/TrackRecentSymbol.test.tsx` | Con storage `'["NVDA"]'`, `render(<TrackRecentSymbol symbol="AAPL" />)` → storage `'["AAPL","NVDA"]'` y `container` vacio. Montar con `"NVDA"` despues → `'["NVDA","AAPL"]'`. `setItem` lanza → no lanza. `getItem` lanza → no lanza. |
| `components/stocks/StockOverview.test.tsx` (actualizar) | Mockear `./TrackRecentSymbol` con `({ symbol }) => <div data-testid="track" data-symbol={symbol} />`. Respuesta OK de AAPL → un `track` con `data-symbol="AAPL"`. 404 `SYMBOL_NOT_FOUND`, `"AAPL1"` (invalido) y `PROVIDER_ERROR` → sin `track`. Los casos existentes no cambian. |
| `components/home/MarketToday.test.tsx` (actualizar) | Sin props → `h2` "Mercado hoy" (caso actual). `title="Índices de referencia"` → `h2` con ese texto, `getByRole("region", { name: "Índices de referencia" })` existe y las 3 tarjetas siguen siendo SPY, QQQ y DIA. |
| `components/stocks/SectorExplorer.test.tsx` | `h2` "Explorar por sector"; 6 `h3` con los titulos en orden; 28 enlaces, p. ej. "AAPL … Apple" a `/stocks/AAPL` y "VOO … Vanguard S&P 500 ETF" a `/stocks/VOO`; 5 badges "ETF" y 23 "Acción"; la nota "Lista de ejemplo para explorar; no es recomendación de inversión."; ninguna funcion de `api` fue llamada. |
| `components/stocks/SearchDiscovery.test.tsx` (QuoteCard mockeado; `RecentSymbols` mockeado con un `<nav aria-label="Vistos recientemente">`) | Orden en el DOM (`compareDocumentPosition`): "Vistos recientemente", `nav` "Populares", `h2` "Índices de referencia", `h2` "Explorar por sector". No hay `h2` "Mercado hoy". |
| `components/stocks/SearchResults.test.tsx` (actualizar; `./SearchDiscovery` mockeado con `<div data-testid="discovery" />`) | Sin `q`: la linea de ayuda exacta, `discovery` presente, sin "Busca una empresa o ETF" y sin llamada al API. Con `q: "apple"`: la linea de ayuda, los resultados como antes y sin `discovery`. Con `q` y `[]` → "Sin resultados para «zzz»" sin `discovery`. Con `ApiError` → `role="alert"` sin `discovery`. Los demas casos existentes no cambian. |
| `app/(app)/page.test.tsx` (Home, sin cambios) | Sigue pasando: `h2` "Mercado hoy" y sin la linea de ayuda de `/search`. |

### Criterios de aceptacion

- [ ] `pnpm --filter web build`, `lint` y `test` pasan. Sin errores de hidratacion en la consola al abrir `/search` con recientes guardados.
- [ ] El HTML de `/search` (ver codigo fuente) ya trae la linea de ayuda, "Populares" y "Explorar por sector"; "Vistos recientemente" no viene en el HTML (aparece despues de hidratar).
- [ ] `SectorExplorer` no importa `@/lib/api`; ningun `fetch` al API fuera de `lib/api.ts`; solo `RecentSymbols` y `TrackRecentSymbol` son `"use client"` nuevos.
- [ ] La Home se ve igual ("Mercado hoy").
- [ ] A 375 px: sectores en 1 columna, nombres truncados y sin scroll horizontal; en escritorio, 2 columnas. Modo claro y oscuro.

### Pasos manuales pendientes

Anotar en `PRUEBAS-MANUALES.md` (en local y en la app desplegada, con sesion):

1. Abrir `/search` sin `q` con el almacenamiento del sitio limpio (DevTools > Application > Local Storage): buscador, la linea "Busca por nombre (Apple) o por símbolo (AAPL). Solo acciones y ETFs de EE. UU.", "Populares", "Índices de referencia" (SPY, QQQ, DIA) y "Explorar por sector". No aparece "Vistos recientemente" ni "Busca una empresa o ETF".
2. Abrir `/stocks/AAPL`, luego `/stocks/NVDA`, luego `/stocks/AAPL` y volver a `/search`: "Vistos recientemente" muestra AAPL, NVDA en ese orden. En Local Storage, `si:recent-symbols` vale `["AAPL","NVDA"]`.
3. Abrir `/stocks/ZZZZZ` y volver a `/search`: ZZZZZ no aparece en recientes.
4. Abrir 9 fichas distintas: solo quedan las ultimas 8, la mas reciente primero.
5. Pulsar "Borrar" (con teclado: Tab + Enter): el bloque desaparece y el foco queda en el buscador. Recargar: sigue sin aparecer.
6. En Local Storage poner `si:recent-symbols` = `hola` y recargar `/search`: la pagina carga sin el bloque y sin errores en la consola.
7. Buscar "apple": se ven la linea de ayuda y los resultados como antes, sin recientes, populares, indices ni sectores.
8. "Explorar por sector": 6 tarjetas (Tecnología, Finanzas, Salud, Consumo, Energía, ETFs); cada fila abre su ficha; los ETFs dicen "ETF" y el resto "Acción"; debajo la nota "Lista de ejemplo para explorar; no es recomendación de inversión.". En DevTools > Network no hay peticiones al API por este bloque.
9. Abrir `/`: el bloque sigue diciendo "Mercado hoy".
10. Con el API apagado: `/search` carga, las tarjetas de indices dicen "No disponible" y recientes, populares y sectores funcionan.
11. A 375 px y en escritorio, modo claro y oscuro, solo con teclado: sin scroll horizontal, foco visible, sectores en 1 y 2 columnas.
