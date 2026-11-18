# Pruebas manuales

## Sesion 01 — Setup

1. `pnpm install` en la raiz termina sin errores.
2. Copia `api/.env.example` a `api/.env` y `web/.env.example` a `web/.env.local`.
3. `pnpm dev` levanta ambos proyectos.
4. Abre http://localhost:3000 → se ve el titulo "Stock Insights".
5. Abre http://localhost:4000/health → responde `{"status":"ok"}`.
6. Abre http://localhost:4000/no-existe → responde 404 con `{"error":{"code":"NOT_FOUND","message":"Route GET /no-existe not found"}}`.
7. `pnpm test`, `pnpm lint` y `pnpm build` terminan sin errores.
