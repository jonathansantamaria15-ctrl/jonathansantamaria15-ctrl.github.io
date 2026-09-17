import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAdminClient } from "../supabase.js";
import { guarded } from "./helpers.js";
import { upsertBusinessService, listBusinessServices } from "../../../src/lib/services/integrations-service.js";
import { serviceUpsertSchema } from "../../../src/lib/schemas.js";

export function registerServiceTools(server: McpServer) {
  server.registerTool(
    "set_business_services",
    {
      title: "Configurar servicios del negocio",
      description:
        "Activa/edita uno o varios servicios publicos (Google Maps, telefono, WhatsApp, web, redes sociales, reservas, resenas, delivery, wifi). Solo los marcados como activos apareceran en la carta publica.",
      inputSchema: { business_id: z.string().uuid(), services: z.array(serviceUpsertSchema).min(1).max(12) },
    },
    async ({ business_id, services }) =>
      guarded(async () => {
        const admin = getAdminClient();
        const results = [];
        for (const s of services) results.push(await upsertBusinessService(admin, business_id, s));
        return results;
      })
  );

  server.registerTool(
    "list_business_services",
    {
      title: "Listar servicios",
      description: "Lista los servicios configurados de un establecimiento.",
      inputSchema: { business_id: z.string().uuid() },
    },
    async ({ business_id }) => guarded(async () => listBusinessServices(getAdminClient(), business_id))
  );
}
