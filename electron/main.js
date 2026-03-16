import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, clipboard, ipcMain, Menu, nativeImage, Notification, shell, Tray } from 'electron';

import { getConfigPath } from '../src/config.js';
import { createBridgeSupervisor } from '../src/supervisor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDevBuild = !app.isPackaged;
const windowIconPath = path.join(__dirname, 'assets', 'app-icon.png');

const translations = {
  'zh-CN': {
    appName: 'CDP Bridge',
    devAppName: 'CDP Bridge Dev',
    copiedWs: '已复制 WS 地址。',
    copiedHttp: '已复制 HTTP 地址。',
    copiedPrompt: '已复制 OpenClaw Prompt。',
    trayStatus: '状态',
    wsUnavailable: 'WS 地址不可用',
    httpUnavailable: 'HTTP 地址不可用',
    copyPrompt: '复制 OpenClaw Prompt',
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
    promptAsk3: '- 如果失败，返回你实际尝试连接的完整地址'
  },
  'en-US': {
    appName: 'CDP Bridge',
    devAppName: 'CDP Bridge Dev',
    copiedWs: 'WS endpoint copied.',
    copiedHttp: 'HTTP endpoint copied.',
    copiedPrompt: 'OpenClaw prompt copied.',
    trayStatus: 'Status',
    wsUnavailable: 'WS endpoint unavailable',
    httpUnavailable: 'HTTP endpoint unavailable',
    copyPrompt: 'Copy OpenClaw Prompt',
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
    promptAsk3: '- if it failed, the exact address you actually attempted'
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

function buildOpenClawPrompt(snapshot) {
  const language = snapshot.language ?? 'zh-CN';
  return [
    t(language, 'promptIntro'),
    '',
    t(language, 'promptUseBridge'),
    '',
    t(language, 'promptSteps'),
    '',
    t(language, 'promptStep1'),
    `\`${snapshot.wsEndpoint ?? '<WS endpoint unavailable>'}\``,
    '',
    t(language, 'promptStep2'),
    '- `http://localhost:9222`',
    '- `http://<任何IP>:9222`',
    '- `ws://<任何IP>:9222/...`',
    '',
    t(language, 'promptStep3'),
    t(language, 'promptStep4'),
    t(language, 'promptStep5'),
    '',
    t(language, 'promptVersion'),
    `\`${snapshot.versionEndpoint ?? '<HTTP endpoint unavailable>'}\``,
    '',
    t(language, 'promptAsk'),
    t(language, 'promptAsk1'),
    t(language, 'promptAsk2'),
    t(language, 'promptAsk3')
  ].join('\n');
}

function createTrayIcon(status) {
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
  clipboard.writeText(buildOpenClawPrompt(snapshot));
  showNotification(t(snapshot.language ?? 'zh-CN', 'copiedPrompt'));
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
    { label: t(language, 'copyPrompt'), click: () => void copyOpenClawPrompt(), enabled: Boolean(snapshot.wsEndpoint) },
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
    width: 920,
    height: 680,
    minWidth: 860,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    icon: windowIconPath,
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
