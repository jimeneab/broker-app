# 01 — Product

## Vision

Stock Insights es una app web para consultar informacion financiera de acciones y ETFs de US (precio, perfil, metricas, historico y noticias), con una experiencia personalizada segun el perfil de riesgo del usuario y lo que hace dentro de la app.

## Users

- **Inversionista principiante o intermedio** que quiere entender una empresa antes de invertir, sin pagar una terminal profesional.
- **Usuario en aprendizaje** que quiere practicar (simulador) y aprender (learning) acorde a su perfil de riesgo.

Todos los usuarios estan autenticados; no hay modo anonimo.

## User stories

Se detallan por feature en las secciones `## Fxx` de este archivo.

## Scope

### Must have
Dia 1 de `PLAN.md`: F00 Base, F01 Login, F02 Perfil de riesgo, F03 Busqueda y detalle, F04 Favoritos, F05 Noticias, F06 Home.

### Nice to have
Dia 2: F07 Recomendaciones, F08 Analisis tecnico, F09 Simulador. Si sobra tiempo: F10 Carteras, F11 Libertad financiera, F12 Learning.

### Out of scope
- Mercados fuera de US, cripto, forex.
- Ordenes reales, conexion con brokers, datos en tiempo real por streaming.
- Asesoria financiera (todo contenido de senales o recomendaciones lleva la aclaracion "no es recomendacion de inversion").
- F13 Chat y F14 MCP (siguientes pasos despues del reto).

## Success criteria
- Un usuario puede buscar una empresa y ver su informacion financiera de forma confiable en la app desplegada.
- La app sigue respondiendo con datos (cacheados) aunque se acerque a los limites gratuitos de Finnhub y Twelve Data.
- Cada vista de datos muestra estados claros de carga, vacio y error.

---

## F00 — Base

**Estatus:** ready

### Proposito
F00 no agrega funciones visibles nuevas. Deja la base que usan las demas features: la estructura de navegacion de la app, el acceso a los datos de mercado con cache y la conexion con Supabase. Para el usuario esto significa:

- Una app con navegacion consistente (barra lateral y encabezado) desde la que se llegara a todas las secciones.
- Datos de mercado que cargan rapido y no se cortan por exceder los limites gratuitos de los proveedores.
- Mensajes de error comprensibles cuando un proveedor de datos falla, en lugar de pantallas rotas.

### Requisitos
1. CUANDO el usuario abre cualquier pagina de la app (excepto las de autenticacion de F01), EL sistema DEBE mostrar una barra lateral con: Home, Buscar, Favoritos, Noticias, Simulador, Cartera, Libertad financiera y Learning, y un encabezado con un espacio para el buscador y un menu de usuario.
2. CUANDO el usuario esta en una seccion, EL sistema DEBE resaltar esa seccion en la barra lateral.
3. CUANDO la pantalla es angosta (movil), EL sistema DEBE ocultar la barra lateral tras un boton de menu que la abre y la cierra.
4. CUANDO el mismo dato de mercado se pide varias veces dentro de su tiempo de vigencia, EL sistema DEBE reutilizar el dato guardado sin volver a consultar al proveedor.
5. CUANDO un proveedor de datos falla o responde algo invalido, EL sistema DEBE informar "error del proveedor de datos" sin exponer detalles internos.
6. CUANDO un proveedor rechaza la consulta por limite de uso, EL sistema DEBE informar que se intente de nuevo en un momento.

### Criterios de aceptacion
- [ ] La app desplegada muestra la barra lateral y el encabezado en la Home, con la seccion activa resaltada.
- [ ] En un ancho de 375 px la barra lateral se abre y cierra con el boton de menu y no hay scroll horizontal.
- [ ] Vigencia de los datos: precio 60 s, noticias 15 min, historico 12 h, perfil y metricas 7 dias, busqueda 24 h (verificado con tests automaticos del API).
- [ ] Un error del proveedor se ve como un mensaje legible, no como pantalla en blanco (verificado con tests automaticos).
- [ ] Las secciones aun no construidas (F02–F12) pueden mostrar "pagina no encontrada" hasta que su feature se implemente.

---

## F01 — Login con JWT

**Estatus:** ready

### Proposito
Que cada persona tenga su cuenta: se registra con email y contraseña, entra y sale cuando quiere, y solo ve la app con sesion iniciada. Es la base para personalizar todo lo demas (perfil de riesgo en F02, favoritos, simulador). Tambien protege los datos: el API solo responde a usuarios autenticados.

### Historias de usuario
- Como visitante, quiero crear una cuenta con mi nombre, email y contraseña para empezar a usar la app de inmediato, sin confirmar el email.
- Como usuario registrado, quiero iniciar sesion con mi email y contraseña para volver a mi cuenta.
- Como usuario, quiero cerrar sesion desde el menu de usuario para dejar el dispositivo sin mi cuenta abierta.
- Como usuario nuevo, quiero que la app me lleve a completar mi perfil de riesgo antes de entrar (el cuestionario es F02).

