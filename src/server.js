import http from 'node:http';
import { URL } from 'node:url';

import { WebSocket, WebSocketServer } from 'ws';

import { getChromeVersion } from './chrome.js';
import { getTailscaleStatus } from './tailscale.js';

async function getBridgeMetadata(config) {
  const tailscale = await getTailscaleStatus();
  const tailscaleIp = tailscale.tailscaleIp;
  const baseHost = tailscaleIp ?? '127.0.0.1';
  const wsUrl = `ws://${baseHost}:${config.bridgePort}/devtools/browser?token=${config.token}`;

  return {
    tailscale,
    tailscaleIp,
    wsUrl,
    versionInfo: null,
    cdpReady: false,
    cdpError: null
  };
}

async function getVersionMetadata(config) {
  const metadata = await getBridgeMetadata(config);
  const versionInfo = await getChromeVersion(config.chromeDebugPort);

  return {
    ...metadata,
    versionInfo,
    cdpReady: true,
    cdpError: null
  };
}

function parseControlOptions(parsedUrl) {
  return {
    mode: parsedUrl.searchParams.get('mode') || undefined,
    profile: parsedUrl.searchParams.get('profile') || undefined,
    device: parsedUrl.searchParams.get('device') || undefined,
  };
}

function parseSessionOptions(parsedUrl) {
  return {
    sessionId: parsedUrl.searchParams.get('sessionId') || undefined,
    sessionLabel: parsedUrl.searchParams.get('sessionLabel') || undefined,
  };
}

function bridgeUnavailablePayload(config, error) {
  return {
    ok: false,
    error: 'Local browser CDP is not ready',
    detail: error.message,
    hint: 'Start the selected browser mode locally and wait until the app shows CDP available.',
    chromeDebugPort: config.chromeDebugPort,
  };
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload, null, 2));
}

function isAuthorized(request, token) {
  const parsed = new URL(request.url, 'http://127.0.0.1');
  return parsed.searchParams.get('token') === token;
}

export async function startBridgeServer(config, controls = {}) {
  const server = http.createServer(async (request, response) => {
    const parsed = new URL(request.url, 'http://127.0.0.1');

    if (parsed.pathname === '/health') {
      return json(response, 200, { ok: true });
    }

    if (parsed.pathname === '/status') {
      const metadata = await getBridgeMetadata(config);

      try {
        const versionInfo = await getChromeVersion(config.chromeDebugPort);
        metadata.versionInfo = versionInfo;
        metadata.cdpReady = true;
      } catch (error) {
        metadata.cdpError = error.message;
      }

      return json(response, 200, {
        ok: true,
        bridgePort: config.bridgePort,
        chromeDebugPort: config.chromeDebugPort,
        tailscaleIp: metadata.tailscaleIp,
        tailscale: metadata.tailscale,
        wsEndpoint: metadata.wsUrl,
        cdpReady: metadata.cdpReady,
        cdpError: metadata.cdpError,
        browser: metadata.versionInfo
          ? {
              browser: metadata.versionInfo.Browser,
              protocolVersion: metadata.versionInfo['Protocol-Version']
            }
          : null
      });
    }

    if (parsed.pathname === '/json/version') {
      if (!isAuthorized(request, config.token)) {
        return json(response, 401, { ok: false, error: 'Unauthorized' });
      }

      try {
        const metadata = await getVersionMetadata(config);
        return json(response, 200, {
          ...metadata.versionInfo,
          webSocketDebuggerUrl: metadata.wsUrl
        });
      } catch (error) {
        return json(response, 503, bridgeUnavailablePayload(config, error));
      }
    }

    if (parsed.pathname === '/control/start') {
      if (!isAuthorized(request, config.token)) {
        return json(response, 401, { ok: false, error: 'Unauthorized' });
      }
      if (!controls.start) {
        return json(response, 501, { ok: false, error: 'Remote start is not available' });
      }

      try {
        const snapshot = await controls.start(parseControlOptions(parsed));
        return json(response, 200, {
          ok: true,
          mode: snapshot.browserMode,
          profile: snapshot.advancedProfileDirectory ?? 'Default',
          wsEndpoint: snapshot.wsEndpoint,
          versionEndpoint: snapshot.versionEndpoint,
          cdpState: snapshot.cdpState,
          phase: snapshot.phase,
        });
      } catch (error) {
        return json(response, 500, { ok: false, error: error.message });
      }
    }

    if (parsed.pathname === '/diagnostics') {
      if (!isAuthorized(request, config.token)) {
        return json(response, 401, { ok: false, error: 'Unauthorized' });
      }
      if (!controls.getDiagnostics) {
        return json(response, 501, { ok: false, error: 'Diagnostics are not available' });
      }
      try {
        return json(response, 200, {
          ok: true,
          ...(await controls.getDiagnostics())
        });
      } catch (error) {
        return json(response, 500, { ok: false, error: error.message });
      }
    }

    if (parsed.pathname === '/control/close-session-targets') {
      if (!isAuthorized(request, config.token)) {
        return json(response, 401, { ok: false, error: 'Unauthorized' });
      }
      if (!controls.closeSessionTargets) {
        return json(response, 501, { ok: false, error: 'Session cleanup is not available' });
      }
      try {
        const sessionId = parsed.searchParams.get('sessionId');
        if (!sessionId) {
          return json(response, 400, { ok: false, error: 'sessionId is required' });
        }
        return json(response, 200, {
          ok: true,
          ...(await controls.closeSessionTargets(sessionId))
        });
      } catch (error) {
        return json(response, 500, { ok: false, error: error.message });
      }
    }

    return json(response, 404, { ok: false, error: 'Not found' });
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    const parsed = new URL(request.url, 'http://127.0.0.1');

    if (parsed.pathname !== '/devtools/browser' || !isAuthorized(request, config.token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      const versionInfo = await getChromeVersion(config.chromeDebugPort);
      const upstream = new WebSocket(versionInfo.webSocketDebuggerUrl);
      const sessionOptions = parseSessionOptions(parsed);
      const sessionId = controls.openSession?.(sessionOptions) ?? null;

      upstream.once('open', () => {
        wss.handleUpgrade(request, socket, head, (client) => {
          client.on('message', (message, isBinary) => {
            if (!isBinary && sessionId) {
              controls.trackOutgoing?.(sessionId, message);
            }
            if (upstream.readyState === WebSocket.OPEN) {
              upstream.send(message, { binary: isBinary });
            }
          });

          upstream.on('message', (message, isBinary) => {
            if (!isBinary && sessionId) {
              controls.trackIncoming?.(sessionId, message);
            }
            if (client.readyState === WebSocket.OPEN) {
              client.send(message, { binary: isBinary });
            }
          });

          const closeBoth = () => {
            if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
              client.close();
            }
            if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
              upstream.close();
            }
          };

          client.on('close', closeBoth);
          client.on('error', closeBoth);
          upstream.on('close', () => {
            if (sessionId) {
              controls.closeSession?.(sessionId);
            }
            closeBoth();
          });
          upstream.on('error', closeBoth);
        });
      });

      upstream.once('error', () => {
        socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        socket.destroy();
      });
    } catch {
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.bridgePort, config.bindHost ?? '0.0.0.0', resolve);
  });

  return {
    server,
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}
