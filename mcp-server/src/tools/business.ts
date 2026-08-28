import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAdminClient, getSiteUrl } from "../supabase.js";
import { guarded } from "./helpers.js";
import {
  createBusiness,
  getBusiness,
  listBusinesses,
  updateBusiness,
  setBusinessStatus,
  getBusinessTheme,
  setBusinessTheme,
} from "../../../src/lib/services/business-service.js";
import { hydrateMenu } from "../../../src/lib/services/menu-service.js";
import { listBusinessServices } from "../../../src/lib/services/integrations-service.js";
import { listZones, listTables, listQrCodes } from "../../../src/lib/services/qr-service.js";
import { businessCreateSchema, businessUpdateSchema, themeUpdateSchema } from "../../../src/lib/schemas.js";

export function registerBusinessTools(server: McpServer) {
  server.registerTool(
    "create_business",
    {
      title: "Crear establecimiento",
      description:
        "Crea un nuevo establecimiento en estado DRAFT, con tema por defecto y una carta vacia lista para rellenar. Nunca lo publica automaticamente.",
      inputSchema: businessCreateSchema.shape,
    },
    async (args) =>
      guarded(async () => {
        const business = await createBusiness(getAdminClient(), args);
        return { business, note: "Creado en estado draft. Usa publish_business cuando este listo." };
      })
  );

  server.registerTool(
    "get_business",
    {
      title: "Obtener establecimiento",
      description: "Devuelve los datos de un establecimiento por id.",
      inputSchema: { business_id: z.string().uuid() },
    },
    async ({ business_id }) => guarded(async () => getBusiness(getAdminClient(), business_id))
  );

  server.registerTool(
    "list_businesses",
    {
      title: "Listar establecimientos",
      description: "Lista todos los establecimientos de la plataforma, opcionalmente filtrados por estado.",
      inputSchema: { status: z.enum(["draft", "published", "unpublished"]).optional() },
    },
    async ({ status }) => guarded(async () => listBusinesses(getAdminClient(), { status }))
  );

  server.registerTool(
    "update_business",
    {
      title: "Actualizar establecimiento",
      description: "Actualiza datos basicos de un establecimiento (nombre, contacto, horarios, etc).",
      inputSchema: { business_id: z.string().uuid(), ...businessUpdateSchema.shape },
    },
    async ({ business_id, ...patch }) => guarded(async () => updateBusiness(getAdminClient(), business_id, patch))
  );

  server.registerTool(
    "set_business_theme",
    {
      title: "Configurar tema visual",
      description:
        "Configura la identidad visual del establecimiento (colores, tipografias, estilos de componentes, logo, hero, galeria). Elige tipografias solo de la lista permitida.",
      inputSchema: { business_id: z.string().uuid(), ...themeUpdateSchema.shape },
    },
    async ({ business_id, ...patch }) => guarded(async () => setBusinessTheme(getAdminClient(), business_id, patch))
  );

  server.registerTool(
    "get_business_preview",
    {
      title: "Previsualizar establecimiento",
      description:
        "Devuelve una instantanea completa de como se veria la carta publica ahora mismo (tema, carta con TODAS las secciones/productos incluidos los draft, servicios activos), sin publicar nada.",
      inputSchema: { business_id: z.string().uuid() },
    },
    async ({ business_id }) =>
      guarded(async () => {
        const admin = getAdminClient();
        const [business, theme, menu, services, zones, tables, qrCodes] = await Promise.all([
          getBusiness(admin, business_id),
          getBusinessTheme(admin, business_id),
          hydrateMenu(admin, business_id),
          listBusinessServices(admin, business_id),
          listZones(admin, business_id),
          listTables(admin, business_id),
          listQrCodes(admin, business_id),
        ]);
        const previewUrl = business ? `${getSiteUrl()}/r/${business.slug}` : null;
        return { business, theme, menu, services, zones, tables_count: tables.length, qr_codes_count: qrCodes.length, previewUrl };
      })
  );

  server.registerTool(
    "publish_business",
    {
      title: "Publicar establecimiento",
      description:
        "Hace que el establecimiento y su contenido publicado sean visibles publicamente en /r/{slug} y los QR activos. Requiere confirmacion explicita del usuario antes de llamarlo -- nunca lo invoques automaticamente sin que el propietario de la plataforma lo haya pedido.",
      inputSchema: { business_id: z.string().uuid() },
    },
    async ({ business_id }) =>
      guarded(async () => {
        const business = await setBusinessStatus(getAdminClient(), business_id, "published");
        return { business, url: `${getSiteUrl()}/r/${business.slug}` };
      })
  );

  server.registerTool(
    "unpublish_business",
    {
      title: "Despublicar establecimiento",
      description: "Oculta el establecimiento de la vista publica (vuelve a estado 'unpublished').",
      inputSchema: { business_id: z.string().uuid() },
    },
    async ({ business_id }) => guarded(async () => setBusinessStatus(getAdminClient(), business_id, "unpublished"))
  );
}