### Requisitos
1. CUANDO alguien sin sesion abre cualquier pagina de la app, EL sistema DEBE llevarlo a "Iniciar sesión".
2. CUANDO el visitante crea una cuenta con nombre (1 a 50 caracteres), email valido y contraseña de al menos 8 caracteres, EL sistema DEBE crear la cuenta, iniciar su sesion sin pedir confirmacion de email y llevarlo a completar su perfil.
3. CUANDO algun dato del formulario es invalido, EL sistema DEBE indicar el problema junto al campo, en espanol, sin borrar lo ya escrito (salvo la contraseña).
4. CUANDO el email ya tiene cuenta, EL sistema DEBE mostrar "Ya existe una cuenta con ese email."
5. CUANDO el email o la contraseña son incorrectos al iniciar sesion, EL sistema DEBE mostrar "Email o contraseña incorrectos." sin decir cual de los dos fallo.
6. CUANDO un usuario con sesion abre "Iniciar sesión" o "Crear cuenta", EL sistema DEBE llevarlo a la app.
7. CUANDO un usuario con sesion no ha completado su perfil de riesgo, EL sistema DEBE llevarlo a la pagina de onboarding en cualquier seccion que abra. Mientras F02 no exista, esa pagina solo avisa que el cuestionario llegara pronto y permite cerrar sesion.
8. CUANDO el usuario abre el menu de usuario, EL sistema DEBE mostrar su email y la opcion "Cerrar sesión"; al elegirla DEBE cerrar la sesion en ese dispositivo y llevarlo a "Iniciar sesión".
9. CUANDO la sesion expira mientras se usa la app, EL sistema DEBE renovarla sin intervencion del usuario mientras siga siendo valida; si ya no lo es, DEBE pedir iniciar sesion de nuevo.
10. CUANDO alguien llama al API sin sesion o con una sesion invalida o expirada, EL sistema DEBE rechazar la peticion (`401 UNAUTHORIZED`).

### Fuera de alcance (F01)
- Recuperar o cambiar la contraseña, login con Google u otros proveedores, editar el nombre.
- Volver a la pagina original despues de iniciar sesion (siempre se entra a la Home).
- El cuestionario de perfil de riesgo (F02).

### Criterios de aceptacion
- [ ] Peticion al API sin token → `401 UNAUTHORIZED`.
- [ ] Token invalido o expirado → `401`.
- [ ] Signup, login y logout funcionan en la app desplegada.
- [ ] Al registrarse se crea su profile (nombre, sin perfil de riesgo) y un usuario no puede ver el profile de otro.
- [ ] Un usuario no puede escribir directamente su perfil de riesgo (`risk_score`, `risk_profile`, `onboarded_at`) con su sesion; solo su nombre. El perfil lo guardara el servidor en F02 (verificado con prueba SQL/manual).
- [ ] F01 se despliega junto con F02 (commit sin push hasta que F02 este `ready`); mientras tanto `/onboarding` es un placeholder.
- [ ] Sin sesion no se puede ver ninguna pagina de la app; con sesion y sin onboarding se termina en `/onboarding`.
- [ ] El menu de usuario muestra el email de la cuenta.

---

## F02 — Formulario de perfil de riesgo

**Estatus:** ready

### Proposito
Al abrir su cuenta, el usuario responde un cuestionario corto y obtiene su perfil de riesgo (conservador, moderado o agresivo). Ese perfil personaliza el resto de la app (saludo en la Home en F06, recomendaciones en F07, retorno esperado en F11, lecciones en F12). Mientras no lo complete, no puede entrar a la app.

### Historias de usuario
- Como usuario nuevo, quiero responder unas pocas preguntas sencillas, una por pantalla, para conocer mi perfil de riesgo sin sentirme abrumado.
- Como usuario, quiero ver al final mi perfil y que significa, para entender por que la app me mostrara ciertas cosas.
- Como usuario, quiero rehacer el cuestionario desde el menu de usuario cuando cambie mi situacion.

### Cuestionario
Cada pregunta tiene 4 opciones, mostradas en este orden. La opcion 1 vale 1 punto, la 2 vale 2, la 3 vale 3 y la 4 vale 4.

| # | Tema | Pregunta | Opcion 1 (1 pt) | Opcion 2 (2 pts) | Opcion 3 (3 pts) | Opcion 4 (4 pts) |
|---|---|---|---|---|---|---|
| 1 | Horizonte | ¿Cuánto tiempo piensas mantener tus inversiones antes de necesitar ese dinero? | Menos de 1 año | Entre 1 y 3 años | Entre 3 y 7 años | Más de 7 años |
| 2 | Caída del 20% | Si tus inversiones cayeran un 20% en pocas semanas, ¿qué harías? | Vendería todo para no perder más | Vendería una parte | Esperaría sin hacer cambios | Compraría más aprovechando el precio bajo |
| 3 | Objetivo | ¿Cuál es tu objetivo principal al invertir? | Proteger mi dinero aunque gane poco | Obtener ingresos estables con poco riesgo | Hacer crecer mi dinero con un riesgo moderado | Maximizar el crecimiento aunque haya mucha volatilidad |
| 4 | Experiencia | ¿Cuánta experiencia tienes invirtiendo? | Ninguna, nunca he invertido | Poca: solo ahorro, depósitos o fondos | Algo: he comprado acciones o ETFs | Mucha: invierto con frecuencia en acciones, ETFs u otros instrumentos |
| 5 | Patrimonio | ¿Qué porcentaje de tu patrimonio invertirías en la bolsa? | Menos del 10% | Entre 10% y 25% | Entre 25% y 50% | Más del 50% |
| 6 | Ingresos | ¿Qué tan estables son tus ingresos? | Inestables o sin ingresos fijos | Algo variables | Estables | Muy estables y con un fondo de emergencia |

