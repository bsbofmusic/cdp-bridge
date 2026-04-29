# CDP Bridge 0.2.11

## Highlights

- Makes this repository the single agent entry point for the **cdper Playwright CDP** experience.
- Documents `@bsbofmusic/cdper@latest` + `@bsbofmusic/cdper-mcp@latest` with `CDPER_KERNEL=playwright-cdp` as the standard path.
- Adds `npm run verify:cdper-playwright` to validate npm latest, Bridge readiness, and a real open/snapshot/eval/screenshot/close smoke flow.

## Agent routing

- Default: cdper MCP with `CDPER_KERNEL=playwright-cdp`.
- Advanced scripting: `playwright-core` with `chromium.connectOverCDP(<Bridge WS URL>)`.
- Do not launch a local browser for logged-in remote-browser tasks.
- Do not publish or remember CDP tokens or full `ws://...token=...` URLs.

## Verified package baseline

- `@bsbofmusic/cdper@1.0.10`
- `@bsbofmusic/cdper-mcp@1.5.9`

Both are consumed through `@latest` in the docs so agents get the fixed clean-install path.
