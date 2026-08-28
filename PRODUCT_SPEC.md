# Especificacion de producto y decisiones finales

Resumen de la especificacion original (SaaS multi-tenant para hosteleria)
y las decisiones tecnicas tomadas al implementar la V1. Para el detalle de
cada decision ver `ARCHITECTURE.md` / `DATABASE.md` / `SECURITY.md` / `MCP.md`.

## Concepto

Un unico motor web multi-tenant (no una web por restaurante) con tres
experiencias: **MASTER** (SUPERADMIN, `/master`), **BUSINESS** (owner/
manager/employee, `/business/[businessId]`) y **PUBLIC** (comensal, sin
cuenta, `/r/[slug]` + `/q/[code]`). Arquitectura preparada para 3D/AR,
reservas, pedidos, fidelizacion y nuevas verticales, sin implementarlas
ahora (campos ya presentes: `products.model_3d_url`, `ar_enabled`,
`metadata`; `businesses.vertical`).

## Restriccion economica

Stack elegido para 0€/mes en el free tier: Supabase (Postgres+Auth+
Storage) + Vercel + librerias open-source (`qrcode`, `recharts`, zod). Sin
QR de terceros, sin CMS de pago, sin analitica de pago, sin IA en el
runtime del comensal. Ver `DEPLOYMENT.md`.

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth,
Storage) + `@supabase/ssr`. **Decision**: Next 15.5.x en vez de 16.x (post
corte de conocimiento del modelo, ver `SECURITY.md`); Tailwind v3 en vez de
v4 (mas predecible para un sistema de theming basado en CSS vars a esta
escala).

## Arquitectura multi-tenant y roles

`businesses`/`memberships`/`superadmins` + RLS en cada tabla de tenant.
SUPERADMIN > OWNER > MANAGER > EMPLOYEE. **Decision de diseño**: EMPLOYEE
no tiene UPDATE directo sobre `products`; su unico camino de escritura es
la RPC `set_product_availability`, exactamente el permiso minimo que pide
el spec ("como minimo debe poder... cambiar disponibilidad/agotado"). Ver
`DATABASE.md`.

## Autenticacion

Email+contraseña, recuperacion, Google OAuth, invitaciones por email+rol,
`accept_invitation` valida que el email coincide. **Decision**: el
propietario de un negocio se asigna mediante el mismo mecanismo de
invitacion (tabla `invitations`, `role='owner'`), pero restringido por RLS
a que solo SUPERADMIN pueda crear una invitacion de ese rol — separa
"SUPERADMIN asigna propietario" de "OWNER invita a su equipo", tal como
pide el spec sin necesitar un mecanismo distinto.

## MASTER dashboard

Estadisticas de plataforma (`platform_summary()`), listado de
establecimientos con estado/propietario/publicar-despublicar, `+ NUEVO
LOCAL` con el minimo de campos (nombre, opcional: eslogan, email del
propietario) — **deliberadamente no** un CMS grande, tal como pide el spec
("mi metodo principal sera Claude via MCP"). Placeholders explicitos para
MRR/altas-bajas (esquema listo, sistema comercial no implementado en V1).

## Claude como agente MASTER (MCP)

Servidor MCP propio (`mcp-server/`, transporte stdio) con ~30 herramientas
sobre la misma capa de servicio que usan los dashboards — nunca SQL libre.
Ver catalogo completo y modelo de autorizacion en `MCP.md`. Principio
CLAUDE=DIRECTOR / MOTOR=CONSTRUCTOR: Claude decide, el motor valida-
persiste-renderiza de forma deterministica.

## Seguridad del agente / estados de publicacion

`businesses.status`: `draft`/`published`/`unpublished`. Todo lo que crea
Claude nace en `draft`; `publish_business` es la unica herramienta que
publica, y es una llamada separada y explicita (nunca automatica). Ningun
campo de ingredientes/alergenos se infiere: si la fuente no lo confirma, se
omite (`null`), nunca se rellena con conocimiento general — reforzado en
las descripciones de las herramientas MCP y en el motor del chatbot.

## Motor universal de cartas

Ver `DATABASE.md`. Cubre desde "Cafe solo — 1,50€" hasta un plato con
ingredientes, los 14 alergenos UE (vocabulario cerrado, nunca texto libre
adivinado), variantes, suplementos, peso/racion/calorias, picante,
maridaje, y campos ya listos para 3D/AR. Ningun campo vacio se muestra al
comensal (renderizado condicional en `product-detail.tsx`).

