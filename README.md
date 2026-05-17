# PotholePilot AI

> The triage layer for city pothole queues.

PotholePilot AI helps Michigan cities turn messy resident pothole complaints into prioritized repair decisions. Residents file reports in plain language; a Granite-powered pipeline running through an MCP server extracts severity, clusters duplicates, factors in proximity to schools and bus stops, and weights by freeze-thaw weather risk. City workers get a ranked dashboard with plain-English explanations they can defend to residents.

Built for [Hack Michigan 2026](https://hackmichigan.org) — Smart Urban Planning & Community Development track.

---

## The problem

Michigan has the worst roads in the country. Cities like Detroit receive thousands of pothole reports a month through services like Improve Detroit. The reports are messy, duplicated, and sit in a first-come-first-served queue. A pothole outside an elementary school waits behind a crack on a side street. City workers spend hours manually reading, sorting, and triaging complaints instead of fixing roads.

## The solution

PotholePilot AI is a prioritization layer that sits on top of existing 311-style systems. It does four things existing tools don't:

- **Clusters duplicates** — eight residents reporting the same pothole becomes one ticket with a "reported 8 times" badge
- **Scores priority** — every ticket gets a 0–100 score based on severity, proximity to sensitive locations, safety language, age, and freeze-thaw forecast
- **Explains itself** — every score comes with a plain-English sentence workers can read aloud to residents or council members

## How it works

```
┌─────────────────────────────────────────┐
│  Next.js 16 app (Vercel)                │
│  ├─ /report   resident submission       │
│  ├─ /dashboard  worker triage (WIP)     │
│  └─ /api/reports  MCP orchestrator      │
└──────────────────┬──────────────────────┘
                   │ @modelcontextprotocol/sdk
                   │ StreamableHTTP → :8000/mcp
                   ▼
┌─────────────────────────────────────────┐
│  Python MCP server (FastMCP)            │
│  5 tools: extract / dupes / geo /       │
│           score / status                │
└────────┬──────────┬─────────┬───────────┘
         │          │         │
         ▼          ▼         ▼
   watsonx.ai   Supabase   Open-Meteo
   (Granite)   (Postgres)  (weather)
```

When a resident submits a report:

1. Frontend POSTs description + lat/lng + photo to `/api/reports`
2. API route uploads photo to Supabase Storage, inserts a `processing` row
3. Three MCP tools run in parallel:
   - `extract_report_details_tool` → Granite returns severity, safety concerns, landmarks, urgency signals
   - `find_nearby_duplicates_tool` → haversine query within 100m, returns cluster ID + count
   - `get_nearby_sensitive_locations_tool` → schools/hospitals/bus stops within 200m
4. `calculate_priority_score_tool` → deterministic formula + Open-Meteo freeze-thaw check → 0–100 score + plain-English reason
5. Report row updated with all extracted fields; resident sees score + reason on confirmation screen
6. If MCP pipeline fails, the report still saves — it just shows "score pending"

The AI doesn't touch the database directly — it calls scoped MCP tools. That's how civic AI gets deployed responsibly.

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16.2.6 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Maps | Leaflet + OpenStreetMap (no API key) |
| Geocoding | Nominatim (OSM reverse geocoding) |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (`report-photos` bucket) |
| AI | IBM Granite 3-8B via watsonx.ai |
| MCP server | Python + FastMCP (streamable-http transport) |
| MCP client | `@modelcontextprotocol/sdk` StreamableHTTPClientTransport |
| Weather | Open-Meteo (free, no key) |
| Deploy | Vercel |

Everything is free at hackathon scale.

## Project structure

```
PotholePilot/
├── src/
│   ├── app/
│   │   ├── page.tsx                  landing — links to /report and /dashboard
│   │   ├── layout.tsx                root layout with Header on every page
│   │   ├── report/page.tsx           resident submission form (fully functional)
│   │   ├── dashboard/page.tsx        city worker triage view (WIP — placeholders)
│   │   └── api/
│   │       └── reports/route.ts      POST handler — orchestrates all 5 MCP tools
│   ├── components/
│   │   ├── Header.tsx                full-width logo, links back to /
│   │   ├── PinMap.tsx                Leaflet map, click-to-pin + locate me
│   │   ├── PhotoUpload.tsx           drag/drop + camera, preview + remove
│   │   └── ui/button.tsx             shadcn button
│   └── lib/
│       ├── supabase.ts               anon + service role clients
│       └── mcp-client.ts             typed MCP client (StreamableHTTP → :8000/mcp)
├── mcp-server/
│   ├── server.py                     FastMCP entry point, port 8000
│   ├── tools/
│   │   ├── extract_report.py         calls Granite via watsonx
│   │   ├── find_duplicates.py        haversine dedup (100m radius)
│   │   ├── nearby_locations.py       sensitive location proximity (200m)
│   │   ├── calculate_score.py        deterministic formula + reason string
│   │   └── update_status.py          worker status flip
│   ├── lib/
│   │   ├── watsonx.py                IBM IAM auth + Granite chat API
│   │   ├── supabase.py               Supabase service role client
│   │   └── weather.py                Open-Meteo freeze-thaw multiplier
│   ├── requirements.txt
│   └── .env.example
├── supabase/                         (SQL migration files — run manually)
├── public/
│   ├── PotholePilotHeaderLogo.png
│   └── PotholeSign.png               favicon
└── README.md
```

## Current build status

| Feature | Status |
|---------|--------|
| Resident submission form (description, map, photo) | ✅ Done |
| Leaflet map with click-to-pin + locate me + reverse geocoding | ✅ Done |
| Photo upload with preview (drag/drop + mobile camera) | ✅ Done |
| Supabase Storage for photos | ✅ Done |
| MCP server (FastMCP, streamable-http, port 8000) | ✅ Done |
| Granite extraction via watsonx.ai | ✅ Done |
| Duplicate clustering (haversine 100m) with cluster bootstrap fix | ✅ Done |
| Sensitive location proximity (haversine 200m) | ✅ Done |
| Priority scoring formula + plain-English reason | ✅ Done |
| Freeze-thaw multiplier via Open-Meteo | ✅ Done |
| Resident confirmation screen with "what happens next" copy | ✅ Done |
| Graceful MCP degradation | ✅ Done |
| Worker dashboard — stat cards (open, high priority, dupes) | ✅ Done |
| Worker dashboard — Leaflet map with color-coded priority pins | ✅ Done |
| Worker dashboard — priority queue with score badges | ✅ Done |
| Worker dashboard — ticket detail panel with photo + score breakdown | ✅ Done |
| Worker dashboard — status/priority filter bar | ✅ Done |
| Worker dashboard — status update buttons (in progress / completed) | ✅ Done |
| Worker dashboard — auto-refresh every 30s | ✅ Done |
| Seed data script (50 realistic Detroit reports) | ✅ Done |

## Running locally

### Prerequisites

- Node.js 20+
- Python 3.11+
- A Supabase project (free tier)
- A watsonx.ai account (API key + project ID)

### Setup

```bash
git clone https://github.com/AbduTello/PotholePilot.git
cd PotholePilot

# Frontend
npm install
# Create .env.local — see Environment variables section

# MCP server
cd mcp-server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in WATSONX_API_KEY, WATSONX_PROJECT_ID, WATSONX_URL, SUPABASE creds
```

### Database

Run the SQL in your Supabase SQL editor to create the schema (tables and RLS policies are set up manually — see Supabase setup section in the project bible).

### Run

```bash
# Terminal 1: MCP server
cd mcp-server
source venv/bin/activate
python3 server.py
# → Uvicorn running on http://0.0.0.0:8000

# Terminal 2: Next.js
npm run dev
# → http://localhost:3000
```

## Environment variables

### Frontend (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
MCP_SERVER_URL=http://localhost:8000
DATABASE_URL=...
```

### MCP server (`mcp-server/.env`)

```
WATSONX_API_KEY=...
WATSONX_PROJECT_ID=...
WATSONX_URL=https://us-south.ml.cloud.ibm.com
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## The priority score

Deterministic, explainable, tunable. Granite extracts the inputs; the formula does the math.

```
base =
    severity_weight              (low=10, med=25, high=40)
  + min(duplicate_count * 3, 20)
  + proximity_bonus              (school=20, hospital=15,
                                  bus_stop=10, senior_center=15)
  + safety_keyword_bonus         (+10 per term, max 20)
  + age_bonus                    (min(days_open * 0.5, 15))

final = base * freeze_thaw_multiplier

    freeze_thaw_multiplier:
      1.0  — no freeze-thaw forecast in next 7 days
      1.3  — forecast crosses 32°F within 7 days

Cap final at 100.
```

## MCP tools

| Tool | Purpose |
|------|---------|
| `extract_report_details_tool` | Sends resident text to Granite, returns structured JSON |
| `find_nearby_duplicates_tool` | Haversine query within 100m, returns cluster ID + count |
| `get_nearby_sensitive_locations_tool` | Returns schools/hospitals/bus stops within 200m |
| `calculate_priority_score_tool` | Runs the formula + Open-Meteo weather check, returns score + reason |
| `update_repair_status_tool` | Worker action — flips status to in_progress/completed/deferred |

## Roadmap (post-hackathon)

- Worker dashboard (ranked queue, map, ticket detail panel) — in progress
- Seed data — 40–60 realistic Detroit reports for demo
- Real integration with Improve Detroit and other 311 systems
- Image-based severity scoring (computer vision on uploaded photos)
- Crew dispatch + route optimization
- Resident notifications when their report is repaired
- Expansion to other Michigan cities (Grand Rapids, Flint, Lansing)

## Built for Michigan

The freeze-thaw multiplier isn't a generic feature — it's why Michigan roads are uniquely bad. Hot/cold cycles split asphalt faster than steady weather does. PotholePilot AI knows this and adjusts urgency when the forecast turns.

We're not replacing Improve Detroit. We're making it 10x more effective.

## Team

Built at Hack Michigan 2026. [Add team member names]

## License

MIT
