# Seguridad

## Aislamiento multi-tenant

La barrera de seguridad real es **PostgreSQL Row Level Security**, no el
frontend. Todas las tablas de tenant tienen RLS habilitado y deniegan por
defecto; solo las policies en `supabase/migrations/0003_rls.sql` conceden
acceso, y estan acotadas por `business_id` + rol de `memberships`. Ver
`DATABASE.md` para el detalle completo de cada policy.

Verificado por `tests/rls/isolation.test.ts` (13 tests) contra un Postgres
real con el mismo SQL que se despliega — no mocks. Cubre: un propietario no
puede leer ni escribir el negocio de otro tenant; un empleado no puede
escribir productos directamente (solo `set_product_availability`, RPC
acotada); un anonimo solo ve negocios/productos `published`; solo
SUPERADMIN puede insertar un `business` o una invitacion con `role='owner'`;
`accept_invitation` exige que el email coincida; `bootstrap_superadmin`
solo funciona una vez.

## Claves y secretos

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` es publica por diseño (Supabase): la
  seguridad la da RLS, no el secreto de esta clave.
- `SUPABASE_SERVICE_ROLE_KEY` **nunca** se expone al navegador. Se usa solo
  en: `src/lib/supabase/admin.ts` (import protegido por el paquete
  `server-only`, que hace fallar el build si algun Client Component la
  importa), rutas de servidor concretas (`/api/track`, `/q/[code]`,
  acciones MASTER), y el servidor MCP (proceso local, nunca en el
  navegador).
- El servidor MCP asume que quien puede ejecutar el proceso tiene acceso
  equivalente a SUPERADMIN (ver `MCP.md`). Protege tu `.env.local` como
  protegerias cualquier credencial de administrador.

## QR

El QR nunca contiene la carta ni datos sensibles: solo un identificador
opaco (`qr_codes.code`, generado con `nanoid`) resuelto server-side. La
tabla `qr_codes` no es legible por `anon` bajo ninguna circunstancia — la
resolucion pasa siempre por `/q/[code]` con el cliente `service_role`.

## Chatbot

Sin LLM, sin llamadas a red, sin conocimiento externo — es una funcion
pura sobre los datos de la carta ya cargados en la pagina
(`src/lib/chatbot/engine.ts`). No hay superficie de prompt injection porque
no hay prompt: es matching de reglas sobre datos estructurados propios.

## Analitica y privacidad

`analytics_events` no almacena PII: `session_id` es un UUID aleatorio
generado en el navegador (`sessionStorage`, no persistente entre sesiones),
sin relacion con ninguna cuenta. La insercion pasa solo por
`/api/track` (server, valida el payload con zod) — no hay policy de
`INSERT` para `anon`/`authenticated`, así que un cliente no puede escribir
eventos arbitrarios directamente contra Postgres.

## Validacion de entrada

Todas las mutaciones (Server Actions del dashboard y herramientas MCP)
validan con **zod** (`src/lib/schemas.ts`) antes de tocar la base de datos:
tipos, rangos, longitudes, y vocabularios cerrados donde aplica (los 14
alergenos UE, las tipografias curadas, los estilos de tema). El motor
**nunca infiere** alergenos, ingredientes o precios no declarados — ver
`PRODUCT_SPEC.md` seccion 10.

## Dependencias: vulnerabilidades conocidas y por que se aceptan

`npm audit` en este proyecto (revisar periodicamente, `npm audit` para el
detalle actualizado):

- **postcss (build-time, via Next 15.5.x)**: advisories de XSS/lectura de
  archivos via `sourceMappingURL` en comentarios CSS. Se activan al
  procesar CSS **no confiable** en build time; este proyecto solo compila
  su propio CSS (Tailwind), nunca CSS de terceros/usuarios. Riesgo residual
  aceptado y documentado; se resolvera solo actualizando a Next 16.x
  cuando esa version este fuera de su ventana "preview"/canary (evitado
  deliberadamente en este MVP, ver mas abajo).
- **vitest/vite/esbuild/tsx (dev-only)**: RCE/lectura de archivos si el
  servidor de desarrollo de Vite queda expuesto a una red no confiable.
  Estas herramientas solo corren en `npm test`/`npm run dev` local, nunca
  en produccion ni en un servidor accesible publicamente.
- **@modelcontextprotocol/sdk (DNS rebinding, HTTP/SSE transport)**: no
  aplica — este proyecto usa exclusivamente el **transporte stdio** (ver
  `MCP.md`), que no abre ningun socket de red.

## Por que Next.js 15.5.x y no 16.x

Next 16 es post-corte de conocimiento del modelo y su propio archivo
generado (`AGENTS.md`, ver git history) advierte de cambios de ruptura
respecto a lo documentado hasta ahora. Se eligio 15.5.24 (linea con
parches de seguridad activos) por previsibilidad en un proyecto de este
tamaño; migrar a 16.x mas adelante es viable sin cambios arquitectonicos.

## Reportar un problema

Este es un proyecto interno/MVP sin programa de bug bounty. Si encuentras
un problema de seguridad, corrigelo directamente o abre un issue.
