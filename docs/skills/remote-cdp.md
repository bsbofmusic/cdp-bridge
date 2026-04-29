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
| Standard logged-in remote browser interaction | cdper MCP with `CDPER_KERNEL=playwright-cdp` | Default MCP control path |
| Advanced scripted logged-in automation | `playwright-core` over CDP Bridge | Must `connectOverCDP` to CDP Bridge; never local `launch()` |

For the full control-loop, stability, Playwright CDP, and secret-handling rules, import the canonical skill above.
