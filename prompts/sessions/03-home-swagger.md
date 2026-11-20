# Session 03 — Home (F06) y Swagger (F15)

**Date:** 2026-11-20
**Goal:** Construir la Home redefinida por el dueño y documentar el API con OpenAPI/Swagger.

## Prompts
### 1. Home y Swagger
> Hola hoy vamos a continuar con algunas cosas:
> 1. Saludo y perfil — "Hola, {displayName}", badge del perfil, descripcion, puntaje, enlace "Rehacer cuestionario"; si `/me` falla, solo "Hola".
> 2. Buscador grande — reutiliza `SearchForm` con `q=""` y chips "Populares".
> 3. Mercado hoy: SPY, QQQ y DIA — 3 tarjetas con precio, cambio y triangulo; cada una en su Suspense; si falla, "No disponible".
> 4. Ideas para tu perfil — 4 tarjetas con lista estatica por perfil (conservador KO/JNJ/PG/VTI, moderado AAPL/MSFT/V/QQQ, agresivo NVDA/TSLA/AMD/META), logo y nombre; comentario de F07.
> 5. Proximamente — Favoritos, Noticias, Simulador, no clicables.
> 6. Backend — Ayudame a crear el swagger para los endpoints

**Outcome:** Flujo SDD con agentes: leader → spec_author (F06 + F15) → dos implementers en paralelo (web/ y api/) → reviewer por feature.
- F15: `api/src/docs/openapi.ts` (OpenAPI 3.1, 6 endpoints), `GET /openapi.json` y `GET /docs` (Swagger UI 5.17.14 por CDN con SRI), publicos. Test que compara rutas del router contra `paths` en ambos sentidos. Reviewer: **ready**.
- F06: Home en `web/src/app/(app)/page.tsx` con `components/home/*`, `Trend` y `PopularSymbols` compartidos, `lib/home.ts` y `lib/me.ts` (`getMe` con React `cache()`). Reviewer: **rejected** (con `displayName` vacio se ocultaba el bloque del perfil; la spec 03-frontend lo decia en contra del dueño) → corregido spec + codigo + test → **ready**.
- Verificacion final del leader: `pnpm lint` ok; `pnpm test` api 163 / web 186 en verde.

## Decisions
- F06 deja de depender de F04/F05: sin favoritos ni noticias (van en "Proximamente").
- Sin endpoint `GET /market/overview`: cada tarjeta llama al `GET /stocks/:symbol` existente (quote + logo), una por Suspense, asi cada una falla sola. Costo aceptado: hasta 21 llamadas a Finnhub con cache fria, 7 con cache caliente.
- Chips "Populares": lista estatica AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, SPY (el texto del dueño mencionaba un componente que no venia en el pegado).
- Sin perfil: subtitulo "Selección de ejemplo. No es recomendación de inversión." y sin badge ni "Rehacer cuestionario".
- Swagger sin dependencias npm (UI por CDN con version fija y SRI) para que funcione en Vercel serverless.

## Follow-ups
- [ ] Pruebas manuales de F06 y F15 en `PRUEBAS-MANUALES.md` (navegador, 375 px, modo oscuro, Authorize en `/docs`).
- [ ] Cada feature nueva debe agregar sus endpoints a `api/src/docs/openapi.ts` (el test de drift lo exige).
- [ ] Commit y deploy de F06 + F15.

## Prompts (continuacion)
### 2. Pagina de busqueda enriquecida (F16)
> Vamos a hacer tambien esto para la pagina de busqueda:
> 1. Buscador + linea de ayuda; quitar el EmptyState.
> 2. Vistos recientemente (`RecentSymbols`, localStorage `si:recent-symbols`, 8 max, `TrackRecentSymbol` en StockOverview solo en exito, boton "Borrar", logica pura en `lib/recent.ts`).
> 3. Populares.
> 4. Indices de referencia (`MarketToday` con prop `title`).
> 5. Explorar por sector (`SectorExplorer`, catalogo estatico en `lib/sectors.ts`, sin llamadas al API).

**Outcome:** spec_author → implementer → reviewer: **ready** a la primera. Web 39 archivos / 211 tests.

## Decisions (F16)
- Los bloques reemplazan el estado vacio solo en `/search` sin `q`; con `q` todo queda como en F03. La linea de ayuda se ve siempre.
- Sectores como tarjetas con `h3`, no `<details>` (un heading dentro de `<summary>` pierde semantica en varios lectores de pantalla).
- `SearchDiscovery` agrupa los 4 bloques; `SYMBOL_CHIP_CLASS` compartido entre Populares y Recientes.
- Recientes son por navegador, no por usuario: cerrar sesion no los borra (solo "Borrar").

## Follow-ups (F16)
- [ ] Pruebas manuales F16 en `PRUEBAS-MANUALES.md` (hidratacion en consola, 375 px, modo oscuro).
- [ ] Opcional: `parseRecent` podria cortar el recorrido al llegar a 8 (solo importa con storage corrupto enorme).
