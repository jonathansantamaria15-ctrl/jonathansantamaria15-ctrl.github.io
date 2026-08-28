import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSuperadmin, getCurrentUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { renderQrSvg, renderQrPng } from "@/lib/qr/render";
import type { QrTemplate } from "@/lib/types";

const DEFAULT_TEMPLATE: Omit<QrTemplate, "id" | "business_id" | "created_at" | "updated_at" | "name" | "is_default"> = {
  fg_color: "#111827",
  bg_color: "#ffffff",
  accent_color: "#b45309",
  logo_url: null,
  frame_style: "rounded",
  corner_style: "square",
  label_position: "bottom",
  cta_text: "Escanea para ver la carta",
  font: "Inter",
};

export async function GET(request: Request, { params }: { params: Promise<{ qrId: string }> }) {
  const { qrId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  // RLS (qr_codes/qr_templates: staff read) enforces tenant isolation here --
  // a non-member simply gets no row back, regardless of role checks below.
  const { data: qr } = await supabase.from("qr_codes").select("*").eq("id", qrId).maybeSingle();
  if (!qr) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const admin = await isSuperadmin();
  if (!admin) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("business_id", qr.business_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership || !["owner", "manager"].includes(membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  let template = DEFAULT_TEMPLATE;
  if (qr.template_id) {
    const { data: t } = await supabase.from("qr_templates").select("*").eq("id", qr.template_id).maybeSingle();
    if (t) template = t;
  }

  const url = `${getSiteUrl()}/q/${qr.code}`;
  const reqUrl = new URL(request.url);
  const format = reqUrl.searchParams.get("format") === "png" ? "png" : "svg";
  const disposition = reqUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
  const filename = `qr-${qr.label.replace(/[^a-z0-9]+/gi, "-")}`;

  if (format === "png") {
    const png = await renderQrPng(url, template.fg_color, template.bg_color);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `${disposition}; filename="${filename}.png"`,
      },
    });
  }

  const svg = renderQrSvg({ url, template, label: qr.label });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `${disposition}; filename="${filename}.svg"`,
    },
  });
}
