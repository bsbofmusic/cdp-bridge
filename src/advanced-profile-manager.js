import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';

import { getAppDir } from './config.js';

const SCHEMA_VERSION = 3;

const SKIP_NAMES = new Set([
  'Cache',
  'Code Cache',
  'Crashpad',
  'CrashpadMetrics-active.pma',
  'DawnCache',
  'DawnGraphiteCache',
  'DawnWebGPUCache',
  'GPUCache',
  'GrShaderCache',
  'GraphiteDawnCache',
  'ShaderCache',
  'LOCK',
  'LOG',
  'LOG.old',
  'SingletonCookie',
  'SingletonLock',
  'SingletonSocket',
  'component_crx_cache'
]);

function isChromeProfileDirectory(name) {
  return name === 'Default' || /^Profile \d+$/.test(name) || name === 'System Profile' || name === 'Guest Profile';
}

const METADATA_FILE = '.advanced-profile-state.json';

function exists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function sanitizeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function safeStatMtime(targetPath) {
  try {
    return fs.statSync(targetPath).mtimeMs;
  } catch {
    return 0;
  }
}

function readJson(filePath) {
  try {
    if (!exists(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function getReplicaBaseDir() {
  return path.join(getAppDir(), 'advanced-profile-replicas');
}

function buildLayout(config) {
  const sourceRootDir = config.advancedChromeUserDataDir || config.chromeUserDataDir;
  const profileDirectory = config.advancedProfileDirectory || 'Default';
  const replicaRootDir = path.join(getReplicaBaseDir(), sanitizeName(profileDirectory));

  return {
    sourceRootDir,
    profileDirectory,
    sourceProfileDir: path.join(sourceRootDir, profileDirectory),
    replicaRootDir,
    replicaProfileDir: path.join(replicaRootDir, profileDirectory),
    metadataPath: path.join(replicaRootDir, METADATA_FILE),
  };
}

function getReplicaStatePath(layout) {
  return layout.metadataPath;
}

function buildFingerprint(layout) {
  return JSON.stringify({
    localState: safeStatMtime(path.join(layout.sourceRootDir, 'Local State')),
    extensions: safeStatMtime(path.join(layout.sourceRootDir, 'Extensions')),
    preferences: safeStatMtime(path.join(layout.sourceProfileDir, 'Preferences')),
    cookies: safeStatMtime(path.join(layout.sourceProfileDir, 'Network', 'Cookies')),
    loginData: safeStatMtime(path.join(layout.sourceProfileDir, 'Login Data')),
    profile: safeStatMtime(layout.sourceProfileDir),
  });
}

async function ensureDir(targetPath) {
  await fsp.mkdir(targetPath, { recursive: true });
}

async function clearDir(targetPath) {
  if (!exists(targetPath)) {
    return;
  }
  const entries = await fsp.readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    await fsp.rm(path.join(targetPath, entry.name), { recursive: true, force: true });
  }
}

async function copyFileSafe(sourcePath, targetPath) {
  if (!exists(sourcePath)) {
    return false;
  }
  try {
    await ensureDir(path.dirname(targetPath));
    await fsp.copyFile(sourcePath, targetPath);
    return true;
  } catch {
    return false;
  }
}

async function countDirEntries(sourceDir) {
  if (!exists(sourceDir)) {
    return 0;
  }
  let total = 0;
  const entries = await fsp.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_NAMES.has(entry.name)) {
      continue;
    }
    if (entry.isDirectory()) {
      total += await countDirEntries(path.join(sourceDir, entry.name));
    } else if (entry.isFile()) {
      total += 1;
    }
  }
  return total;
}

function createProgress(total, emitProgress, stage, startPercent, endPercent) {
  return {
    completed: 0,
    total: Math.max(total, 1),
    advance() {
      this.completed += 1;
      const percent = Math.min(endPercent, startPercent + Math.round((this.completed / this.total) * (endPercent - startPercent)));
      emitProgress?.({ stage, percent, detail: `${this.completed}/${this.total}` });
    }
  };
}

async function copyDirectoryRecursive(sourceDir, targetDir, progress) {
  if (!exists(sourceDir)) {
    return;
  }
  await ensureDir(targetDir);
  const entries = await fsp.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_NAMES.has(entry.name)) {
      continue;
    }
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirectoryRecursive(sourcePath, targetPath, progress);
      continue;
    }
    if (entry.isFile()) {
      const copied = await copyFileSafe(sourcePath, targetPath);
      if (copied) {
        progress?.advance();
      }
    }
  }
}

