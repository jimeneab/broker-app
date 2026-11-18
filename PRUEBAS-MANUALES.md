# Pruebas manuales

## Sesion 01 — Setup

1. `pnpm install` en la raiz termina sin errores.
2. Copia `api/.env.example` a `api/.env` y `web/.env.example` a `web/.env.local`.
3. `pnpm dev` levanta ambos proyectos.
4. Abre http://localhost:3000 → se ve el titulo "Stock Insights".
5. Abre http://localhost:4000/health → responde `{"status":"ok"}`.
6. Abre http://localhost:4000/no-existe → responde 404 con `{"error":{"code":"NOT_FOUND","message":"Route GET /no-existe not found"}}`.
7. `pnpm test`, `pnpm lint` y `pnpm build` terminan sin errores.

## Sesion 01 — Deploy

1. Abre https://broker-app-web-nine.vercel.app → se ve "Stock Insights".
2. Abre https://broker-app-api.vercel.app/health → `{"status":"ok"}`.
3. Abre https://broker-app-api.vercel.app/no-existe → 404 con `{"error":{"code":"NOT_FOUND",...}}`.
4. En el dashboard de Vercel, ambos proyectos muestran el repo `jimeneab/broker-app` conectado y root directory `web` / `api`.

## F00 — Base: Supabase, providers, cache, layout

### Ahora (sin credenciales)

1. `pnpm install`, `pnpm test`, `pnpm lint` y `pnpm build` terminan sin errores (api 42 tests, web 30 tests).
2. Si no existen, copia `api/.env.example` a `api/.env` y `web/.env.example` a `web/.env.local`. Luego corre `pnpm dev`.
3. http://localhost:4000/health responde `{"status":"ok"}`.
4. Borra temporalmente `FINNHUB_API_KEY` de `api/.env` y corre `pnpm dev:api`. El API no arranca y el error de Zod nombra `FINNHUB_API_KEY`. Despues restaura la linea.
5. Abre http://localhost:3000 en escritorio:
   - Se ven el sidebar (con "Stock Insights" arriba) y el header (con el menu de usuario a la derecha).
   - "Home" aparece resaltado.
   - Buscar, Favoritos, Noticias, Simulador, Cartera, Libertad financiera y Learning se ven atenuados con la etiqueta "Próximamente" y no son clicables.
6. Navega con el teclado:
   - Con `Tab` desde el inicio aparece "Saltar al contenido".
   - El foco es visible (contorno azul) en cada elemento.
   - Los items "Próximamente" no reciben foco.
7. En DevTools, activa el modo responsive a 375 px de ancho:
   - El sidebar esta oculto y en el header aparece el boton de menu (hamburguesa).
   - Al pulsarlo se abre el panel con un fondo oscurecido.
   - El panel se cierra con `Escape` (y el foco vuelve al boton), al tocar el fondo oscurecido y al pulsar "Home".
   - No hay scroll horizontal.
8. Cambia el sistema operativo a modo oscuro: la app cambia a tema oscuro y los textos se leen bien.
9. Abre http://localhost:3000/news: muestra "pagina no encontrada", lo esperado hasta F05.

### Pendientes (cuando existan el proyecto de Supabase y las keys)

1. Crea el proyecto en Supabase. Aplica `supabase/migrations/20261118120000_f00_base.sql` con `supabase link` + `supabase db push`, o pegando el SQL en el SQL Editor.
2. En el dashboard de Supabase verifica:
   - La tabla `provider_cache` existe con RLS "enabled" y 0 policies.
   - La extension `vector` esta activa.
3. Crea las API keys de Finnhub y Twelve Data.
4. Pon las 5 variables reales en estos lugares:
   - `api/.env`.
   - El proyecto de Vercel `broker-app-api`, en Production y Preview.
