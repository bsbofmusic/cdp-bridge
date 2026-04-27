# Remote CDP Skill

> Canonical import path: [`../../skills/remote-cdp/SKILL.md`](../../skills/remote-cdp/SKILL.md). This legacy docs copy remains for old links.

Use this skill when an agent needs to control a user-owned Chrome/Edge/Chromium browser through **cdp-bridge over Tailscale**.

This document is safe for public repositories: it uses placeholders only and never embeds real bridge tokens, GitHub tokens, private IPs, or user-specific WebSocket URLs.

## Non-negotiable safety rules

1. **Never ask the user to expose raw Chrome `9222` publicly.** Use cdp-bridge over Tailscale only.
2. **Never require firewall/port-forwarding changes** unless the user explicitly chooses a different network model.
3. **Never invent or store tokens.** If `<TOKEN>` is missing, ask the user for it or ask them to copy it from the cdp-bridge tray app.
4. **Never print real tokens in final output.** Mask as `<TOKEN>` or `abcd…wxyz`.
5. **Separate bridge health from browser CDP readiness.** A bridge can be reachable while `cdpReady=false`; start the browser before connecting CDP.
6. **Use a unique `sessionId` and `sessionLabel` per run** so cleanup and diagnostics can be scoped to the current agent task.
7. **Only close targets/pages created by the current session.** Do not close the user’s existing tabs or all browser targets.
8. Prefer DOM/accessibility snapshots before screenshots or blind clicks; understand the page before interacting.

## Required placeholders

Use these placeholders in docs, examples, logs, and generated configs:

- `<TAILSCALE_IP>` — the cdp-bridge machine's Tailscale IP or MagicDNS name
- `<BRIDGE_PORT>` — cdp-bridge HTTP/CDP port
- `<TOKEN>` — cdp-bridge auth token supplied by the user
- `<SESSION_ID>` — unique per task, for example `agent-20260427-153000-a1b2`
- `<SESSION_LABEL>` — human-readable label, for example `openclaw-checkout-test`

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

If the user already provided a host and port but not a token, ask only for the token.

### 2. Check Tailscale reachability

Use the platform-appropriate command if available:

```bash
tailscale status
tailscale ping <TAILSCALE_IP>
```

If Tailscale CLI is unavailable, continue with HTTP probes and report that Tailscale CLI checks were skipped.

### 3. Probe bridge status

Prefer short timeouts and do not retry blindly.

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

### 4. Start browser when `cdpReady=false`

Use advanced mode for logged-in browser workflows; use clean mode only for stateless tasks.

```bash
# Logged-in persistent browser replica
curl -sS -X POST "http://<TAILSCALE_IP>:<BRIDGE_PORT>/control/start?token=<TOKEN>&mode=advanced&profile=Default"

# Clean isolated browser, no login state
curl -sS -X POST "http://<TAILSCALE_IP>:<BRIDGE_PORT>/control/start?token=<TOKEN>&mode=clean"
```

After starting, re-run `/json/version` and confirm CDP readiness.

## CDP connection rules

Build the WebSocket URL from the bridge endpoint and include session identifiers:

```text
ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>&sessionId=<SESSION_ID>&sessionLabel=<SESSION_LABEL>
```

When automating high-risk/login sites, first reuse or prewarm a trusted site tab instead of opening/closing many tabs:

```bash
curl -sS -X POST "http://<TAILSCALE_IP>:<BRIDGE_PORT>/control/ensure-site-tab?token=<TOKEN>&url=https%3A%2F%2Fchatgpt.com%2F&host=chatgpt.com"
```

Then connect CDP and attach to the returned or matching target.

## Page interaction workflow

