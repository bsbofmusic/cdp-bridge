import crypto from 'node:crypto';

import { WebSocket } from 'ws';

import { getChromeVersion } from './chrome.js';

function now() {
  return new Date().toISOString();
}

function safeText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function summarizeTarget(targetInfo = {}) {
  return {
    targetId: targetInfo.targetId ?? null,
    type: targetInfo.type ?? null,
    title: targetInfo.title ?? null,
    url: targetInfo.url ?? null,
    attached: Boolean(targetInfo.attached),
    openerId: targetInfo.openerId ?? null,
    browserContextId: targetInfo.browserContextId ?? null,
  };
}

function pushBounded(list, item, limit = 50) {
  list.unshift(item);
  if (list.length > limit) {
    list.length = limit;
  }
}

function parseJsonMessage(raw) {
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

async function callBrowserEndpoint(config, method, params = {}) {
  const versionInfo = await getChromeVersion(config.chromeDebugPort);
  const ws = new WebSocket(versionInfo.webSocketDebuggerUrl);
  return new Promise((resolve, reject) => {
    const id = 1;
    const cleanup = () => {
      try {
        ws.close();
      } catch {
      }
    };

    ws.once('open', () => {
      ws.send(JSON.stringify({ id, method, params }));
    });

    ws.on('message', (raw) => {
      const message = parseJsonMessage(raw);
      if (!message || message.id !== id) {
        return;
      }
      cleanup();
      if (message.error) {
        reject(new Error(message.error.message || 'CDP request failed'));
        return;
      }
      resolve(message.result ?? {});
    });

    ws.once('error', (error) => {
      cleanup();
      reject(error);
    });
  });
}

export function createCdpObservability() {
  const sessions = new Map();
  const createdTargets = new Map();

  function ensureSession(sessionId, extra = {}) {
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        sessionId,
        sessionLabel: extra.sessionLabel ?? null,
        connectedAt: now(),
        lastSeenAt: now(),
        createdTargets: new Set(),
        consoleEvents: [],
        exceptionEvents: [],
        networkEvents: [],
        targetsSeen: new Map(),
        pendingCommands: new Map(),
      });
    }
    const session = sessions.get(sessionId);
    session.lastSeenAt = now();
    if (extra.sessionLabel) {
      session.sessionLabel = extra.sessionLabel;
    }
    return session;
  }

  function openSession(extra = {}) {
    const sessionId = extra.sessionId || crypto.randomUUID();
    ensureSession(sessionId, extra);
    return sessionId;
  }

  function closeSession(sessionId) {
    sessions.delete(sessionId);
  }

  function trackOutgoing(sessionId, rawMessage) {
    const session = ensureSession(sessionId);
    const message = parseJsonMessage(rawMessage);
    if (!message) {
      return;
    }
    if (message.id) {
      session.pendingCommands.set(message.id, {
        method: message.method,
        params: message.params ?? {},
        issuedAt: now(),
      });
    }
  }

  function trackIncoming(sessionId, rawMessage) {
    const session = ensureSession(sessionId);
    const message = parseJsonMessage(rawMessage);
    if (!message) {
      return;
    }

    if (message.id && session.pendingCommands.has(message.id)) {
      const pending = session.pendingCommands.get(message.id);
      session.pendingCommands.delete(message.id);

      if (pending.method === 'Target.createTarget' && message.result?.targetId) {
        session.createdTargets.add(message.result.targetId);
        createdTargets.set(message.result.targetId, sessionId);
      }

      if (pending.method === 'Target.getTargets' && Array.isArray(message.result?.targetInfos)) {
        for (const targetInfo of message.result.targetInfos) {
          if (targetInfo?.targetId) {
            session.targetsSeen.set(targetInfo.targetId, summarizeTarget(targetInfo));
          }
        }
      }
    }

    if (message.method === 'Target.targetCreated' || message.method === 'Target.targetInfoChanged') {
      const targetInfo = message.params?.targetInfo;
      if (targetInfo?.targetId) {
        session.targetsSeen.set(targetInfo.targetId, summarizeTarget(targetInfo));
      }
    }

    if (message.method === 'Target.targetDestroyed') {
      const targetId = message.params?.targetId;
      if (targetId) {
        session.targetsSeen.delete(targetId);
        session.createdTargets.delete(targetId);
      }
    }

    if (message.method === 'Runtime.consoleAPICalled') {
      pushBounded(session.consoleEvents, {
        ts: now(),
        type: message.params?.type ?? 'log',
        args: Array.isArray(message.params?.args)
          ? message.params.args.map((arg) => safeText(arg?.value, arg?.description ?? '[object]'))
          : [],
        executionContextId: message.params?.executionContextId ?? null,
      });
    }

    if (message.method === 'Runtime.exceptionThrown') {
      pushBounded(session.exceptionEvents, {
        ts: now(),
        text: safeText(message.params?.exceptionDetails?.text, 'Exception'),
        url: safeText(message.params?.exceptionDetails?.url),
        lineNumber: message.params?.exceptionDetails?.lineNumber ?? null,
        columnNumber: message.params?.exceptionDetails?.columnNumber ?? null,
      });
    }

    if (message.method === 'Network.requestWillBeSent') {
      pushBounded(session.networkEvents, {
        ts: now(),
        type: 'request',
        requestId: message.params?.requestId ?? null,
        url: safeText(message.params?.request?.url),
        method: safeText(message.params?.request?.method),
      }, 100);
    }

    if (message.method === 'Network.responseReceived') {
      pushBounded(session.networkEvents, {
        ts: now(),
        type: 'response',
        requestId: message.params?.requestId ?? null,
        url: safeText(message.params?.response?.url),
        status: message.params?.response?.status ?? null,
        mimeType: safeText(message.params?.response?.mimeType),
      }, 100);
    }
  }

  function summarizeSession(session) {
    return {
      sessionId: session.sessionId,
      sessionLabel: session.sessionLabel,
      connectedAt: session.connectedAt,
      lastSeenAt: session.lastSeenAt,
      createdTargetCount: session.createdTargets.size,
      createdTargets: Array.from(session.createdTargets),
      targetsSeen: Array.from(session.targetsSeen.values()),
      consoleEvents: session.consoleEvents,
      exceptionEvents: session.exceptionEvents,
      networkEvents: session.networkEvents,
    };
  }

  async function listBrowserTargets(config) {
    const result = await callBrowserEndpoint(config, 'Target.getTargets');
    const targetInfos = Array.isArray(result.targetInfos) ? result.targetInfos : [];
    return targetInfos.map((targetInfo) => ({
      ...summarizeTarget(targetInfo),
      ownerSessionId: createdTargets.get(targetInfo.targetId) ?? null,
    }));
  }

  async function closeSessionTargets(config, sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      return { closedTargetIds: [], missingSession: true };
    }
    const closedTargetIds = [];
    for (const targetId of Array.from(session.createdTargets)) {
      try {
        await callBrowserEndpoint(config, 'Target.closeTarget', { targetId });
        closedTargetIds.push(targetId);
        createdTargets.delete(targetId);
        session.createdTargets.delete(targetId);
        session.targetsSeen.delete(targetId);
      } catch {
      }
    }
    return { closedTargetIds, missingSession: false };
  }

  return {
    openSession,
    closeSession,
    trackOutgoing,
    trackIncoming,
    listSessions() {
      return Array.from(sessions.values()).map(summarizeSession);
    },
    async getDiagnostics(config) {
      return {
        sessions: this.listSessions(),
        targets: await listBrowserTargets(config),
      };
    },
    closeSessionTargets,
  };
}
