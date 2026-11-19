# Plan de features — Stock Insights

App web para ver informacion financiera de la bolsa (US), con experiencia personalizada segun el perfil de riesgo y las interacciones del usuario.

**Plazo:** 2 dias (2026-11-18 → 2026-11-20). El nucleo (Dia 1) es lo que se evalua sí o sí: ver datos de stocks de forma solida.

**Flujo (SDD):** `pending → [spec_author] → in_progress → [implementer] → testing → [reviewer] → ready` (o `rejected` → vuelve al implementer).

## Resumen

| # | Feature | Bloque | Depende de | Estatus |
|---|---------|--------|-----------|---------|
| F00 | Base: Supabase, providers, cache, layout | Dia 1 | — | ready |
| F01 | Login con JWT | Dia 1 | F00 | ready |
| F02 | Formulario de perfil de riesgo (onboarding) | Dia 1 | F01 | ready |
| F03 | Busqueda y detalle de stock | Dia 1 | F00, F01 | ready |
| F04 | Favoritos | Dia 1 | F03 | pending |
| F05 | Noticias | Dia 1 | F03 | pending |
| F06 | Home | Dia 1 | F04, F05 | pending |
| F07 | Interacciones + carrusel personalizado | Dia 2 | F02, F06 | pending |
| F08 | Analisis tecnico | Dia 2 | F03 | pending |
| F09 | Simulador de trading | Dia 2 | F03 | pending |
| F10 | Analizador de carteras | Si sobra tiempo | F09 | pending |
| F11 | Libertad financiera | Si sobra tiempo | F02 | pending |
| F12 | Learning | Si sobra tiempo | F02 | pending |
| F13 | Chat con Claude | Siguientes pasos | F03, F05, F08 | pending |
| F14 | Servidor MCP | Siguientes pasos | F03, F05, F08 | pending |

## Decisiones transversales

- **Mercado:** solo acciones y ETFs de US (lo que cubre el plan gratuito de Finnhub).
- **Proveedores** (detras de `MarketDataProvider`, los services nunca llaman al vendor directo):
  - Finnhub: `search`, `quote`, `stock/profile2`, `stock/metric` (beta, 52w, P/E, market cap), `company-news`, `news?category=general`.
  - Twelve Data: `time_series` (historico diario). Los indicadores tecnicos se **calculan en el API**, no se piden a Twelve Data (ahorra creditos).
- **Cache** en Supabase (tabla `provider_cache`) con TTL por tipo: quote 60 s, news 15 min, history 12 h, profile/metric 7 dias. Protege los limites gratuitos (Finnhub 60/min, Twelve Data 8/min y 800/dia).
- **Auth en el API:** middleware que verifica el JWT de Supabase con JWKS (`jose`) y deja `req.user = { id, email }`. Todas las rutas excepto `/health` requieren auth.
- **Acceso a datos:** el API crea un cliente de Supabase **con el JWT del usuario**, asi aplica RLS. La `service_role` solo se usa para `provider_cache` y `stock_catalog`.
- **Frontend:** Server Components por defecto; un solo cliente tipado `web/src/lib/api.ts` que adjunta el JWT. Estados de loading, vacio y error en cada vista. Graficas con `lightweight-charts`. Sesion con `@supabase/ssr` y proteccion de rutas en `proxy.ts` (en Next 16 `middleware.ts` se renombro a `proxy.ts`).
- **Layout:** sidebar con: Home, Buscar, Favoritos, Noticias, Simulador, Cartera, Libertad financiera, Learning. Header con buscador y menu de usuario.
- **Errores:** `{ error: { code, message } }` (ya implementado). Errores del proveedor → `502 PROVIDER_ERROR`; rate limit del proveedor → `503 PROVIDER_RATE_LIMITED`.
- **Tests:** cada feature con tests de services (providers mockeados) y endpoints (supertest) en `api/`, y de componentes clave en `web/`. Pruebas manuales en `PRUEBAS-MANUALES.md`.

