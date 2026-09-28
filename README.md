# Línia del temps tecnològica

Aplicació web perquè l'alumnat construeixi col·laborativament una línia de
temps de tecnologies al llarg de la història. Cada entrada té una foto, un
títol, una descripció, un any (i opcionalment una època), i mostra qui l'ha
afegit. S'entra amb qualsevol correu electrònic, mitjançant un codi d'accés
(OTP) enviat per correu.

## Stack

- [Vite](https://vitejs.dev/) + React + TypeScript + Tailwind CSS — SPA
  estàtica, sense servidor propi
- [Supabase](https://supabase.com/) — base de dades Postgres, autenticació
  amb magic link i emmagatzematge de fotos, tot protegit amb Row Level
  Security
- [GitHub Pages](https://pages.github.com/) — hosting estàtic gratuït,
  desplegat automàticament amb GitHub Actions

No hi ha cap backend propi: el navegador parla directament amb Supabase
(la clau `anon` és pública per disseny; la seguretat la donen les
polítiques de RLS, no el secret de la clau).

## 1. Crear el projecte a Supabase

1. Crea un compte/projecte a [supabase.com](https://supabase.com).
2. Ves a **SQL Editor** i executa el contingut de
   [`supabase/schema.sql`](supabase/schema.sql). És **idempotent**: es pot
   tornar a executar sempre que s'actualitzi l'esquema (per exemple en
   pujar una versió nova de l'app) sense provocar errors. Crea:
   - la taula `entries` (amb RLS: lectura pública, inserció només d'entrades
     pròpies, esborrat de les pròpies o de qualsevol si ets l'administrador)
   - la taula `profiles` (còpia mínima de `auth.users` perquè es pugui
     mostrar l'autor)
   - el bucket públic `photos` per a les fotografies, amb les seves
     polítiques d'accés
3. Ves a **Authentication → Sign In / Providers → Email** i comprova que
   el mètode "Email OTP / Magic Link" estigui activat (ho està per
   defecte).
4. Ves a **Authentication → URL Configuration** i afegeix com a *Redirect
   URL* l'adreça on servirà GitHub Pages, per exemple:
   `https://<el-teu-usuari>.github.io/societatsitecnologies/`
5. Ves a **Project Settings → API** i copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

## 2. Configurar les variables d'entorn

Copia `.env.example` a `.env` en local i omple-hi els valors de Supabase.

```bash
cp .env.example .env
```

## 3. Desenvolupament local

```bash
npm install
npm run dev
```

L'aplicació queda disponible a http://localhost:5173. Perquè el magic
link funcioni en local, afegeix també `http://localhost:5173/` a les
*Redirect URLs* de Supabase (pas 1.4).

## 4. Desplegament a GitHub Pages

El repositori ja inclou el workflow
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), que
compila i publica automàticament a cada `push` a `main`.

1. Al repositori de GitHub: **Settings → Pages → Source** → selecciona
   **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository
   secret**, i crea:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Fes push a `main`. Al cap d'uns segons l'acció desplegarà el lloc a
   `https://<el-teu-usuari>.github.io/societatsitecnologies/`.

> Si el repositori canvia de nom, actualitza també `base` a
> `vite.config.ts` perquè coincideixi amb `/<nom-del-repo>/`.

## Model de dades

- **`profiles`**: `id`, `email` — es crea automàticament en iniciar sessió
  per primer cop.
- **`entries`**: `title`, `description`, `photo_url`, `year` (enter;
  negatiu per a.C.), `era` (opcional: Prehistòria, Edat Antiga, Edat
  Mitjana, Edat Moderna, Edat Contemporània), `author_id`.

## Seguretat

- S'admet qualsevol domini de correu per iniciar sessió; l'accés es
  verifica amb un codi OTP enviat per correu.
- Row Level Security assegura que ningú pugui inserir entrades fent-se
  passar per un altre autor (`auth.uid() = author_id`), encara que la
  clau `anon` sigui pública.
- Les fotos es limiten a 5 MB des del client (ajustable a
  `src/components/EntryForm.tsx`).
