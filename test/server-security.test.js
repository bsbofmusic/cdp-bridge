import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { test } from 'node:test';

import { WebSocket } from 'ws';

import { startBridgeServer } from '../src/server.js';

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function createTestBridge(t) {
  const port = await getAvailablePort();
  const config = {
    bridgePort: port,
    bindHost: '127.0.0.1',
    chromeDebugPort: 9,
    token: 'test-secret-token',
    launchChrome: true
  };
  const handle = await startBridgeServer(config, {
    start: async () => ({
      browserMode: 'clean',
      wsEndpoint: `ws://127.0.0.1:${port}/devtools/browser?token=${config.token}`,
      versionEndpoint: `http://127.0.0.1:${port}/json/version?token=${config.token}`,
      cdpState: 'available',
      phase: 'ready'
    }),
    getDiagnostics: async () => ({ activeAgentSessions: [] }),
    closeSessionTargets: async () => ({ closed: 0 }),
    ensureSiteTab: async () => ({ targetId: null })
  });

  t.after(() => handle.close());
  return {
    config,
    baseUrl: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${port}`
  };
}

async function getText(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: `${parsed.pathname}${parsed.search}`,
      method: 'GET'
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => resolve({ status: response.statusCode, text: body }));
    });
    request.once('error', reject);
    request.end();
  });
}

async function getJson(url) {
  const response = await getText(url);
  return {
    ...response,
    payload: JSON.parse(response.text)
  };
}

function assertNoSecretLeak(text, token) {
  assert.equal(text.includes(token), false, 'response must not include the raw token');
  assert.equal(text.includes('token='), false, 'response must not include tokenized URLs');
  assert.equal(text.includes('wsEndpoint'), false, 'public status must not expose wsEndpoint');
  assert.equal(text.includes('versionEndpoint'), false, 'public status must not expose versionEndpoint');
  assert.equal(text.includes('controlStartBase'), false, 'public status must not expose controlStartBase');
  assert.equal(text.includes('diagnosticsEndpoint'), false, 'public status must not expose diagnosticsEndpoint');
}

test('/health is public and minimal', async (t) => {
  const { baseUrl } = await createTestBridge(t);
  const response = await getJson(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.payload, { ok: true });
});

test('/status is public but redacts token-bearing endpoint details', async (t) => {
  const { baseUrl, config } = await createTestBridge(t);
  const response = await getText(`${baseUrl}/status`);
  assert.equal(response.status, 200);
  const text = response.text;
  assertNoSecretLeak(text, config.token);

  const payload = JSON.parse(text);
  assert.equal(payload.ok, true);
  assert.equal(payload.bridgeReady, true);
  assert.equal(payload.canRemoteStart, true);
  assert.equal(typeof payload.recommendedAction, 'string');
  assert.equal(Object.hasOwn(payload, 'wsEndpoint'), false);
});

test('/status with a valid token may include endpoint details', async (t) => {
  const { baseUrl, config } = await createTestBridge(t);
  const response = await getJson(`${baseUrl}/status?token=${encodeURIComponent(config.token)}`);
  assert.equal(response.status, 200);
  const payload = response.payload;
  assert.equal(typeof payload.wsEndpoint, 'string');
  assert.match(payload.wsEndpoint, new RegExp(`^ws://.+:${config.bridgePort}/devtools/browser\\?token=${config.token}$`));
});

test('/status with a wrong token keeps public redaction behavior', async (t) => {
  const { baseUrl, config } = await createTestBridge(t);
  const response = await getText(`${baseUrl}/status?token=wrong-token`);
  assert.equal(response.status, 200);
  const text = response.text;
  assertNoSecretLeak(text, config.token);
});

test('protected HTTP endpoints reject missing or wrong tokens', async (t) => {
  const { baseUrl } = await createTestBridge(t);
  const protectedPaths = [
    '/json/version',
    '/control/start',
    '/diagnostics',
    '/control/close-session-targets',
    '/control/ensure-site-tab'
  ];

  for (const path of protectedPaths) {
    const missing = await getText(`${baseUrl}${path}`);
    assert.equal(missing.status, 401, `${path} should reject a missing token`);

    const wrong = await getText(`${baseUrl}${path}?token=wrong-token`);
    assert.equal(wrong.status, 401, `${path} should reject a wrong token`);
  }
});

test('WebSocket upgrade rejects missing or wrong tokens', async (t) => {
  const { wsUrl } = await createTestBridge(t);

  await assertWebSocketRejected(`${wsUrl}/devtools/browser`);
  await assertWebSocketRejected(`${wsUrl}/devtools/browser?token=wrong-token`);
});

async function assertWebSocketRejected(url) {
  await new Promise((resolve, reject) => {
    const client = new WebSocket(url);
    const timeout = setTimeout(() => {
      client.terminate();
      reject(new Error(`Timed out waiting for WebSocket rejection: ${url}`));
    }, 2000);

    client.once('unexpected-response', (_request, response) => {
      clearTimeout(timeout);
      assert.equal(response.statusCode, 401);
      resolve();
    });
    client.once('open', () => {
      clearTimeout(timeout);
      client.close();
      reject(new Error(`WebSocket unexpectedly opened: ${url}`));
    });
    client.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
