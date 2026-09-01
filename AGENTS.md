# Base44 Dev Environment

## Overview
This is a Base44 SDK app — a Vite + React frontend that connects to a hosted Base44 backend.
The app name is "FormFlow Notify" (a fire department incident reporting system branded "Fast Attack").

## Running the app
```bash
docker compose -f docker-compose.base44.yml up -d
```
- Node 22 image, source bind-mounted at `/app`, deps installed via `npm install` at startup.
- Vite dev server on port 5173, mapped to host port 3000.
- Live reload is active; edits appear automatically.

## Required environment variables
- `VITE_BASE44_APP_ID` — Base44 App ID (from the Base44 builder).
- `VITE_BASE44_APP_BASE_URL` — Base44 backend URL (e.g. `https://my-app.base44.app`).

Without real values, the app boots with placeholders and the UI renders but cannot fetch data
from the backend. Provide real values via the Base44 secrets dashboard; they land in
`/run/base44/app.env` and override `.env.base44-defaults`.

## Verification
- `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/` should return the HTML.
- The Vite config sets `server.allowedHosts: true` so the preview's external hostname is accepted.

## Notes
- The `@base44/vite-plugin` enables an `/api` proxy to the app's base URL.
- `src/lib/app-params.js` reads appId/baseUrl from `import.meta.env` (or URL params/localStorage).
