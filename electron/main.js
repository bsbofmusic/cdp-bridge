import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, clipboard, ipcMain, Menu, nativeImage, Notification, shell, Tray } from 'electron';

import { getConfigPath } from '../src/config.js';
import { createBridgeSupervisor } from '../src/supervisor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDevBuild = !app.isPackaged;

if (isDevBuild) {
  app.setPath('userData', path.join(app.getPath('appData'), 'cdp-bridge-dev'));
}

const supervisor = createBridgeSupervisor();

let tray = null;
let mainWindow = null;

function buildOpenClawPrompt(snapshot) {
  return [
    '不要再尝试连接 Windows 上的原始 Chrome CDP 端口 `9222`，也不要要求我把 `--remote-debugging-address=0.0.0.0` 暴露到公网或局域网。',
    '',
    '改为使用我本地 `cdp-bridge` 提供的 WebSocket CDP 地址。',
    '',
    '请按下面要求配置：',
    '',
    '1. 使用我提供的这条 WS endpoint 作为唯一的 CDP 连接地址：',
    `\`${snapshot.wsEndpoint ?? '<WS endpoint unavailable>'}\``,
    '',
    '2. 不要再连接：',
    '- `http://localhost:9222`',
    '- `http://<任何IP>:9222`',
    '- `ws://<任何IP>:9222/...`',
    '',
    '3. 不要要求开放 Windows 防火墙的 `9222`',
    '4. 不要要求 Chrome 绑定 `0.0.0.0`',
    '5. 只通过这条 bridge WS 地址连接浏览器',
    '',
    '如果需要探测版本信息，可以使用这个 HTTP endpoint：',
    `\`${snapshot.versionEndpoint ?? '<HTTP endpoint unavailable>'}\``,
    '',
    '请直接基于这条 bridge WS endpoint 完成浏览器配置，并告诉我：',
    '- 你最终采用的配置项名称',
    '- 是否连接成功',
    '- 如果失败，返回你实际尝试连接的完整地址'
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
  const value = type === 'ws' ? snapshot.wsEndpoint : snapshot.versionEndpoint;
  if (!value) {
    return;
  }
  clipboard.writeText(value);
  showNotification(`${type === 'ws' ? 'WS' : 'HTTP'} endpoint copied.`);
}

async function copyOpenClawPrompt() {
  const snapshot = supervisor.getSnapshot();
  clipboard.writeText(buildOpenClawPrompt(snapshot));
  showNotification('OpenClaw prompt copied.');
}

function buildTrayMenu(snapshot) {
  return Menu.buildFromTemplate([
    { label: `Status: ${snapshot.phase}`, enabled: false },
    { label: snapshot.wsEndpoint ?? 'WS endpoint unavailable', click: () => void copyEndpoint('ws'), enabled: Boolean(snapshot.wsEndpoint) },
    { label: snapshot.versionEndpoint ?? 'HTTP endpoint unavailable', click: () => void copyEndpoint('http'), enabled: Boolean(snapshot.versionEndpoint) },
    { label: 'Copy OpenClaw prompt', click: () => void copyOpenClawPrompt(), enabled: Boolean(snapshot.wsEndpoint) },
    { type: 'separator' },
    { label: 'Open status window', click: showWindow },
    { label: 'One-click bridge', click: () => void supervisor.restart() },
    { label: 'One-click repair', click: () => void supervisor.repair() },
    { label: 'Rotate token', click: () => void supervisor.rotateToken() },
    { label: 'Open config file', click: () => void shell.showItemInFolder(getConfigPath()) },
    { label: 'Open logs folder', click: () => void shell.openPath(snapshot.logDir ?? snapshot.appDir) },
    { type: 'separator' },
    {
      label: 'Launch on login',
      type: 'checkbox',
      checked: Boolean(snapshot.launchOnLogin),
      click: ({ checked }) => {
        supervisor.updateConfig((config) => ({ ...config, launchOnLogin: checked }));
        updateLaunchOnLogin(checked);
        void supervisor.refresh();
      }
    },
    {
      label: 'Minimize to tray',
      type: 'checkbox',
      checked: Boolean(snapshot.minimizeToTray),
      click: ({ checked }) => {
        supervisor.updateConfig((config) => ({ ...config, minimizeToTray: checked }));
        void supervisor.refresh();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
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
  tray.setToolTip(`${isDevBuild ? 'CDP Bridge Dev' : 'CDP Bridge'} · ${snapshot.phase}${snapshot.tailscale?.tailscaleIp ? ` · ${snapshot.tailscale.tailscaleIp}` : ''}`);
  tray.setContextMenu(buildTrayMenu(snapshot));
  mainWindow?.webContents.send('bridge-state', snapshot);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 760,
    height: 580,
    minWidth: 720,
    minHeight: 520,
    show: false,
    autoHideMenuBar: true,
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
