# Agent Browser Bridge Redesign Plan

Maintained by `bsbofmusic`.

## Product direction

The product should evolve from a narrow `OpenClaw` helper into a lightweight
`Agent Browser Bridge` for any AI agent or client that can consume a CDP
endpoint over a Tailscale-connected network.

Primary clients:

- OpenClaw
- Codex-style agent workflows
- Claude Code-style agent workflows
- Playwright `connectOverCDP`
- Any generic CDP consumer

Primary product values:

- Lightweight local desktop utility
- Standardized agent handoff
- Stable long-running behavior
- Minimal user learning cost
- Safe-by-default local browser exposure

## What to learn from reference projects

### `servas-ai/openclaw-agent-browser`

Use as a reference for:

- Simple installation flow
- Clear agent-first onboarding copy
- Tight positioning around agent-driven browser access

Do not copy:

- Single-client branding
- CLI-only mental model

### `frankhommers/openclaw-neko-chrome-docker`

Use as a reference for:

- Well-documented architecture diagrams
- Explicit explanation of Chrome/CDP limitations
- Stability notes and operational caveats

Do not copy into the main product:

- Docker-heavy architecture
- Neko/WebRTC visual stack for the default desktop app

That stack is useful as a future advanced mode, not the core product.

### `rickli-cloud/headscale-console`

Use as a reference for:

- Clean product framing
- Clear feature grouping
- Strong documentation structure
- Security-first messaging

Do not copy:

- Browser-hosted control model
- Large web-app style control surface

## Core product model

The app should revolve around five objects:

- Browser
- Bridge
- Network
- Agent
- Maintenance

The main window must answer these questions immediately:

1. Is the browser ready?
2. Is Tailscale available?
3. Is the bridge endpoint healthy?
4. Which client do I want to connect?
5. What is the one recommended fix if something is wrong?

## Information architecture

### Top layer: overview

- Product name
- Current health state
- Browser identity
- Tailscale identity
- Language switch

### Middle left: runtime status

- Browser card
- Tailscale card
- Bridge card
- Last error / health note

### Middle right: agent handoff

- OpenClaw handoff
- Codex handoff
- Claude Code handoff
- Playwright snippet
- Raw CDP URL

### Bottom: maintenance

- Repair
- Restart
- Rotate token
- Open logs
- Open config
- Uninstall
- Clean install guidance

## UI principles

The desktop app should feel closer to a compact Windows control center than a
generic web dashboard.

Rules:

- Keep the visual hierarchy strong
- Prefer short labels over long explanation blocks
- Keep one clear primary action per state
- Avoid mixed-language UI strings
- Use dense but calm grouping, similar in spirit to small desktop utilities
- Make maintenance actions obvious, but secondary

## Agent-standard outputs

The product should not only expose a raw WebSocket endpoint. It should generate
standardized handoff outputs for different clients.

Required outputs:

- Copy OpenClaw Prompt
- Copy Codex Prompt
- Copy Claude Code Prompt
- Copy Playwright snippet
- Copy Raw CDP URL

Each output should be purpose-built and concise.

## Stability model

Use a small, explicit state machine:

- Ready
- Needs Browser
- Needs Tailscale
- Repairing
- Error

Each state should define:

- User-facing explanation
- Primary recommended action
- Optional maintenance actions

## Desktop behavior model

Required behaviors:

- Consistent taskbar, window, tray, and installer icons
- Minimize-to-tray as a user-controlled setting
- Close-to-tray or close-to-exit depending on the setting
- Separate dev and packaged app user-data paths
- Single-instance behavior that never lets dev builds steal the packaged app window

## Install / uninstall / clean install model

Required installer behavior:

- Normal install path
- Clean install option with explanation
- First-run guidance after install

Required maintenance behavior:

- Visible uninstall action in the app
- Documented clean reinstall path
- Cleanup of development leftovers and stale local conflicts

## Open-source release expectations

The repo should present as a real product, not an experiment.

Required repository outcomes:

- Clear README hero section
- Supported client matrix
- Security rationale for using the bridge instead of exposing raw `9222`
- Install instructions
- Troubleshooting section
- Release notes and screenshots

## Execution phases

### Phase A - Product baseline

- Finalize product naming and messaging
- Finalize information architecture
- Finalize client output matrix

### Phase B - UI redesign

- Rebuild main window as a compact control center
- Unify Chinese and English copy
- Make the right column agent-focused

### Phase C - Agent standardization

- Add Codex prompt
- Add Claude Code prompt
- Add Playwright snippet
- Keep OpenClaw prompt
- Keep raw CDP URL

### Phase D - Desktop polish

- Fix tray/taskbar/window icon consistency
- Refine minimize and close behavior
- Refine notifications

### Phase E - Maintenance polish

- Improve uninstall entry
- Improve clean install explanation
- Improve first-run and recovery flow

### Phase F - Open-source release polish

- Refresh README
- Add screenshots
- Add updated release notes

## Acceptance criteria

The redesign is complete when:

- A new user can understand the app in under 15 seconds
- The UI no longer feels OpenClaw-only
- The correct handoff for each agent is one click away
- Tray/taskbar behavior feels native enough for a Windows utility
- Install, uninstall, and clean reinstall all feel intentional