### Perfiles

Puntaje = suma de las 6 respuestas (de 6 a 24).

| Puntaje | Perfil | Explicacion (texto exacto en la pantalla final) |
|---|---|---|
| 6 a 11 | Conservador | Priorizas proteger tu dinero sobre ganar más. Te sientes mejor con inversiones estables y de baja volatilidad, aunque crezcan despacio. |
| 12 a 18 | Moderado | Buscas un equilibrio entre crecimiento y seguridad. Aceptas altibajos moderados a cambio de un mejor rendimiento a mediano plazo. |
| 19 a 24 | Agresivo | Buscas el mayor crecimiento posible y toleras caídas fuertes en el camino. Tienes un horizonte largo para recuperarte de la volatilidad. |

Debajo de la explicacion siempre va: "Este perfil es orientativo y no es una recomendación de inversión."

### Requisitos
1. CUANDO un usuario con sesion y sin perfil abre cualquier pagina de la app, EL sistema DEBE llevarlo al cuestionario (ya lo hace F01; F02 reemplaza el aviso "muy pronto" por el cuestionario).
2. CUANDO el usuario esta en el cuestionario, EL sistema DEBE mostrar una pregunta por pantalla con sus 4 opciones, el avance ("Pregunta N de 6" y una barra de progreso) y los botones "Atrás" y "Siguiente".
3. CUANDO el usuario no ha elegido una opcion, EL sistema NO DEBE dejarlo avanzar.
4. CUANDO el usuario vuelve con "Atrás", EL sistema DEBE conservar las respuestas ya elegidas.
5. CUANDO el usuario responde la sexta pregunta y confirma, EL sistema DEBE calcular el puntaje en el servidor (nunca en el navegador), guardar puntaje, perfil y fecha, y mostrar la pantalla final con el nombre del perfil, el puntaje ("15 de 24"), la explicacion y el aviso, y un boton "Ir a la app".
6. CUANDO el puntaje es 11 o menos, EL perfil DEBE ser conservador; de 12 a 18, moderado; 19 o mas, agresivo.
7. CUANDO el guardado falla, EL sistema DEBE mostrar un mensaje de error en espanol, conservar las respuestas y permitir reintentar.
8. CUANDO el usuario ya completo el cuestionario, EL sistema DEBE dejarlo entrar a toda la app.
9. CUANDO el usuario elige "Rehacer cuestionario" en el menu de usuario, EL sistema DEBE abrir el cuestionario vacio; al terminarlo, el nuevo perfil reemplaza al anterior.
10. CUANDO un usuario que ya tiene perfil esta en el cuestionario, EL sistema DEBE ofrecer "Volver a la app" sin cambiar su perfil; CUANDO aun no tiene perfil, DEBE ofrecer "Cerrar sesión".
11. CUANDO alguien intenta guardar un perfil sin pasar por el calculo (fijar el puntaje o el perfil directamente, o mandar respuestas invalidas), EL sistema DEBE rechazarlo.

### Fuera de alcance (F02)
- Historial de perfiles anteriores: rehacer el cuestionario sobrescribe el perfil y no se guarda el anterior (el registro de interacciones es de F07).
- Guardar las respuestas individuales o precargarlas al rehacer.
- Mostrar el perfil en la Home (F06) y usarlo en recomendaciones (F07), libertad financiera (F11) o learning (F12).
- Editar el nombre del usuario.

### Criterios de aceptacion
- [ ] Tests automaticos de los limites de puntaje: 11 → conservador, 12 → moderado, 18 → moderado, 19 → agresivo (y los extremos 6 y 24).
- [ ] Respuestas invalidas (no son 6, alguna fuera de 1–4, no enteras, cuerpo invalido) → `400 VALIDATION_ERROR`.
- [ ] Sin onboarding no se puede entrar a la app; al terminarlo, "Ir a la app" lleva a la Home sin volver al cuestionario.
- [ ] Rehacer el cuestionario desde el menu de usuario cambia el perfil guardado.
- [ ] Un usuario no puede escribir su puntaje, perfil o fecha de onboarding con valores arbitrarios usando su sesion (ni con un update directo ni llamando la funcion de la base de datos con otros datos); verificado con test automatico y prueba SQL/manual.
- [ ] El cuestionario se puede responder solo con teclado y a 375 px no hay scroll horizontal.
- [ ] F01 y F02 se despliegan juntas y el flujo signup → cuestionario → Home funciona en la app desplegada.
