# SmartNagar

SmartNagar is a Hindi/English civic-complaint portal demo for citizens and municipal teams. Citizens can report local issues with a photo and location, receive a Gemini-generated issue classification and Hindi complaint draft, and track progress. Department, municipal, and admin views demonstrate complaint triage and weather-informed priority scoring.

## Technology

- React 19, TypeScript, Vite, Tailwind CSS, and Leaflet
- Express 4 and Node.js for the API and production server
- Google GenAI JavaScript SDK with Gemini 3.8 Flash for image diagnosis
- MongoDB/Mongoose for persistent users and complaints when `MONGO_URI` is configured
- Open-Meteo for forecast-based priority scoring; OpenStreetMap map tiles; Unsplash demo photos

The app has seeded demonstration users and complaints. In local demo mode without MongoDB, data lives in memory and resets when the server restarts. Do not use the demo password storage or in-memory sessions for a production system handling real citizen data.

## Run locally

Requirements: Node.js 24 and npm.

```powershell
npm install
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
# Edit .env.local and set GEMINI_API_KEY and the DEMO_*_PASSWORD values.
npm run dev
```

Set `MONGO_URI` to a MongoDB connection string to persist data locally. Keep `.env.local` private; never commit API keys, database credentials, or real demo passwords. The server loads `.env.local` and `.env`.

Useful commands:

```powershell
npm run lint
npm run build
npm start
```

## API overview

| Endpoint | Purpose | Access |
| --- | --- | --- |
| `POST /api/auth/register` | Register a citizen and issue login and diagnosis credentials. | Public |
| `POST /api/auth/login` | Sign in and issue login and diagnosis credentials. | Public |
| `POST /api/ai/diagnose` | Classify a photo, draft a Hindi complaint, and calculate weather priority. | Login-issued diagnosis token; 10 requests/account and IP/15 minutes |
| `GET /api/complaints` | List complaints permitted for the signed-in role. | Signed in |
| `POST /api/complaints` | Submit a complaint. | Citizen |
| `PATCH /api/complaints/:id/status` | Update complaint status and attach resolution evidence. | Signed in; role and department checks apply |
| `GET /api/analytics/summary` | View municipal complaint analytics. | Municipal or admin role |

JSON request bodies are limited to 6 MB. Uploaded diagnosis and complaint photos must be JPEG, PNG, or WebP and no larger than 4 MB. Diagnosis sessions expire after 24 hours. The diagnosis rate limit and session store are in-process memory; use a shared store and edge-level limits for multi-instance production deployments.

## Gemini model

The server calls `gemini-3.8-flash`. Google lists this model ID as generally available in its [Gemini API documentation](https://ai.google.dev/gemini-api/docs/latest-model). Set `GEMINI_API_KEY` on the server (or in Render's private environment settings); never expose it in browser code.

## Deploy to Render

The repository includes a `render.yaml` Blueprint for the `smartnagar` web service. Connect this GitHub repository in Render and apply the Blueprint. Configure the requested `MONGO_URI`, `GEMINI_API_KEY`, and `DEMO_*_PASSWORD` environment values as private secrets in Render. MongoDB is required for durable production data.

## Data and licensing

- No public civic dataset is bundled. Demo users and complaints are seeded in `server.ts`; real-time forecast data comes from Open-Meteo.
- Sample photos are remote Unsplash assets. Map tiles use OpenStreetMap and display its attribution. Review the providers' current terms and attribution requirements before redistribution or production use.
- Third-party packages have individual licenses; check their license metadata and text before distribution.
- This repository has no `LICENSE` file. No license to reuse or redistribute SmartNagar's own source code is granted by this README.
