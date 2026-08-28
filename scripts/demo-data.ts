// Pure data builder for the demo restaurant. Kept free of any Supabase/IO
// calls so it can be unit tested (tests/unit/demo-data.test.ts) independently
// of having a live database connection -- scripts/seed.ts just persists
// whatever this function returns.
import type { ProductUpsertInput, SectionUpsertInput } from "@/lib/schemas";

export interface DemoSectionSpec extends Omit<SectionUpsertInput, "menu_id" | "id"> {
  products: Omit<ProductUpsertInput, "section_id" | "id">[];
}

export interface DemoData {
  business: {
    name: string;
    slug: string;
    vertical: string;
    tagline: string;
    description: string;
    phone: string;
    email: string;
    address: string;
  };
  theme: {
    color_primary: string;
    color_secondary: string;
    color_bg: string;
    color_surface: string;
    color_text: string;
    color_accent: string;
    font_heading: string;
    font_body: string;
    button_style: "solid" | "outline" | "ghost" | "pill";
    radius: "none" | "sm" | "md" | "lg" | "full";
    card_style: "elevated" | "flat" | "outlined" | "image-forward";
    nav_style: "tabs" | "chips" | "sidebar";
    hero_style: "full-bleed" | "split" | "minimal" | "logo-centric";
    hero_image_url: string;
    logo_url: string;
  };
  sections: DemoSectionSpec[];
  services: { type: string; value: string; is_active: boolean }[];
  zones: { name: string; kind: "interior" | "terraza" | "barra" | "privado" | "otro" }[];
  tableCounts: { zoneName: string; prefix: string; count: number }[];
}

