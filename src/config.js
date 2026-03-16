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
    bindHost: '0.0.0.0',
    autoRepair: true,
    healthCheckIntervalMs: 15000,
    chromeUserDataDir: path.join(appDir, 'chrome-profile'),
    logDir: path.join(appDir, 'logs')
  };
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
  const merged = { ...createDefaultConfig(), ...parsed };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
  return merged;
}

export function saveConfig(config) {
  ensureDir();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return config;
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
