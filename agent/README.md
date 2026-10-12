# AirCast Monitoring Agent

The existing monitoring script is the agent. Use `monitoring_onair_aircast_version.py` from the project package or the standalone file supplied with this project.

Set these environment variables before running it:

```powershell
$env:AGENT_API_URL="https://YOUR-DOMAIN/api/agent/heartbeat"
$env:CLIENT_ID="YOUR-SUPABASE-CLIENT-UUID"
$env:AGENT_TOKEN="YOUR-ONE-TIME-AGENT-TOKEN"
$env:AGENT_VERSION="1.0.0"
python monitoring_onair_aircast_version.py
```

The agent keeps its local monitoring behavior and additionally sends a heartbeat to the Next.js backend. It does not need Supabase credentials.
