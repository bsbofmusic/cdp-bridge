# remote-cdp Skill Compatibility Entry

The canonical importable skill now lives at:

- [`skills/remote-cdp/SKILL.md`](../../skills/remote-cdp/SKILL.md)
- Raw: `https://raw.githubusercontent.com/bsbofmusic/cdp-bridge/main/skills/remote-cdp/SKILL.md`

Install the canonical skill:

```bash
mkdir -p ~/.hermes/skills/mcp/remote-cdp
curl -fsSL \
  https://raw.githubusercontent.com/bsbofmusic/cdp-bridge/main/skills/remote-cdp/SKILL.md \
  -o ~/.hermes/skills/mcp/remote-cdp/SKILL.md
```

Core routing summary:

| Need | Use | Boundary |
|---|---|---|
| Standard logged-in remote browser interaction | cdper MCP | Default MCP control path |
| Advanced scripted logged-in automation | Playwright over CDP | Must `connectOverCDP` to CDP Bridge; never local `launch()` |
| Logged-in structured reading / markdown | Dokobot | Eyes, not hands; login-state trusted only when configured against the same remote Chrome/CDP Bridge |
| Public unauthenticated URL fast read | Lightpanda | Independent URL reader; no remote Chrome cookies |
| bb browser / Browserbase | Out of this chain | Not the user's remote Windows Chrome |

For the full control-loop, stability, Playwright, Dokobot, Lightpanda, and secret-handling rules, import the canonical skill above.
