'use strict';

const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CDPER = '@bsbofmusic/cdper@latest';
const CDPER_MCP = '@bsbofmusic/cdper-mcp@latest';

let installRoot;
let cdperCli;
let mcpEntrypoint;

function resolveNpmCli() {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const NPM_CLI = resolveNpmCli();

function redact(value) {
  return String(value || '')
    .replace(/(token=)[^&\s"'<>]+/gi, '$1<redacted>')
    .replace(/("token"\s*:\s*")[^"]+/gi, '$1<redacted>')
    .replace(/(CDP_WS\s*=\s*ws:\/\/[^\s"']*token=)[^\s"']+/gi, '$1<redacted>');
}

function run(command, args, options = {}) {
  const result = cp.spawnSync(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CDPER_KERNEL: 'playwright-cdp',
      CDPER_NO_UPDATE_CHECK: '1',
      ...options.env,
    },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: redact(result.stdout),
    stderr: redact(result.stderr || result.error?.message),
  };
}

function parseJson(step, result) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`${step} returned non-JSON output: ${result.stdout.slice(0, 600)} ${result.stderr.slice(0, 600)}`.trim());
  }
}

function runCdper(args) {
  if (!cdperCli) throw new Error('cdper CLI was not installed yet');
  return run(process.execPath, [cdperCli, '--kernel', 'playwright-cdp', ...args]);
}

function runNpm(args) {
  if (NPM_CLI) return run(process.execPath, [NPM_CLI, ...args]);
  const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return run(npmBin, args);
}

function packageVersion(packageName) {
  const result = runNpm(['view', packageName, 'version', '--json', '--prefer-online']);
  if (result.status !== 0) return { ok: false, error: result.stderr || result.stdout };
  return { ok: true, version: String(parseJson(`npm view ${packageName}`, result)).replace(/^"|"$/g, '') };
}

function installLatestPackages() {
  installRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cdper-playwright-verify-'));
  const result = runNpm([
    'install',
    '--prefix',
    installRoot,
    CDPER,
    CDPER_MCP,
    '--ignore-scripts',
    '--prefer-online',
  ]);
  if (result.status !== 0) {
    throw new Error(`npm install failed: ${result.stderr || result.stdout}`);
  }

  cdperCli = path.join(installRoot, 'node_modules', '@bsbofmusic', 'cdper', 'dist', 'cli.js');
  mcpEntrypoint = path.join(installRoot, 'node_modules', '@bsbofmusic', 'cdper-mcp', 'index-v2.js');
  if (!fs.existsSync(cdperCli)) throw new Error(`cdper CLI not found after install: ${cdperCli}`);
  if (!fs.existsSync(mcpEntrypoint)) throw new Error(`cdper MCP entrypoint not found after install: ${mcpEntrypoint}`);
}

async function main() {
  const cdperVersion = packageVersion('@bsbofmusic/cdper');
  const mcpRegistryVersion = packageVersion('@bsbofmusic/cdper-mcp');
  installLatestPackages();
  const mcpBin = run(process.execPath, [mcpEntrypoint, '--version']);

  const doctorResult = runCdper(['doctor', '--json']);
  const doctor = parseJson('cdper doctor', doctorResult);
  if (!doctor.ok) {
    console.log(JSON.stringify({
      ok: false,
      stage: 'doctor',
      cdperVersion,
      mcpRegistryVersion,
      mcpBinVersion: mcpBin.stdout.trim(),
      installRoot,
      doctor,
      nextSteps: [
        'Start CDP Bridge on the Windows host.',
        'Copy the Bridge WS URL into ~/.cdp-auth.json, or set CDP_BRIDGE_HOST plus ~/.cdp-bridge/config.json.',
        'Retry npm run verify:cdper-playwright.',
      ],
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  let tabId;
  try {
    const open = parseJson('cdper open', runCdper(['open', 'https://example.com', '--label', 'cdper-playwright-verify', '--json']));
    if (!open.ok) throw new Error(`open failed: ${open.error || JSON.stringify(open)}`);
    tabId = open.tabId || open.id;

    const snapshot = parseJson('cdper snapshot', runCdper(['snapshot', tabId, '--json']));
    if (!snapshot.ok) throw new Error(`snapshot failed: ${snapshot.error || JSON.stringify(snapshot)}`);

    const evaluated = parseJson('cdper eval', runCdper(['eval', tabId, '({ title: document.title, href: location.href })', '--json']));
    if (!evaluated.ok) throw new Error(`eval failed: ${evaluated.error || JSON.stringify(evaluated)}`);

    const shotPath = path.join(os.tmpdir(), `cdper-playwright-verify-${Date.now()}.png`);
    const screenshot = parseJson('cdper screenshot', runCdper(['screenshot', tabId, '--lite', '--timeout', '8000', '--out', shotPath, '--json']));
    if (!screenshot.ok) throw new Error(`screenshot failed: ${screenshot.error || JSON.stringify(screenshot)}`);
    const screenshotBytes = fs.existsSync(screenshot.path) ? fs.statSync(screenshot.path).size : 0;
    if (screenshotBytes <= 0) throw new Error('screenshot artifact was empty');

    const close = parseJson('cdper close', runCdper(['close', tabId, '--json']));
    if (!close.ok) throw new Error(`close failed: ${close.error || JSON.stringify(close)}`);
    tabId = undefined;

    const tabs = parseJson('cdper tabs', runCdper(['tabs', '--json']));
    const leaked = (tabs.tabs || []).filter((tab) => String(tab.label || '').startsWith('cdper-playwright-verify'));

    console.log(JSON.stringify({
      ok: leaked.length === 0,
      cdperVersion,
      mcpRegistryVersion,
      mcpBinVersion: mcpBin.stdout.trim(),
      installRoot,
      kernel: doctor.controlKernel?.active,
      kernelVersion: doctor.controlKernel?.version,
      playwrightCoreVersion: doctor.controlKernel?.playwrightCoreVersion,
      browser: doctor.bridgeStatus?.browser,
      smoke: {
        tabId: open.tabId,
        targetId: open.targetId,
        snapshotNodes: snapshot.snapshot?.nodeCount,
        evalTitle: evaluated.result?.title,
        screenshotMode: screenshot.mode,
        screenshotBytes,
        closeOk: close.ok,
        leakedVerifyTabs: leaked.length,
      },
    }, null, 2));
    process.exitCode = leaked.length === 0 ? 0 : 1;
  } catch (error) {
    if (tabId) {
      runCdper(['close', tabId, '--json']);
    }
    console.log(JSON.stringify({ ok: false, stage: 'smoke', error: redact(error.message) }, null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(redact(error.stack || error.message));
  process.exitCode = 1;
});