function validateReplica(layout) {
  const issues = [];
  if (!exists(path.join(layout.replicaRootDir, 'Local State'))) {
    issues.push('missing Local State');
  }
  if (!exists(path.join(layout.replicaProfileDir, 'Preferences'))) {
    issues.push('missing Preferences');
  }
  if (!exists(path.join(layout.replicaProfileDir, 'Network', 'Cookies'))) {
    issues.push('missing Cookies DB');
  }

  const preferences = readJson(path.join(layout.replicaProfileDir, 'Preferences'));
  const extensionSettings = preferences?.extensions?.settings ?? {};
  const sourceProfileExtensionsPath = path.join(layout.sourceProfileDir, 'Extensions');
  const replicaProfileExtensionsPath = path.join(layout.replicaProfileDir, 'Extensions');
  if (exists(sourceProfileExtensionsPath) && !exists(replicaProfileExtensionsPath)) {
    issues.push('missing profile Extensions directory');
  }
  for (const extensionId of Object.keys(extensionSettings)) {
    if (exists(path.join(replicaProfileExtensionsPath, extensionId))) {
      continue;
    }
    if (exists(path.join(layout.replicaRootDir, 'Extensions', extensionId))) {
      continue;
    }
    issues.push(`missing extension binary: ${extensionId}`);
    break;
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

async function writeMetadata(layout, payload) {
  await ensureDir(layout.replicaRootDir);
  await fsp.writeFile(layout.metadataPath, JSON.stringify(payload, null, 2));
}

async function waitForSourceUnlock(sourceRootDir, timeoutMs = 12000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!exists(path.join(sourceRootDir, 'SingletonLock'))
      && !exists(path.join(sourceRootDir, 'SingletonCookie'))
      && !exists(path.join(sourceRootDir, 'SingletonSocket'))) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

export function createAdvancedProfileManager() {
  const jobs = new Map();

  function getProfileState(config) {
    const layout = buildLayout(config);
    const fingerprint = buildFingerprint(layout);
    const metadata = readJson(layout.metadataPath);
    if (!metadata) {
      return { status: 'missing', fingerprint };
    }
    if (metadata.schemaVersion !== SCHEMA_VERSION) {
      return { status: 'stale', fingerprint, lastSyncCompletedAt: metadata.lastSyncCompletedAt ?? null };
    }
    if (!metadata.validationPassed) {
      return {
        status: 'error',
        fingerprint,
        lastSyncCompletedAt: metadata.lastSyncCompletedAt ?? null,
        lastError: metadata.lastError ?? null,
      };
    }
    return {
      status: metadata.sourceFingerprint === fingerprint ? 'ready' : 'ready-stale',
      fingerprint,
      lastSyncCompletedAt: metadata.lastSyncCompletedAt ?? null,
      lastError: metadata.lastError ?? null,
      sourceFingerprint: metadata.sourceFingerprint ?? null,
    };
  }

  function getLaunchContext(config) {
    const layout = buildLayout(config);
    const state = getProfileState(config);
    if (state.status !== 'ready' && state.status !== 'ready-stale') {
      return null;
    }
    return {
      profileDirectory: layout.profileDirectory,
      userDataDir: layout.replicaRootDir,
    };
  }

  async function syncReplica(config, emitProgress) {
    const layout = buildLayout(config);
    if (!exists(layout.sourceRootDir)) {
      throw new Error('Chrome user data directory was not found.');
    }
    if (!exists(layout.sourceProfileDir)) {
      throw new Error('Selected Chrome user was not found.');
    }

    emitProgress?.({ stage: 'preparing-replica', percent: 8, detail: layout.profileDirectory });
    const unlocked = await waitForSourceUnlock(layout.sourceRootDir);
    if (!unlocked) {
      throw new Error('Close all Chrome windows for the selected user before preparing Advanced Mode.');
    }

    await ensureDir(layout.replicaRootDir);
    await clearDir(layout.replicaRootDir);
    await ensureDir(layout.replicaProfileDir);

    emitProgress?.({ stage: 'copying-browser-root', percent: 15, detail: layout.profileDirectory });
    const rootEntries = await fsp.readdir(layout.sourceRootDir, { withFileTypes: true });
    const rootEntryCount = rootEntries.filter((entry) => !SKIP_NAMES.has(entry.name) && !isChromeProfileDirectory(entry.name)).length;
    const rootProgress = createProgress(Math.max(rootEntryCount, 1), emitProgress, 'copying-browser-root', 18, 38);
    for (const entry of rootEntries) {
      if (SKIP_NAMES.has(entry.name) || isChromeProfileDirectory(entry.name)) {
        continue;
      }
      const sourcePath = path.join(layout.sourceRootDir, entry.name);
      const targetPath = path.join(layout.replicaRootDir, entry.name);
      if (entry.isDirectory()) {
        await copyDirectoryRecursive(sourcePath, targetPath, rootProgress);
      } else if (entry.isFile()) {
        const copied = await copyFileSafe(sourcePath, targetPath);
        if (copied) {
          rootProgress.advance();
        }
      }
    }

    emitProgress?.({ stage: 'copying-login-state', percent: 42, detail: layout.profileDirectory });
    const profileTotal = await countDirEntries(layout.sourceProfileDir);
    const profileProgress = createProgress(Math.max(profileTotal, 1), emitProgress, 'copying-login-state', 45, 88);
    await copyDirectoryRecursive(layout.sourceProfileDir, layout.replicaProfileDir, profileProgress);

    emitProgress?.({ stage: 'validating-replica', percent: 94, detail: layout.profileDirectory });
    const fingerprint = buildFingerprint(layout);
    const validation = validateReplica(layout);
    await writeMetadata(layout, {
      profileDirectory: layout.profileDirectory,
      schemaVersion: SCHEMA_VERSION,
      sourceFingerprint: fingerprint,
      lastSyncCompletedAt: new Date().toISOString(),
      validationPassed: validation.passed,
      validationIssues: validation.issues,
      lastError: validation.passed ? null : validation.issues.join('; '),
    });

    if (!validation.passed) {
      throw new Error(validation.issues.join('; '));
    }

    emitProgress?.({ stage: 'replica-ready', percent: 100, detail: layout.profileDirectory });
    return {
      profileDirectory: layout.profileDirectory,
      userDataDir: layout.replicaRootDir,
    };
  }

  function ensureReplica(config, emitProgress) {
    const profileKey = config.advancedProfileDirectory || 'Default';
    if (jobs.has(profileKey)) {
      return jobs.get(profileKey);
    }

    const state = getProfileState(config);
    if (state.status === 'ready' || state.status === 'ready-stale') {
      return Promise.resolve(getLaunchContext(config));
    }

    const job = syncReplica(config, emitProgress).finally(() => {
      jobs.delete(profileKey);
    });
    jobs.set(profileKey, job);
    return job;
  }

  return {
    getProfileState,
    getLaunchContext,
    ensureReplica,
    invalidateReplica(config) {
      const layout = buildLayout(config);
      try {
        fs.rmSync(layout.replicaRootDir, { recursive: true, force: true });
      } catch {
      }
    },
  };
}
