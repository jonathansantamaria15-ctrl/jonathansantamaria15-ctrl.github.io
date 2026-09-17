import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAdminClient } from "../supabase.js";
import { guarded } from "./helpers.js";
import {
  getDefaultMenu,
  updateMenu,
  upsertSection,
  deleteSection,
  reorderSections,
  upsertProduct,
  upsertProductsBulk,
  deleteProduct,
  setProductAvailability,
  reorderProducts,
  hydrateMenu,
} from "../../../src/lib/services/menu-service.js";
import { menuCreateSchema, productUpsertSchema } from "../../../src/lib/schemas.js";
import { ALLERGEN_CODES } from "../../../src/lib/menu/allergens.js";

export function registerMenuTools(server: McpServer) {
  server.registerTool(
    "create_menu",
    {
      title: "Configurar la carta principal",
      description:
        "Actualiza el nombre/idioma de la carta por defecto de un establecimiento (la carta se crea automaticamente con create_business).",
      inputSchema: { business_id: z.string().uuid(), ...menuCreateSchema.shape },
    },
    async ({ business_id, ...patch }) =>
      guarded(async () => {
        const admin = getAdminClient();
        const menu = await getDefaultMenu(admin, business_id);
        if (!menu) throw new Error("Business has no default menu");
        return updateMenu(admin, menu.id, patch);
      })
  );

  server.registerTool(
    "update_menu",
    {
      title: "Actualizar carta",
      description: "Actualiza el estado/descripcion de una carta (menu_id).",
      inputSchema: {
        menu_id: z.string().uuid(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        description: z.string().max(500).optional(),
      },
    },
    async ({ menu_id, ...patch }) => guarded(async () => updateMenu(getAdminClient(), menu_id, patch))
  );

  server.registerTool(
    "create_menu_section",
    {
      title: "Crear categoria/seccion",
      description: "Crea una seccion (categoria) dentro de la carta principal del establecimiento.",
      inputSchema: {
        business_id: z.string().uuid(),
        name: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        image_url: z.string().url().optional(),
        parent_id: z.string().uuid().optional(),
      },
    },
    async ({ business_id, ...rest }) =>
      guarded(async () => {
        const admin = getAdminClient();
        const menu = await getDefaultMenu(admin, business_id);
        if (!menu) throw new Error("Business has no default menu");
        return upsertSection(admin, business_id, { menu_id: menu.id, ...rest });
      })
  );

  server.registerTool(
    "update_menu_section",
    {
      title: "Actualizar categoria/seccion",
      description:
        "Actualiza una seccion existente. Incluye siempre 'name' (aunque no cambie) junto con los campos que quieras modificar.",
      inputSchema: {
        business_id: z.string().uuid(),
        section_id: z.string().uuid(),
        name: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        image_url: z.string().url().optional(),
        parent_id: z.string().uuid().nullable().optional(),
        status: z.enum(["draft", "published", "hidden"]).optional(),
      },
    },
    async ({ business_id, section_id, ...patch }) =>
      guarded(async () => {
        const admin = getAdminClient();
        const menu = await getDefaultMenu(admin, business_id);
        if (!menu) throw new Error("Business has no default menu");
        return upsertSection(admin, business_id, { id: section_id, menu_id: menu.id, ...patch });
      })
  );

  server.registerTool(
    "delete_menu_section",
    {
      title: "Eliminar seccion",
      description: "Elimina una seccion y sus productos.",
      inputSchema: { business_id: z.string().uuid(), section_id: z.string().uuid() },
    },
    async ({ business_id, section_id }) => guarded(async () => deleteSection(getAdminClient(), business_id, section_id))
  );

  server.registerTool(
    "reorder_menu_sections",
    {
      title: "Reordenar secciones",
      description: "Fija el orden de visualizacion de las secciones (lista de ids en el orden deseado).",
      inputSchema: { business_id: z.string().uuid(), ordered_section_ids: z.array(z.string().uuid()) },
    },
    async ({ business_id, ordered_section_ids }) =>
      guarded(async () => {
        await reorderSections(getAdminClient(), business_id, ordered_section_ids);
        return { ok: true };
      })
  );

  server.registerTool(
    "create_product",
    {
      title: "Crear producto",
      description:
        "Crea un producto en una seccion. Solo declara ingredientes/alergenos/dietas/calorias si estan confirmados en la fuente (foto de carta, texto del propietario, etc). Si no lo sabes, omite el campo -- nunca lo inventes.",
      inputSchema: { business_id: z.string().uuid(), ...productUpsertSchema.omit({ id: true }).shape },
    },
    async ({ business_id, ...input }) => guarded(async () => upsertProduct(getAdminClient(), business_id, input))
  );

  server.registerTool(
    "update_product",
    {
      title: "Actualizar producto",
      description:
        "Actualiza un producto existente. Debes incluir section_id, name y price (aunque no cambien) junto con el resto de campos que quieras modificar -- llama antes a get_menu si necesitas ver los valores actuales.",
      inputSchema: {
        business_id: z.string().uuid(),
        product_id: z.string().uuid(),
        ...productUpsertSchema.omit({ id: true }).shape,
      },
    },
    async ({ business_id, product_id, ...patch }) =>
      guarded(async () => upsertProduct(getAdminClient(), business_id, { id: product_id, ...patch }))
  );

  server.registerTool(
    "upsert_products",
    {
      title: "Crear/actualizar productos en bloque",
      description:
        "Crea o actualiza varios productos en una sola llamada (por ejemplo, toda una carta importada de una foto o PDF). Cada elemento sin 'id' se crea; con 'id' se actualiza.",
      inputSchema: { business_id: z.string().uuid(), products: z.array(productUpsertSchema).min(1).max(200) },
    },
    async ({ business_id, products }) => guarded(async () => upsertProductsBulk(getAdminClient(), business_id, products))
  );

  server.registerTool(
    "delete_product",
    {
      title: "Eliminar producto",
      description: "Elimina un producto de la carta.",
      inputSchema: { business_id: z.string().uuid(), product_id: z.string().uuid() },
    },
    async ({ business_id, product_id }) => guarded(async () => deleteProduct(getAdminClient(), business_id, product_id))
  );

  server.registerTool(
    "set_product_availability",
    {
      title: "Marcar disponible/agotado",
      description: "Cambia rapidamente si un producto esta disponible o agotado, sin tocar el resto de sus datos.",
      inputSchema: { product_id: z.string().uuid(), is_available: z.boolean() },
    },
    async ({ product_id, is_available }) =>
      guarded(async () => {
        await setProductAvailability(getAdminClient(), product_id, is_available);
        return { ok: true };
      })
  );

  server.registerTool(
    "reorder_products",
    {
      title: "Reordenar productos",
      description: "Fija el orden de los productos dentro de la carta (lista de ids en el orden deseado).",
      inputSchema: { business_id: z.string().uuid(), ordered_product_ids: z.array(z.string().uuid()) },
    },
    async ({ business_id, ordered_product_ids }) =>
      guarded(async () => {
        await reorderProducts(getAdminClient(), business_id, ordered_product_ids);
        return { ok: true };
      })
  );

  const importProductSchema = z.object({
    name: z.string().min(1).max(160),
    description: z.string().max(1000).optional(),
    price: z.number().min(0),
    compare_at_price: z.number().min(0).optional(),
    status: z.enum(["draft", "published", "hidden"]).optional(),
    is_available: z.boolean().optional(),
    is_featured: z.boolean().optional(),
    is_recommended: z.boolean().optional(),
    is_new: z.boolean().optional(),
    is_popular: z.boolean().optional(),
    ingredients: z.array(z.string().min(1).max(60)).max(50).optional(),
    allergens: z.array(z.enum(ALLERGEN_CODES)).max(20).optional(),
    is_vegetarian: z.boolean().optional(),
    is_vegan: z.boolean().optional(),
    is_gluten_free: z.boolean().optional(),
    spice_level: z.number().int().min(0).max(3).optional(),
    image_url: z.string().url().optional(),
  });

  const importSectionSchema = z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    products: z.array(importProductSchema).max(200),
  });

  server.registerTool(
    "import_menu",
    {
      title: "Importar carta completa",
      description:
        "Crea de una vez varias secciones con sus productos (ideal tras analizar una foto/PDF de una carta). Agrupa toda la creacion en una sola llamada de herramienta. Cualquier dato no confirmado en la fuente debe omitirse, nunca inventarse. Para variantes, suplementos, 3D u otros campos avanzados usa update_product despues.",
      inputSchema: {
        business_id: z.string().uuid(),
        sections: z.array(importSectionSchema).min(1).max(50),
      },
    },
    async ({ business_id, sections }) =>
      guarded(async () => {
        const admin = getAdminClient();
        const menu = await getDefaultMenu(admin, business_id);
        if (!menu) throw new Error("Business has no default menu");

        const created: { section: string; products: number }[] = [];
        for (const s of sections) {
          const section = await upsertSection(admin, business_id, {
            menu_id: menu.id,
            name: s.name,
            description: s.description,
          });
          if (s.products.length > 0) {
            await upsertProductsBulk(
              admin,
              business_id,
              s.products.map((p) => ({ ...p, section_id: section.id }))
            );
          }
          created.push({ section: section.name, products: s.products.length });
        }
        return { menu_id: menu.id, created };
      })
  );

  server.registerTool(
    "get_menu",
    {
      title: "Leer carta completa",
      description: "Devuelve la carta completa (secciones + productos, incluidos los draft) para revisarla o editarla.",
      inputSchema: { business_id: z.string().uuid() },
    },
    async ({ business_id }) => guarded(async () => hydrateMenu(getAdminClient(), business_id))
  );
}
