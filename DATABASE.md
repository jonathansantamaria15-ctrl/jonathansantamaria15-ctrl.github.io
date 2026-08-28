# Base de datos

Fuente de verdad: `supabase/migrations/*.sql`, aplicadas en orden contra un
proyecto Supabase (Postgres 15/16 + Auth + Storage). Este documento resume
el esquema; el SQL es la referencia exacta.

## Tablas

| Tabla | Proposito |
| --- | --- |
| `superadmins` | usuarios con acceso total a la plataforma (tabla separada, no una columna booleana) |
| `profiles` | metadata de usuario (1:1 con `auth.users`, autopoblada por trigger) |
| `businesses` | tenants. `status`: `draft`/`published`/`unpublished` |
| `business_themes` | identidad visual (1:1 con `businesses`) |
| `memberships` | `(business_id, user_id, role)`, `role`: `owner`/`manager`/`employee` |
| `invitations` | invitaciones por email + token, `role` incluye `owner` (solo SUPERADMIN puede crearlas, ver RLS) |
| `menus`, `menu_sections`, `products`, `product_variants`, `product_extras` | motor de carta (ver abajo) |
| `zones`, `tables` | organizacion fisica del local |
| `qr_templates`, `qr_codes` | personalizacion visual + codigos QR permanentes |
| `business_services` | integraciones (maps, whatsapp, redes, reservas, delivery, wifi...) |
| `media` | biblioteca de imagenes (referencia a Supabase Storage) |
| `analytics_events` | eventos anonimos (`session_id`, sin PII) |

## Motor de carta

`menus` (1 por negocio, `is_default`) -> `menu_sections` (jerarquia via
`parent_id`, `status` propio) -> `products` -> `product_variants` /
`product_extras`.

`products` incluye, ademas de nombre/precio/imagen: `compare_at_price`,
disponibilidad, destacado/recomendado/nuevo/popular, `ingredients`/
`allergens` (declarados, `text[]`/vocabulario controlado — ver
`src/lib/menu/allergens.ts`, los 14 alergenos que exige la UE), banderas de
dieta (`is_vegetarian`/`is_vegan`/`is_gluten_free`, `null` = no declarado,
nunca inferido), `spice_level`, peso/racion/calorias, notas, y campos ya
preparados para el futuro (`model_3d_url`, `ar_enabled`, `metadata jsonb`).

## RLS: aislamiento multi-tenant

RLS **habilitado en todas las tablas de tenant**, por defecto deniega todo
a `anon`/`authenticated`; solo las policies explicitas conceden acceso.
`service_role` (usado por rutas de servidor concretas y por el MCP server)
sobrepasa RLS — es el unico camino con acceso "de plataforma", y esta
acotado a: `/api/track`, `/q/[code]`, acciones MASTER que crean negocios, y
el servidor MCP.

Patron general por tabla de contenido (`businesses`, `menus`,
`menu_sections`, `products`, ...):

```sql
select: is_superadmin() OR has_business_role(business_id, [owner,manager,employee])
        OR (status = 'published' AND negocio publicado)   -- solo lectura publica
insert/update/delete: is_superadmin() OR has_business_role(business_id, [owner,manager])
```

`zones`/`tables`/`qr_codes`/`qr_templates` **nunca** son legibles por
`anon` — la resolucion publica de un QR pasa por `/q/[code]` (servidor,
`service_role`), no por una consulta directa del navegador.

Casos especiales:

- **EMPLOYEE** no tiene UPDATE directo sobre `products`; solo puede
  invocar la funcion `set_product_availability(product_id, is_available)`
  (`SECURITY DEFINER`, revalida el rol internamente) — es el unico cambio
  que el spec le permite.
- **Invitaciones con `role = 'owner'`**: la policy exige `is_superadmin()`
  explicitamente; un OWNER solo puede invitar `manager`/`employee` para su
  propio negocio.
- **`bootstrap_superadmin()`**: permite que el primer usuario autenticado
  se autoasigne SUPERADMIN, y solo el primero (`raise exception` si la
  tabla `superadmins` ya no esta vacia).
- **`accept_invitation(token)`**: `SECURITY DEFINER`, verifica que el email
  del usuario autenticado coincida (case-insensitive) con el de la
  invitacion antes de crear la membership.

Todo este comportamiento esta cubierto por tests de integracion reales
(`tests/rls/isolation.test.ts`) contra un Postgres local con las mismas
migraciones — ver `SECURITY.md`.

## Storage

Un unico bucket publico `media` (`supabase/migrations/0005_storage.sql`),
objetos con ruta `media/<business_id>/<kind>/...`. Lectura publica (las
imagenes de la carta publicada deben cargar sin auth); escritura solo para
`owner`/`manager` de ese `business_id` (`storage.foldername(name)[1]`) o
`service_role`.

## Analitica

Insercion solo via `service_role` (sin policy de `INSERT` para
`anon`/`authenticated`: `/api/track` es el unico camino). Lectura agregada
via funciones SQL (`analytics_summary`, `analytics_daily`,
`analytics_top_products`, `analytics_top_qr`) que respetan RLS de forma
natural (no son `SECURITY DEFINER`, así que un OWNER solo agrega sus
propios eventos). `platform_summary()` es la unica excepcion `SECURITY
DEFINER` de analitica, porque agrega a proposito entre tenants — revalida
`is_superadmin()` internamente antes de devolver nada.

## Probar el esquema localmente sin un proyecto Supabase

`scripts/local-auth-shim.sql` recrea lo minimo del esquema `auth` (+
`storage`) de Supabase sobre un Postgres 16 vacio para poder aplicar las
migraciones REALES y ejercer las policies REALES con `pg`. `npm run
db:reset` lo hace de principio a fin; `npm test` lo usa automaticamente
para `tests/rls/*.test.ts`. No sustituye a un proyecto Supabase real (no
hay GoTrue/PostgREST), pero prueba exactamente el SQL que se despliega.