5. Pon `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en estos lugares:
   - `web/.env.local`.
   - El proyecto de Vercel `broker-app-web`.

   Pon tambien `NEXT_PUBLIC_API_URL` con la URL del API desplegado. Haz redeploy, porque estas variables se inlinean en el build.
6. Prueba de humo de la cache: desde `api/`, con un script temporal ejecutado con `pnpm exec tsx --env-file=.env`, llama dos veces a `getOrSet("finnhub:quote:AAPL", 60, () => marketData.quote("AAPL"))`. Comprueba lo siguiente:
   - Ambas llamadas devuelven el quote.
   - En `provider_cache` hay una sola fila con esa key y `expires_at` a unos 60 s.
   - La verificacion completa por HTTP llega con F03.
7. Despues del deploy:
   - https://broker-app-api.vercel.app/health sigue respondiendo `{"status":"ok"}`.
   - La web desplegada muestra el sidebar y el header.

## F01 — Login con JWT

> Desde F01 cambian dos pruebas anteriores: http://localhost:4000/no-existe sin token ahora responde `401 UNAUTHORIZED` (el auth corre antes del 404), y http://localhost:3000 sin sesion redirige a `/login` (el sidebar de F00 solo se ve con un usuario onboarded, ver pendiente 9).

### Ahora (sin el proyecto de Supabase configurado)

1. `pnpm install`, `pnpm test`, `pnpm lint` y `pnpm build` terminan sin errores (api 70 tests, web 78 tests).
2. `pnpm dev` y luego:
   - http://localhost:4000/health → 200 `{"status":"ok"}`.
   - http://localhost:4000/me sin token → 401 `{"error":{"code":"UNAUTHORIZED","message":"Missing bearer token"}}`.
   - `curl -H "Authorization: Bearer abc" http://localhost:4000/me` → 401 `{"error":{"code":"UNAUTHORIZED","message":"Invalid or expired token"}}`.
   - http://localhost:4000/no-existe sin token → 401 (no 404).
3. Abre http://localhost:3000 → termina en http://localhost:3000/login. Lo mismo con http://localhost:3000/onboarding.
4. En `/login`:
   - Se ve una tarjeta centrada con "Stock Insights" arriba, el titulo "Iniciar sesión", los campos Email y Contraseña, el boton "Entrar" y el enlace "¿No tienes cuenta? Crear cuenta". No hay sidebar ni header.
   - Pulsa "Entrar" con todo vacio → bajo Email "Ingresa un email válido." y bajo Contraseña "Ingresa tu contraseña.", en rojo. El email escrito se conserva.
   - Con un lector de pantalla (o DevTools > Accessibility), el input con error tiene `aria-invalid="true"` y su descripcion es el mensaje.
5. En `/signup` (desde el enlace):
   - Campos Nombre, Email y Contraseña, boton "Crear cuenta" y enlace "¿Ya tienes cuenta? Iniciar sesión".
   - Nombre solo con espacios → "Ingresa tu nombre."; contraseña de 7 caracteres → "La contraseña debe tener al menos 8 caracteres.". El nombre y el email se conservan; la contraseña se vacia.
6. Navega con `Tab`: el foco es visible en cada campo, el boton y el enlace.
7. DevTools a 375 px: los formularios caben sin scroll horizontal.
8. Modo oscuro del sistema: la tarjeta, los campos y el boton se leen bien.

### Pendientes (cuando exista el proyecto de Supabase)

1. Aplica `supabase/migrations/20261118130000_f01_profiles.sql` despues de la de F00 (`supabase db push`, o pega el SQL en el SQL Editor).
2. En el dashboard verifica:
   - `profiles` con RLS "enabled" y 2 policies: `profiles_select_own` y `profiles_update_own`.
   - El trigger `on_auth_user_created` en `auth.users`.
3. Authentication > Providers > Email: deja Email habilitado y **desactiva "Confirm email"**.
4. Project Settings > JWT Keys: revisa si el proyecto usa signing keys (ES256).
   - Si sigue con el secreto legacy (HS256), pon `SUPABASE_JWT_SECRET` en `api/.env` y en Vercel del API (Production y Preview). Haz redeploy.
   - Si usa signing keys, deja la variable comentada.
