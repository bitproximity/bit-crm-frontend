# Bit CRM — Frontend

React + Tailwind. Login con Supabase Auth, kanban de pipeline, tablero de
tareas, contactos, empresas, proyectos.

## Setup

1. Copiar `.env.example` a `.env` y completar:
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` — mismos que usaste en el
     backend, pero aquí va la key **publishable/anon** (no la secret/service_role).
   - `VITE_API_URL` — la URL de Railway del backend (ej.
     `https://bit-crm-backend-production.up.railway.app`).
2. `npm install`
3. `npm run dev` — corre local en `http://localhost:5173`
4. `npm run build` — genera `dist/` para deploy

## Deploy en Cloudflare Pages

1. Subir este repo a GitHub (mismo flujo que el backend).
2. Cloudflare Dashboard → Workers & Pages → **Create application** → **Pages** →
   **Connect to Git** → selecciona el repo.
3. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Environment variables (mismas del `.env`, con el prefijo `VITE_`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL`
5. Deploy. Cloudflare te da una URL tipo `bit-crm-frontend.pages.dev`.
6. Para el dominio final: Cloudflare Pages → Custom domains → agregar
   `crm.bitproximity.com`.
7. En el backend (Railway), actualizar `FRONTEND_ORIGIN` a
   `https://crm.bitproximity.com` si no lo habías puesto ya.

## Notas

- El archivo `public/_redirects` es necesario para que las rutas de React
  Router (`/deals`, `/tasks`, etc.) funcionen al refrescar la página en
  Cloudflare Pages — sin él, da 404 en cualquier ruta que no sea `/`.
- El login requiere que el usuario ya exista en Supabase Auth **y** tenga una
  fila en `team_members` con su `auth_user_id` — si no, el login funciona
  pero la app no carga el perfil (ver README del backend, sección "Primer
  usuario admin").
