import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAdminClient } from "../supabase.js";
import { guarded } from "./helpers.js";

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function registerMediaTools(server: McpServer) {
  server.registerTool(
    "upload_media",
    {
      title: "Subir/asociar imagen",
      description:
        "Sube una imagen al almacenamiento del establecimiento y la registra en la libreria de medios. Acepta 'base64' (contenido de una imagen que hayas analizado) o, si la imagen ya esta alojada en una URL publica, 'url' para solo registrarla sin volver a subirla. Devuelve la URL publica para usar en logo_url, hero_image_url, product image_url, etc.",
      inputSchema: {
        business_id: z.string().uuid(),
        kind: z.enum(["logo", "hero", "gallery", "product", "other"]).default("other"),
        alt: z.string().max(200).optional(),
        base64: z.string().optional(),
        content_type: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]).optional(),
        url: z.string().url().optional(),
      },
    },
    async ({ business_id, kind, alt, base64, content_type, url }) =>
      guarded(async () => {
        const admin = getAdminClient();
        let publicUrl: string;
        let storagePath: string | null = null;

        if (base64) {
          if (!content_type) throw new Error("content_type is required when uploading base64 image data");
          const ext = EXT_BY_TYPE[content_type];
          storagePath = `${business_id}/${kind}/${Date.now()}.${ext}`;
          const buffer = Buffer.from(base64, "base64");
          const { error } = await admin.storage.from("media").upload(storagePath, buffer, {
            contentType: content_type,
            upsert: true,
          });
          if (error) throw new Error(error.message);
          publicUrl = admin.storage.from("media").getPublicUrl(storagePath).data.publicUrl;
        } else if (url) {
          publicUrl = url;
        } else {
          throw new Error("Provide either base64+content_type or url");
        }

        const { data, error } = await admin
          .from("media")
          .insert({ business_id, url: publicUrl, storage_path: storagePath, kind, alt: alt ?? null })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return data;
      })
  );

  server.registerTool(
    "list_media",
    {
      title: "Listar medios",
      description: "Lista las imagenes subidas/asociadas a un establecimiento.",
      inputSchema: { business_id: z.string().uuid() },
    },
    async ({ business_id }) =>
      guarded(async () => {
        const admin = getAdminClient();
        const { data, error } = await admin
          .from("media")
          .select("*")
          .eq("business_id", business_id)
          .order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        return data;
      })
  );
}
