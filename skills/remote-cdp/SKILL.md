---
name: remote-cdp
description: Use cdp-bridge over Tailscale and cdper-mcp to control a user-owned logged-in Chrome/Edge/Chromium browser safely from remote agents such as Hermes, OpenClaw, OpenCode, Claude, or Cursor.
version: 1.0.0
author: bsbofmusic
license: MIT
metadata:
  hermes:
    tags: [MCP, CDP, browser, Tailscale, cdper, Hermes, Supermemory]
    related_skills: [native-mcp, supermemory-mcp-official-config]
---

# Remote CDP Skill

Use this skill when an agent needs to control a user-owned Chrome/Edge/Chromium browser through **cdp-bridge over Tailscale**.

This file is safe for public repositories: it uses placeholders only and never embeds real bridge tokens, GitHub tokens, private IPs, or user-specific WebSocket URLs.

## When to use

- The user wants a remote agent to use their local Windows browser.
- The task needs logged-in browser state, for example ChatGPT, Doubao, social sites, dashboards, or protected pages.
- The user wants `cdper-mcp` tools such as `chatgpt_query`, `doubao_query`, `cdp_fetch`, `cdp_screenshot`, or Reddit research tools.
- The agent runs inside Hermes/OpenClaw/OpenCode/Cursor/Claude and needs a reusable browser bridge.

## Non-negotiable safety rules

1. **Never ask the user to expose raw Chrome `9222` publicly.** Use cdp-bridge over Tailscale only.
2. **Never require firewall/port-forwarding changes** unless the user explicitly chooses another network model.
3. **Never invent or store tokens.** If `<TOKEN>` is missing, ask the user for it or ask them to copy it from the cdp-bridge tray app.
4. **Never print real tokens in final output.** Mask as `<TOKEN>` or `abcd…wxyz`.
5. **Separate bridge health from browser CDP readiness.** A bridge can be reachable while `cdpReady=false`; start the browser before connecting CDP.
6. **Use a unique `sessionId` and `sessionLabel` per run** so cleanup and diagnostics are scoped to the current task.
7. **Only close targets/pages created by the current session.** Do not close the user’s existing tabs or all browser targets.
8. Prefer DOM/accessibility snapshots before screenshots or blind clicks; understand the page before interacting.
9. **[SUPERMEMORY] Never save CDP tokens, SSH passwords, API keys, or raw WebSocket URLs into memory.** Save only non-secret stable facts.

## Required placeholders

- `<TAILSCALE_IP>` — the cdp-bridge machine's Tailscale IP or MagicDNS name
- `<BRIDGE_PORT>` — cdp-bridge HTTP/CDP port
- `<TOKEN>` — cdp-bridge auth token supplied by the user
- `<SESSION_ID>` — unique per task, for example `agent-20260427-153000-a1b2`
- `<SESSION_LABEL>` — human-readable label, for example `openclaw-checkout-test`

## Quick install into Hermes

For Hermes Agent, install this skill into the visible local skill tree:

```bash
mkdir -p ~/.hermes/skills/mcp/remote-cdp
curl -fsSL \
  https://raw.githubusercontent.com/bsbofmusic/cdp-bridge/main/skills/remote-cdp/SKILL.md \
  -o ~/.hermes/skills/mcp/remote-cdp/SKILL.md
hermes skills list | grep remote-cdp
```

Then configure `cdper` as a native MCP server:

```yaml
mcp_servers:
  cdper:
    command: npx
    args:
      - -y
      - '@bsbofmusic/cdper-mcp@1.4.8'
    type: stdio
    enabled: true
    connect_timeout: 60
    timeout: 600
```

If the bridge is remote over Tailscale, prefer a local config file over inline tokens:

```bash
mkdir -p ~/.cdp-bridge
chmod 700 ~/.cdp-bridge
cat > ~/.cdp-bridge/config.json <<'JSON'
{
  "bridgePort": <BRIDGE_PORT>,
  "token": "<TOKEN>"
}
JSON
chmod 600 ~/.cdp-bridge/config.json
```

Set `CDP_BRIDGE_HOST=<TAILSCALE_IP>` in the MCP server environment if the bridge is not on localhost.

## [SUPERMEMORY] durable memory guidance

If the agent has Supermemory enabled, store only durable, non-secret deployment facts so future sessions do not rediscover everything:

