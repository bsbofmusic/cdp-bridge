const { contextBridge, ipcRenderer } = require('electron');

const allowedPayloadKinds = new Set(['generic-agent', 'playwright', 'raw']);

function invokeBridge(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

contextBridge.exposeInMainWorld('bridgeApp', {
  getState() {
    return invokeBridge('bridge:get-state');
  },
  startBridge() {
    return invokeBridge('bridge:start');
  },
  rotateToken() {
    return invokeBridge('bridge:rotate-token');
  },
  copyAgentPayload(kind) {
    if (!allowedPayloadKinds.has(kind)) {
      throw new Error(`Unsupported agent payload kind: ${kind}`);
    }
    return invokeBridge('bridge:copy-agent-payload', { kind });
  },
  copyDiagnosticsSnapshot() {
    return invokeBridge('bridge:copy-diagnostics-snapshot');
  },
  resetAdvancedReplica() {
    return invokeBridge('bridge:reset-advanced-replica');
  },
  openUninstaller() {
    return invokeBridge('bridge:open-uninstaller');
  },
  openDataDir() {
    return invokeBridge('bridge:open-data-dir');
  },
  openReleaseNotes() {
    return invokeBridge('bridge:open-release-notes');
  },
  copyCleanInstallGuide() {
    return invokeBridge('bridge:copy-clean-install-guide');
  },
  setLanguage(language) {
    return invokeBridge('bridge:set-language', { language });
  },
  setBrowserMode(mode) {
    return invokeBridge('bridge:set-browser-mode', { mode });
  },
  setAdvancedProfile(profile) {
    return invokeBridge('bridge:set-advanced-profile', { profile });
  },
  setDeviceMode(mode) {
    return invokeBridge('bridge:set-device-mode', { mode });
  },
  setLaunchOnLogin(enabled) {
    return invokeBridge('bridge:set-launch-on-login', { enabled: Boolean(enabled) });
  },
  setMinimizeToTray(enabled) {
    return invokeBridge('bridge:set-minimize-to-tray', { enabled: Boolean(enabled) });
  },
  onState(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('State listener must be a function');
    }
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on('bridge-state', handler);
    return () => ipcRenderer.off('bridge-state', handler);
  }
});
