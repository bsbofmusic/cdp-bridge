# remote-cdp Skill

cdper controls the user's **real remote Chrome/Edge** through CDP Bridge. It is not a search engine, crawler, or reader — it operates the user's actual browser with their login state, cookies, and extensions.

**Chain**: `Agent → cdper MCP → cdper CLI → CDP Bridge → user's Chrome/Edge`

Current kernel: `playwright-cdp` (Playwright CDP is the internal driver; cdper's public contract is browser control, not Playwright APIs).

---

## 1. BEFORE ANY BROWSER ACTION: Verify

```
cdper_doctor({ deep: true })
```

Or via CLI:
```
cdper --kernel playwright-cdp verify-kernel --json
```

Expected: `{ ok: true, kernel: "playwright-cdp", bridge: true, browser: true, smoke: { open: true, snapshot: true, eval: true, screenshot: true, close: true } }`

If doctor fails → diagnose by layer (config → bridge → browser → page), do NOT switch to a different tool.

## 2. STANDARD FLOW: open → snapshot → act → verify → close

```
1. cdp_open({ url, label })
2. cdp_snapshot({ tabId })              → get fresh @ref values
3. cdp_click / cdp_type / cdp_press    → use @ref from step 2
4. cdp_wait({ tabId, text/selector })  → wait for page change
5. cdp_snapshot or cdp_eval or cdp_screenshot  → verify result
6. cdp_close({ tabId })                → close only tabs you opened
```

**@ref rules**:
- `@ref` is valid only within the snapshot that produced it
- Re-snapshot after: navigation, waits >5s, DOM changes, or stale-ref errors
- Never guess a ref. If it's missing or wrong, fail closed and re-snapshot

**Tab ownership**: Only close tabs you created. If ownership is unclear, leave the tab open.

## 3. PROHIBITIONS

| Prohibited | Why |
|---|---|
| Silent fallback to `web_search`, `curl`, `Lightpanda`, `Dokobot` after cdper fails | These tools have no login state; "success" via fallback is a false positive |
| `chromium.launch()` or any local browser start | cdper's value is the user's real browser; local Chrome has no login state |
| Storing `token=...` or full `ws://...token=...` in memory, logs, or reports | Token leaks compromise the user's browser |
| Using stale `@ref` after page changes | Will click wrong elements or fail |
| Closing tabs you didn't create | May destroy user work |

## 4. FAILURE TRIAGE

| Symptom | Layer | Fix |
|---|---|---|
| `cdper_doctor` returns `ok: false` | Config/Bridge | Check `CDP_WS`, `~/.cdp-auth.json`, ask user for Bridge WS URL |
| `bridgeReachable: false` | Bridge | Verify Bridge is running, check Tailscale connectivity |
| `browserReady: false` | Browser | Bridge is up but Chrome is standby; start browser from Bridge UI |
| `cdp_open` fails | MCP/CLI/Bridge | Run `cdper_doctor`, check bridge health, report error |
| `@ref` stale or missing | Page | Re-run `cdp_snapshot`, use fresh refs |
| `doubao_query` timeout but `cdp_open doubao.com` works | Plugin adapter | Not a kernel failure; adapter selector may need update |
| `chatgpt_query` returns `degraded` for short answer | smart_wait | Short answers are now `ok` (complete_short); upgrade to latest |
| `verify-kernel` fails | Kernel | Reinstall `@bsbofmusic/cdper@latest`, run `doctor --deep` |

## 5. HYBRID FALLBACK

When `chatgpt_query` or `doubao_query` fails (timeout, mode error, input not found):

1. **First**: run `cdper_doctor({ deep: true })` — if kernel/bridge/browser fail, fix those first
2. **Confirm**: open the target site with `cdp_open` — if it loads, the kernel is fine and the adapter selector is the problem
3. **Fallback**: use `cdp_snapshot` → `cdp_click` / `cdp_type` → `cdp_wait` → `cdp_eval` to perform the query manually
4. **Stop** using the fallback once the adapter is updated and working again

See the cdper fallback runbooks for step-by-step procedures:

- ChatGPT: https://github.com/bsbofmusic/cdper/blob/main/skills/chatgpt-fallback/SKILL.md
- Doubao: https://github.com/bsbofmusic/cdper/blob/main/skills/doubao-fallback/SKILL.md

## 6. SECRETS

- **Never remember**: CDP token, full `ws://...token=...`, cookies, session data
- **OK to remember**: Bridge host/IP (without token), bridge port, package versions, install commands
- **Always redact**: Show `ws://<host>:<port>/devtools/browser?token=<REDACTED>` in any output
