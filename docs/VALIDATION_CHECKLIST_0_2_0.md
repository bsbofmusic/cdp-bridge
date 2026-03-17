# Validation Checklist for v0.2.0

This checklist defines the release gate for `0.2.0` and records the latest observed validation run.

## Release goals

- packaged app identity is obvious
- `Clean reinstall` removes installed leftovers and runtime data
- `Start CDP` is the only primary startup path
- managed browser cleanup does not kill unrelated user browsers
- status refresh does not rebuild interactive controls every second
- runtime state labels stay consistent across supervisor, tray, and renderer

## Validation matrix

### Install and uninstall

- [ ] fresh `0.2.0` install succeeds
- [ ] uninstall entry points to the same installed directory
- [ ] uninstall removes the install directory
- [ ] `Clean reinstall` removes app data, updater state, shortcuts, and stale install leftovers
- [ ] `Clean reinstall` preserves the local source tree and build artifacts

### Runtime identity

- [ ] diagnostics show app version
- [ ] diagnostics show install path
- [ ] diagnostics show config path
- [ ] diagnostics show runtime data path
- [ ] launched process path matches the installed directory

### Browser control

- [ ] app does not launch the browser on startup by itself
- [ ] `Start CDP` starts the managed flow only after confirmation
- [ ] closing the managed browser does not trigger an automatic self-heal loop
- [ ] `Repair` only targets managed browser processes
- [ ] existing user Chrome sessions survive normal app startup

### UI behavior

- [ ] language switch rerenders copy correctly
- [ ] browser mode switch updates state correctly
- [ ] page mode switch updates state correctly
- [ ] advanced profile selector does not collapse during auto refresh
- [ ] status text updates without rebuilding the button panels

### State consistency

- [ ] `appState`, `bridgeState`, and `cdpState` use one shared vocabulary
- [ ] tray status matches renderer status
- [ ] error state shows a user-visible reason
- [ ] idle state after stop is reported as `idle`, not a one-off status string

## Latest observed run

Date: `2026-03-17`

### Automated checks

- Passed: `npm run check`
- Passed: `npm run dist:win`

### Installer evidence

- Built installer: `D:\CODE\cdp-bridge\dist\CDP Bridge-Setup-0.2.0.exe`
- Built unpacked asar: `D:\CODE\cdp-bridge\dist\win-unpacked\resources\app.asar`
- Observed built asar size: `303900`

### Matrix evidence

- Fresh matrix install path created: `D:\CODE\matrix\CDPBridge-0.2.0-final`
- Observed installed asar size: `303900`
- Observed launched process path: `D:\CODE\matrix\CDPBridge-0.2.0-final\CDP Bridge.exe`
- Observed uninstall entry: `CDP Bridge 0.2.0`
- Observed uninstall command points to: `D:\CODE\matrix\CDPBridge-0.2.0-final\Uninstall CDP Bridge.exe`

### Clean reinstall evidence

- Reproduced previous failure where `.cdp-bridge` survived because managed `chrome.exe` still held locks
- Fixed cleanup flow to detect and stop managed browser processes before deleting app data
- Latest rerun result: `C:\Users\Maxlead\.cdp-bridge` removed successfully
- Latest rerun result: clean state verification passed

## Known follow-up checks

- Manual UI pass still needed for dropdown stability during long-running refresh
- Manual pass still needed for `Advanced Mode` with a real logged-in Chrome user
- Manual pass still needed for `Start CDP` confirmation wording and browser restart UX

## Acceptance rule

`0.2.0` is ready only when all checklist items above are either checked off or explicitly documented as deferred with a reason.
