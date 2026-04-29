# Agent Skills

This directory is the canonical, easy-to-find home for agent-importable skills.

## Available skills

- [`remote-cdp`](./remote-cdp/SKILL.md) — control and read a user-owned logged-in Windows Chrome/Edge through CDP Bridge.

## Routing model

| Layer | Tool | Role |
|---|---|---|
| Default interaction | cdper MCP with `CDPER_KERNEL=playwright-cdp` | Open, snapshot, click, type, wait, eval, screenshot, close |
| Advanced interaction | `playwright-core` over CDP Bridge | Complex scripted flows connected to the same CDP Bridge WS endpoint |

Reference copies may still exist under `docs/`, but agents should import from `skills/<name>/SKILL.md`.
