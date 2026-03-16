import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, clipboard, ipcMain, Menu, nativeImage, Notification, shell, Tray } from 'electron';

import { getConfigPath } from '../src/config.js';
import { createBridgeSupervisor } from '../src/supervisor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDevBuild = !app.isPackaged;
const windowIconPath = path.join(__dirname, 'assets', 'app-icon.png');
const trayIconPath = path.join(__dirname, 'assets', 'app-icon.ico');

const translations = {
  'zh-CN': {
    appName: 'CDP Bridge',
    devAppName: 'CDP Bridge Dev',
    copiedWs: '已复制 WS 地址。',
    copiedHttp: '已复制 HTTP 地址。',
    copiedPrompt: '已复制通用 Agent Prompt。',
    trayStatus: '状态',
    wsUnavailable: 'WS 地址不可用',
    httpUnavailable: 'HTTP 地址不可用',
    copyPrompt: '复制通用 Agent Prompt',
    openWindow: '打开主窗口',
    bridgeNow: '立即桥接',
    repairNow: '一键修复',
    rotateToken: '轮换 Token',
    openConfig: '打开配置文件',
    openLogs: '打开日志目录',
    openUninstaller: '卸载程序',
    launchOnLogin: '开机启动',
    minimizeToTray: '最小化到托盘',
    quit: '退出',
    uninstallMissing: '未找到卸载程序。',
    promptIntro: '不要再尝试连接 Windows 上的原始 Chrome CDP 端口 `9222`，也不要要求我把 `--remote-debugging-address=0.0.0.0` 暴露到公网或局域网。',
    promptUseBridge: '改为使用我本地 `cdp-bridge` 提供的 WebSocket CDP 地址。',
    promptSteps: '请按下面要求配置：',
    promptStep1: '1. 使用我提供的这条 WS endpoint 作为唯一的 CDP 连接地址：',
    promptStep2: '2. 不要再连接：',
    promptStep3: '3. 不要要求开放 Windows 防火墙的 `9222`',
    promptStep4: '4. 不要要求 Chrome 绑定 `0.0.0.0`',
    promptStep5: '5. 只通过这条 bridge WS 地址连接浏览器',
    promptVersion: '如果需要探测版本信息，可以使用这个 HTTP endpoint：',
    promptAsk: '请直接基于这条 bridge WS endpoint 完成浏览器配置，并告诉我：',
    promptAsk1: '- 你最终采用的配置项名称',
    promptAsk2: '- 是否连接成功',
    promptAsk3: '- 如果失败，返回你实际尝试连接的完整地址',
    copiedClaude: '已复制 Claude Prompt。',
    copiedPlaywright: '已复制 Playwright 代码片段。',
    copiedRaw: '已复制原始 CDP 地址。',
    copyClaude: '复制 Claude Prompt',
    copyPlaywright: '复制 Playwright 代码',
    copyRaw: '复制原始 CDP 地址'
  },
  'en-US': {
    appName: 'CDP Bridge',
    devAppName: 'CDP Bridge Dev',
    copiedWs: 'WS endpoint copied.',
    copiedHttp: 'HTTP endpoint copied.',
    copiedPrompt: 'Generic agent prompt copied.',
    trayStatus: 'Status',
    wsUnavailable: 'WS endpoint unavailable',
    httpUnavailable: 'HTTP endpoint unavailable',
    copyPrompt: 'Copy Generic Agent Prompt',
    openWindow: 'Open main window',
    bridgeNow: 'Bridge now',
    repairNow: 'One-click repair',
    rotateToken: 'Rotate token',
    openConfig: 'Open config file',
    openLogs: 'Open logs folder',
    openUninstaller: 'Uninstall app',
    launchOnLogin: 'Launch on login',
    minimizeToTray: 'Minimize to tray',
    quit: 'Quit',
    uninstallMissing: 'Uninstaller not found.',
    promptIntro: 'Do not try to connect to the raw Windows Chrome CDP port `9222`, and do not ask me to expose `--remote-debugging-address=0.0.0.0` to the public internet or LAN.',
    promptUseBridge: 'Use the local `cdp-bridge` WebSocket CDP endpoint instead.',
    promptSteps: 'Please configure it like this:',
    promptStep1: '1. Use this WS endpoint as the only CDP connection address:',
    promptStep2: '2. Do not connect to:',
    promptStep3: '3. Do not ask to open Windows firewall for `9222`',
    promptStep4: '4. Do not ask Chrome to bind to `0.0.0.0`',
    promptStep5: '5. Only connect through this bridge WS endpoint',
    promptVersion: 'If version discovery is required, use this HTTP endpoint:',
    promptAsk: 'Please finish the browser configuration with this bridge endpoint and tell me:',
    promptAsk1: '- the final config key or field you used',
    promptAsk2: '- whether the connection succeeded',
    promptAsk3: '- if it failed, the exact address you actually attempted',
    copiedClaude: 'Claude prompt copied.',
    copiedPlaywright: 'Playwright snippet copied.',
    copiedRaw: 'Raw CDP URL copied.',
    copyClaude: 'Copy Claude Prompt',
    copyPlaywright: 'Copy Playwright Snippet',
    copyRaw: 'Copy Raw CDP URL'
  }
};

