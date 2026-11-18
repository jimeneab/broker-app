## Mapa del repositorio

```
broker-app/
├── AGENTS.md                 # Este archivo: mapa del repo y flujo de trabajo
├── CLAUDE.md                 # Importa prompts/system/CLAUDE.md y rules.md
├── PLAN.md                   # Lista de features y su estatus (SDD)
├── PRUEBAS-MANUALES.md       # Pruebas manuales a ejecutar al final de cada sesion
├── package.json              # Scripts raiz: dev, dev:api, dev:web, build, lint, test
├── pnpm-workspace.yaml       # Workspaces (api, web) y builds permitidos
│
├── api/                      # Backend: Express 5 + TypeScript (ESM), Vercel serverless
│   ├── .env.example          # Variables de entorno del API
│   └── src/
│       ├── server.ts         # Entrypoint local (app.listen)
│       ├── app.ts            # Crea la app (cors, json, rutas, 404, errores); export default = entrypoint Vercel
│       ├── app.test.ts       # Tests de integracion con supertest
│       ├── routes/           # Routers de Express, sin logica
│       ├── controllers/      # Validan request (Zod), llaman services, arman respuesta
│       ├── services/         # Logica de negocio (compartida por REST, MCP y chat)
│       ├── providers/        # Adaptadores MarketDataProvider (finnhub, twelvedata)
│       ├── repositories/     # Acceso a datos en Supabase
│       ├── mcp/              # Servidor MCP y tools (llaman services)
│       ├── middlewares/      # auth, errorHandler ({ error: { code, message } }), rate limit
│       └── lib/              # env (Zod), logger, cliente supabase
│
├── web/                      # Frontend: Next.js 16 (App Router) + TypeScript + Tailwind 4
│   ├── AGENTS.md             # Reglas de Next.js (generado por create-next-app)
│   ├── .env.example          # Variables de entorno del frontend
│   ├── vitest.config.mts     # Tests con Vitest + Testing Library (jsdom)
│   └── src/app/              # Rutas del App Router (layout, page, tests junto al archivo)
│
├── supabase/
│   └── migrations/           # Migraciones SQL (una nueva por cambio, nunca editar aplicadas)
│
└── prompts/                  # Documentacion del uso de IA
    ├── agents/               # leader, spec_author, implementer, reviewer
    ├── specs/                # 01-product, 02-backend, 03-frontend
    ├── sessions/             # Log de cada sesion de trabajo
    └── system/               # CLAUDE.md, rules.md, PROGRESO.md
```

## Comandos

```bash
pnpm install      # instala todos los workspaces
pnpm dev          # api (http://localhost:4000) + web (http://localhost:3000)
pnpm test         # vitest en api y web
pnpm lint         # tsc --noEmit (api) + eslint (web)
pnpm build
```

## Flujo de trabajo (SDD)
pending → [spec_author] → in_progress → [implementer] testing → [reviewer] → ready
