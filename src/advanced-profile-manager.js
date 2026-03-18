import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';

import { getAppDir } from './config.js';

const SCHEMA_VERSION = 5;
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

function getDefaultReplicaBaseDir() {
  return path.join(getAppDir(), 'advanced-profile-replicas');
}

function getReplicaBaseDir(config) {
  return config.advancedReplicaRootDir || getDefaultReplicaBaseDir();
}

function buildLayout(config) {
  const profileDirectory = config.advancedProfileDirectory || 'Default';
  const replicaBaseDir = getReplicaBaseDir(config);
  const replicaRootDir = path.join(replicaBaseDir, `cdp-${sanitizeName(profileDirectory)}`);

  return {
    profileDirectory,
    replicaBaseDir,
    replicaRootDir,
    replicaProfileDir: path.join(replicaRootDir, profileDirectory),
    metadataPath: path.join(replicaRootDir, METADATA_FILE),
  };
}

async function ensureDir(targetPath) {
  await fsp.mkdir(targetPath, { recursive: true });
}

function buildMetadata(config, replicaRootDir, extra = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    ready: true,
    mode: 'minimal-persistent-replica',
    profileId: sanitizeName(config.advancedProfileDirectory || 'Default'),
    profileDirectory: config.advancedProfileDirectory || 'Default',
    sourceChromeUserDataDir: config.advancedChromeUserDataDir,
    replicaRootDir,
    createdByVersion: '0.2.2',
    lastSyncCompletedAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    ownerAppId: 'cdp-bridge',
    lastError: null,
    ...extra,
  };
}

async function writeMetadata(layout, payload) {
  await ensureDir(layout.replicaRootDir);
  await fsp.writeFile(layout.metadataPath, JSON.stringify(payload, null, 2));
}

async function copyDir(sourcePath, targetPath) {
  await ensureDir(targetPath);
  const entries = await fsp.readdir(sourcePath, { withFileTypes: true });
  for (const entry of entries) {
    const sourceEntryPath = path.join(sourcePath, entry.name);
    const targetEntryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      await copyDir(sourceEntryPath, targetEntryPath);
    } else {
      await fsp.copyFile(sourceEntryPath, targetEntryPath);
    }
  }
}

async function migrateReplicaDirectory(sourcePath, targetPath) {
  if (sourcePath === targetPath || !exists(sourcePath)) {
    return targetPath;
  }

  await ensureDir(path.dirname(targetPath));
  try {
    await fsp.rename(sourcePath, targetPath);
  } catch {
    await copyDir(sourcePath, targetPath);
    await fsp.rm(sourcePath, { recursive: true, force: true });
  }

  return targetPath;
}

async function discoverReplica(config) {
  const roots = Array.from(new Set([getReplicaBaseDir(config), getDefaultReplicaBaseDir()]));
  const matches = [];

  for (const root of roots) {
    try {
      const entries = await fsp.readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const metadata = readJson(path.join(root, entry.name, METADATA_FILE));
        if (!metadata || metadata.ownerAppId !== 'cdp-bridge') {
          continue;
        }
        if ((metadata.profileDirectory || 'Default') !== (config.advancedProfileDirectory || 'Default')) {
          continue;
        }
        matches.push(metadata);
      }
    } catch {
    }
  }

  matches.sort((left, right) => String(right.lastUsedAt || '').localeCompare(String(left.lastUsedAt || '')));
  return matches[0] ?? null;
}

export function createAdvancedProfileManager() {
  const jobs = new Map();

  async function resolveMetadata(config) {
    const layout = buildLayout(config);
    const direct = readJson(layout.metadataPath);
    return direct ?? discoverReplica(config);
  }

  async function touchMetadata(config) {
    const layout = buildLayout(config);
    const metadata = await resolveMetadata(config);
    if (!metadata) {
      return;
    }
    const replicaRootDir = metadata.replicaRootDir || layout.replicaRootDir;
    const metadataPath = path.join(replicaRootDir, METADATA_FILE);
    await fsp.writeFile(metadataPath, JSON.stringify({
      ...metadata,
      replicaRootDir,
      lastUsedAt: new Date().toISOString(),
    }, null, 2));
  }

  async function getProfileState(config) {
    const layout = buildLayout(config);
    const metadata = await resolveMetadata(config);
    if (!metadata) {
      return { status: 'missing', rootDir: layout.replicaBaseDir };
    }
    if (metadata.schemaVersion !== SCHEMA_VERSION) {
      return {
        status: 'stale',
        lastSyncCompletedAt: metadata.lastSyncCompletedAt ?? null,
        rootDir: metadata.replicaRootDir ?? layout.replicaBaseDir,
      };
    }
    return {
      status: metadata.ready ? 'ready' : 'error',
      lastSyncCompletedAt: metadata.lastSyncCompletedAt ?? null,
      lastError: metadata.lastError ?? null,
      rootDir: metadata.replicaRootDir ?? layout.replicaRootDir,
    };
  }

  async function getLaunchContext(config) {
    const state = await getProfileState(config);
    if (state.status !== 'ready') {
      return null;
    }
    await touchMetadata(config);
    return {
      profileDirectory: config.advancedProfileDirectory || 'Default',
      userDataDir: state.rootDir,
    };
  }

  async function bootstrapReplica(config, emitProgress) {
    const layout = buildLayout(config);

    emitProgress?.({ stage: 'preparing-replica', percent: 15, detail: layout.profileDirectory });
    await ensureDir(layout.replicaRootDir);
    await ensureDir(layout.replicaProfileDir);
    await writeMetadata(layout, buildMetadata(config, layout.replicaRootDir));
    emitProgress?.({ stage: 'replica-ready', percent: 100, detail: layout.profileDirectory });

    return {
      profileDirectory: layout.profileDirectory,
      userDataDir: layout.replicaRootDir,
    };
  }

  function ensureReplica(config, emitProgress) {
    const profileKey = `${getReplicaBaseDir(config)}::${config.advancedProfileDirectory || 'Default'}`;
    if (jobs.has(profileKey)) {
      return jobs.get(profileKey);
    }

    const job = (async () => {
      const current = await getLaunchContext(config);
      if (current) {
        return current;
      }
      return bootstrapReplica(config, emitProgress);
    })().finally(() => {
      jobs.delete(profileKey);
    });

    jobs.set(profileKey, job);
    return job;
  }

  return {
    getProfileState,
    getLaunchContext,
    async discoverAndAttachReplica(config) {
      const metadata = await discoverReplica(config);
      if (!metadata) {
        return null;
      }
      await touchMetadata(config);
      return {
        profileDirectory: metadata.profileDirectory || config.advancedProfileDirectory || 'Default',
        userDataDir: metadata.replicaRootDir,
      };
    },
    ensureReplica,
    async invalidateReplica(config) {
      const state = await getProfileState(config);
      const layout = buildLayout(config);
      const targetPath = state.rootDir || layout.replicaRootDir;
      try {
        await fsp.rm(targetPath, { recursive: true, force: true });
      } catch {
      }
    },
  };
}