function t(language, key) {
  return translations[language]?.[key] ?? translations['zh-CN'][key];
}

if (isDevBuild) {
  app.setPath('userData', path.join(app.getPath('appData'), 'cdp-bridge-dev'));
}

const supervisor = createBridgeSupervisor();

let tray = null;
let mainWindow = null;

function buildGenericAgentPrompt(snapshot) {
  const language = snapshot.language ?? 'zh-CN';
  if (language === 'en-US') {
    return [
      'Background',
      'You are configuring a remote AI agent to drive a local Windows Chrome-family browser through a Tailscale-secured CDP bridge.',
      '',
      'Goal',
      'Connect to the existing bridge endpoint and use it as the only browser automation path.',
      '',
      'Agent connection details',
      `- WS endpoint: ${snapshot.wsEndpoint ?? '<unavailable>'}`,
      `- HTTP discovery endpoint: ${snapshot.versionEndpoint ?? '<unavailable>'}`,
      '',
      'Rules',
      '- Do not use raw Chrome port 9222.',
      '- Do not request `--remote-debugging-address=0.0.0.0`.',
      '- Do not ask to open Windows firewall for 9222.',
      '- Treat the bridge WS endpoint as the only browser connection address.',
      '',
      'Step-by-step',
      '1. Verify that the bridge HTTP endpoint is reachable.',
      '2. Configure the browser/CDP client to use the WS endpoint above.',
      '3. Do not attempt any direct connection to localhost:9222 or any raw 9222 port.',
      '4. Report the exact config field or command you used.',
      '5. Report whether the connection succeeded.',
      '6. If it failed, return the exact address you attempted.',
      '',
      'OpenClaw-compatible media note',
      'If local screenshots must later be attached to Discord, Telegram, Signal, or similar channels, use `MEDIA:./relative-path` and let the runtime convert and upload the local file automatically.'
    ].join('\n');
  }

  return [
    '背景',
    '你正在为一个远程 AI Agent 配置浏览器访问。目标浏览器运行在本地 Windows 机器上，并通过 Tailscale 保护的 CDP bridge 暴露出来。',
    '',
    '目标',
    '请连接到现有 bridge，并把它作为唯一的浏览器自动化入口。',
    '',
    '连接信息',
    `- WS 地址：${snapshot.wsEndpoint ?? '<不可用>'}`,
    `- HTTP 探测地址：${snapshot.versionEndpoint ?? '<不可用>'}`,
    '',
    '规则',
    '- 不要使用原始 Chrome 9222 端口。',
    '- 不要要求 `--remote-debugging-address=0.0.0.0`。',
    '- 不要要求开放 Windows 防火墙的 9222。',
    '- 只把 bridge 的 WS 地址当作浏览器连接入口。',
    '',
    '操作步骤',
    '1. 先确认 bridge 的 HTTP 探测地址可访问。',
    '2. 把浏览器/CDP 客户端配置到上面的 WS 地址。',
    '3. 不要再尝试任何 localhost:9222 或其他裸 9222 直连。',
    '4. 返回你最终使用的配置项名称或命令。',
    '5. 返回是否连接成功。',
    '6. 如果失败，返回你实际尝试连接的完整地址。',
    '',
    'OpenClaw 兼容语法糖',
    '如果后续需要把本地截图发到 Discord、Telegram、Signal 等渠道，请使用 `MEDIA:./相对路径` 格式，runtime 会自动把本地图片转换成目标平台附件并上传。'
  ].join('\n');
}

