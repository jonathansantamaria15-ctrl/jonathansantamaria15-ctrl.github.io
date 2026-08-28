#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerBusinessTools } from "./tools/business.js";
import { registerMenuTools } from "./tools/menu.js";
import { registerQrTools } from "./tools/qr.js";
import { registerServiceTools } from "./tools/services.js";
import { registerAnalyticsTools } from "./tools/analytics.js";
import { registerMediaTools } from "./tools/media.js";

const server = new McpServer({
  name: "hosteleria-saas",
  version: "1.0.0",
  description:
    "Controlled admin API for the multi-tenant hospitality SaaS platform. " +
    "Every tool validates input, is scoped to a single business_id, and " +
    "never writes unconfirmed data (no invented allergens/ingredients/prices). " +
    "Publishing is always a separate, explicit action.",
});

registerBusinessTools(server);
registerMenuTools(server);
registerQrTools(server);
registerServiceTools(server);
registerAnalyticsTools(server);
registerMediaTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("hosteleria-saas MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal MCP server error:", error);
  process.exit(1);
});
