# Reset Plan for v0.2.0

This document defines the simplified rebuild direction after multiple rounds of mixed logic changes.

## Keep

- Manual browser startup via a single `Start CDP` action
- Generic Agent Prompt
- Developer section with Playwright snippet and raw CDP URL
- Browser Mode: `Clean` / `Advanced`
- Page Mode: `Desktop` / `Mobile`
- Advanced Mode Chrome user selection
- Tray app shell and installer packaging
- Clean reinstall entry

## Remove or simplify

- Any automatic browser relaunch loop
- Any implicit self-heal behavior on browser close
- Any state inference that mixes app/bridge/cdp into one status phrase
- Any old `OpenClaw-only` product wording
- Any old `Clean install` semantics that only cleaned dev leftovers

## Runtime model

Three explicit runtime layers:

- App: `ready | working | error`
- Bridge: `stopped | starting | started`
- Chrome CDP: `unavailable | waiting | available`

No auto-repair loop.
No automatic browser launch on app startup.

## Allowed actions

- `Start CDP`
- `Reconnect Bridge`
- `Fix Connection`
- `Rotate Token`
- `Refresh Status`

Each action must explicitly own its state transition.

## UI rule

- Buttons and controls render once
- Only status and diagnostics areas refresh automatically
- No full panel rebuild during periodic refresh

## Clean reinstall rule

`Clean reinstall` must be treated as a full reset of prior app leftovers:

- stop processes
- remove installed app data
- remove updater leftovers
- remove old shortcuts
- remove prior install directory when safe

## Goal

Return the project to a simple, maintainable `0.2.0` shape that behaves predictably.
