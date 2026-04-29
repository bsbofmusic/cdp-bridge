# remote-cdp Skill

Use this skill when an agent must operate the user's **real remote Windows Chrome/Edge browser** exposed by CDP Bridge.

This repository keeps one standard agent path: **cdper + Playwright CDP**.

## 1. Source of truth

The only browser that counts for this workflow is:

```text
Agent / MCP client
  -> cdper MCP with CDPER_KERNEL=playwright-cdp
  -> cdp-bridge over Tailscale
  -> user's remote Windows Chrome/Edge session
```

For advanced scripts, use `playwright-core` with `chromium.connectOverCDP(<Bridge WS URL>)` against the same endpoint.

Do not replace this logged-in browser with a local browser launch, curl, web search, or any independent unauthenticated browser when login state matters.

## 2. Install and configure

Latest verified packages:

- `@bsbofmusic/cdper@latest` (verified baseline `1.0.10`)
- `@bsbofmusic/cdper-mcp@latest` (verified baseline `1.5.9`)

MCP config:

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

Reload the MCP client after config changes. Hermes users should run `/reload-mcp`.

## 3. Private CDP connection config

Ask the user for the CDP Bridge WS URL or for Tailscale IP + bridge port + token. Do not guess token values and do not scan public networks.

Preferred full URL file:

```bash
cat > ~/.cdp-auth.json <<'JSON'
{"ws_url":"ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>"}
JSON
chmod 600 ~/.cdp-auth.json
```

Host + token file:

```bash
mkdir -p ~/.cdp-bridge
cat > ~/.cdp-bridge/config.json <<'JSON'
{"bridgePort": <BRIDGE_PORT>, "token": "<TOKEN>"}
JSON
chmod 600 ~/.cdp-bridge/config.json
export CDP_BRIDGE_HOST=<TAILSCALE_IP>
```

## 4. Verify before acting

Run:

```bash
npx -y @bsbofmusic/cdper-mcp@latest --version
npx -y @bsbofmusic/cdper@latest --kernel playwright-cdp doctor --json
```

If this repository is cloned:

```bash
npm run verify:cdper-playwright
```

The verifier runs a real open/snapshot/eval/screenshot/close smoke flow and prints only redacted output.

## 5. cdper MCP standard control loop

Use cdper for the default agent workflow:

```text
1. cdp_open({ url, label })
2. cdp_snapshot({ tabId })
3. cdp_click({ tabId, ref }) / cdp_type({ tabId, ref, text, clear }) / cdp_press({ tabId, key })
4. cdp_wait({ tabId, text or selector, timeoutMs })
5. cdp_snapshot({ tabId }) or cdp_eval({ tabId, expression }) or cdp_screenshot({ tabId })
6. cdp_close({ tabId }) only for tabs created by this agent/task
```

### Stability rules

| Area | Full-score requirement | Acceptable degradation |
|---|---|---|
| Open result | Treat `tabId` as the handle for all later operations | If open fails, report the bridge/cdper error; do not switch tools silently |
| Snapshot refs | `@ref` is scoped to the latest snapshot only | Re-snapshot after navigation, waits, DOM changes, or if more than about 5 seconds passed before click/type |
| Click/type | Use refs from the latest snapshot | If ref is missing/stale, fail closed and re-snapshot; do not guess another ref |
| Wait | Wait for explicit text/selector or a bounded timeout | If timeout occurs, inspect current state with snapshot/eval/screenshot before retrying |
| Eval | Use for current-page inspection and small DOM extraction | Do not turn cdper into a high-volume crawler |
| Screenshot | Use as evidence after visual changes | If screenshot fails, report it and try `lite` mode |
| Close | Close only tabs opened by this agent/task | If ownership is uncertain, leave the tab open |
| Errors | Diagnose with doctor/status/tabs | Never hide failures by switching to a different browser path |

## 6. Advanced Playwright CDP path

Use raw Playwright only when cdper is too low-level for a task: complex selectors, repeated flows, page-object style automation, file upload/download, batch DOM extraction, or screenshot + vision feedback.

Critical rule: **connect to CDP Bridge; do not launch a local browser.**

```js
const { chromium } = require('playwright-core');

const browser = await chromium.connectOverCDP('ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>');
const context = browser.contexts()[0];
const page = await context.newPage();

try {
  await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: '/tmp/remote-page.png', fullPage: true });
  const text = await page.evaluate(() => document.body.innerText);
  console.log(text.slice(0, 2000));
} finally {
  await page.close(); // close only the page this script created
  await browser.close(); // closes the client connection, not the remote Chrome process
}
```

Playwright safety rules:

- Use `connectOverCDP` only.
- Do not use `chromium.launch()` for remote-browser tasks.
- Prefer `browser.contexts()[0]` to reuse the remote browser's logged-in context.
- Open a new page for the agent task unless the user explicitly asks to operate an existing tab.
- Close only pages created by the agent. Do not close existing user tabs, the context, or the remote browser process.

## 7. CDP Bridge health and failure handling

If a tool fails, distinguish the layers:

```text
cdper MCP failed      != cdp-bridge failed
cdp-bridge reachable != browser CDP ready
browser CDP ready    != page task succeeded
```

Recommended checks:

```text
1. cdper_doctor()
2. GET /health                         # public, minimal
3. GET /status                         # public readiness, redacted
4. GET /json/version?token=<TOKEN>      # authenticated CDP readiness + WS endpoint
5. If cdpReady is false, start the browser from CDP Bridge UI or /control/start?token=<TOKEN>&mode=clean|advanced
```

Rules:

- If bridge or token is wrong, report the exact redacted failure and ask for the correct CDP Bridge WS URL or Tailscale IP + port + token.
- If cdper MCP is down but `/json/version?token=<TOKEN>` works, use `npx -y @bsbofmusic/cdper@latest --kernel playwright-cdp ...` or raw `playwright-core` against the same endpoint.
- Do not use a different browser path to pretend a logged-in task succeeded.

## 8. Secrets and memory rules

Allowed to remember:

- bridge host/IP without token
- bridge port
- browser mode preference (`clean` / `advanced`)
- profile label/name if non-sensitive
- package names and install commands

Never remember or publish:

- CDP token
- full `ws://...token=...` URL
- URLs containing `token=`
- cookies, session dumps, local profile data
- SSH passwords or API keys

When showing logs or errors, redact tokenized URLs as `ws://<host>:<port>/devtools/browser?token=<REDACTED>`.
