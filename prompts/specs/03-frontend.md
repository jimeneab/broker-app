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
