import { EventEmitter } from 'node:events';

import { createBridgeService } from './bridge-service.js';
import { getAppDir } from './config.js';
import { createLogger } from './logger.js';

const logger = createLogger('supervisor');

function now() {
  return new Date().toISOString();
}

function deriveState(snapshot) {
  return {
    phase: snapshot.running
      ? (snapshot.chromeReachable ? 'running' : 'waiting_cdp')
      : 'idle',
    appState: 'ready',
    bridgeState: snapshot.running ? 'started' : 'stopped',
    cdpState: snapshot.chromeReachable ? 'available' : (snapshot.running ? 'waiting' : 'unavailable')
  };
}

export function createBridgeSupervisor() {
  const service = createBridgeService();
  const events = new EventEmitter();
  let monitorTimer = null;
  let actionInFlight = false;
  let state = {
    phase: 'idle',
    appState: 'ready',
    bridgeState: 'stopped',
    cdpState: 'unavailable',
    running: false,
    repairCount: 0,
    lastError: null,
    lastHealthyAt: null,
    startedAt: null,
    operationProgress: null,
    appDir: getAppDir(),
    logDir: service.getConfig().logDir,
  };

  function setOperationProgress(progress) {
    return pushState({
      operationProgress: progress ? {
        active: true,
        action: progress.action ?? 'working',
        stage: progress.stage ?? 'working',
        percent: typeof progress.percent === 'number' ? progress.percent : null,
        detail: progress.detail ?? null,
      } : null,
    });
  }

  function pushState(patch) {
    state = { ...state, ...patch };
    logger.info('state-updated', {
      phase: state.phase,
      appState: state.appState,
      bridgeState: state.bridgeState,
      cdpState: state.cdpState,
      running: state.running,
      lastError: state.lastError,
    });
    events.emit('state', state);
    return state;
  }

  function runtimeConfig(context) {
    const config = service.getConfig();
    logger.info('runtime-config', {
      context,
      healthCheckIntervalMs: config.healthCheckIntervalMs,
      autoRepair: config.autoRepair,
      browserMode: config.browserMode,
      deviceMode: config.deviceMode,
      advancedProfileDirectory: config.advancedProfileDirectory,
      bridgePort: config.bridgePort,
      chromeDebugPort: config.chromeDebugPort,
    });
  }

  async function capture(fallbackPhase = state.phase) {
    const snapshot = await service.getStatus();
    const derived = actionInFlight
      ? {
          phase: fallbackPhase,
          appState: 'working',
          bridgeState: fallbackPhase === 'idle' ? 'stopped' : 'starting',
          cdpState: fallbackPhase === 'idle' ? 'unavailable' : 'waiting',
        }
      : deriveState(snapshot);

    return pushState({
      ...snapshot,
      ...derived,
      lastHealthyAt: snapshot.running && snapshot.chromeReachable ? now() : state.lastHealthyAt,
    });
  }

  async function tick() {
    try {
      return await capture();
    } catch (error) {
      logger.error('tick-failed', { error: error.message });
      return pushState({
        phase: 'error',
        appState: 'error',
        bridgeState: 'stopped',
        cdpState: 'unavailable',
        lastError: error.message,
      });
    }
  }

  function stopMonitor() {
    clearTimeout(monitorTimer);
    monitorTimer = null;
  }

  function startMonitor() {
    stopMonitor();
    const schedule = () => {
      const intervalMs = service.getConfig().healthCheckIntervalMs;
      monitorTimer = setTimeout(async () => {
        await tick();
        schedule();
      }, intervalMs);
    };
    schedule();
  }

  async function runAction(phase, context, action, extraPatch = {}) {
    runtimeConfig(context);
    actionInFlight = true;
    pushState({
      phase,
      appState: 'working',
      bridgeState: phase === 'idle' ? 'stopped' : 'starting',
      cdpState: phase === 'idle' ? 'unavailable' : 'waiting',
      lastError: null,
      operationProgress: {
        active: true,
        action: context,
        stage: phase,
        percent: 5,
        detail: null,
      },
      ...extraPatch,
    });

    const onProgress = (progress) => {
      setOperationProgress({ ...progress, action: context });
    };
    try {
      const snapshot = await action(onProgress);
      const derived = deriveState(snapshot);
      return pushState({
        ...snapshot,
        ...derived,
        operationProgress: null,
        lastHealthyAt: snapshot.running && snapshot.chromeReachable ? now() : state.lastHealthyAt,
      });
    } catch (error) {
      logger.error(`${context}-failed`, { error: error.message });
      return pushState({
        phase: 'error',
        appState: 'error',
        bridgeState: 'stopped',
        cdpState: 'unavailable',
        running: false,
        operationProgress: null,
        lastError: error.message,
      });
    } finally {
      actionInFlight = false;
    }
  }

  return {
    events,
    async initialize() {
      runtimeConfig('initialize');
      startMonitor();
      return capture('idle');
    },
    async start() {
      return runAction('starting', 'start', async (onProgress) => {
        const snapshot = await service.start({ onProgress });
        startMonitor();
        return snapshot;
      }, { startedAt: state.startedAt ?? now() });
    },
    async stop() {
      logger.info('stop-requested');
      stopMonitor();
      await service.stop();
      return pushState({
        phase: 'idle',
        appState: 'ready',
        bridgeState: 'stopped',
        cdpState: 'unavailable',
        running: false,
      });
    },
    async restart() {
      return runAction('restarting', 'restart', async (onProgress) => {
        onProgress({ stage: 'stopping-bridge', percent: 12, detail: String(service.getConfig().bridgePort) });
        const snapshot = await service.restart({ onProgress });
        startMonitor();
        return snapshot;
      });
    },
    async repair() {
      return runAction('repairing', 'repair', async (onProgress) => {
        const snapshot = await service.repair({ onProgress });
        startMonitor();
        return { ...snapshot, repairCount: state.repairCount + 1 };
      });
    },
    async rotateToken() {
      return runAction('rotating-token', 'rotate-token', async (onProgress) => {
        onProgress({ stage: 'rotating-token', percent: 25, detail: null });
        const snapshot = await service.rotateToken();
        startMonitor();
        return snapshot;
      });
    },
    async refresh() {
      return capture(state.phase);
    },
    getSnapshot() {
      return state;
    },
    updateConfig(mutator) {
      const config = service.updateConfig(mutator);
      pushState({
        launchOnLogin: config.launchOnLogin,
        minimizeToTray: config.minimizeToTray,
        language: config.language,
        advancedReplicaRootDir: config.advancedReplicaRootDir,
      });
      return config;
    },
    async prepareAdvancedReplica(reason = 'Preparing advanced replica') {
      return runAction('repairing', 'prepare-advanced-replica', async (onProgress) => {
        onProgress({ stage: 'preparing-replica', percent: 10, detail: reason });
        return service.prepareAdvancedReplica({ onProgress });
      }, { lastError: reason });
    },
    async resetAdvancedReplica() {
      return runAction('repairing', 'reset-advanced-replica', async (onProgress) => {
        onProgress({ stage: 'stopping-managed-browser', percent: 12, detail: 'advanced-replica' });
        const snapshot = await service.resetAdvancedReplica();
        stopMonitor();
        return {
          ...snapshot,
          running: false,
        };
      });
    },
    async reconfigure(mutator, reason = 'Configuration changed') {
      return runAction('repairing', 'reconfigure', async (onProgress) => {
        onProgress({ stage: 'updating-config', percent: 8, detail: reason });
        const config = service.updateConfig(mutator);
        const snapshot = await service.repair({ onProgress });
        startMonitor();
        return {
          ...snapshot,
          launchOnLogin: config.launchOnLogin,
          minimizeToTray: config.minimizeToTray,
          language: config.language,
          advancedReplicaRootDir: config.advancedReplicaRootDir,
        };
      }, { lastError: reason });
    },
  };
}