function buildClaudePrompt(snapshot) {
  const language = snapshot.language ?? 'zh-CN';
  if (language === 'en-US') {
    return[
      'Configure browser automation to use this local CDP bridge over Tailscale.',
      '',
      `Bridge WS endpoint: ${snapshot.wsEndpoint ?? '<unavailable>'}`,
      `Bridge HTTP endpoint: ${snapshot.versionEndpoint ?? '<unavailable>'}`,
      '',
      'Treat this as the only browser connection path. Do not connect to raw port 9222.'
    ].join('\n');
  }

  return[
    '请把浏览器自动化配置到这条本地 Tailscale CDP bridge。',
    '',
    `Bridge WS 地址：${snapshot.wsEndpoint ?? '<不可用>'}`,
    `Bridge HTTP 地址：${snapshot.versionEndpoint ?? '<不可用>'}`,
    '',
    '请把它视为唯一浏览器连接方式，不要再尝试连接裸 9222。'
  ].join('\n');
}

function buildPlaywrightSnippet(snapshot) {
  return[
    "import { chromium } from 'playwright'",
    '',
    '(async () => {',
    `  const browser = await chromium.connectOverCDP('${snapshot.wsEndpoint ?? ''}')`,
    '  const contexts = browser.contexts()',
    '  console.log({ contexts: contexts.length })',
    '})()'
  ].join('\n');
}

function buildCleanInstallGuide(snapshot) {
  const language = snapshot.language ?? 'zh-CN';
  if (language === 'en-US') {
    return[
      'Clean install guide',
      '',
      'Use the installer option named "Clean install" if the packaged app still opens an old window or a stale dev instance hijacks the single-instance lock.',
      '',
      'It is designed to solve:',
      '- old Electron dev processes still running',
      '- leftover dev profile conflicts',
      '- stale tray/window state after reinstall'
    ].join('\n');
  }

  return[
    '清洁安装说明',
    '',
    '如果安装版仍然打开旧窗口，或者旧开发版进程抢占单实例，请在安装器里勾选 “Clean install”。',
    '',
    '它主要解决：',
    '- 旧 Electron 开发版进程仍在运行',
    '- 开发版残留用户目录冲突',
    '- 重装后托盘/窗口状态残留'
  ].join('\n');
}

function buildAgentPayload(kind, snapshot) {
  switch (kind) {
    case 'generic-agent':
      return { text: buildGenericAgentPrompt(snapshot), notice: t(snapshot.language ?? 'zh-CN', 'copiedPrompt') };
    case 'claude':
      return { text: buildClaudePrompt(snapshot), notice: t(snapshot.language ?? 'zh-CN', 'copiedClaude') };
    case 'playwright':
      return { text: buildPlaywrightSnippet(snapshot), notice: t(snapshot.language ?? 'zh-CN', 'copiedPlaywright') };
    case 'raw':
      return { text: snapshot.wsEndpoint ?? '', notice: t(snapshot.language ?? 'zh-CN', 'copiedRaw') };
    default:
      return { text: snapshot.wsEndpoint ?? '', notice: t(snapshot.language ?? 'zh-CN', 'copiedRaw') };
  }
}