5. Pon la URL y la anon key reales en `web/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) y en `api/.env` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). Reinicia `pnpm dev`.
6. Flujo en local:
   - Abre `/` sin sesion → termina en `/login`.
   - Crea una cuenta con nombre, email y contraseña → termina en `/onboarding` ("Completa tu perfil de riesgo" / "El cuestionario estará disponible muy pronto.").
   - Ve a `/` → vuelve a `/onboarding`. Ve a `/login` → te manda a `/` y de ahi a `/onboarding`.
   - Pulsa "Cerrar sesión" → `/login`. El boton Atras del navegador no muestra contenido protegido.
   - Entra con la misma cuenta → `/onboarding`.
   - Contraseña incorrecta → "Email o contraseña incorrectos.".
   - Registra el mismo email otra vez → "Ya existe una cuenta con ese email.".
7. En Table Editor, la fila del usuario en `profiles` tiene su `display_name` y `risk_score`, `risk_profile` y `onboarded_at` en `null`.
8. Verificacion SQL del grant (SQL Editor, con el uuid de ese usuario):

   ```sql
   begin;
   set local role authenticated;
   select set_config('request.jwt.claims', '{"sub":"<uuid-del-usuario>","role":"authenticated"}', true);
   update public.profiles set display_name = 'Nuevo' where id = '<uuid-del-usuario>';   -- OK, 1 fila
   update public.profiles set risk_score = 24 where id = '<uuid-del-usuario>';          -- ERROR: permission denied for table profiles
   rollback;
   ```

   Repite el segundo `update` con `risk_profile = 'agresivo'` y con `onboarded_at = now()`: los tres fallan con `permission denied`.
   Opcional por PostgREST: `PATCH {SUPABASE_URL}/rest/v1/profiles?id=eq.<uuid>` con headers `apikey: <anon>` y `Authorization: Bearer <access_token>`, body `{"risk_score":24}` → error `42501`.
9. Para probar la app con un usuario onboarded antes de F02, en el SQL Editor (como admin):
   `update profiles set risk_score = 15, risk_profile = 'moderado', onboarded_at = now() where id = '<uuid>';`
   - `/` muestra la Home con sidebar.
   - Abre el menu de usuario (avatar) → muestra el email y "Cerrar sesión", que funciona.
10. Prueba de humo del API:
    - `curl {API}/me` → 401 `UNAUTHORIZED`.
    - Con el `access_token` del usuario (DevTools > Application > Cookies, o `supabase.auth.getSession()`): `curl -H "Authorization: Bearer <token>" {API}/me` → 200 con `id`, `email`, `displayName`, `riskScore`, `riskProfile`, `onboardedAt` y `createdAt`.
    - Con el token alterado en un caracter → 401.
11. Despliegue: F01 y F02 salen juntas. F01 se commitea pero **no se hace push** hasta que F02 este `ready`. La prueba de humo en produccion (signup, login y logout en la app desplegada) se hace con las dos.

## F02 — Formulario de perfil de riesgo

### Ahora (sin aplicar la migracion de F02)
1. En la raiz: `pnpm install`, `pnpm test` (api 111, web 99), `pnpm lint` y `pnpm build` pasan.
2. `pnpm dev` y:
   - `curl -i http://localhost:4000/health` → 200 `{"status":"ok"}`.
   - `curl -i -X PUT -H "Content-Type: application/json" -d '{"answers":[3,2,3,2,3,2]}' http://localhost:4000/me/risk-profile` → 401 `UNAUTHORIZED`.
   - `curl -i -X PUT -H "Content-Type: application/json" -d '{' http://localhost:4000/me/risk-profile` → 400 `{"error":{"code":"VALIDATION_ERROR","message":"Malformed JSON body"}}`.
   - `curl -i http://localhost:3000/onboarding` (sin sesion) → 307 a `/login`.