export function buildDemoData(): DemoData {
  return {
    business: {
      name: "Restaurante Demo Cantabria",
      slug: "restaurante-demo-cantabria",
      vertical: "restaurant",
      tagline: "Cocina de mercado frente al mar",
      description:
        "Producto local cantabro, brasa y una carta que cambia con la temporada. Este es el establecimiento de demostracion de la plataforma.",
      phone: "+34 942 000 000",
      email: "hola@demo-cantabria.example",
      address: "Paseo Maritimo 12, Santander, Cantabria",
    },
    theme: {
      color_primary: "#0f4c5c",
      color_secondary: "#5c7a89",
      color_bg: "#ffffff",
      color_surface: "#f4f7f7",
      color_text: "#0b1d26",
      color_accent: "#e1b12c",
      font_heading: "Fraunces",
      font_body: "Inter",
      button_style: "pill",
      radius: "lg",
      card_style: "elevated",
      nav_style: "chips",
      hero_style: "full-bleed",
      hero_image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80",
      logo_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80",
    },
    services: [
      { type: "maps", value: "https://maps.google.com/?q=Restaurante+Demo+Cantabria", is_active: true },
      { type: "phone", value: "+34942000000", is_active: true },
      { type: "whatsapp", value: "+34600000000", is_active: true },
      { type: "website", value: "https://demo-cantabria.example", is_active: true },
      { type: "instagram", value: "https://instagram.com/demo.cantabria", is_active: true },
      { type: "reservations", value: "https://demo-cantabria.example/reservas", is_active: true },
      { type: "reviews", value: "https://g.page/demo-cantabria", is_active: false },
      { type: "delivery", value: "https://glovoapp.com/es/es/santander/demo-cantabria", is_active: false },
      { type: "wifi", value: "Contrasena: cantabria2024", is_active: true },
    ],
    zones: [
      { name: "Interior", kind: "interior" },
      { name: "Terraza", kind: "terraza" },
      { name: "Barra", kind: "barra" },
    ],
    tableCounts: [
      { zoneName: "Interior", prefix: "Mesa", count: 8 },
      { zoneName: "Terraza", prefix: "Terraza", count: 4 },
    ],
    sections: [
      {
        name: "Bebidas",
        description: "Cafes, refrescos y algo mas.",
        status: "published",
        products: [
          {
            name: "Cafe solo",
            price: 1.5,
            status: "published",
            is_available: true,
            ingredients: null,
            allergens: null,
          },
          {
            name: "Cafe con leche",
            price: 1.8,
            status: "published",
            is_available: true,
            allergens: ["lacteos"],
          },
          {
            name: "Agua mineral 50cl",
            price: 2.0,
            status: "published",
            is_available: true,
          },
          {
            name: "Cerveza de barril",
            price: 2.8,
            status: "published",
            is_available: true,
            allergens: ["gluten"],
            variants: [
              { name: "Cana", price_delta: 0, is_default: true, position: 0 },
              { name: "Doble", price_delta: 1.2, is_default: false, position: 1 },
            ],
          },
        ],
      },
      {
        name: "Entrantes",
        description: "Para compartir en el centro de la mesa.",
        status: "published",
        products: [
          {
            name: "Croquetas de jamon iberico",
            description: "Cremosas, hechas a diario. 8 unidades.",
            price: 9.5,
            status: "published",
            is_available: true,
            is_popular: true,
            ingredients: ["jamon iberico", "bechamel", "pan rallado", "huevo"],
            allergens: ["gluten", "lacteos", "huevos"],
            serving_size: "8 unidades",
          },
          {
            name: "Rabas de calamar",
            description: "Calamar fresco de lonja, fritura ligera.",
            price: 13.0,
            status: "published",
            is_available: true,
            is_recommended: true,
            ingredients: ["calamar", "harina", "aceite de oliva"],
            allergens: ["gluten", "moluscos"],
          },
          {
            name: "Ensalada de tomate y anchoa",
            price: 8.5,
            status: "published",
            is_available: true,
            is_vegetarian: false,
            allergens: ["pescado"],
            ingredients: ["tomate", "anchoa", "cebolleta", "aceite de oliva virgen extra"],
          },
          {
            name: "Hummus de la casa",
            price: 7.0,
            status: "published",
            is_available: true,
            is_vegetarian: true,
            is_vegan: true,
            is_gluten_free: true,
            ingredients: ["garbanzo", "tahini", "limon", "aceite de oliva"],
            allergens: ["sesamo"],
          },
        ],
      },
      {
        name: "Carnes y pescados",
        description: "A la brasa, producto de proximidad.",
        status: "published",
        products: [
          {
            name: "Solomillo de vaca a la brasa",
            description: "250g, con guarnicion de patata panadera.",
            price: 22.5,
            compare_at_price: 25.0,
            status: "published",
            is_available: true,
            is_featured: true,
            ingredients: ["solomillo de vaca", "patata", "pimiento"],
            allergens: null,
            spice_level: 0,
            weight_grams: 250,
            pairing_notes: "Marida bien con nuestro tinto de crianza de la casa.",
            extras: [
              { name: "Salsa de pimienta", price: 1.5, position: 0 },
              { name: "Huevo frito", price: 1.0, position: 1 },
            ],
          },
          {
            name: "Merluza del pincho a la plancha",
            description: "Con almejas y salsa verde.",
            price: 19.0,
            status: "published",
            is_available: false,
            ingredients: ["merluza", "almeja", "perejil", "ajo"],
            allergens: ["pescado", "moluscos"],
          },
          {
            name: "Costillar de cerdo picante",
            description: "Marinado 24h, glaseado picante de la casa.",
            price: 17.5,
            status: "published",
            is_available: true,
            is_new: true,
            spice_level: 2,
            allergens: ["mostaza"],
          },
        ],
      },
      {
        name: "Postres",
        status: "published",
        products: [
          {
            name: "Tarta de queso cantabra",
            price: 6.0,
            status: "published",
            is_available: true,
            is_popular: true,
            allergens: ["lacteos", "huevos", "gluten"],
            notes: "No confirmado si contiene frutos secos: preguntar al personal.",
          },
          {
            name: "Fruta de temporada",
            price: 4.5,
            status: "published",
            is_available: true,
            is_vegetarian: true,
            is_vegan: true,
            is_gluten_free: true,
          },
        ],
      },
      {
        name: "Fuera de carta (borrador)",
        description: "Seccion todavia sin publicar, visible solo en preview.",
        status: "draft",
        products: [
          {
            name: "Menu degustacion de temporada",
            description: "En preparacion, precio por confirmar.",
            price: 45.0,
            status: "draft",
            is_available: true,
          },
        ],
      },
    ],
  };
}
