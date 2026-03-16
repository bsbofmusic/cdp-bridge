import crypto from 'node:crypto';
import net from 'node:net';

import {
  detectInstalledBrowsers,
  detectPreferredBrowser,
  ensureChrome,
  getChromeVersion,
  isChromeReachable,
  killManagedBrowsers
} from './chrome.js';
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

  async function buildSnapshot() {
    currentConfig = loadConfig();
    const preferredBrowser = detectPreferredBrowser(currentConfig.chromePath);
    const installedBrowsers = detectInstalledBrowsers();
    const [tailscale, chromeReachable] = await Promise.all([
      getTailscaleStatus(),
      isChromeReachable(currentConfig.chromeDebugPort)
    ]);

    const baseHost = tailscale.tailscaleIp ?? '127.0.0.1';
    const snapshot = {
      running: Boolean(serverHandle),
      bridgePort: currentConfig.bridgePort,
      chromeDebugPort: currentConfig.chromeDebugPort,
      chromeReachable,
      browserName: preferredBrowser?.name ?? null,
      browserPath: preferredBrowser?.executablePath ?? null,
      installedBrowsers,
      tailscale,
      token: currentConfig.token,
      launchOnLogin: currentConfig.launchOnLogin,
      minimizeToTray: currentConfig.minimizeToTray,
      logDir: currentConfig.logDir,
      wsEndpoint: `ws://${baseHost}:${currentConfig.bridgePort}/devtools/browser?token=${currentConfig.token}`,
      versionEndpoint: `http://${baseHost}:${currentConfig.bridgePort}/json/version?token=${currentConfig.token}`
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
    async start() {
      if (serverHandle) {
        return buildSnapshot();
      }

      currentConfig = await reserveBridgePort(loadConfig());
      await ensureChrome(currentConfig);
      serverHandle = await startBridgeServer(currentConfig);
      return buildSnapshot();
    },
    async stop() {
      if (!serverHandle) {
        return;
      }
      await serverHandle.close();
      serverHandle = null;
    },
    async restart() {
      await this.stop();
      return this.start();
    },
    async repair() {
      await killManagedBrowsers();
      await this.stop();
      return this.start();
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
      return buildSnapshot();
    },
    getConfig() {
      currentConfig = loadConfig();
      return currentConfig;
    },
    updateConfig(mutator) {
      currentConfig = saveConfig(mutator(loadConfig()));
      return currentConfig;
    }
  };
}