Safe to save:
- cdp-bridge is the browser host appliance.
- cdper-mcp is the remote MCP controller.
- canonical skill path: `skills/remote-cdp/SKILL.md`.
- Hermes install path: `~/.hermes/skills/mcp/remote-cdp/SKILL.md`.
- the Tailscale host/MagicDNS name **only if the user accepts saving it**.
- the bridge port, browser mode (`advanced` vs `clean`), and profile name.
- package pins such as `@bsbofmusic/cdper-mcp@1.4.8`.

Never save:
- CDP bridge token
- SSH password
- API keys
- raw `ws://...token=...` URLs
- cookies or session dumps

When recalling memory, verify it with `/status?token=<TOKEN>` before assuming the browser is ready.

## Discovery workflow

### 1. Collect only missing inputs

Ask the user only for fields that are not already known:

```text
I need the cdp-bridge Tailscale host/port and bridge token.
Please provide:
- Tailscale host/IP: <TAILSCALE_IP>
- Bridge port: <BRIDGE_PORT>
- Token: <TOKEN>
```

If the user already provided host and port but not a token, ask only for the token.

### 2. Check bridge status

```bash
curl -sS --connect-timeout 5 "http://<TAILSCALE_IP>:<BRIDGE_PORT>/status?token=<TOKEN>"
curl -sS --connect-timeout 5 "http://<TAILSCALE_IP>:<BRIDGE_PORT>/json/version?token=<TOKEN>"
```

Interpret results:

- HTTP 200 + bridge JSON returned: bridge is online.
- `cdpReady=true`: browser CDP endpoint is ready.
- `cdpReady=false` or `/json/version` fails while `/status` works: bridge is online, browser needs start/restart.
- 401/403: token is wrong or missing; ask user to confirm token.
- connection refused/timeout: host, port, Tailscale, or bridge process issue.

### 3. Start browser when needed

Use advanced mode for logged-in browser workflows; use clean mode only for stateless tasks.

```bash
curl -sS -X POST "http://<TAILSCALE_IP>:<BRIDGE_PORT>/control/start?token=<TOKEN>&mode=advanced&profile=Default"
curl -sS --connect-timeout 5 "http://<TAILSCALE_IP>:<BRIDGE_PORT>/json/version?token=<TOKEN>"
```

### 4. Connect through CDP

```text
ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>&sessionId=<SESSION_ID>&sessionLabel=<SESSION_LABEL>
```

For high-risk/login sites, first reuse or prewarm a trusted site tab:

```bash
curl -sS -X POST "http://<TAILSCALE_IP>:<BRIDGE_PORT>/control/ensure-site-tab?token=<TOKEN>&url=https%3A%2F%2Fchatgpt.com%2F&host=chatgpt.com"
```

## cdper-mcp handoff

Install and verify official packages:

```bash
npm install -g @bsbofmusic/cdper-mcp
cdper-mcp install chatgpt
cdper-mcp install doubao
cdper-mcp install reddit
cdper_doctor
```

First query after setup:

```json
{
  "tool": "chatgpt_query",
  "params": {
    "query": "Reply with: READY",
    "conversationPolicy": "fresh",
    "expectedDuration": "short"
  }
}
```

## Expected final report

Always include a concise diagnostic summary with token masked:

```json
{
  "bridge": {
    "host": "<TAILSCALE_IP>",
    "port": "<BRIDGE_PORT>",
    "online": true,
    "cdpReady": true
  },
  "session": {
    "sessionId": "<SESSION_ID>",
    "sessionLabel": "<SESSION_LABEL>",
    "mode": "advanced"
  },
  "actions": [
    "status_probe",
    "start_browser_if_needed",
    "connect_cdp",
    "snapshot",
    "task_actions",
    "scoped_cleanup"
  ],
  "diagnostics": {
    "failedCommand": null,
    "error": null
  }
}
```

## Troubleshooting map

| Symptom | Likely cause | Action |
|---|---|---|
| Timeout connecting to host | Tailscale offline, wrong host, bridge not running | Check `tailscale status`, tray app, and `<TAILSCALE_IP>:<BRIDGE_PORT>` |
| 401 / 403 | Missing or wrong token | Ask user to copy the current token from cdp-bridge |
| `/status` works but `/json/version` fails | Browser CDP not started | Call `/control/start`, then re-probe |
| Browser opens but page is not logged in | Clean mode or wrong advanced profile | Use `mode=advanced&profile=Default`; ask user to log in once locally |
| Many stale tabs | Previous sessions did not cleanup | Close only tabs created by the current session; ask user before broad cleanup |
| Site verification/captcha | Site requires human action | Stop automation and ask user to complete verification manually |
