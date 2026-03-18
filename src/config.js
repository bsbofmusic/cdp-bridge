import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const legacyAppDir = path.join(os.homedir(), '.cdp-bridge');

function detectPortableAppDir() {
  if (!process.versions?.electron || process.defaultApp) {
    return null;
  }

  const portableExecutableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableExecutableDir) {
    return path.join(portableExecutableDir, 'data');
  }

  return path.join(path.dirname(process.execPath), 'data');
}

const appDir = detectPortableAppDir() ?? legacyAppDir;
const configPath = path.join(appDir, 'config.json');

function ensureDir() {
  fs.mkdirSync(appDir, { recursive: true });
}

function ensureBootstrapConfig() {
  ensureDir();
  if (fs.existsSync(configPath)) {
    return;
  }
  const legacyConfigPath = path.join(legacyAppDir, 'config.json');
  if (legacyConfigPath !== configPath && fs.existsSync(legacyConfigPath)) {
    try {
      fs.copyFileSync(legacyConfigPath, configPath);
    } catch {
    }
  }
}

function createDefaultConfig() {
  const advancedChromeUserDataDir = path.join(process.env.LOCALAPPDATA || os.homedir(), 'Google', 'Chrome', 'User Data');
  return {
    token: crypto.randomBytes(24).toString('base64url'),
    bridgePort: 39222,
    chromeDebugPort: 9222,
    chromePath: null,
    browserName: null,
    launchChrome: true,
    launchOnLogin: false,
    minimizeToTray: true,
    language: 'zh-CN',
    browserMode: 'clean',
    deviceMode: 'desktop',
    advancedChromeUserDataDir,
    advancedProfileDirectory: 'Default',
    bindHost: '0.0.0.0',
    autoRepair: false,
    healthCheckIntervalMs: 1000,
    chromeUserDataDir: path.join(appDir, 'chrome-profile'),
    advancedReplicaRootDir: path.join(path.dirname(advancedChromeUserDataDir), 'CDP Bridge Profiles'),
    logDir: path.join(appDir, 'logs')
  };
}

function migrateConfig(parsed) {
  const merged = { ...createDefaultConfig(), ...parsed };
  const legacyDefaults = {
    chromeUserDataDir: path.join(legacyAppDir, 'chrome-profile'),
    advancedReplicaRootDir: path.join(legacyAppDir, 'advanced-profile-replicas'),
    logDir: path.join(legacyAppDir, 'logs')
  };

  if (!parsed?.healthCheckIntervalMs || parsed.healthCheckIntervalMs === 15000) {
    merged.healthCheckIntervalMs = 1000;
  }

  if (merged.browserMode === 'local-user') {
    merged.browserMode = 'advanced';
  }

  if (!parsed?.chromeUserDataDir || parsed.chromeUserDataDir === legacyDefaults.chromeUserDataDir) {
    merged.chromeUserDataDir = createDefaultConfig().chromeUserDataDir;
  }

  merged.advancedReplicaRootDir = path.join(path.dirname(merged.advancedChromeUserDataDir), 'CDP Bridge Profiles');

  if (!parsed?.logDir || parsed.logDir === legacyDefaults.logDir) {
    merged.logDir = createDefaultConfig().logDir;
  }

  merged.autoRepair = false;
  return merged;
}

export function loadConfig() {
  ensureBootstrapConfig();

  if (!fs.existsSync(configPath)) {
    const initial = createDefaultConfig();
    fs.writeFileSync(configPath, JSON.stringify(initial, null, 2));
    return initial;
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);
  return migrateConfig(parsed);
}

export function saveConfig(config) {
  ensureDir();
  const normalized = migrateConfig(config);
  fs.writeFileSync(configPath, JSON.stringify(normalized, null, 2));
  return normalized;
}

export function updateConfig(mutator) {
  const currentConfig = loadConfig();
  const nextConfig = mutator(structuredClone(currentConfig));
  return saveConfig(nextConfig);
}

export function getConfigPath() {
  return configPath;
}

export function getAppDir() {
  return appDir;
}

export function isPortableMode() {
  return appDir !== legacyAppDir;
}
