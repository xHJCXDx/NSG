# Suite del *frontend*: fallas previas y su corrección (REV77, B16)

Fecha: 16/11/2026. Rama `test/rev77-frontend-suite`, que sale de `develop` `77a960f` (incluye B5 y B6). Entorno: Node 24.21.0, Vitest (`npx vitest run` en `frontend/`).

## Por qué este documento

La suite del *frontend* fallaba en `develop` antes de la REV77. La tesis no la cita. En la devolución de cuarta instancia (Q-M2) el tribunal objetó que, en la REV76, se actualizaran pruebas desactualizadas para que coincidieran con el código (commit `0814501`): pasar así prueba que no hay regresiones, no que el código cumpla la especificación. Por eso cada falla se clasificó **antes** de tocarla, con estas reglas:

- **Prueba desactualizada:** el comportamiento cambió a propósito (lo muestra el commit que lo cambió o lo exige la tesis). Se actualiza la prueba sin quitar ni debilitar aserciones y se cita el commit.
- **Defecto del código:** la prueba exige algo correcto que el código no cumple. Se corrige el código, no la prueba.
- **Indeterminado:** falta evidencia o es una decisión del autor. No se toca.

Estas pruebas son **pruebas de regresión** de la interfaz. No verifican la especificación de la tesis y no se presentan como tal.

## Línea de base

`develop` antes de B6: 33 archivos (7 con fallas), 221 pruebas (**9 fallidas**, 212 aprobadas) y **2 errores no capturados**. Después de B6 (`030923e`): las mismas 9 fallas y los mismos 2 errores, sin fallas nuevas.

## Clasificación

| # | Prueba | Síntoma | Causa (commit que cambió el comportamiento) | Clasificación | Corrección |
|---|---|---|---|---|---|
| 1 | `threats/api.test.ts` › *maps supported raw API aliases…* | El objeto mapeado trae `alert: null`, que la prueba no espera | `ce107a1` (28/09, «improve analytics and alert visibility»): cada detección incluye el resumen de su aviso (`api.ts`, `mapAlertSummary`). La prueba es del 25/09 | Prueba desactualizada | Se agrega `alert: null` a los dos objetos esperados |
| 2 | `DashboardLayout.test.tsx` › *groups permitted destinations…* | El enlace del panel apunta a `/dashboard`, no a `/` | `c6bb818` (28/09, «generic home page, accessible settings»): el panel pasó a `/dashboard` y `/` redirige a `/home` (Inicio, Tabla 23) | Prueba desactualizada | `href` esperado `/dashboard`. La misma prueba buscaba el enlace «Threats», que B6 (`030923e`, Q-B2) rotuló «Detections» (la ruta sigue siendo `/threats`): se busca «Detections» |
| 3 | `DashboardLayout.test.tsx` › *hides destinations missing from JWT permissions* | El título de grupo «Administration» se ve sin permisos | `c6bb818`: Preferencias (*Settings*) no exige permiso, como pide la Tabla 23 («Autenticado»), y está en el grupo Administración, así que el título se ve con Preferencias como único destino | Prueba desactualizada (no es defecto: lo exige la Tabla 23) | Se espera el título y el enlace a `/settings`; Usuarios sigue oculto |
| 4 | `AppRouter.test.tsx` › *keeps the protected index route…* | En `/` no aparece la página del panel | `c6bb818`: el índice redirige a `/home` | Prueba desactualizada | El índice espera Inicio (se agrega su *mock*) y una prueba nueva verifica `/dashboard`, para no perder cobertura |
| 5–6 y los 2 errores | `KeywordsPage.test.tsx` › *creates keywords…* y *supports inline edit…* | `categories.map is not a function`; la página queda vacía y no encuentra el campo «Priority» | `4a65f8d` (28/09, «managed select dropdown»): la página pide además la lista de categorías. El *mock* respondía en secuencia y le entregaba a esa consulta un objeto de término. Con la API real no ocurre: `GET /api/keyword-categories` declara `response_model=list[KeywordCategoryResponse]` (`backend/routers/keyword_categories.py:19`) | Prueba desactualizada (*mock*), no defecto | El *mock* responde `[]` a la consulta de categorías y conserva el orden de las demás respuestas; ninguna aserción cambia |
| 7 | `ThreatsPage.test.tsx` › *shows loading and then renders…* | No encuentra `credential_leak` ni `high` | `8f86451` (28/09, «i18n labels»): la tarjeta muestra rótulos legibles («credential leak», «High») | Prueba desactualizada | Se esperan los rótulos legibles |
| 8 | `users/api.test.ts` › `deleteRole` | Resuelve `{}` y la prueba esperaba `undefined` | `a25b863` (28/09, «soft delete, reactivation, and permanent deletion»): la baja de un rol es lógica y devuelve el rol (`backend/routers/roles.py:104`, `response_model=RoleResponse`) | Prueba desactualizada | Se espera el rol desactivado que devuelve la API |
| 9 | `UsersPage.test.tsx` › *disables self-delete and inactive users…* | No existe el botón deshabilitado «Inactive» | `a25b863`: un usuario inactivo muestra «Reactivate» y «Delete permanently» | Prueba desactualizada | Se esperan esos dos botones habilitados; «Current user» sigue deshabilitado y «Deactivate» sigue ausente |

**Resultado de la clasificación:** 9 pruebas desactualizadas (con los 2 errores incluidos en las fallas 5–6), **0 defectos del código** y **0 casos indeterminados**.

## Aserciones

No se quitó ninguna aserción. Se reemplazaron 7 (las que verificaban el comportamiento anterior) y se agregaron 4: el enlace a Preferencias (falla 3), el botón «Delete permanently» (falla 9) y las dos de la prueba nueva de `/dashboard` (falla 4). Cada cambio lleva en la prueba un comentario con el commit que lo justifica.

## Resultado

Commit `bce3b51`. `npx vitest run`: **33 archivos y 222 pruebas aprobadas, 0 fallidas, 0 errores** (`suite_frontend_20261116-151300.log`). `tsc --noEmit` sin errores; `eslint` sin problemas en los 7 archivos de prueba modificados.
