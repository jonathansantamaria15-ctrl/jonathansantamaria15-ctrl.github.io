import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAdminClient } from "../supabase.js";
import { guarded } from "./helpers.js";
import { getBusinessAnalytics, getPlatformSummary } from "../../../src/lib/services/analytics-service.js";

export function registerAnalyticsTools(server: McpServer) {
  server.registerTool(
    "get_business_analytics",
    {
      title: "Estadisticas del establecimiento",
      description: "Escaneos, visitas, productos y QR mas populares de un establecimiento en los ultimos N dias.",
      inputSchema: { business_id: z.string().uuid(), days: z.number().int().min(1).max(365).default(30) },
    },
    async ({ business_id, days }) => guarded(async () => getBusinessAnalytics(getAdminClient(), business_id, days))
  );

  server.registerTool(
    "get_platform_summary",
    {
      title: "Resumen de la plataforma",
      description: "Estadisticas globales: establecimientos totales/publicados, usuarios, escaneos y visitas de toda la plataforma.",
      inputSchema: {},
    },
    async () => guarded(async () => getPlatformSummary(getAdminClient()))
  );
}
