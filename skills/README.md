# Agent Skills

This directory is the canonical, easy-to-find home for agent-importable skills.

## Available skills

- [`remote-cdp`](./remote-cdp/SKILL.md) — control and read a user-owned logged-in Windows Chrome/Edge through CDP Bridge.

## Routing model

| Layer | Tool | Role |
|---|---|---|
| Default interaction | cdper MCP | Open, snapshot, click, type, wait, eval, screenshot, close |
| Advanced interaction | Playwright over CDP | Complex scripted flows connected to the same CDP Bridge WS endpoint |
| Logged-in reading | Dokobot | Structured markdown reading when configured against the same remote Chrome/CDP Bridge |
| Public URL reading | Lightpanda | Fast independent reads for unauthenticated pages |
| Out of chain | bb browser / Browserbase | Not a substitute for the user's logged-in remote browser |

Legacy/reference copies may still exist under `docs/`, but agents should import from `skills/<name>/SKILL.md`.
