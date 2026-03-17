import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
let managedBrowserPid = null;

const browserCandidates = [
  {
    name: 'Google Chrome',
    paths: [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      `${process.env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`
    ]
  },
  {
    name: 'Microsoft Edge',
    paths: [
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
      `${process.env.LOCALAPPDATA || ''}/Microsoft/Edge/Application/msedge.exe`
    ]
  },
  {
    name: 'Chromium',
    paths: [
      'C:/Program Files/Chromium/Application/chrome.exe',
      `${process.env.LOCALAPPDATA || ''}/Chromium/Application/chrome.exe`
    ]
  }
].map((browser) => ({
  ...browser,
  paths: browser.paths.filter(Boolean)
}));

function exists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function readJsonFile(filePath) {
  try {
    if (!exists(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function resolveChromePath(configuredPath) {
  if (configuredPath && exists(configuredPath)) {
    return configuredPath;
  }

  for (const browser of browserCandidates) {
    const match = browser.paths.find(exists);
    if (match) {
      return match;
    }
  }

  return null;
}

export function detectInstalledBrowsers() {
  return browserCandidates
    .map((browser) => {
      const executablePath = browser.paths.find(exists) ?? null;
      return executablePath ? { name: browser.name, executablePath } : null;
    })
    .filter(Boolean);
}

export function detectPreferredBrowser(configuredPath) {
  if (configuredPath && exists(configuredPath)) {
    return {
      name: 'Custom Browser',
      executablePath: configuredPath
    };
  }

  return detectInstalledBrowsers()[0] ?? null;
}

export function detectChromeProfiles(userDataDir) {
  const rootDir = userDataDir || path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
  if (!exists(rootDir)) {
    return [];
  }

  const localState = readJsonFile(path.join(rootDir, 'Local State'));
  const infoCache = localState?.profile?.info_cache ?? {};
  const directories = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name === 'Default' || /^Profile \d+$/.test(name));

  return directories.map((directory) => {
    const cacheEntry = infoCache[directory] ?? {};
    const displayName = cacheEntry.name || cacheEntry.shortcut_name || directory;
    return {
      id: directory,
      directory,
      name: displayName,
      label: `${displayName} (${directory})`,
      path: path.join(rootDir, directory)
    };
  });
}

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unexpected ${response.status} from ${url}`);
  }
  return response.json();
}

export async function getChromeVersion(debugPort) {
  return readJson(`http://127.0.0.1:${debugPort}/json/version`);
}

export async function isChromeReachable(debugPort) {
  try {
    await getChromeVersion(debugPort);
    return true;
  } catch {
    return false;
  }
}

export async function killManagedBrowsers() {
  if (!managedBrowserPid) {
    return;
  }

  try {
    await execFileAsync('taskkill', ['/F', '/T', '/PID', String(managedBrowserPid)], { windowsHide: true });
  } catch {
  } finally {
    managedBrowserPid = null;
  }
}

async function killProcessTree(pid) {
  try {
    await execFileAsync('taskkill', ['/F', '/T', '/PID', String(pid)], { windowsHide: true });
  } catch {
  }
}

async function findManagedBrowserPids(config) {
  const filters = [`--remote-debugging-port=${config.chromeDebugPort}`];

  const script = [
    "$patterns = @(",
    ...filters.map((pattern) => `  '${String(pattern).replace(/'/g, "''")}'`),
    ")",
    "Get-CimInstance Win32_Process | Where-Object {",
    "  $cmd = $_.CommandLine",
    "  $cmd -and (($patterns | Where-Object { $cmd -like ('*' + $_ + '*') }).Count -gt 0)",
    "} | Select-Object -ExpandProperty ProcessId"
  ].join('; ');

  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', script], { windowsHide: true });
    return stdout
      .split(/\r?\n/)
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

export async function stopManagedBrowsers(config) {
  const pids = new Set();

  if (managedBrowserPid) {
    pids.add(managedBrowserPid);
  }

  for (const pid of await findManagedBrowserPids(config)) {
    pids.add(pid);
  }

  for (const pid of pids) {
    await killProcessTree(pid);
  }

  managedBrowserPid = null;
}

export async function waitForChrome(debugPort, timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await getChromeVersion(debugPort);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error('Chrome remote debugging endpoint did not become ready in time.');
}

export async function ensureChrome(config, advancedLaunchContext, onProgress) {
  try {
    return await getChromeVersion(config.chromeDebugPort);
  } catch {
    if (!config.launchChrome) {
      throw new Error('Chrome is not running with remote debugging enabled.');
    }
  }

  const browser = detectPreferredBrowser(config.chromePath);
  if (!browser) {
    throw new Error('Chrome executable not found. Set chromePath in config.json.');
  }

  if (config.browserMode === 'advanced' && !advancedLaunchContext) {
    throw new Error('Advanced Mode browser data is still being prepared.');
  }

  onProgress?.({ stage: 'preparing-browser', percent: 10, detail: browser.name });

  const profileRootDir = advancedLaunchContext?.userDataDir ?? config.chromeUserDataDir;
  const profileDirectory = advancedLaunchContext?.profileDirectory ?? config.advancedProfileDirectory ?? 'Default';
  const viewportArg = config.deviceMode === 'mobile'
    ? '--window-size=1080,1920'
    : '--window-size=1920,1080';

  const args = [
    `--remote-debugging-port=${config.chromeDebugPort}`,
    `--user-data-dir=${profileRootDir}`,
    viewportArg,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ];

  if (config.browserMode === 'advanced') {
    args.splice(2, 0, `--profile-directory=${profileDirectory}`);
  }

  onProgress?.({ stage: 'launching-browser', percent: 88, detail: config.browserMode === 'advanced' ? profileDirectory : 'clean' });

  const child = spawn(browser.executablePath, args, {
    detached: true,
    stdio: 'ignore'
  });

  managedBrowserPid = child.pid ?? null;
  child.unref();

  try {
    onProgress?.({ stage: 'waiting-cdp', percent: 96, detail: String(config.chromeDebugPort) });
    return await waitForChrome(config.chromeDebugPort, config.browserMode === 'advanced' ? 30000 : 15000);
  } catch (error) {
    managedBrowserPid = null;
    if (config.browserMode === 'advanced') {
      throw new Error('Advanced Mode could not launch the managed browser replica.');
    }
    throw error;
  }
}

export function getBrowserModeMeta(config, advancedLaunchContext = null) {
  const browserMode = config.browserMode === 'advanced' ? 'advanced' : 'clean';
  const deviceMode = config.deviceMode === 'mobile' ? 'mobile' : 'desktop';
  const viewport = deviceMode === 'mobile'
    ? { width: 1080, height: 1920, label: '1080x1920' }
    : { width: 1920, height: 1080, label: '1920x1080' };
  const profileDir = browserMode === 'advanced'
    ? path.join(advancedLaunchContext?.userDataDir ?? config.chromeUserDataDir, advancedLaunchContext?.profileDirectory ?? config.advancedProfileDirectory ?? 'Default')
    : config.chromeUserDataDir;

  return {
    browserMode,
    deviceMode,
    viewport,
    profileDir,
    browserModeLabel: browserMode === 'advanced' ? 'Advanced Mode' : 'Clean Mode',
    deviceModeLabel: deviceMode === 'mobile' ? 'Mobile Mode' : 'Desktop Mode'
  };
}