---

## Dia 1 — Nucleo

### F00 — Base: Supabase, providers, cache, layout
**Objetivo:** dejar la infraestructura que usan todas las features.

- **Base de datos:**
  - Migracion `provider_cache(key text pk, payload jsonb, expires_at timestamptz)`, con RLS activado y sin policies (solo service role).
  - Extension `vector` habilitada.
- **API:**
  - `lib/supabase.ts` con `adminClient()` y `userClient(jwt)`.
  - `lib/env.ts` con las nuevas variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FINNHUB_API_KEY`, `TWELVEDATA_API_KEY`.
  - Interfaz `MarketDataProvider` con los adaptadores `finnhub` y `twelvedata`. Las respuestas se validan con Zod.
  - `services/cache.ts` con `getOrSet(key, ttl, fetcher)`.
- **Web:**
  - Layout con sidebar y header.
  - Tema base con la skill impeccable.
  - `lib/api.ts` (cliente tipado) y `lib/supabase` (clientes server y browser).
- **Aceptacion:**
  - Una segunda llamada dentro del TTL no llega al proveedor (test).
  - Una respuesta invalida del proveedor devuelve `502`.
  - Todo `.env.example` actualizado.

### F01 — Login con JWT
**Objetivo:** que el usuario se registre e inicie sesion; el API solo responde a usuarios autenticados.

- **Auth:** Supabase Auth con email y contrasena. El JWT viaja en `Authorization: Bearer` al API.
- **Base de datos:** `profiles(id uuid pk → auth.users, display_name, risk_score int null, risk_profile text null check in ('conservador','moderado','agresivo'), onboarded_at timestamptz null, created_at)`.
  - Un trigger crea el profile al registrarse.
  - RLS: el usuario solo ve y edita su fila.
- **API:**
  - `middlewares/auth.ts` (JWKS con `jose`).
  - `GET /me` devuelve el profile.
- **Web:**
  - `/login` y `/signup` con validacion Zod.
  - Logout en el menu de usuario.
  - `proxy.ts`: sin sesion redirige a `/login`; con sesion y sin `onboarded_at` redirige a `/onboarding`.
- **Confirmacion de email:** desactivada en Supabase para que el registro sea inmediato en la demo.
- **Aceptacion:**
  - Peticion sin token → `401 UNAUTHORIZED`.
  - Token invalido o expirado → `401`.
  - Signup, login y logout funcionan en la app desplegada.

### F02 — Formulario de perfil de riesgo (onboarding)
**Objetivo:** al abrir su cuenta, el usuario responde un cuestionario y obtiene su perfil de riesgo, que personaliza el resto de la app.

- **Cuestionario:** 6 preguntas de opcion multiple, cada respuesta vale de 1 a 4 puntos.
  - Preguntas:
    1. Horizonte de inversion.
    2. Reaccion ante una caida del 20%.
    3. Objetivo principal.
    4. Experiencia invirtiendo.
    5. Porcentaje del patrimonio que invertiria.
    6. Estabilidad de ingresos.
  - Puntaje total de 6 a 24: hasta 11 = conservador, 12–18 = moderado, 19 o mas = agresivo.
- **API:**
  - `PUT /me/risk-profile` recibe `{ answers: number[6] }`.
  - El service calcula el puntaje y el perfil, y guarda `risk_score`, `risk_profile` y `onboarded_at`.
  - El calculo vive en el servidor: la funcion SQL `submit_risk_profile` (security definer, usa `auth.uid()`) que el service invoca por `rpc`; nunca en el cliente.
- **Web:**
  - `/onboarding`, un wizard de una pregunta por pantalla con barra de progreso.
  - Pantalla final con el perfil y su explicacion.
  - Opcion de rehacer el cuestionario desde el menu de usuario.
- **Aceptacion:**
  - Tests de los limites de puntaje (11/12, 18/19).
  - Respuestas invalidas → `400 VALIDATION_ERROR`.
  - Sin onboarding no se puede entrar a la app.

### F03 — Busqueda y detalle de stock
**Objetivo:** el corazon del reto: buscar una empresa y ver su informacion financiera.

- **API:**
  - `GET /stocks/search?q=` devuelve maximo 10 resultados (symbol, nombre, tipo).
  - `GET /stocks/:symbol` devuelve:
    - quote: precio, cambio, cambio %, high/low del dia, apertura, cierre previo.
    - profile: nombre, logo, sector, pais, web, market cap.
    - metricas: P/E, beta, maximo y minimo de 52 semanas, rendimiento de dividendo.
  - `GET /stocks/:symbol/history?range=1M|6M|1Y|5Y` devuelve velas OHLCV diarias (semanales en 5Y).
  - Simbolo inexistente → `404 SYMBOL_NOT_FOUND`.
- **Web:**
  - Buscador en el header con autocompletado y debounce de 300 ms; Enter lleva a `/search?q=`.
  - `/search?q=` con la lista completa de resultados (simbolo, nombre, tipo) y enlace al detalle; sin `q` muestra el buscador vacio.
  - `/stocks/[symbol]` con:
    - Encabezado: precio y cambio con color.
    - Tarjetas de metricas.
    - Grafica de velas con selector de rango.
    - Tabs: Resumen | Tecnico (F08) | Noticias (F05).
  - SSR del encabezado y las metricas.
- **Aceptacion:**
  - Buscar "apple" muestra AAPL.
  - El detalle carga y el cambio de rango actualiza la grafica.
  - Un simbolo inexistente muestra estado vacio.
  - La cache se usa (test).

### F04 — Favoritos
**Objetivo:** que el usuario guarde stocks para seguirlos.

- **Base de datos:** `favorites(user_id, symbol, created_at, pk(user_id, symbol))` con RLS.
- **API:**
  - `GET /favorites` devuelve la lista con su quote actual.
  - `POST /favorites { symbol }` es idempotente.
  - `DELETE /favorites/:symbol`.
- **Web:**
  - Boton de estrella en el detalle de stock.
  - `/favorites` con tabla de precio, cambio % y acceso al detalle.
  - Estado vacio con CTA para buscar.
- **Aceptacion:**
  - Agregar el mismo simbolo dos veces no duplica.
  - Un usuario no ve los favoritos de otro (RLS).

### F05 — Noticias
**Objetivo:** contexto de mercado general y por empresa.

- **API:**
  - `GET /news?category=general` devuelve las 20 noticias mas recientes.
  - `GET /stocks/:symbol/news` devuelve las noticias de los ultimos 7 dias.
  - Cada noticia: titulo, fuente, fecha, resumen, imagen, url.
- **Web:**
  - `/news` con lista de tarjetas.
  - Tab "Noticias" en el detalle de stock.
  - Los enlaces abren la fuente original en otra pestana.
- **Aceptacion:** loading, vacio y error manejados; las fechas se muestran en hora local.

### F06 — Home
**Objetivo:** al entrar, el usuario ve lo relevante para el.

- **API:** `GET /market/overview` devuelve el quote de SPY, QQQ y DIA (proxies de los indices).
- **Web:** `/` con:
  1. Saludo y perfil de riesgo.
  2. Resumen de mercado (SPY, QQQ, DIA).
  3. Favoritos con su precio; vacio = CTA.
  4. Slot del carrusel personalizado (lo llena F07; mientras, se oculta).
  5. Ultimas 5 noticias.
- **Aceptacion:** cada bloque carga de forma independiente; si uno falla, el resto se muestra.

---

## Dia 2 — Lo que la hace distinta

### F07 — Interacciones + carrusel personalizado
**Objetivo:** guardar lo que hace el usuario y recomendarle stocks en la home.

- **Base de datos:**
  - `interactions(id, user_id, type, symbol null, metadata jsonb, created_at)` con RLS.
    - Tipos: `view_stock`, `favorite`, `unfavorite`, `read_news`, `trade`, `complete_lesson`.
  - `stock_catalog(symbol pk, name, sector, industry, beta, embedding vector(384))`.
    - Universo curado de unos 100 tickers populares de US.
    - Se carga con un script de seed.
  - Funcion SQL `recommend_stocks(user_id, limit)`:
    - Construye el vector del usuario como el promedio ponderado de los embeddings de los simbolos con los que interactuo. Pesos: favorite 3, trade 3, view 1, read_news 1, con decaimiento por antiguedad.
    - Devuelve los vecinos mas cercanos del catalogo.
    - Excluye los favoritos.
    - Filtra por perfil: conservador beta ≤ 1.0, moderado beta ≤ 1.5, agresivo sin limite.
- **Embeddings:**
  - Edge Function `embed` con `gte-small` (384 dimensiones).
  - El texto a embeber es `"{name}. Sector: {sector}. Industry: {industry}"`.
  - El seed llama a la Edge Function.
- **Arranque en frio:** si el usuario tiene menos de 3 interacciones, se devuelven los stocks del catalogo filtrados por su perfil, ordenados por market cap.
- **API:**
  - `POST /interactions { type, symbol?, metadata? }`.
  - `GET /recommendations?limit=10` devuelve symbol, nombre, quote y el motivo ("Porque viste NVDA").
  - Los registros de interacciones se disparan desde los services de F03, F04, F05 y F09 (se agregan a esas features ya terminadas).
  - Registrar una interaccion nunca debe romper la peticion principal: si falla, se loguea y se continua.
  - `read_news` se registra desde la web con `POST /interactions` al abrir la noticia.
- **Web:** carrusel horizontal en la home con tarjetas: logo, nombre, precio, cambio y motivo.
- **Aceptacion:**
  - Tras ver o agregar a favoritos varios stocks de tecnologia, el carrusel prioriza tecnologia.
  - Un usuario conservador no ve stocks con beta mayor a 1.0.
  - Test de la funcion de recomendacion con datos fijos.

### F08 — Analisis tecnico
**Objetivo:** indicadores sobre el historico, dentro del detalle del stock.

- **API:** `GET /stocks/:symbol/technicals?range=6M|1Y`.
  - Se calculan en `services/technicals.ts` (funciones puras):
    - SMA 20 y SMA 50.
    - EMA 12 y EMA 26.
    - RSI 14.
    - MACD (12, 26, 9).
  - Devuelve las series y un resumen de senales:
    - RSI > 70 sobrecompra, < 30 sobreventa.
    - Precio sobre o bajo la SMA 50.
    - Cruce de MACD.
- **Web:**
  - Tab "Tecnico" con la grafica de precio y overlays de SMA y EMA (toggles).
  - Paneles inferiores de RSI y MACD.
  - Tarjeta de senales con lenguaje simple y la aclaracion "no es recomendacion de inversion".
- **Aceptacion:** tests unitarios de cada indicador contra valores conocidos; sin historico suficiente se muestra un estado vacio.

### F09 — Simulador de trading
**Objetivo:** practicar con dinero ficticio y precios reales.

- **Base de datos:**
  - `sim_accounts(user_id pk, cash numeric, starting_cash numeric default 100000, created_at)`.
  - `sim_trades(id, user_id, symbol, side 'buy'|'sell', quantity numeric, price numeric, created_at)`.
  - Ambas con RLS.
  - Las posiciones no se guardan: se derivan de los trades.
- **Reglas:**
  - Solo ordenes de mercado al precio del quote actual. No se valida el horario de mercado.
  - No se puede comprar sin cash suficiente ni vender mas de lo que se tiene.
  - La operacion es atomica: una funcion SQL `execute_sim_trade` actualiza cash y trade en una transaccion.
- **API:**
  - `GET /simulator/account` devuelve cash, posiciones con costo promedio, valor actual, P&L y valor total.
  - `POST /simulator/orders { symbol, side, quantity }`.
  - `GET /simulator/trades`.
  - `POST /simulator/reset` vuelve a $100,000.
- **Web:**
  - `/simulator` con resumen de cuenta, tabla de posiciones e historial.
  - Formulario de orden con preview del costo.
  - Boton "Operar" en el detalle de stock.
- **Aceptacion:**
  - Tests de cash insuficiente, venta mayor a la posicion y calculo de costo promedio y P&L.
  - El reset borra trades y restaura el cash.

---

## Si sobra tiempo

### F10 — Analizador de carteras
**Objetivo:** evaluar la cartera del simulador frente al perfil de riesgo.

- **API:** `GET /portfolio/analysis` devuelve:
  - Asignacion por sector y por posicion (%).
  - Concentracion: mayor posicion y top 3.
  - Beta ponderada de la cartera.
  - Comparacion contra el perfil (por ejemplo, "tu beta 1.4 es alta para un perfil conservador").
  - P&L total.
- **Web:** `/portfolio` con dona de asignacion, metricas y alertas. Sin posiciones = CTA al simulador.
- **Aceptacion:** tests del calculo de pesos y de la beta ponderada.

### F11 — Libertad financiera
**Objetivo:** que el usuario sepa cuanto necesita y en cuanto tiempo llega.

- **Base de datos:** `financial_plans(user_id pk, monthly_expenses, current_savings, monthly_contribution, expected_return, withdrawal_rate default 0.04, updated_at)` con RLS.
- **Calculo** (service puro):
  - Meta = gastos anuales / tasa de retiro.
  - Proyeccion mes a mes con interes compuesto.
  - Resultado: anos para llegar a la meta y la serie de la proyeccion.
  - El retorno esperado por defecto depende del perfil: conservador 4%, moderado 6%, agresivo 8%.
- **API:**
  - `GET /financial-freedom/plan` devuelve el plan y la proyeccion.
  - `PUT /financial-freedom/plan` guarda el plan.
- **Web:** `/financial-freedom` con formulario, numero meta, anos estimados y grafica de la proyeccion.
- **Aceptacion:** tests del calculo (meta y anos) con casos conocidos; aportacion 0 y meta ya alcanzada manejadas.

### F12 — Learning
**Objetivo:** contenido educativo segun el nivel del usuario.

- **Contenido:**
  - 6 a 9 lecciones cortas en Markdown dentro de `web/src/content/learning/`.
  - Frontmatter con titulo, nivel (`basico|intermedio|avanzado`) y perfiles recomendados.
- **API:** solo registra `complete_lesson` (via `POST /interactions`).
- **Web:**
  - `/learning` con lista filtrada y ordenada por el perfil; marca las lecciones completadas.
  - `/learning/[slug]` con la leccion y el boton "Marcar como completada".
- **Aceptacion:** las lecciones recomendadas cambian segun el perfil; el estado de completado persiste.

---

## Siguientes pasos (despues del reto)

### F13 — Chat con Claude
- `POST /chat` (streaming) con `@anthropic-ai/sdk`.
- Tools que llaman a los services: `search_stocks`, `get_stock`, `get_news`, `get_technicals`, `get_my_portfolio`.
- El system prompt considera el perfil de riesgo y aclara que no es asesoria financiera.
- Panel de chat en la web.

### F14 — Servidor MCP
- `/mcp` en el API con el transporte Streamable HTTP, sin estado (compatible con serverless).
- Tools: `search_stocks`, `get_quote`, `get_stock_profile`, `get_news`, `get_technicals`, que llaman a los services.
- Auth con el mismo JWT.

---

## Prerrequisitos (antes de F00)

- Proyecto de Supabase creado (URL, anon key, service role key).
- API keys de Finnhub y Twelve Data.
- Variables configuradas en local (`.env`) y en los dos proyectos de Vercel.
