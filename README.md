# Stock Insights

App web para consultar información financiera de acciones y ETFs de EE. UU., con una experiencia personalizada según tu perfil de riesgo.

- **web/**: Next.js 16 (App Router) + TypeScript + Tailwind 4
- **api/**: Express 5 + TypeScript (desplegable en Vercel como serverless)
- **Base de datos y auth**: Supabase (Postgres + Supabase Auth)
- **Datos de mercado**: Finnhub (quotes, perfiles, búsqueda) y Twelve Data (histórico)

## Requisitos

- [Node.js](https://nodejs.org) 22 o superior
- [pnpm](https://pnpm.io) 11 (con Corepack: `corepack enable`)
- Una cuenta de [Supabase](https://supabase.com) (el plan gratuito basta)
- API keys gratuitas de [Finnhub](https://finnhub.io) y [Twelve Data](https://twelvedata.com)

## 1. Clonar e instalar

```bash
git clone https://github.com/jimeneab/broker-app.git
cd broker-app
pnpm install
```

## 2. Configurar Supabase

1. Crea un proyecto en Supabase.
2. Aplica las migraciones de `supabase/migrations/` **en orden** (el nombre empieza con la fecha). Elige una opción:
   - **SQL Editor:** abre cada archivo, pega su contenido y ejecútalo, del más antiguo al más nuevo.
   - **Supabase CLI:**
     ```bash
     npx supabase link --project-ref <tu-project-ref>
     npx supabase db push
     ```
3. En **Authentication > Providers > Email**, deja Email habilitado y **desactiva "Confirm email"** para que el registro sea inmediato.
4. En **Project Settings > API** copia la URL del proyecto, la `anon key` y la `service_role key`.

## 3. Variables de entorno

Copia los ejemplos y llena los valores:

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env.local
```

**`api/.env`**

| Variable | Valor |
|---|---|
| `PORT` | `4000` |
| `CORS_ORIGIN` | `http://localhost:3000` |
| `SUPABASE_URL` | URL del proyecto de Supabase |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (secreta, solo servidor) |
| `FINNHUB_API_KEY` | tu key de Finnhub |
| `TWELVEDATA_API_KEY` | tu key de Twelve Data |
| `SUPABASE_JWT_SECRET` | *Opcional.* Solo si tu proyecto aún firma JWTs con el secreto legacy HS256 |

**`web/.env.local`**

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |

Las variables se validan al arrancar: si falta alguna, el API o el web no inician y el error dice cuál.

> Nunca subas `api/.env` ni `web/.env.local`: ya están en `.gitignore`.

## 4. Correr en local

```bash
pnpm dev
```

- Web: http://localhost:3000. Crea una cuenta en `/signup`, responde el cuestionario de perfil de riesgo y entrarás a la Home.
- API: http://localhost:4000. Comprueba que responde en `/health`.
- Documentación del API (Swagger): http://localhost:4000/docs. Usa **Authorize** con el JWT de tu sesión para probar los endpoints protegidos.

Para levantar solo una parte:

```bash
pnpm dev:api   # solo el API
pnpm dev:web   # solo el frontend
```

## Otros comandos

```bash
pnpm test    # tests de api y web (Vitest)
pnpm lint    # tsc --noEmit (api) + eslint (web)
pnpm build   # build de producción de ambos
```

## Estructura

```
broker-app/
├── api/                  # Express: routes → controllers → services → providers / repositories
├── web/                  # Next.js App Router
├── supabase/migrations/  # Migraciones SQL
└── prompts/              # Specs, agentes y logs de sesión (desarrollo con IA)
```

Más detalle en [AGENTS.md](AGENTS.md) y en el plan de features en [PLAN.md](PLAN.md).

## Despliegue (Vercel)

El repo se despliega como dos proyectos de Vercel:

- **API:** Root Directory `api/`, con las variables de `api/.env`. `CORS_ORIGIN` debe ser la URL del web.
- **Web:** Root Directory `web/`, con las variables de `web/.env.local`. `NEXT_PUBLIC_API_URL` debe ser la URL del API.
