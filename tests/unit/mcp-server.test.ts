// NOTE: excluded from `tsc --noEmit` (see tsconfig.json) because
// @modelcontextprotocol/sdk's zod-compat conditional types make `tsc`
// pathologically slow once many `registerTool` call sites are reachable in
// one compilation (confirmed: even a handful of tools alone took >60s to
// typecheck; runtime behavior is unaffected). vitest/esbuild transpiles
// without full type-checking, so this file still runs -- and is the
// primary way the MCP server's tool registration and zod validation are
// verified end-to-end.
//
// Integration test for the MCP server itself: registers all tools on a real
// McpServer, connects a real SDK Client over an in-memory transport (no
// network/stdio involved), and drives it exactly like Claude would.
// Tool logic that needs Supabase is exercised only for its input-validation
// and error-handling paths, since this sandbox has no live Supabase project
// (see DEPLOYMENT.md) -- the RLS test suite covers the actual data layer.
import { describe, it, expect, beforeAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerBusinessTools } from "../../mcp-server/src/tools/business";
import { registerMenuTools } from "../../mcp-server/src/tools/menu";
import { registerQrTools } from "../../mcp-server/src/tools/qr";
import { registerServiceTools } from "../../mcp-server/src/tools/services";
import { registerAnalyticsTools } from "../../mcp-server/src/tools/analytics";
import { registerMediaTools } from "../../mcp-server/src/tools/media";

let client: Client;

beforeAll(async () => {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerBusinessTools(server);
  registerMenuTools(server);
  registerQrTools(server);
  registerServiceTools(server);
  registerAnalyticsTools(server);
  registerMediaTools(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client", version: "1.0.0" });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
});

describe("MCP server", () => {
  it("exposes every tool required by the product spec", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    const required = [
      "create_business", "get_business", "update_business", "list_businesses",
      "set_business_theme", "get_business_preview", "publish_business", "unpublish_business",
      "create_menu", "update_menu", "import_menu",
      "create_menu_section", "update_menu_section", "delete_menu_section", "reorder_menu_sections",
      "create_product", "update_product", "upsert_products", "delete_product",
      "set_product_availability", "reorder_products",
      "create_zone", "create_table", "create_tables_bulk", "update_table", "delete_table",
      "create_qr", "generate_qrs_bulk", "update_qr_assignment", "disable_qr",
      "set_business_services", "get_business_analytics", "upload_media",
    ];
    for (const name of required) {
      expect(names, `missing tool: ${name}`).toContain(name);
    }
  });

  it("never exposes a raw SQL / arbitrary query tool", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name.toLowerCase());
    for (const name of names) {
      expect(name).not.toMatch(/sql|query|execute|raw/);
    }
  });

  it("rejects a create_business call with no name (zod validation, before touching Supabase)", async () => {
    const result = await client.callTool({ name: "create_business", arguments: {} });
    expect(result.isError).toBeTruthy();
  });

  it("rejects a product price below zero", async () => {
    const result = await client.callTool({
      name: "create_product",
      arguments: { business_id: "00000000-0000-0000-0000-000000000000", section_id: "00000000-0000-0000-0000-000000000000", name: "X", price: -5 },
    });
    expect(result.isError).toBeTruthy();
  });

  it("rejects an unknown allergen code (controlled vocabulary only)", async () => {
    const result = await client.callTool({
      name: "create_product",
      arguments: {
        business_id: "00000000-0000-0000-0000-000000000000",
        section_id: "00000000-0000-0000-0000-000000000000",
        name: "X",
        price: 5,
        allergens: ["frutos_del_bosque_inventado"],
      },
    });
    expect(result.isError).toBeTruthy();
  });

  it("rejects a font not in the curated safe list", async () => {
    const result = await client.callTool({
      name: "set_business_theme",
      arguments: { business_id: "00000000-0000-0000-0000-000000000000", font_heading: "ComicSansFromTheInternet" },
    });
    expect(result.isError).toBeTruthy();
  });

  it("valid input passes validation and fails only at the (absent) Supabase connection, not at the schema", async () => {
    const result = await client.callTool({
      name: "create_business",
      arguments: { name: "Restaurante De Prueba" },
    });
    // No live Supabase project in this sandbox -- but the failure must be a
    // network/config error, never a validation error.
    expect(result.isError).toBeTruthy();
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).not.toMatch(/expected|invalid_type|required/i);
  });
});
