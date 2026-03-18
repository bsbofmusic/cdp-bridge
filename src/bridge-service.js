import crypto from 'node:crypto';
import net from 'node:net';

import {
  detectInstalledBrowsers,
  detectChromeProfiles,
  detectPreferredBrowser,
  ensureChrome,
  getBrowserModeMeta,
  getChromeVersion,
  isChromeReachable,
  stopManagedBrowsers
} from './chrome.js';
import { createAdvancedProfileManager } from './advanced-profile-manager.js';
import { loadConfig, saveConfig } from './config.js';
import { startBridgeServer } from './server.js';
import { getTailscaleStatus } from './tailscale.js';

async function canBindPort(port, host) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, host);
  });
}

async function reserveBridgePort(config) {
  const host = config.bindHost ?? '0.0.0.0';
  for (let offset = 0; offset < 10; offset += 1) {
    const candidatePort = config.bridgePort + offset;
    if (await canBindPort(candidatePort, host)) {
      if (candidatePort === config.bridgePort) {
        return config;
      }

      const nextConfig = { ...config, bridgePort: candidatePort };
      saveConfig(nextConfig);
      return nextConfig;
    }
  }

  throw new Error('No available bridge port found near the configured port.');
}

export function createBridgeService() {
  let currentConfig = loadConfig();
  let serverHandle = null;
  const advancedProfileManager = createAdvancedProfileManager();

  async function ensureServerStarted() {
    if (serverHandle) {
      return;
    }

    currentConfig = await reserveBridgePort(loadConfig());
    serverHandle = await startBridgeServer(currentConfig, {
      start: async (options = {}) => activateFromRemote(options)
    });
  }

  async function activateFromRemote(options = {}) {
    currentConfig = saveConfig({
      ...loadConfig(),
      ...(options.mode ? { browserMode: options.mode === 'advanced' ? 'advanced' : 'clean' } : {}),
      ...(options.profile ? { advancedProfileDirectory: options.profile } : {}),
      ...(options.device ? { deviceMode: options.device === 'mobile' ? 'mobile' : 'desktop' } : {}),
    });

    await stopManagedBrowsers(currentConfig);

    let advancedLaunchContext = await advancedProfileManager.getLaunchContext(currentConfig) ?? await advancedProfileManager.discoverAndAttachReplica(currentConfig);
    if (currentConfig.browserMode === 'advanced' && !advancedLaunchContext) {
      advancedLaunchContext = await advancedProfileManager.ensureReplica(currentConfig, null);
    }

    await ensureChrome(currentConfig, advancedLaunchContext, null);
    return buildSnapshot();
  }

  async function buildSnapshot() {
    currentConfig = loadConfig();
    const preferredBrowser = detectPreferredBrowser(currentConfig.chromePath);
    const installedBrowsers = detectInstalledBrowsers();
    const availableProfiles = detectChromeProfiles(currentConfig.advancedChromeUserDataDir);
    const [tailscale, chromeReachable] = await Promise.all([
      getTailscaleStatus(),
      isChromeReachable(currentConfig.chromeDebugPort)
    ]);
    const advancedReplicaState = await advancedProfileManager.getProfileState(currentConfig);
    const modeMeta = getBrowserModeMeta(currentConfig, await advancedProfileManager.getLaunchContext(currentConfig));

    const baseHost = tailscale.tailscaleIp ?? '127.0.0.1';
    const snapshot = {
      running: Boolean(serverHandle),
      bridgePort: currentConfig.bridgePort,
      chromeDebugPort: currentConfig.chromeDebugPort,
      chromeReachable,
      browserName: preferredBrowser?.name ?? null,
      browserPath: preferredBrowser?.executablePath ?? null,
      installedBrowsers,
      availableProfiles,
      advancedProfileDirectory: currentConfig.advancedProfileDirectory,
      advancedReplicaRootDir: currentConfig.advancedReplicaRootDir,
      advancedReplicaState,
      tailscale,
      token: currentConfig.token,
      launchOnLogin: currentConfig.launchOnLogin,
      minimizeToTray: currentConfig.minimizeToTray,
      language: currentConfig.language,
      browserMode: modeMeta.browserMode,
      deviceMode: modeMeta.deviceMode,
      viewport: modeMeta.viewport,
      profileDir: modeMeta.profileDir,
      logDir: currentConfig.logDir,
      wsEndpoint: `ws://${baseHost}:${currentConfig.bridgePort}/devtools/browser?token=${currentConfig.token}`,
      versionEndpoint: `http://${baseHost}:${currentConfig.bridgePort}/json/version?token=${currentConfig.token}`
      ,controlStartBase: `http://${baseHost}:${currentConfig.bridgePort}/control/start?token=${currentConfig.token}`
    };

    if (!chromeReachable) {
      return snapshot;
    }

    const versionInfo = await getChromeVersion(currentConfig.chromeDebugPort);
    return {
      ...snapshot,
      browser: versionInfo.Browser,
      protocolVersion: versionInfo['Protocol-Version']
    };
  }

  return {
    async start(options = {}) {
      const onProgress = options.onProgress;
      if (serverHandle) {
        return buildSnapshot();
      }

      currentConfig = await reserveBridgePort(loadConfig());
      await ensureServerStarted();
      let advancedLaunchContext = await advancedProfileManager.getLaunchContext(currentConfig);
      if (currentConfig.browserMode === 'advanced') {
        if (!advancedLaunchContext) {
          advancedLaunchContext = await advancedProfileManager.discoverAndAttachReplica(currentConfig);
        }
        if (!advancedLaunchContext) {
          onProgress?.({ stage: 'preparing-replica', percent: 4, detail: currentConfig.advancedProfileDirectory || 'Default' });
          await stopManagedBrowsers(currentConfig);
          advancedLaunchContext = await advancedProfileManager.ensureReplica(currentConfig, onProgress);
        } else {
          onProgress?.({ stage: 'preparing-replica', percent: 12, detail: 'reusing existing advanced replica' });
        }
      }
      onProgress?.({ stage: 'starting-bridge', percent: 90, detail: String(currentConfig.bridgePort) });
      await ensureChrome(currentConfig, advancedLaunchContext, onProgress);
      onProgress?.({ stage: 'starting-bridge', percent: 98, detail: String(currentConfig.bridgePort) });
      return buildSnapshot();
    },
    async stop() {
      if (!serverHandle) {
        return;
      }
      await serverHandle.close();
      serverHandle = null;
    },
    async restart(options = {}) {
      await this.stop();
      return this.start(options);
    },
    async repair(options = {}) {
      const onProgress = options.onProgress;
      onProgress?.({ stage: 'stopping-managed-browser', percent: 12, detail: currentConfig.browserMode ?? 'clean' });
      await stopManagedBrowsers(loadConfig());
      onProgress?.({ stage: 'stopping-bridge', percent: 22, detail: String(loadConfig().bridgePort) });
      await this.stop();
      return this.start({ onProgress });
    },
    async rotateToken() {
      currentConfig = saveConfig({
        ...loadConfig(),
        token: crypto.randomBytes(24).toString('base64url')
      });
      if (serverHandle) {
        await this.restart();
      }
      return buildSnapshot();
    },
    async getStatus() {
      await ensureServerStarted();
      return buildSnapshot();
    },
    getConfig() {
      currentConfig = loadConfig();
      return currentConfig;
    },
    updateConfig(mutator) {
      currentConfig = saveConfig(mutator(loadConfig()));
      return currentConfig;
    },
    async prepareAdvancedReplica(options = {}) {
      currentConfig = loadConfig();
      if (currentConfig.browserMode !== 'advanced') {
        return buildSnapshot();
      }
      const onProgress = options.onProgress;
      let advancedLaunchContext = await advancedProfileManager.getLaunchContext(currentConfig);
      if (!advancedLaunchContext) {
        advancedLaunchContext = await advancedProfileManager.discoverAndAttachReplica(currentConfig);
      }
      if (!advancedLaunchContext) {
        advancedLaunchContext = await advancedProfileManager.ensureReplica(currentConfig, onProgress);
      }
      return buildSnapshot();
    },
    async resetAdvancedReplica() {
      currentConfig = loadConfig();
      await stopManagedBrowsers(currentConfig);
      await this.stop();
      await advancedProfileManager.invalidateReplica(currentConfig);
      await ensureServerStarted();
      return buildSnapshot();
    }
  };
}