## Sistema visual universal

`business_themes` (colores, tipografias curadas, estilo de boton/tarjeta/
navegacion/hero, logo, hero, galeria) + componentes con variantes
(`src/components/public/*`) aplicados via CSS custom properties
(`ThemeProvider`). Un mismo codigo, apariencia distinta por tenant.

## Business dashboard

Panel tradicional, chrome neutro con acento moderado de la identidad del
negocio (borde superior + logo), **no** sacrifica usabilidad por
personalizacion. Toggle de disponibilidad optimizado para ser rapido
(`/business/[id]/availability`, un toque = disponible/agotado).

## Servicios/integraciones

`business_services`: maps, telefono, whatsapp, email, web, instagram,
facebook, tiktok, reservas (URL), reseñas (URL), delivery (URL), wifi.
Solo los `is_active` aparecen en la carta publica. Explicitamente separado
de "Login con Google" (autenticacion, no integracion de negocio).

## QR propio

Libreria open-source (`qrcode`), sin proveedores externos. `/q/{code}` no
contiene la carta; resuelve negocio+mesa/zona server-side y registra el
evento. Reasignar un QR (`update_qr_assignment`) no cambia su codigo — el
QR fisico impreso sigue funcionando. QR general y QR por mesa/zona/canal
soportados (`qr_codes.type`).

## Personalizacion QR

`qr_templates`: colores, logo, marco, esquinas, texto CTA, posicion de
etiqueta, tipografia (curada). Renderizado propio sobre la matriz del QR
(no post-proceso del SVG de la libreria) para poder validar **contraste**
(`src/lib/qr/render.ts`, `MIN_QR_CONTRAST`) y mantener siempre la
**quiet zone** (4 modulos) y el logo dentro de un limite seguro
(≤22% del ancho, nivel de correccion de errores `H`). Descarga SVG y PNG;
arquitectura lista para hojas de impresion/PDF (no implementado en V1: el
spec permite dejarlo preparado sin construirlo).

## Experiencia del comensal

Mobile-first, sin cuenta, sin instalar nada. PWA/manifest presente
(`src/app/manifest.ts`) pero no intrusivo. Carta, hero, categorias,
productos, filtros (via chatbot), servicios activos, chatbot con el mismo
tema visual del negocio.

## Chatbot del comensal

Cerrado, sin LLM (`src/lib/chatbot/engine.ts`): intents/reglas/fuzzy
matching sobre los datos publicados. Fallback seguro explicito cuando el
dato no esta confirmado. Cubierto por 13 tests unitarios que verifican,
entre otras cosas, que nunca "inventa" una respuesta sobre datos no
declarados.

## Analitica propia

`analytics_events` (sin PII), eventos: `qr_scanned`, `menu_opened`,
`section_viewed`, `product_viewed`, `chat_opened`, `chat_query`,
`service_clicked`. Dashboards BUSINESS (grafico diario + top
productos/QR) y MASTER (agregados de plataforma).

## Preparacion 3D/AR

Campos de esquema listos (`model_3d_url`, `ar_enabled`, `metadata`); sin
implementacion de visor WebAR en V1 (explicitamente fuera de alcance del
MVP segun el spec).

## Datos demo

`scripts/seed.ts` + `scripts/demo-data.ts`: "Restaurante Demo Cantabria"
completo (identidad, hero, 5+1 secciones incluyendo una en borrador,
productos simples y complejos, alergenos/variantes/suplementos, un
producto agotado, destacados/recomendados/nuevos/populares, servicios,
zonas, mesas, QR, 4 cuentas de desarrollo con roles distintos, y ~14 dias
de eventos de analitica de ejemplo). Requiere un proyecto Supabase real
conectado (ver `DEPLOYMENT.md`) — no se pudo ejecutar dentro del entorno
de desarrollo de esta sesion por no disponer de esas credenciales.

## No hacer (verificado)

Sin mocks presentados como funcionalidad; sin negocio hardcodeado; sin
codigo distinto por restaurante; sin QR de terceros; sin IA generativa
para el comensal; sin invencion de alergenos/ingredientes/precios; sin
`service_role` en el navegador (paquete `server-only` lo hace fallar en
build si se intenta); sin acceso cross-tenant (verificado con tests RLS
reales); sin CMS MASTER sobredimensionado; sin Kubernetes/microservicios.
