# MCP: Claude como agente MASTER

`mcp-server/` es un servidor MCP standalone (Node, transporte **stdio** —
el mismo mecanismo que usa Claude Desktop/Code para conectar apps locales;
no abre ningun puerto de red, así que evita por completo la clase de
vulnerabilidad "DNS rebinding" de los transportes HTTP/SSE). Expone
herramientas controladas sobre la misma capa de servicio
(`src/lib/services/*`) que usan los dashboards — Claude nunca ejecuta SQL
libre, todo pasa por zod + las mismas reglas de producto.

## Conectarlo a Claude Code

1. Asegurate de que `.env.local` en la raiz del repo tiene
   `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` de tu proyecto
   Supabase real (ver `DEPLOYMENT.md`).
2. Anade el servidor a tu configuracion de Claude Code (`.mcp.json` en el
   repo, o la config global de Claude Desktop):

```json
{
  "mcpServers": {
    "hosteleria-saas": {
      "command": "npx",
      "args": ["tsx", "mcp-server/src/index.ts"],
      "cwd": "/ruta/absoluta/a/este/repo"
    }
  }
}
```

3. Reinicia Claude Code/Desktop. Deberías ver las herramientas listadas
   (prefijo `hosteleria-saas`).

## Modelo de autorizacion

El servidor MCP usa la **service_role key** de Supabase: quien puede
ejecutar este proceso (tu, localmente) tiene el mismo nivel de acceso que
SUPERADMIN. Es intencional (spec: "Claude = agente MASTER"), no un bug —
la clave nunca sale de tu maquina ni se expone a un navegador. Cada
herramienta sigue validando su input con zod y aplicando las reglas de
producto (nunca inventar alergenos/precios, publicar es siempre explicito,
vocabulario de alergenos cerrado a los 14 de la UE, tipografias limitadas a
la lista curada, etc).

## Catalogo de herramientas

**Negocio**
`create_business`, `get_business`, `update_business`, `list_businesses`,
`set_business_theme`, `get_business_preview`, `publish_business`,
`unpublish_business`

**Carta**
`create_menu`, `update_menu`, `import_menu` (bulk, secciones+productos de
una vez), `create_menu_section`, `update_menu_section`,
`delete_menu_section`, `reorder_menu_sections`, `create_product`,
`update_product`, `upsert_products` (bulk), `delete_product`,
`set_product_availability`, `reorder_products`, `get_menu`

**Mesas y QR**
`create_zone`, `create_table`, `create_tables_bulk`, `update_table`,
`delete_table`, `create_qr`, `generate_qrs_bulk`, `update_qr_assignment`,
`disable_qr`, `list_tables_and_qrs`

**Servicios e integraciones**
`set_business_services`, `list_business_services`

**Medios**
`upload_media` (acepta `base64`+`content_type` o una `url` ya alojada),
`list_media`

**Analitica**
`get_business_analytics`, `get_platform_summary`

Ninguna herramienta ejecuta SQL arbitrario ni acepta una consulta libre —
cada una tiene un input schema zod estricto y una operacion de producto
concreta (ver `mcp-server/src/tools/*.ts`).

## Seguridad del agente: DRAFT vs PUBLISHED

`create_business` siempre crea en `draft`. `create_product`/`upsert_products`
respetan el `status` que se les pase (por defecto `draft` si no se indica
en el schema de servicio). **Publicar es siempre una llamada explicita y
separada** (`publish_business`) — ninguna otra herramienta cambia el
estado de publicacion. `get_business_preview` deja ver exactamente que se
publicaria (tema + carta completa, incluyendo borradores) sin publicar
nada.

Las descripciones de `create_product`/`upsert_products`/`import_menu`
instruyen explicitamente a Claude a omitir (no inventar) cualquier campo
no confirmado en la fuente (foto, texto, PDF) — ingredientes, alergenos,
precios. Si Claude no sabe un dato, debe dejarlo fuera; el motor nunca
"rellena" campos vacios con contenido inventado.

## Ejemplo de flujo (lo que deberias poder pedirle a Claude)

```
Tu: "Crea un restaurante llamado 'Marisqueria El Faro'. Aqui tienes su
     logo, tres fotos del local y una foto de la carta."
Claude: analiza las imagenes -> decide tema (colores/tipografia acordes al
     logo) -> create_business -> upload_media (logo + hero) ->
     set_business_theme -> import_menu (con lo que puede leer de la foto de
     la carta; deja fuera lo que no puede confirmar) -> get_business_preview
Tu: "Enseñame la preview." -> Claude comparte la URL de preview.
Tu: "Crea 20 mesas interiores y 8 de terraza, y genera sus QR."
Claude: create_zone x2 -> create_tables_bulk x2 -> generate_qrs_bulk
Tu: "Publica el restaurante." -> Claude llama publish_business (solo tras
     tu confirmacion explicita).
```

## Verificacion

`tests/unit/mcp-server.test.ts` conecta un cliente MCP real (SDK oficial,
transporte en memoria) contra el servidor, lista las herramientas y
verifica: (a) estan todas las requeridas por el spec, (b) ninguna se llama
`sql`/`query`/`execute`/`raw`, (c) el input invalido se rechaza (nombre
vacio, precio negativo, alergeno fuera del vocabulario cerrado, tipografia
fuera de la lista curada) antes de tocar Supabase.

> Nota de tooling: `mcp-server/` esta excluido del `tsc --noEmit` de la raiz
> porque los tipos condicionales de `@modelcontextprotocol/sdk` (zod-compat)
> vuelven `tsc` extremadamente lento con muchas herramientas en un mismo
> proyecto (confirmado: incluso un puñado de herramientas tardaba >60s). No
> afecta al comportamiento en tiempo de ejecucion — `mcp-server/tsconfig.json`
> existe para el editor, y la correccion real se verifica con el test de
> arriba (vitest/esbuild no hace type-checking completo, así que no sufre
> el mismo problema) y ejecutando el servidor de verdad (`npm run mcp`).
