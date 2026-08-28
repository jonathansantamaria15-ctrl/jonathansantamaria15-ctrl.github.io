# Despliegue

## 1. Crear el proyecto Supabase (gratis)

1. Crea una cuenta en https://supabase.com y un nuevo proyecto (free tier:
   Postgres 500MB, Auth ilimitado, Storage 1GB — suficiente para el MVP).
2. En **Project Settings -> API**, copia `Project URL` y la `anon public`
   key, y en **API -> service_role** copia la `service_role` key (secreta).
3. Copia `.env.example` a `.env.local` en la raiz del repo y rellena:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # o tu dominio en produccion
```

4. Aplica el esquema: abre **SQL Editor** en el dashboard de Supabase y
   ejecuta, en orden, cada archivo de `supabase/migrations/` (0001 a 0006).
   Alternativa con la Supabase CLI (si tienes Docker):
   `supabase link --project-ref <ref> && supabase db push`.
5. `npm run seed` — crea "Restaurante Demo Cantabria" completo (carta,
   tema, mesas, QR, servicios, analitica de ejemplo) y 4 cuentas de
   desarrollo (`superadmin@demo.local`, `owner@demo.local`,
   `manager@demo.local`, `employee@demo.local`, contraseña `Demo1234!`).
   **Cambia o elimina estas cuentas antes de dar acceso real a nadie.**

En este punto `npm run dev` es completamente funcional: auth, dashboards,
carta publica, QR, chatbot, analitica.

## 2. Google Login — el unico paso manual que solo tu puedes hacer

Todo el codigo ya esta implementado (`supabase.auth.signInWithOAuth({provider:
"google"})`, boton en login/signup, callback en `/auth/callback`). Falta
**una configuracion externa en Google Cloud que solo el propietario de la
cuenta puede completar**:

1. En https://console.cloud.google.com, crea (o reutiliza) un proyecto.
2. **APIs & Services -> OAuth consent screen**: configuralo (tipo External
   esta bien para empezar), añade tu email de soporte.
3. **APIs & Services -> Credentials -> Create Credentials -> OAuth client ID**,
   tipo **Web application**.
4. En **Authorized redirect URIs** añade exactamente:
   `https://<tu-proyecto>.supabase.co/auth/v1/callback`
   (lo encuentras en Supabase: **Authentication -> Providers -> Google**,
   ahí mismo Supabase te muestra esta URL exacta).
5. Copia el **Client ID** y **Client Secret** generados.
6. En el dashboard de Supabase: **Authentication -> Providers -> Google**,
   activa el proveedor y pega ese Client ID/Secret. Guarda.

Con eso el boton "Continuar con Google" ya funciona en local y en
produccion — no requiere ningun cambio de codigo ni variable de entorno
adicional (Supabase gestiona el intercambio OAuth).

## 3. Desplegar (Vercel recomendado, free tier)

Este repositorio es tambien la GitHub Pages personal de la cuenta
(`legacy-static/`, sitio no relacionado) — **GitHub Pages no puede servir
esta aplicacion** (necesita Server Actions, Route Handlers y cookies de
sesion; GitHub Pages solo sirve archivos estaticos). Despliega en Vercel u
otro host Node/Next compatible (Cloudflare Pages con adaptador Next
tambien funciona, Vercel es el camino mas directo para Next.js):

1. Importa este repositorio en https://vercel.com (rama que quieras
   desplegar).
2. Añade las mismas variables de `.env.local` en **Project Settings ->
   Environment Variables** (con `NEXT_PUBLIC_SITE_URL` apuntando a tu
   dominio real de Vercel).
3. Deploy. Vercel detecta Next.js automaticamente (sin configuracion extra).
4. Añade la URL de produccion como **Site URL** y **Redirect URLs**
   adicionales en Supabase (**Authentication -> URL Configuration**) para
   que el login por email y Google redirijan correctamente.

## Coste esperado durante el MVP

| Servicio | Plan | Coste |
| --- | --- | --- |
| Supabase (Postgres+Auth+Storage) | Free tier | 0 € |
| Vercel (hosting Next.js) | Hobby | 0 € |
| Google OAuth | — | 0 € |
| Librerias QR/graficos | `qrcode`, `recharts` (open source) | 0 € |
| IA para el comensal | ninguna (chatbot cerrado, sin LLM) | 0 € |

Escalar mas adelante es subir de plan en Supabase/Vercel — no requiere
reescribir el producto.

## Base de datos local para desarrollo/tests

`npm run db:reset` + `npm test` no necesitan un proyecto Supabase: usan un
Postgres 16 local con un "shim" minimo del esquema `auth`/`storage` de
Supabase (`scripts/local-auth-shim.sql`) para poder aplicar las migraciones
reales y probar las policies RLS reales. Esto es solo para tests — la app
en si (`npm run dev`) siempre necesita un proyecto Supabase real (paso 1).
