# Arquitectura

## Principio de generacion: CLAUDE = DIRECTOR, MOTOR = CONSTRUCTOR

No existe generacion de codigo por restaurante. Un unico motor web
renderiza N establecimientos a partir de:

1. **Datos** (`businesses`, `menus`, `products`, ...) — el contenido real.
2. **Configuracion** (`business_themes`, `qr_templates`) — la identidad visual.
3. **Componentes reutilizables** (`src/components/public/*`) que leen esa
   configuracion vía variables CSS (`--tenant-*`, ver
   `src/lib/theme/tokens.ts` y `src/components/theme/theme-provider.tsx`) y
   props de variante (`button_style`, `card_style`, `nav_style`, `hero_style`...).

Claude (via MCP, `mcp-server/`) analiza fotos/cartas y decide *que* datos y
*que* configuracion usar. Nuestro codigo valida (zod), persiste (Postgres +
RLS) y renderiza de forma determinista — Claude nunca genera HTML/CSS/TSX
para un restaurante concreto.

```
Claude (director)  --tools MCP-->  capa de servicio (src/lib/services/*)
                                          |
                                          v
                                   Postgres + RLS  <-- estado real
                                          ^
                                          |
        Next.js dashboards (MASTER/BUSINESS) --misma capa de servicio-->
                                          |
                                          v
                          Next.js PUBLIC (/r/[slug]) --misma capa de servicio-->
```

La capa de servicio (`src/lib/services/*.ts`) es la unica fuente de logica
de negocio: creacion de negocios, carta, mesas/QR, servicios, analitica.
Tanto los Server Actions del dashboard como las herramientas MCP la llaman
igual — nunca hay dos implementaciones de la misma regla.

## Multi-tenancy

- Cada establecimiento (`businesses`) es un tenant con `id` (uuid) propio.
- Todas las tablas de contenido llevan `business_id` y estan protegidas por
  RLS (ver `DATABASE.md` / `SECURITY.md`). El frontend nunca es la barrera
  de seguridad: cada consulta pasa por Postgres RLS o, en rutas de servidor
  con `service_role`, por comprobaciones explicitas equivalentes.
- El propio panel BUSINESS resuelve el negocio actual desde la URL
  (`/business/[businessId]/...`) y valida el rol del usuario en cada layout
  y en cada Server Action (`requireBusinessRole`), no solo ocultando UI.

## Roles (RBAC)

`SUPERADMIN` (tabla `superadmins`, fuera de `businesses`) > `OWNER` >
`MANAGER` > `EMPLOYEE` (estos tres en `memberships.role`, por negocio). Ver
`DATABASE.md` para las politicas RLS exactas y `SECURITY.md` para las
pruebas que las verifican.

## Sistema visual (design system)

`src/components/public/*` son los unicos componentes que renderizan al
comensal: `Hero`, `CategoryNav`, `ProductCard`, `ProductDetail`, `Gallery`,
`FooterServices`, `TenantButton`, mas el chatbot. Cada uno soporta varias
variantes (`hero_style`, `card_style`, `nav_style`, `button_style`) fijadas
por `business_themes`. Los colores/tipografias se aplican via CSS custom
properties (`ThemeProvider`), asi que cambiar el tema no requiere ningun
despliegue ni cambio de codigo.

El panel BUSINESS (`src/app/business/**`) usa un chrome neutro
(`src/components/ui/*`) con un acento moderado del color primario del
negocio (borde superior + logo) — usabilidad ante todo, identidad visual
secundaria, tal como pide el spec.

## Motor de carta

`menus` -> `menu_sections` (jerarquia via `parent_id`) -> `products` ->
`product_variants` / `product_extras`. Diseñado para representar desde
"Cafe solo — 1,50€" hasta un plato con ingredientes, alergenos declarados,
variantes de tamaño y suplementos (ver `DATABASE.md`). Ningun campo vacio
se muestra al comensal (`src/components/public/product-detail.tsx` solo
renderiza secciones cuyo dato existe).

## QR propio

`qr_codes.code` es un identificador opaco resuelto server-side en
`/q/[code]` (`src/app/q/[code]/route.ts`, usa el cliente `service_role`,
nunca expuesto a `anon`). Resuelve negocio + mesa/zona, registra el evento
`qr_scanned` y redirige a `/r/[slug]?qr=...`. Reasignar un QR a otra mesa
(`update_qr_assignment`) no cambia `code` — el codigo fisico impreso sigue
funcionando. Renderizado con la libreria open-source `qrcode`
(`src/lib/qr/render.ts`), matriz propia para poder componer logo/marco/
etiqueta y validar contraste (nunca se genera un QR ilegible).

## Chatbot cerrado

`src/lib/chatbot/engine.ts` es una funcion pura, sin LLM ni red: normaliza
la pregunta, aplica reglas (precio, dieta, alergenos declarados, categoria,
producto especifico) sobre los datos de la carta ya cargados en la pagina.
Si el dato no esta declarado, responde con un fallback fijo — nunca infiere
("La carta no contiene informacion confirmada... Consulta con el personal").

## Analitica

Eventos minimos (`analytics_events`, sin PII, `session_id` anonimo por
pestaña) insertados solo via `/api/track` (server, `service_role`) — RLS no
concede `INSERT` a `anon`/`authenticated` en esa tabla a proposito. Las
funciones SQL `analytics_summary`/`analytics_daily`/`analytics_top_*`
agregan en el propio Postgres respetando RLS (ver `DATABASE.md`).

## Coste de infraestructura

Disenado para el free tier de Supabase (Postgres + Auth + Storage) y de
Vercel (o cualquier host Node compatible). Sin QR de pago, sin CMS de pago,
sin analitica de terceros, sin API de IA en el runtime del comensal. Ver
`DEPLOYMENT.md` para el desglose de coste esperado.

## Preparado para el futuro (no implementado en V1)

- `products.model_3d_url` / `ar_enabled` / `metadata` — listos para
  GLB/GLTF + WebAR sin migracion adicional.
- `businesses.vertical` — hoy `"restaurant"`, el esquema no asume que sea
  el unico vertical.
- `businesses.plan` + estructura de `analytics_events` — MRR/suscripciones
  se pueden construir encima sin tocar el esquema actual (ver el panel
  MASTER, que ya muestra placeholders para esto).