function createTrayIcon(status) {
  if (process.platform === 'win32') {
    const stableIcon = nativeImage.createFromPath(trayIconPath);
    if (!stableIcon.isEmpty()) {
      return stableIcon.resize({ width: 16, height: 16 });
    }
  }

  const palette = {
    running: '#22c55e',
    starting: '#3b82f6',
    restarting: '#3b82f6',
    repairing: '#ef4444',
    error: '#ef4444',
    stopped: '#64748b',
    idle: '#64748b',
    'rotating-token': '#8b5cf6'
  };
  const color = palette[status] ?? '#64748b';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="28" fill="${color}" /><circle cx="32" cy="32" r="12" fill="#0f172a" /></svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function showNotification(body) {
  new Notification({ title: 'CDP Bridge', body }).show();
}

function showWindow() {
  if (!mainWindow) {
    return;
  }
  mainWindow.show();
  mainWindow.focus();
}

function updateLaunchOnLogin(enabled) {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath
  });
}

async function copyEndpoint(type) {
  const snapshot = supervisor.getSnapshot();
  const language = snapshot.language ?? 'zh-CN';
  const value = type === 'ws' ? snapshot.wsEndpoint : snapshot.versionEndpoint;
  if (!value) {
    return;
  }
  clipboard.writeText(value);
  showNotification(type === 'ws' ? t(language, 'copiedWs') : t(language, 'copiedHttp'));
}

async function copyOpenClawPrompt() {
  const snapshot = supervisor.getSnapshot();
  clipboard.writeText(buildGenericAgentPrompt(snapshot));
  showNotification(t(snapshot.language ?? 'zh-CN', 'copiedPrompt'));
}

async function copyAgentPayload(kind) {
  const snapshot = supervisor.getSnapshot();
  const payload = buildAgentPayload(kind, snapshot);
  clipboard.writeText(payload.text);
  showNotification(payload.notice);
}

function openUninstaller() {
  const uninstallPath = path.join(path.dirname(process.execPath), 'Uninstall CDP Bridge.exe');
  if (!app.isPackaged) {
    showNotification('开发模式下没有卸载程序。');
    return;
  }

  void shell.openPath(uninstallPath).then((result) => {
    if (result) {
      showNotification(t(supervisor.getSnapshot().language ?? 'zh-CN', 'uninstallMissing'));
    }
  });
}

function buildTrayMenu(snapshot) {
  const language = snapshot.language ?? 'zh-CN';
  return Menu.buildFromTemplate([
    { label: `${t(language, 'trayStatus')}: ${snapshot.phase}`, enabled: false },
    { label: snapshot.wsEndpoint ?? t(language, 'wsUnavailable'), click: () => void copyEndpoint('ws'), enabled: Boolean(snapshot.wsEndpoint) },
    { label: snapshot.versionEndpoint ?? t(language, 'httpUnavailable'), click: () => void copyEndpoint('http'), enabled: Boolean(snapshot.versionEndpoint) },
    { label: t(language, 'copyPrompt'), click: () => void copyAgentPayload('generic-agent'), enabled: Boolean(snapshot.wsEndpoint) },
    { label: t(language, 'copyClaude'), click: () => void copyAgentPayload('claude'), enabled: Boolean(snapshot.wsEndpoint) },
    { label: t(language, 'copyPlaywright'), click: () => void copyAgentPayload('playwright'), enabled: Boolean(snapshot.wsEndpoint) },
    { label: t(language, 'copyRaw'), click: () => void copyAgentPayload('raw'), enabled: Boolean(snapshot.wsEndpoint) },
    { type: 'separator' },
    { label: t(language, 'openWindow'), click: showWindow },
    { label: t(language, 'bridgeNow'), click: () => void supervisor.restart() },
    { label: t(language, 'repairNow'), click: () => void supervisor.repair() },
    { label: t(language, 'rotateToken'), click: () => void supervisor.rotateToken() },
    { label: t(language, 'openConfig'), click: () => void shell.showItemInFolder(getConfigPath()) },
    { label: t(language, 'openLogs'), click: () => void shell.openPath(snapshot.logDir ?? snapshot.appDir) },
    { label: t(language, 'openUninstaller'), click: openUninstaller },
    { type: 'separator' },
    {
      label: t(language, 'launchOnLogin'),
      type: 'checkbox',
      checked: Boolean(snapshot.launchOnLogin),
      click: ({ checked }) => {
        supervisor.updateConfig((config) => ({ ...config, launchOnLogin: checked }));
        updateLaunchOnLogin(checked);
        void supervisor.refresh();
      }
    },
    {
      label: t(language, 'minimizeToTray'),
      type: 'checkbox',
      checked: Boolean(snapshot.minimizeToTray),
      click: ({ checked }) => {
        supervisor.updateConfig((config) => ({ ...config, minimizeToTray: checked }));
        void supervisor.refresh();
      }
    },
    { type: 'separator' },
    {
      label: t(language, 'quit'),
      click: () => {
        app.isQuitting = true;
        void supervisor.stop().finally(() => app.quit());
      }
    }
  ]);
}

