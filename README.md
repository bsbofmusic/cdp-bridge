# Agent Browser Bridge

Lightweight Windows tray app for exposing a local Chrome-family browser to AI agents over a Tailscale-secured CDP bridge.

Maintained by `bsbofmusic`.

## What it is

Agent Browser Bridge keeps a local browser available for remote agent workflows without exposing raw Chrome port `9222`.

It is built for:

- OpenClaw
- OpenCode
- Codex-style agent workflows
- Claude Code-style agent workflows
- Playwright `connectOverCDP`
- Any generic CDP client

## Why this exists

Raw Chrome remote debugging is powerful but unsafe to expose directly.

This project adds a safer local bridge layer:

- Chrome stays local
- Tailscale provides private network reachability
- The bridge exposes a tokenized CDP endpoint
- The desktop app handles repair, prompts, and packaging

## Features

- Auto-detect and launch Chrome / Edge / Chromium
- Tailscale-aware bridge endpoint generation
- Windows tray app with taskbar and installer icons
- Generic Agent Prompt for OpenClaw, OpenCode, Codex, and similar agents
- Playwright snippet and developer CDP URL output
- Self-healing browser reconnect and bridge repair
- Launch-on-login and minimize-to-tray controls
- Clean install flow for stale dev leftovers and old tray conflicts
- Built-in uninstall entry and maintenance actions

## Supported platforms

- Local host: Windows
- Remote clients: any device on the same Tailscale tailnet
- Browser engines: Chrome / Edge / Chromium

## Install

Download the latest Windows installer from Releases.

Or build it locally:

```bash
npm install
npm run dist:win
```

Installer output:

- `dist/CDP Bridge-Setup-0.1.0.exe`

## First run

1. Install and sign in to Tailscale on the local Windows machine.
2. Launch `CDP Bridge`.
3. Let the app detect and start a managed local browser.
4. Use `Copy Generic Agent Prompt` as the default handoff for agents.
5. Use the Developer section only if you need low-level access.

## Main UI model

- **Quick Actions**: bridge controls and basic endpoint copy
- **Agent Handoff**: the main end-user handoff area
- **Developer**: Playwright and low-level CDP outputs
- **Maintenance**: uninstall and clean install guidance

## Generic Agent Prompt

The primary output is a single generic prompt that explains:

- background
- goal
- bridge endpoints
- rules
- step-by-step connection flow

Use this first for most agents.

## OpenClaw `MEDIA:./` syntax sugar

For OpenClaw-compatible runtimes, local images can be referenced like this:

```text
MEDIA:./relative/path/to/file.png
```

This lets the runtime convert and upload the local image as a platform-native attachment.

Useful for:

- Discord
- Telegram
- Signal
- other supported channels

The runtime adapts the upload behavior to the target platform automatically.

## Self-heal behavior

If you close the managed browser and it opens again, that is expected.

This app continuously checks browser and bridge health. If the browser/CDP path drops, it attempts to repair the connection by relaunching the browser and rebuilding the bridge.

This is **not a bug**.

## Clean install

Use the installer option named `Clean install` if:

- an old development build window still appears
- a stale tray process hijacks the packaged app instance
- previous local leftovers keep breaking the packaged app experience

There is also a local helper:

```bash
clean-install.cmd
```

It stops stale local processes and removes known development leftovers before reinstalling.

## Uninstall

You can uninstall the app in two ways:

- use the built-in `Open Uninstaller` action from the app
- run `Uninstall CDP Bridge.exe` from the install directory

## Development

Run locally:

```bash
npm install
npm start
```

Run CLI bridge only:

```bash
npm run start:bridge
```

Syntax check:

```bash
npm run check
```

## Project structure

- `electron/` desktop shell, tray behavior, renderer UI
- `src/` bridge core, browser management, supervisor, config
- `build/` NSIS installer customization
- `docs/` product and redesign planning
- `scripts/` local helper scripts

## License

MIT
