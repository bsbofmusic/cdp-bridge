import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const appDir = path.join(os.homedir(), '.cdp-bridge');
const configPath = path.join(appDir, 'config.json');

function ensureDir() {
  fs.mkdirSync(appDir, { recursive: true });
}

function createDefaultConfig() {
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
    advancedChromeUserDataDir: path.join(process.env.LOCALAPPDATA || os.homedir(), 'Google', 'Chrome', 'User Data'),
    advancedProfileDirectory: 'Default',
    bindHost: '0.0.0.0',
    autoRepair: false,
    healthCheckIntervalMs: 1000,
    chromeUserDataDir: path.join(appDir, 'chrome-profile'),
    logDir: path.join(appDir, 'logs')
  };
}

function migrateConfig(parsed) {
  const merged = { ...createDefaultConfig(), ...parsed };

  if (!parsed?.healthCheckIntervalMs || parsed.healthCheckIntervalMs === 15000) {
    merged.healthCheckIntervalMs = 1000;
  }

  if (merged.browserMode === 'local-user') {
    merged.browserMode = 'advanced';
  }

  merged.autoRepair = false;
  return merged;
}

export function loadConfig() {
  ensureDir();

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