### Pendientes (requieren aplicar la migracion)
1. Aplicar `supabase/migrations/20261118140000_f02_risk_profile.sql` despues de la de F01.
2. En el dashboard, Database > Functions muestra `submit_risk_profile` (security definer).
3. **No se puede saltar el calculo** (SQL Editor, con el uuid de un usuario registrado). Corre cada bloque por separado, porque tras un error la transaccion queda abortada. Cada bloque empieza con este prefijo y termina con `rollback;`:

   ```sql
   begin;
   set local role authenticated;
   select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true);
   ```

   - Bloque 1: `select risk_score, risk_profile, onboarded_at from public.submit_risk_profile(array[2,2,2,2,2,2]);` → `12 | moderado | <fecha>`.
   - Bloque 2: `update public.profiles set risk_score = 24, risk_profile = 'agresivo' where id = '<uuid>';` → ERROR `permission denied for table profiles`.
   - Bloque 3: `select public.submit_risk_profile(array[4,4,4,4,4,4,4]);` → ERROR `answers must be 6 integers between 1 and 4`.
4. Lo mismo por PostgREST (siempre con el header `apikey: <anon>`):
   - `POST {SUPABASE_URL}/rest/v1/rpc/submit_risk_profile` sin `Authorization` de usuario, con body `{"answers":[4,4,4,4,4,4]}` → error `42501`.
   - Con `Authorization: Bearer <access_token>` y 7 respuestas → 400 (`22023`).
   - `PATCH {SUPABASE_URL}/rest/v1/profiles?id=eq.<uuid>` con el JWT y `{"risk_score":24}` → `42501`.
5. Prueba de humo del API con el `access_token`:
   - `PUT {API}/me/risk-profile` con `{"answers":[3,2,3,2,3,2]}` → 200 con `riskScore: 15` y `riskProfile: "moderado"`.
   - Con 5 respuestas → 400 `VALIDATION_ERROR`.
   - Sin token → 401.
   - Con `{"answers":[1,1,1,1,1,1],"risk_score":24}` → 200 con `riskScore: 6` (el campo extra se ignora).
6. Flujo completo en el navegador, en local y luego en la app desplegada:
   1. Crea una cuenta → `/onboarding` con "Tu perfil de riesgo", "Pregunta 1 de 6" y la barra de progreso. El pie dice "Cerrar sesión".
   2. Abre `/` a mano → vuelve a `/onboarding`.
   3. "Atrás" esta deshabilitado en la pregunta 1 y "Siguiente" esta deshabilitado hasta elegir una opcion.
   4. Responde con "Atrás" de por medio (la respuesta se conserva) y termina con `3,2,3,2,3,2` (opcion 3, 2, 3, 2, 3, 2). Mientras guarda, el boton dice "Calculando…". Resultado: "Tu perfil es Moderado", "Puntaje: 15 de 24", la explicacion y el aviso "Este perfil es orientativo y no es una recomendación de inversión.".
   5. "Ir a la app" → Home, sin volver a `/onboarding`. Recarga → sigue en la Home.
   6. Menu de usuario → "Rehacer cuestionario" (entre el email y "Cerrar sesión") → pregunta 1 vacia, y el pie dice "Volver a la app". Pulsalo → Home, y en Table Editor el perfil no cambio.
   7. Rehaz el cuestionario con todas las opciones 4 → "Tu perfil es Agresivo", "Puntaje: 24 de 24". En Table Editor: `risk_score = 24`, `risk_profile = agresivo` y `onboarded_at` igual al de la primera vez.
   8. Con el API apagado, envia la pregunta 6 → alerta "No se pudo conectar con el servidor." y la respuesta sigue marcada. Enciende el API y pulsa "Ver mi perfil" otra vez → funciona.
7. Solo con teclado: Tab llega a las opciones, las flechas cambian la opcion, Enter avanza y el foco pasa al encabezado de cada pregunta y al de la pantalla final. El foco es visible en las opciones y los botones.
8. A 375 px de ancho, en modo claro y oscuro: sin scroll horizontal, la opcion elegida se marca en azul y el boton principal es oscuro (claro en modo oscuro).
9. Despliegue conjunto de F01 + F02: push solo cuando F02 este `ready`. Prueba de humo en produccion: signup → cuestionario → Home.
