#!/usr/bin/env tsx
// Seeds "Restaurante Demo Cantabria" end-to-end: business, theme, full menu
// (simple + complex products, allergens, variants, extras, one draft
// section), services, zones/tables, a QR template + QR codes, demo
// analytics events, and three DEV-ONLY demo accounts (owner/manager/
// employee). Idempotent: safe to re-run (upserts by slug/email).
//
// Requires a real Supabase project connected via .env.local -- this cannot
// run against the local RLS test database (that's plain Postgres, no
// PostgREST/GoTrue). See DEPLOYMENT.md.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "node:path";
import { buildDemoData } from "./demo-data";

config({ path: path.resolve(__dirname, "../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey || url.includes("placeholder")) {
  console.error(
    "Missing or placeholder Supabase credentials in .env.local.\n" +
      "Connect a real Supabase project first (see DEPLOYMENT.md), then re-run: npm run seed"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DEV_PASSWORD = "Demo1234!";
const DEMO_USERS = [
  { email: "superadmin@demo.local", role: "superadmin" as const },
  { email: "owner@demo.local", role: "owner" as const },
  { email: "manager@demo.local", role: "manager" as const },
  { email: "employee@demo.local", role: "employee" as const },
];

async function ensureUser(email: string): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`Could not create ${email}: ${error?.message}`);
  return data.user.id;
}

async function main() {
  console.log("Seeding demo data...");
  const demo = buildDemoData();

  const userIds: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    userIds[u.role] = await ensureUser(u.email);
    console.log(`  user ready: ${u.email} (${u.role})`);
  }

  await admin.from("superadmins").upsert({ user_id: userIds.superadmin });

  let { data: business } = await admin.from("businesses").select("*").eq("slug", demo.business.slug).maybeSingle();
  if (!business) {
    const { data, error } = await admin
      .from("businesses")
      .insert({ ...demo.business, status: "published", created_by: userIds.superadmin })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    business = data;
  } else {
    await admin.from("businesses").update({ ...demo.business, status: "published" }).eq("id", business.id);
  }
  const businessId = business!.id as string;
  console.log(`  business ready: ${business!.name} (${businessId})`);

  for (const role of ["owner", "manager", "employee"] as const) {
    await admin
      .from("memberships")
      .upsert({ business_id: businessId, user_id: userIds[role], role }, { onConflict: "business_id,user_id" });
  }

  await admin.from("business_themes").upsert({ business_id: businessId, ...demo.theme });

  let { data: menu } = await admin.from("menus").select("*").eq("business_id", businessId).eq("is_default", true).maybeSingle();
  if (!menu) {
    const { data, error } = await admin
      .from("menus")
      .insert({ business_id: businessId, name: "Carta principal", status: "published", is_default: true })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    menu = data;
  } else {
    await admin.from("menus").update({ status: "published" }).eq("id", menu.id);
  }
  const menuId = menu!.id as string;

  const sectionIds: Record<string, string> = {};
  for (const [i, section] of demo.sections.entries()) {
    const { products, ...sectionFields } = section;
    const { data: existing } = await admin
      .from("menu_sections")
      .select("id")
      .eq("business_id", businessId)
      .eq("menu_id", menuId)
      .eq("name", sectionFields.name)
      .maybeSingle();

    let sectionId: string;
    if (existing) {
      sectionId = existing.id;
      await admin.from("menu_sections").update({ ...sectionFields, position: i }).eq("id", sectionId);
    } else {
      const { data, error } = await admin
        .from("menu_sections")
        .insert({ business_id: businessId, menu_id: menuId, ...sectionFields, position: i })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      sectionId = data.id;
    }
    sectionIds[section.name] = sectionId;

    for (const [j, product] of products.entries()) {
      const { variants, extras, ...productFields } = product;
      const { data: existingProduct } = await admin
        .from("products")
        .select("id")
        .eq("business_id", businessId)
        .eq("section_id", sectionId)
        .eq("name", productFields.name)
        .maybeSingle();

      let productId: string;
      if (existingProduct) {
        productId = existingProduct.id;
        await admin.from("products").update({ ...productFields, position: j }).eq("id", productId);
      } else {
        const { data, error } = await admin
          .from("products")
          .insert({ business_id: businessId, section_id: sectionId, ...productFields, position: j })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        productId = data.id;
      }

      if (variants) {
        await admin.from("product_variants").delete().eq("product_id", productId);
        if (variants.length > 0) {
          await admin.from("product_variants").insert(variants.map((v) => ({ ...v, product_id: productId, business_id: businessId })));
        }
      }
      if (extras) {
        await admin.from("product_extras").delete().eq("product_id", productId);
        if (extras.length > 0) {
          await admin.from("product_extras").insert(extras.map((e) => ({ ...e, product_id: productId, business_id: businessId })));
        }
      }
    }
  }
  console.log(`  menu ready: ${demo.sections.length} sections`);

  for (const service of demo.services) {
    await admin
      .from("business_services")
      .upsert({ business_id: businessId, ...service }, { onConflict: "business_id,type" });
  }

  const zoneIds: Record<string, string> = {};
  for (const zone of demo.zones) {
    let { data: existing } = await admin
      .from("zones")
      .select("id")
      .eq("business_id", businessId)
      .eq("name", zone.name)
      .maybeSingle();
    if (!existing) {
      const { data, error } = await admin.from("zones").insert({ business_id: businessId, ...zone }).select("id").single();
      if (error) throw new Error(error.message);
      existing = data;
    }
    zoneIds[zone.name] = existing.id;
  }

  const tableIds: string[] = [];
  for (const spec of demo.tableCounts) {
    for (let n = 1; n <= spec.count; n++) {
      const label = `${spec.prefix} ${n}`;
      let { data: existing } = await admin
        .from("tables")
        .select("id")
        .eq("business_id", businessId)
        .eq("label", label)
        .maybeSingle();
      if (!existing) {
        const { data, error } = await admin
          .from("tables")
          .insert({ business_id: businessId, zone_id: zoneIds[spec.zoneName], label, capacity: 4 })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        existing = data;
      }
      tableIds.push(existing.id);
    }
  }
  console.log(`  ${tableIds.length} tables ready across ${demo.zones.length} zones`);

  let { data: template } = await admin.from("qr_templates").select("*").eq("business_id", businessId).maybeSingle();
  if (!template) {
    const { data, error } = await admin
      .from("qr_templates")
      .insert({
        business_id: businessId,
        name: "Plantilla principal",
        fg_color: "#0b1d26",
        bg_color: "#ffffff",
        accent_color: "#e1b12c",
        frame_style: "scan-me",
        label_position: "bottom",
        cta_text: "Escanea para ver la carta",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    template = data;
  }

  const { data: existingQrs } = await admin.from("qr_codes").select("assigned_table_id").eq("business_id", businessId);
  const tablesWithQr = new Set((existingQrs ?? []).map((q) => q.assigned_table_id).filter(Boolean));
  const { data: tableRows } = await admin.from("tables").select("id, label").eq("business_id", businessId);
  const newQrRows = (tableRows ?? [])
    .filter((t) => !tablesWithQr.has(t.id))
    .map((t) => ({
      business_id: businessId,
      code: cryptoRandomCode(),
      type: "table" as const,
      label: t.label,
      assigned_table_id: t.id,
      template_id: template!.id,
    }));
  if (newQrRows.length > 0) await admin.from("qr_codes").insert(newQrRows);

  const { data: generalQr } = await admin
    .from("qr_codes")
    .select("id")
    .eq("business_id", businessId)
    .eq("type", "general")
    .maybeSingle();
  if (!generalQr) {
    await admin.from("qr_codes").insert({
      business_id: businessId,
      code: cryptoRandomCode(),
      type: "general",
      label: "General",
      template_id: template!.id,
    });
  }
  console.log("  QR template + codes ready");

  await seedAnalytics(businessId, tableIds.slice(0, 3));
  console.log("  demo analytics events inserted");

  console.log("\nDone.");
  console.log(`  Public URL: ${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/r/${demo.business.slug}`);
  console.log(`  Demo accounts (password: ${DEV_PASSWORD}):`);
  for (const u of DEMO_USERS) console.log(`    ${u.email} -> ${u.role}`);
}

function cryptoRandomCode(): string {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}

async function seedAnalytics(businessId: string, sampleTableIds: string[]) {
  const { data: products } = await admin.from("products").select("id, section_id").eq("business_id", businessId).limit(10);
  const { data: qrs } = await admin.from("qr_codes").select("id, assigned_table_id").eq("business_id", businessId);

  const rows: Record<string, unknown>[] = [];
  const now = Date.now();
  for (let day = 13; day >= 0; day--) {
    const scans = 3 + Math.floor(Math.random() * 12);
    for (let i = 0; i < scans; i++) {
      const ts = new Date(now - day * 86400000 - Math.floor(Math.random() * 86400000)).toISOString();
      const qr = qrs?.[Math.floor(Math.random() * (qrs.length || 1))];
      rows.push({
        business_id: businessId,
        type: "qr_scanned",
        qr_id: qr?.id ?? null,
        table_id: qr?.assigned_table_id ?? null,
        session_id: `demo-${day}-${i}`,
        metadata: {},
        created_at: ts,
      });
      rows.push({ business_id: businessId, type: "menu_opened", qr_id: qr?.id ?? null, session_id: `demo-${day}-${i}`, metadata: {}, created_at: ts });
      if (products && products.length > 0 && Math.random() > 0.4) {
        const p = products[Math.floor(Math.random() * products.length)];
        rows.push({
          business_id: businessId,
          type: "product_viewed",
          product_id: p.id,
          section_id: p.section_id,
          session_id: `demo-${day}-${i}`,
          metadata: {},
          created_at: ts,
        });
      }
      if (Math.random() > 0.85) {
        rows.push({ business_id: businessId, type: "chat_opened", session_id: `demo-${day}-${i}`, metadata: {}, created_at: ts });
        rows.push({
          business_id: businessId,
          type: "chat_query",
          session_id: `demo-${day}-${i}`,
          metadata: { query: "que tenéis vegetariano?" },
          created_at: ts,
        });
      }
    }
  }
  void sampleTableIds;

  // Insert in chunks to stay well under typical request size limits.
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from("analytics_events").insert(rows.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
