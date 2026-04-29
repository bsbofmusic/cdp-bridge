# Getting Started: cdp-bridge + cdper

This guide connects the two halves of the system:

```text
Agent -> cdper MCP -> cdper CLI -> CDP Bridge -> Windows Chrome/Edge
```

- `cdp-bridge`: Windows host-side browser appliance and release source.
- `cdper`: remote agent toolkit containing MCP, CLI, plugins, and runtimes.

**Secret rule:** never commit or store a full WS URL/token in source control, docs, issues, chat logs, memory, or shared logs. Only place secrets in private local config files with restrictive permissions, and redact as `ws://<host>:<port>/devtools/browser?token=<REDACTED>`.

## A. Windows host setup

1. Install and sign in to Tailscale on the Windows host.
2. Run CDP Bridge and start Chrome/Edge from the Bridge UI.
3. Copy only what the remote agent needs: Tailscale IP, bridge port, and token, or the full WS URL for one-time private config.
4. Check the host service from the remote machine:

```bash
curl -s "http://<TAILSCALE_IP>:<BRIDGE_PORT>/health"
curl -s "http://<TAILSCALE_IP>:<BRIDGE_PORT>/status"
curl -s "http://<TAILSCALE_IP>:<BRIDGE_PORT>/json/version?token=<TOKEN>"
```

Expected signals:

- `/health`: bridge process is alive.
- `/status`: bridge/browser readiness and recommended action.
- `/json/version?token=<TOKEN>`: authenticated CDP readiness plus browser WebSocket metadata.

## B. Remote Agent setup

Register cdper MCP in your agent client:

```yaml
mcp_servers:
  cdper:
    command: npx
    args:
      - -y
      - '@bsbofmusic/cdper-mcp@latest'
    type: stdio
    enabled: true
    connect_timeout: 60
    timeout: 600
    env:
      CDPER_KERNEL: playwright-cdp
      CDPER_NO_UPDATE_CHECK: '1'
```

Reload the MCP client after saving config. Hermes users can run `/reload-mcp`; other clients should restart or reload the MCP server.

## C. Private config

Use a private file on the remote agent machine. Do not put these values in the repository.

Full WS URL option:

```bash
cat > ~/.cdp-auth.json <<'JSON'
{"ws_url":"ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>"}
JSON
chmod 600 ~/.cdp-auth.json
```

Host + token option:

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
export CDP_BRIDGE_HOST=<TAILSCALE_IP>
```

## D. Verify

From MCP:

```text
cdper_doctor({ deep: true })
```

From CLI:

```bash
npx -y @bsbofmusic/cdper@latest --kernel playwright-cdp doctor --deep --json
```

Success shape:

```json
{
  "ok": true,
  "kernel": "playwright-cdp",
  "bridge": {
    "reachable": true
  },
  "browser": {
    "ready": true
  },
  "smoke": {
    "open": true,
    "snapshot": true,
    "eval": true,
    "screenshot": true,
    "close": true
  }
}
```

Exact field names may evolve; the important signals are `ok: true`, `kernel: "playwright-cdp"`, reachable bridge, ready browser, and passing deep smoke steps.

## E. First browser task

Use cdper MCP tools in this order:

```text
cdp_open({ url, label })
cdp_snapshot({ tabId })
cdp_click({ tabId, ref }) / cdp_type({ tabId, ref, text }) / cdp_press({ tabId, key })
cdp_wait({ tabId, text }) or cdp_wait({ tabId, selector })
cdp_eval({ tabId, expression }) or cdp_screenshot({ tabId })
cdp_close({ tabId })
```

Rules:

- Use `@ref` values only from the latest `cdp_snapshot`.
- Re-snapshot after navigation, waits, DOM changes, or stale-ref errors.
- Close only tabs created by the current task.

## F. ChatGPT/Doubao hybrid fallback

Use `chatgpt_query` and `doubao_query` normally. If they fail at adapter/UI level while `cdper_doctor({ deep: true })` says the kernel, bridge, and browser are healthy, fall back to direct CDP operations for that site.

Fallback runbooks live in the cdper repository:

- ChatGPT fallback: <https://github.com/bsbofmusic/cdper/blob/main/skills/chatgpt-fallback/SKILL.md>
- Doubao fallback: <https://github.com/bsbofmusic/cdper/blob/main/skills/doubao-fallback/SKILL.md>

Do not use non-CDP browser/search tools to claim success for a logged-in remote-browser task.

## G. Troubleshooting by layer

| Layer | Symptom | What to check |
|---|---|---|
| Private config | `cdper_doctor` cannot find endpoint | `~/.cdp-auth.json`, `~/.cdp-bridge/config.json`, `CDP_BRIDGE_HOST`; ask user for fresh Bridge connection info if missing |
| Network | `/health` or `/status` unreachable | Tailscale status, host IP, bridge port, Windows firewall, Bridge process running |
| Auth/CDP | `/json/version?token=<TOKEN>` fails | Token mismatch, stale WS URL, browser not started from Bridge |
| Browser | Bridge is reachable but browser not ready | Start Chrome/Edge from Bridge UI; check selected mode/profile |
| MCP | MCP tools missing or stale | Reload MCP, verify `@bsbofmusic/cdper-mcp@latest`, keep `CDPER_KERNEL=playwright-cdp` |
| CLI/kernel | CLI doctor fails but host checks pass | Run `npx -y @bsbofmusic/cdper@latest --kernel playwright-cdp doctor --deep --json`; inspect redacted JSON |
| Page/UI | `@ref` missing or stale | Re-run `cdp_snapshot`; never guess refs |
| Adapter | `chatgpt_query`/`doubao_query` fails but manual `cdp_open` works | Treat as adapter selector drift; use linked fallback runbook until adapter is updated |

If you need to share diagnostics, redact every token and full WS URL first.
