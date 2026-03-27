# AutoHub (pilot monorepo)

- **Product spec:** [AutoHub_PRD_Pilot.md](./AutoHub_PRD_Pilot.md)
- **Frontend:** `apps/web` — React 19, Vite, JavaScript (`.jsx`), Tailwind CSS v4, TanStack Query, Zustand, React Router, React Hook Form + Yup.
- **API contract (for parallel backend work):** [docs/API_CONTRACT.md](./docs/API_CONTRACT.md)

## Run the web app

```bash
cd apps/web
cp .env.example .env
# set VITE_API_BASE_URL to your API /v1 base
npm install
npm run dev
```

From the repo root you can also run:

```bash
npm run dev:web
```

**404 on `http://localhost:5173/`?** Another process is probably using that port. In the terminal where Vite started, use the **“Local:”** URL it prints (for example `http://localhost:5175/`). Or free port 5173 (stop other dev servers / Node processes) and run `npm run dev` again. The dev server is configured with `open: true` so your browser should open the correct port automatically.

Build: `npm run build` (from `apps/web`).

## PWA note

`public/manifest.webmanifest` and a minimal `public/sw.js` are included; the service worker registers **in production** only.
