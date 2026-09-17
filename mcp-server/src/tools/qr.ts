import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAdminClient, getSiteUrl } from "../supabase.js";
import { guarded } from "./helpers.js";
import {
  createZone,
  createTable,
  createTablesBulk,
  updateTable,
  deleteTable,
  createQr,
  generateQrsForTables,
  updateQrAssignment,
  setQrActive,
  listTables,
  listQrCodes,
} from "../../../src/lib/services/qr-service.js";
import { zoneCreateSchema, tableCreateSchema, tablesBulkCreateSchema, qrCreateSchema } from "../../../src/lib/schemas.js";

export function registerQrTools(server: McpServer) {
  server.registerTool(
    "create_zone",
    {
      title: "Crear zona",
      description: "Crea una zona del local (interior, terraza, barra, privado, otro).",
      inputSchema: { business_id: z.string().uuid(), ...zoneCreateSchema.shape },
    },
    async ({ business_id, ...input }) => guarded(async () => createZone(getAdminClient(), business_id, input))
  );

  server.registerTool(
    "create_table",
    {
      title: "Crear mesa",
      description: "Crea una mesa individual, opcionalmente asignada a una zona.",
      inputSchema: { business_id: z.string().uuid(), ...tableCreateSchema.shape },
    },
    async ({ business_id, ...input }) => guarded(async () => createTable(getAdminClient(), business_id, input))
  );

  server.registerTool(
    "create_tables_bulk",
    {
      title: "Crear mesas en bloque",
      description:
        "Crea varias mesas de una vez (por ejemplo, 20 interiores y 8 de terraza en dos llamadas). Evita crear mesas una a una.",
      inputSchema: { business_id: z.string().uuid(), ...tablesBulkCreateSchema.shape },
    },
    async ({ business_id, ...input }) => guarded(async () => createTablesBulk(getAdminClient(), business_id, input))
  );

  server.registerTool(
    "update_table",
    {
      title: "Actualizar mesa",
      description: "Cambia la etiqueta, zona, capacidad o estado de una mesa.",
      inputSchema: {
        business_id: z.string().uuid(),
        table_id: z.string().uuid(),
        label: z.string().min(1).max(40).optional(),
        zone_id: z.string().uuid().nullable().optional(),
        capacity: z.number().int().min(1).max(60).nullable().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      },
    },
    async ({ business_id, table_id, ...patch }) =>
      guarded(async () => updateTable(getAdminClient(), business_id, table_id, patch))
  );

  server.registerTool(
    "delete_table",
    {
      title: "Eliminar mesa",
      description: "Elimina una mesa. Los QR ya generados para ella quedan sin mesa asignada (no se borran).",
      inputSchema: { business_id: z.string().uuid(), table_id: z.string().uuid() },
    },
    async ({ business_id, table_id }) => guarded(async () => deleteTable(getAdminClient(), business_id, table_id))
  );

  server.registerTool(
    "create_qr",
    {
      title: "Crear codigo QR",
      description:
        "Crea un codigo QR permanente (general, de mesa, de zona o personalizado). El QR nunca contiene la carta, solo un identificador que el sistema resuelve en el momento del escaneo.",
      inputSchema: { business_id: z.string().uuid(), ...qrCreateSchema.shape },
    },
    async ({ business_id, ...input }) =>
      guarded(async () => {
        const qr = await createQr(getAdminClient(), business_id, input);
        return { qr, scan_url: `${getSiteUrl()}/q/${qr.code}`, download_svg: `${getSiteUrl()}/api/qr/${qr.id}?format=svg` };
      })
  );

  server.registerTool(
    "generate_qrs_bulk",
    {
      title: "Generar QR para varias mesas",
      description: "Genera un codigo QR de tipo mesa para cada id de mesa indicado, con la plantilla dada (o la de por defecto).",
      inputSchema: {
        business_id: z.string().uuid(),
        table_ids: z.array(z.string().uuid()).min(1).max(500),
        template_id: z.string().uuid().nullable().optional(),
      },
    },
    async ({ business_id, table_ids, template_id }) =>
      guarded(async () => {
        const qrs = await generateQrsForTables(getAdminClient(), business_id, table_ids, template_id ?? null);
        return { created: qrs.length, qrs: qrs.map((q) => ({ id: q.id, label: q.label, scan_url: `${getSiteUrl()}/q/${q.code}` })) };
      })
  );

  server.registerTool(
    "update_qr_assignment",
    {
      title: "Reasignar QR",
      description:
        "Cambia a que mesa o zona apunta un QR YA EXISTENTE, sin generar uno nuevo ni cambiar su codigo (el QR fisico impreso sigue funcionando).",
      inputSchema: {
        business_id: z.string().uuid(),
        qr_id: z.string().uuid(),
        assigned_table_id: z.string().uuid().nullable().optional(),
        assigned_zone_id: z.string().uuid().nullable().optional(),
        label: z.string().min(1).max(60).optional(),
      },
    },
    async ({ business_id, qr_id, ...patch }) =>
      guarded(async () => updateQrAssignment(getAdminClient(), business_id, qr_id, patch))
  );

  server.registerTool(
    "disable_qr",
    {
      title: "Desactivar QR",
      description: "Desactiva un codigo QR (deja de resolver). Vuelve a activarse con el mismo id si se necesita.",
      inputSchema: { business_id: z.string().uuid(), qr_id: z.string().uuid(), active: z.boolean().default(false) },
    },
    async ({ business_id, qr_id, active }) => guarded(async () => setQrActive(getAdminClient(), business_id, qr_id, active))
  );

  server.registerTool(
    "list_tables_and_qrs",
    {
      title: "Listar mesas y QR",
      description: "Lista las mesas y los codigos QR de un establecimiento, para saber que falta generar.",
      inputSchema: { business_id: z.string().uuid() },
    },
    async ({ business_id }) =>
      guarded(async () => {
        const admin = getAdminClient();
        const [tables, qrs] = await Promise.all([listTables(admin, business_id), listQrCodes(admin, business_id)]);
        return { tables, qrs };
      })
  );
}