function syncUi(snapshot) {
  if (!tray) {
    return;
  }

  tray.setImage(createTrayIcon(snapshot.phase));
  tray.setToolTip(`${isDevBuild ? t(snapshot.language ?? 'zh-CN', 'devAppName') : t(snapshot.language ?? 'zh-CN', 'appName')} · ${snapshot.phase}${snapshot.tailscale?.tailscaleIp ? ` · ${snapshot.tailscale.tailscaleIp}` : ''}`);
  tray.setContextMenu(buildTrayMenu(snapshot));
  mainWindow?.webContents.send('bridge-state', snapshot);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 740,
    minWidth: 860,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    icon: windowIconPath,
    title: 'CDP Bridge',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting && supervisor.getSnapshot().minimizeToTray !== false) {
      event.preventDefault();
      mainWindow.hide();
      return;
    }

    if (!app.isQuitting) {
      event.preventDefault();
      app.isQuitting = true;
      void supervisor.stop().finally(() => app.quit());
    }
  });

  mainWindow.on('minimize', (event) => {
    if (supervisor.getSnapshot().minimizeToTray !== false) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  void mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function wireIpc() {
  ipcMain.handle('bridge:get-state', async () => supervisor.refresh());
  ipcMain.handle('bridge:restart', async () => supervisor.restart());
  ipcMain.handle('bridge:repair', async () => supervisor.repair());
  ipcMain.handle('bridge:rotate-token', async () => supervisor.rotateToken());
  ipcMain.handle('bridge:copy', async (_event, payload) => copyEndpoint(payload.type));
  ipcMain.handle('bridge:copy-openclaw-prompt', async () => copyOpenClawPrompt());
  ipcMain.handle('bridge:copy-agent-payload', async (_event, payload) => copyAgentPayload(payload.kind));
  ipcMain.handle('bridge:set-launch-on-login', async (_event, payload) => {
    supervisor.updateConfig((config) => ({ ...config, launchOnLogin: payload.enabled }));
    updateLaunchOnLogin(payload.enabled);
    return supervisor.refresh();
  });
  ipcMain.handle('bridge:set-minimize-to-tray', async (_event, payload) => {
    supervisor.updateConfig((config) => ({ ...config, minimizeToTray: payload.enabled }));
    return supervisor.refresh();
  });
  ipcMain.handle('bridge:set-language', async (_event, payload) => {
    supervisor.updateConfig((config) => ({ ...config, language: payload.language }));
    return supervisor.refresh();
  });
  ipcMain.handle('bridge:open-uninstaller', async () => openUninstaller());
  ipcMain.handle('bridge:copy-clean-install-guide', async () => {
    const snapshot = supervisor.getSnapshot();
    clipboard.writeText(buildCleanInstallGuide(snapshot));
    showNotification(snapshot.language === 'en-US' ? 'Clean install guide copied.' : '已复制清洁安装说明。');
  });
}

async function bootstrap() {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    showWindow();
  });

  await app.whenReady();
  app.setAppUserModelId('ai.cosymart.cdpbridge');
  createWindow();
  wireIpc();

  tray = new Tray(createTrayIcon('starting'));
  tray.on('click', showWindow);
  supervisor.events.on('state', syncUi);

  try {
    const snapshot = await supervisor.start();
    updateLaunchOnLogin(Boolean(snapshot.launchOnLogin));
    syncUi(snapshot);
  } catch (error) {
    const snapshot = supervisor.getSnapshot();
    syncUi({ ...snapshot, phase: 'error', lastError: error.message });
    showNotification(error.message);
  }
}

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

void bootstrap();
