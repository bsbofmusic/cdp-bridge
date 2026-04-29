# cdper Playwright Agent Quickstart

This repository is the single URL an agent needs for the CDP Bridge + cdper Playwright CDP workflow.

Repository:

```text
https://github.com/bsbofmusic/cdp-bridge
```

## Components

| Component | Source | Purpose |
|---|---|---|
| CDP Bridge | this repository | Windows tray app that exposes the user's local Chrome/Edge through a token-authenticated CDP endpoint over Tailscale |
| remote-cdp Skill | `skills/remote-cdp/SKILL.md` | Agent operating rules, secret handling, and Playwright-only routing |
| cdper CLI | `@bsbofmusic/cdper@latest` | Command-line control layer; use `--kernel playwright-cdp` |
| cdper MCP | `@bsbofmusic/cdper-mcp@latest` | MCP tool surface for agents; set `CDPER_KERNEL=playwright-cdp` |

Current verified npm baseline:

- `@bsbofmusic/cdper@1.0.10`
- `@bsbofmusic/cdper-mcp@1.5.9`

## Golden path

1. Start CDP Bridge on the Windows host.
2. Copy the Bridge WS URL or collect Tailscale IP + bridge port + token.
3. Store the token locally in `~/.cdp-auth.json` or `~/.cdp-bridge/config.json`; never write it to logs, docs, memory, or issues.
4. Register cdper MCP with `CDPER_KERNEL=playwright-cdp`.
5. Verify with `cdper --kernel playwright-cdp doctor --json` or `npm run verify:cdper-playwright` from this repository.

## MCP registration

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

Reload the MCP client after changing config. Hermes users should run `/reload-mcp`.

## Private CDP config

Preferred full-URL file:

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

## Verification

No clone required:

```bash
npx -y @bsbofmusic/cdper-mcp@latest --version
npx -y @bsbofmusic/cdper@latest --kernel playwright-cdp doctor --json
```

With this repository cloned:

```bash
npm install
npm run verify:cdper-playwright
```

The repository verifier runs:

- npm latest metadata check
- `cdper --kernel playwright-cdp doctor --json`
- `open https://example.com`
- `snapshot`
- `eval`
- `screenshot --lite`
- `close`
- final verify-tab leak check

All output is redacted before printing.

## Advanced Playwright script

Use `playwright-core` and connect to the existing Bridge endpoint. Do not launch a local browser.

```js
const { chromium } = require('playwright-core');

const browser = await chromium.connectOverCDP('ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>');
const context = browser.contexts()[0];
const page = await context.newPage();

try {
  await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: 'remote-page.png', fullPage: true });
  console.log(await page.title());
} finally {
  await page.close();
  await browser.close();
}
```

## Hard rules

- Use Playwright CDP only: `CDPER_KERNEL=playwright-cdp` or `--kernel playwright-cdp`.
- Do not install the standalone kernel package; `@bsbofmusic/cdper@latest` contains the fixed clean-install path.
- Do not run `chromium.launch()` for logged-in remote-browser tasks.
- Do not use non-Bridge browsing tools to claim a logged-in remote-browser task succeeded.
- Close only tabs/pages created by the current agent task.
- Redact every `token=` URL before displaying or storing output.