1. Generate a unique `<SESSION_ID>` and `<SESSION_LABEL>`.
2. Confirm bridge online and `cdpReady=true`.
3. Connect CDP with the session identifiers.
4. Reuse an existing site tab when appropriate; avoid mechanical tab churn.
5. Capture a snapshot/accessibility tree before interacting.
6. Interact through stable selectors/roles/text first; use coordinates only as last resort.
7. Wait for network/DOM/state changes explicitly; do not use blind fixed sleeps except short stabilization pauses.
8. On completion, close only pages created by `<SESSION_ID>`.
9. Return a concise diagnostic summary.

## Expected final report

Always include:

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
  "page": {
    "url": "https://example.com/",
    "title": "Example"
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

If the task fails, include the failed command with token masked, the HTTP status/error, and the next recommended action.

## Troubleshooting map

| Symptom | Likely cause | Action |
|---|---|---|
| Timeout connecting to host | Tailscale offline, wrong host, bridge not running | Check `tailscale status`, tray app, and `<TAILSCALE_IP>:<BRIDGE_PORT>` |
| 401 / 403 | Missing or wrong token | Ask user to copy the current token from cdp-bridge |
| `/status` works but `/json/version` fails | Browser CDP not started | Call `/control/start`, then re-probe |
| Browser opens but page is not logged in | Clean mode or wrong advanced profile | Use `mode=advanced&profile=Default`; ask user to log in once locally |
| Many stale tabs | Previous sessions did not cleanup | Close only tabs created by the current session; ask user before broad cleanup |
| Site verification/captcha | Site requires human action | Stop automation and ask user to complete verification manually |

## Example agent prompt snippet

```text
Use cdp-bridge via Tailscale. Do not expose raw 9222. Probe:
http://<TAILSCALE_IP>:<BRIDGE_PORT>/status?token=<TOKEN>
If bridge is online but cdpReady=false, call /control/start with mode=advanced&profile=Default.
Connect to ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>&sessionId=<SESSION_ID>&sessionLabel=<SESSION_LABEL>.
Take a snapshot before interactions and cleanup only targets created by <SESSION_ID>.
Mask tokens in all output.
```

## cdper-mcp handoff

If the task involves using cdper-mcp tools (`chatgpt_query`, `doubao_query`, `cdp_fetch`, etc.), configure the bridge endpoint as the MCP CDP source:

```bash
# Write bridge WS endpoint to MCP config
echo '{"ws_url": "ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>"}' > ~/.cdp-auth.json
```

Then install official packages and verify:

```bash
npm install -g @bsbofmusic/cdper-mcp
cdper-mcp install chatgpt
cdper-mcp install doubao
cdper-mcp install reddit
cdper_doctor
```

Register as MCP server in your agent client:

```json
{
  "mcpServers": {
    "cdper": {
      "command": "cdper-mcp",
      "args": []
    }
  }
}
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

## Bridge diagnostics and scoped cleanup

Check full bridge diagnostics:

```bash
curl -sS --connect-timeout 5 "http://<TAILSCALE_IP>:<BRIDGE_PORT>/status?token=<TOKEN>"
```

Close only targets created by the current session (scoped cleanup):

```bash
curl -sS -X POST \
  "http://<TAILSCALE_IP>:<BRIDGE_PORT>/control/close-session-targets?token=<TOKEN>&sessionId=<SESSION_ID>"
```

If the endpoint is not available on your bridge version, close only pages whose `sessionId` or `sessionLabel` matches the current task. Never close all targets blindly.

## Tailscale discovery tips

- Use `tailscale status` to list connected peers and their IPs.
- Use `tailscale ping <TAILSCALE_IP>` to confirm reachability before probing the bridge.
- If MagicDNS is enabled, you can use the machine hostname instead of IP: `http://<MACHINE_NAME>.<TAILNET_NAME>.ts.net:<BRIDGE_PORT>/status?token=<TOKEN>`.
- The bridge port is shown in the cdp-bridge tray app. Default is typically `39222` but may differ per install.
- If you don't know the token, ask the user to copy it from the tray app ("Copy Developer CDP URL" contains the token).
