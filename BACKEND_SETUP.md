# AirCast Monitor — Backend + Supabase setup

## 1. Install

```bash
npm install
npm run dev
```

## 2. Supabase

Open Supabase SQL Editor and run `supabase/schema.sql`.

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
AGENT_PUBLIC_API_URL=https://YOUR_DOMAIN/api/agent/heartbeat
```

The service-role key is server-only. Never put it in the Python agent or browser code.

## 3. Register a client

Open `/clients/add` and register a PC. The website creates a UUID and a one-time agent token.

The monitoring fields are intentionally not entered manually. They arrive from the Python agent.

## 4. Pair the agent

On the client PC, configure:

```powershell
$env:AGENT_API_URL="https://YOUR_DOMAIN/api/agent/heartbeat"
$env:CLIENT_ID="CLIENT_UUID_FROM_WEBSITE"
$env:AGENT_TOKEN="ONE_TIME_TOKEN_FROM_WEBSITE"
$env:AGENT_VERSION="1.0.0"
python monitoring_onair_aircast_version.py
```

The agent keeps monitoring CPU/RAM/disk, OnAir, Docker/Podman, containers and AirCast images, then posts a heartbeat to the backend.

## 5. Online/offline

The server marks a client online when a heartbeat has arrived within 60 seconds. Otherwise it becomes offline. A PC does not need to send an explicit "offline" message.

## 6. Current API

- `GET /api/clients`
- `POST /api/clients`
- `GET /api/clients/:id`
- `DELETE /api/clients/:id`
- `POST /api/agent/heartbeat`
