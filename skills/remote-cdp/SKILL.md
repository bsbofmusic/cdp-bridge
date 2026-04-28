# remote-cdp Skill

Use this skill when an agent must operate or read the user's **real remote Windows Chrome/Edge browser** exposed by CDP Bridge.

## 1. Source of truth

The only true logged-in browser in this workflow is:

```text
Agent / MCP client
  -> cdper MCP or Playwright connectOverCDP or Dokobot configured against the same remote Chrome
  -> cdp-bridge over Tailscale
  -> user's remote Windows Chrome/Edge session
```

Do not replace this logged-in browser with a local Playwright launch, Browserbase, bb browser, curl, web search, or an unauthenticated reader when login state matters.

## 2. Tool routing decision tree

| Need | Use | Rule |
|---|---|---|
| Standard browser operation: open, snapshot, click, type, wait, eval, screenshot, close | cdper MCP | Default path for agents |
| Complex scripted automation, rich selectors, batch DOM extraction, high-quality screenshots, vision + coordinate loop | Playwright over CDP | Must connect to the same CDP Bridge WS endpoint; never launch local Chrome |
| Structured markdown reading from the logged-in remote browser | Dokobot | Trusted for login-state reading only when configured against the same remote Chrome/CDP Bridge; eyes, not hands |
| Fast reading of public/static URL without login state | Lightpanda | Independent URL reader; opens the URL again and does not inherit remote Chrome cookies |
| bb browser / Browserbase / platform temporary browser | Not part of this chain | Use only for non-login public browsing; never as logged-in fallback |

Short version:

```text
Need login state and light interaction?  -> cdper MCP
Need login state and complex scripting? -> Playwright over CDP
Need login state and structured reading? -> Dokobot
Need public URL quick read only?        -> Lightpanda
Need logged-in state?                   -> never local launch / Browserbase / bb browser
```

## 3. cdper MCP standard control loop

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
| Screenshot | Use as evidence after visual changes | If screenshot fails, report it and try lite/reduced scope if available |
| Close | Close only tabs opened by this agent/task | If ownership is uncertain, leave the tab open |
| Errors | Diagnose with doctor/status/tabs | Never hide failures by falling back to Lightpanda/web search/local browser |

## 4. Playwright over CDP advanced path

Use Playwright when cdper is too low-level for a task: complex selectors, repeated steps, page-object style flows, DOM batch extraction, downloads/uploads, or screenshot + vision + coordinate feedback.

Critical rule: **connect to CDP Bridge; do not launch a local browser.**

### JavaScript example

```js
const { chromium } = require('playwright');

const wsUrl = 'ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>&sessionId=<SESSION_ID>&sessionLabel=agent';
const browser = await chromium.connectOverCDP(wsUrl);

const context = browser.contexts()[0];
const page = await context.newPage();

try {
  await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: '/tmp/remote-page.png', fullPage: true });
  const text = await page.evaluate(() => document.body.innerText);
  console.log(text.slice(0, 2000));
} finally {
  await page.close(); // close only the page this script created
}
```

### Python example

```python
from playwright.async_api import async_playwright

async with async_playwright() as p:
    browser = await p.chromium.connect_over_cdp(
        "ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>&sessionId=<SESSION_ID>&sessionLabel=agent"
    )
    context = browser.contexts[0]
    page = await context.new_page()
    try:
        await page.goto("https://example.com", wait_until="domcontentloaded")
        await page.screenshot(path="/tmp/remote-page.png", full_page=True)
        text = await page.evaluate("() => document.body.innerText")
        print(text[:2000])
    finally:
        await page.close()
```

### Playwright safety rules

- Use `connectOverCDP` / `connect_over_cdp` only.
- Do not use `chromium.launch()` for logged-in remote-browser tasks.
- Prefer `browser.contexts()[0]` / `browser.contexts[0]` to reuse the remote browser's logged-in context.
- Open a new page for the agent task unless the user explicitly asks to operate an existing tab.
- Close only pages created by the agent. Do not close existing user tabs, the context, or the browser.
- If cdper MCP is unavailable but bridge is alive, Playwright over CDP may still work because it connects in parallel to the same CDP Bridge endpoint.

## 5. Dokobot read path

Dokobot is the structured reading layer for the logged-in remote browser only when it is configured against the same remote Chrome/CDP Bridge. If it is not connected to that browser, treat it as an independent read-only browser with no guaranteed login state.

Use it for:

- search-result reading
- SPA pages that require the remote Chrome login state
- converting complex pages into markdown
- quickly understanding a page before choosing cdper or Playwright actions

Do not use Dokobot for clicking, typing, form submission, tab cleanup, or workflow control. If the task needs hands, route back to cdper or Playwright over CDP.

## 6. Lightpanda read path

Lightpanda is an independent fast URL reader.

Use it only when:

- the URL is public or does not need cookies/session state
- you already have a detail URL and want a quick markdown/link/semantic-tree pass
- failure is acceptable and will not be reported as logged-in browser failure

Do not use Lightpanda for logged-in search pages, private pages, user-specific pages, or as fallback after a cdper/bridge failure. Lightpanda reopens the URL independently and does not inherit remote Chrome login state.

## 7. bb browser / Browserbase boundary

bb browser, Browserbase, or a platform-provided temporary browser is not the user's remote Windows Chrome.

It may be useful for ordinary public-page QA, but it is out of scope for this logged-in CDP Bridge workflow. If a site depends on the user's remote Chrome profile, cookies, extensions, device posture, or existing login, do not use bb browser/Browserbase as a substitute.

## 8. CDP Bridge health and failure handling

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
- If cdper MCP is down but `/json/version?token=<TOKEN>` works, Playwright over CDP is a valid advanced path.
- Do not switch to Lightpanda, web search, curl, local Playwright launch, bb browser, or Browserbase to pretend a logged-in task succeeded.

## 9. Search/read fallback without companion tools

If Dokobot/Lightpanda are unavailable and the user still needs a basic search/read path, cdper can do a slow current-page fallback. This is a continuity fallback, not a crawler.

Example flow:

```text
1. cdp_open({ url: "https://www.bing.com/search?q=<QUERY>", label: "search" })
2. cdp_snapshot({ tabId })
3. If the result list is visible, inspect refs/text.
4. cdp_eval({
     tabId,
     expression: `Array.from(document.querySelectorAll('a'))
       .map(a => ({ text: a.innerText.trim(), href: a.href }))
       .filter(x => x.text && x.href)
       .slice(0, 20)`
   })
5. Open only the selected result URL in the remote browser if login state or interaction is needed.
6. cdp_close({ tabId }) for the search tab if the agent created it.
```

Do not use this fallback for high-volume crawling or to bypass site rules.

## 10. Secrets and memory rules

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
