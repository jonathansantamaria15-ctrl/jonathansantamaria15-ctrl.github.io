# Hosteleria SaaS — plataforma multi-tenant para cartas digitales

Un unico motor web (Next.js + Supabase) capaz de representar muchos
establecimientos hosteleros mediante datos y configuracion, no codigo por
restaurante. Tres experiencias sobre el mismo motor:

- **MASTER** (`/master`) — tu, como SUPERADMIN de la plataforma.
- **BUSINESS** (`/business/[id]`) — propietarios, gerentes y empleados de
  cada establecimiento.
- **PUBLIC** (`/r/[slug]`, `/q/[code]`) — el comensal, sin cuenta, mobile-first.

Y un **servidor MCP** propio para que Claude actue como agente MASTER: crea
y edita establecimientos completos (identidad visual, carta, mesas, QR)
mediante herramientas controladas, nunca con SQL libre.

## Quickstart

```bash
npm install
cp .env.example .env.local   # rellena con tu proyecto Supabase (ver DEPLOYMENT.md)
npm run dev                  # http://localhost:3000
```

Sin un proyecto Supabase conectado, la app arranca y las paginas publicas
sin datos (login, landing, 404) funcionan, pero cualquier flujo con datos
(auth, dashboards, carta) necesita un proyecto real. Ver `DEPLOYMENT.md`
para los pasos exactos (gratis, ~10 minutos).

Una vez conectado un proyecto Supabase:

```bash
# aplica el esquema: pega el contenido de supabase/migrations/*.sql
# (en orden) en el SQL Editor de tu proyecto Supabase, o usa `supabase db push`
# si tienes la CLI y Docker instalados localmente.

npm run seed     # crea "Restaurante Demo Cantabria" + cuentas de prueba
npm run dev
```

Primer usuario que inicia sesion y visita `/master`: puede reclamar el rol
SUPERADMIN una unica vez (botón "Convertirme en SUPERADMIN"), sin tocar SQL.

## Scripts

| Comando | Que hace |
| --- | --- |
| `npm run dev` | servidor de desarrollo |
| `npm run build` / `npm start` | build + arranque de produccion |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (ver nota sobre `mcp-server/` abajo) |
| `npm test` | vitest (unit + RLS de integracion contra Postgres local) |
| `npm run db:reset` | recrea la base de datos de test local y aplica las migraciones reales |
| `npm run seed` | siembra el establecimiento demo en tu proyecto Supabase real |
| `npm run mcp` | arranca el servidor MCP (stdio) para conectarlo a Claude |

## Estructura

```
src/app/            rutas Next.js: (auth), master/, business/[businessId]/, r/[slug], q/[code], api/
src/components/      ui/ (chrome MASTER/BUSINESS), public/ (design system del comensal), chatbot/, theme/
src/lib/             auth, supabase clients, schemas (zod), services/ (dominio compartido), chatbot, qr, theme, menu
supabase/migrations/ esquema SQL + RLS (fuente de verdad; aplicar en Supabase)
mcp-server/          servidor MCP (Node, stdio) que reutiliza src/lib/services
scripts/             seed de datos demo, harness de tests RLS locales
tests/               vitest: RLS de integracion, motor de carta, chatbot, QR, MCP
```

## Documentacion

- `ARCHITECTURE.md` — decisiones de arquitectura y el principio CLAUDE=DIRECTOR / MOTOR=CONSTRUCTOR.
- `DATABASE.md` — esquema, RLS, funciones.
- `MCP.md` — catalogo de herramientas MCP y como conectar Claude.
- `DEPLOYMENT.md` — Supabase, Google OAuth, despliegue (Vercel u otra alternativa gratuita).
- `SECURITY.md` — modelo de aislamiento multi-tenant, RLS, riesgos conocidos.
- `PRODUCT_SPEC.md` — especificacion original y decisiones finales tomadas.

## Nota sobre este repositorio

Este repo es la pagina de GitHub Pages personal de la cuenta (una app movil
no relacionada, `legacy-static/`). Este proyecto vive en la rama
`claude/saas-hosteleria-mvp-9a9yk5` y no toca `main` ni el sitio publicado.
GitHub Pages no puede servir esta aplicacion (necesita rutas dinamicas, auth
por cookies, API routes) — el despliegue recomendado es Vercel u otra
plataforma Node/Next compatible; ver `DEPLOYMENT.md`.
