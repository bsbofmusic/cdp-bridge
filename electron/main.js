import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, nativeImage, Notification, shell, Tray } from 'electron';

import { getAppDir, getConfigPath, isPortableMode } from '../src/config.js';
import { createBridgeSupervisor } from '../src/supervisor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDevBuild = !app.isPackaged;
const windowIconPath = path.join(__dirname, 'assets', 'app-icon.png');
const trayIconPath = path.join(__dirname, 'assets', 'app-icon.ico');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageMetadata = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const portableMode = isPortableMode();

const translations = {
  'zh-CN': {
    appName: 'CDP Bridge',
    devAppName: 'CDP Bridge Dev',
    copiedPrompt: '已复制通用 Agent Prompt。',
    trayStatus: '状态',
    copyPrompt: '复制通用 Agent Prompt',
    startBridge: '一键启动',
    openWindow: '打开主窗口',
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
    copiedPlaywright: '已复制 Playwright 代码片段。',
    copiedRaw: '已复制原始 CDP 地址。',
    resetReplicaDone: '已重置高级模式副本。下次启动高级模式时会重新创建。',
    copyPlaywright: '复制 Playwright 代码',
    copyRaw: '复制原始 CDP 地址',
    openDataDir: '打开绿色版数据目录',
    portableConflictTitle: '检测到已运行实例',
    portableConflictBody: '检测到其他 CDP Bridge 实例，当前版本会自动关闭旧实例后接管运行。',
    portableConflictDetail: '只会关闭 CDP Bridge 自己的旧实例，不会关闭你正常使用的浏览器。',
    portableModeBadge: '绿色版运行中'
  },
  'en-US': {
    appName: 'CDP Bridge',
    devAppName: 'CDP Bridge Dev',
    copiedPrompt: 'Generic agent prompt copied.',
    trayStatus: 'Status',
    copyPrompt: 'Copy Generic Agent Prompt',
    startBridge: 'Start CDP',
    openWindow: 'Open main window',
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
    copiedPlaywright: 'Playwright snippet copied.',
    copiedRaw: 'Raw CDP URL copied.',
    resetReplicaDone: 'Advanced Mode replica reset. It will be recreated next time you start Advanced Mode.',
    copyPlaywright: 'Copy Playwright Snippet',
    copyRaw: 'Copy Raw CDP URL',
    openDataDir: 'Open portable data directory',
    portableConflictTitle: 'Another instance is already running',
    portableConflictBody: 'Another CDP Bridge instance was detected. The current build will automatically close the older instance and take over.',
    portableConflictDetail: 'Only CDP Bridge instances are terminated. Your normal browser windows are not touched.',
    portableModeBadge: 'Portable mode active'
  }
};

function t(language, key) {
  return translations[language]?.[key] ?? translations['zh-CN'][key];
}

if (portableMode) {
  app.setPath('userData', getAppDir());
} else if (isDevBuild) {
  app.setPath('userData', path.join(app.getPath('appData'), 'cdp-bridge-dev'));
}

const supervisor = createBridgeSupervisor();

let tray = null;
let mainWindow = null;

function buildGenericAgentPrompt(snapshot) {
  const language = snapshot.language ?? 'zh-CN';
  const wsUrl = snapshot.wsEndpoint ?? '<WS endpoint unavailable>';
  const httpUrl = snapshot.versionEndpoint ?? '<HTTP endpoint unavailable>';
  const controlBase = snapshot.controlStartBase ?? '<Control start endpoint unavailable>';
  const browserModeLine = snapshot.browserMode === 'advanced'
    ? (language === 'en-US' ? 'Current browser mode: Advanced Mode (builds a high-compat managed replica of the selected Chrome user, then launches that replica with CDP enabled).' : '当前浏览器模式：高级模式（会为所选 Chrome 用户创建高兼容受管副本，并以启用 CDP 的方式拉起该副本）。')
    : (language === 'en-US' ? 'Current browser mode: Clean Mode (isolated profile, best stability, does not reuse existing logins or extensions).' : '当前浏览器模式：干净模式（隔离 profile，稳定优先，不继承已有登录态和扩展）。');
  const browserProfileLine = snapshot.browserMode === 'advanced'
    ? (language === 'en-US' ? `Selected Chrome user: ${snapshot.advancedProfileDirectory || 'Default'}` : `当前选中的 Chrome 用户：${snapshot.advancedProfileDirectory || 'Default'}`)
    : null;
  const deviceModeLine = snapshot.deviceMode === 'mobile'
    ? (language === 'en-US' ? 'Current page mode: Mobile Mode (portrait 1080x1920).' : '当前页面模式：手机模式（竖屏 1080×1920）。')
    : (language === 'en-US' ? 'Current page mode: Desktop Mode (landscape 1920x1080).' : '当前页面模式：电脑模式（横屏 1920×1080）。');
  const viewportCommand = snapshot.deviceMode === 'mobile'
    ? `agent-browser --cdp "${wsUrl}" set viewport 1080 1920`
    : `agent-browser --cdp "${wsUrl}" set viewport 1920 1080`;
  if (language === 'en-US') {
    return [
      'Use this Windows browser only through the Tailscale-secured CDP bridge below.',
      'Do not use raw port 9222 or request firewall / remote-debugging-address changes.',
      'Current local preference',
      browserModeLine,
      ...(browserProfileLine ? [browserProfileLine] : []),
      deviceModeLine,
      'Bridge endpoints',
      `WS endpoint: ${wsUrl}`,
      `HTTP discovery endpoint: ${httpUrl}`,
      `Remote start base: ${controlBase}`,
      'Workflow',
      '1. Check the HTTP discovery endpoint first:',
      `curl -s "${httpUrl}" --connect-timeout 5`,
      '2. If Browser and webSocketDebuggerUrl are returned, connect directly with the WS endpoint.',
      '3. If it returns 503 or says local CDP is not ready, start the mode you need:',
      `Clean Mode: curl -X POST "${controlBase}&mode=clean"`,
      `Advanced Mode: curl -X POST "${controlBase}&mode=advanced&profile=${snapshot.advancedProfileDirectory || 'Default'}"`,
      '4. Poll the HTTP endpoint again until webSocketDebuggerUrl appears.',
      '5. Only then begin CDP / Playwright work with this exact WS endpoint:',
      wsUrl,
      '6. Only set viewport if the layout is clearly wrong:',
      viewportCommand,
      '7. Open the target page:',
      `agent-browser --cdp "${wsUrl}" open "https://example.com"`,
      '8. Verify the connection:',
      `agent-browser --cdp "${wsUrl}" get url`,
      `agent-browser --cdp "${wsUrl}" get title`,
      '9. Read the page structure:',
      `agent-browser --cdp "${wsUrl}" snapshot`,
      `agent-browser --cdp "${wsUrl}" get text 'body'`,
      'Notes',
      '- Always include the full `--cdp` argument. Remote start is allowed when local CDP is not ready.',
      '- Do not rely on a saved cdpUrl. Use `snapshot` for structured page understanding.',
      'Return',
      '- exact command(s) used with `--cdp`',
      '- whether remote start was used and which mode started',
      '- whether the connection succeeded',
      '- current URL and title',
      '- if it failed, the attempted command and error output'
    ].join('\n');
  }

  return [
    '请只通过下面这条 Tailscale 保护的 CDP bridge 使用这台 Windows 电脑上的浏览器。',
    '不要使用原始 9222，也不要要求开放防火墙或设置 remote-debugging-address。',
    '当前本地偏好',
    browserModeLine,
    ...(browserProfileLine ? [browserProfileLine] : []),
    deviceModeLine,
    'Bridge 信息',
    `WS 地址：${wsUrl}`,
    `HTTP 探测地址：${httpUrl}`,
    `远程启动基地址：${controlBase}`,
    '执行流程',
    '1. 先检查 HTTP 探测地址：',
    `curl -s "${httpUrl}" --connect-timeout 5`,
    '2. 如果已返回 Browser 和 webSocketDebuggerUrl，就直接用 WS 地址连接。',
    '3. 如果返回 503，或提示本地 CDP 未就绪，就先远程拉起你需要的模式：',
    `干净模式：curl -X POST "${controlBase}&mode=clean"`,
    `高级模式：curl -X POST "${controlBase}&mode=advanced&profile=${snapshot.advancedProfileDirectory || 'Default'}"`,
    '4. 远程启动后，继续轮询 HTTP 探测地址，直到拿到 webSocketDebuggerUrl。',
    '5. 拿到可用的 webSocketDebuggerUrl 后，再开始真正的 CDP / Playwright 操作。',
    '6. 只有页面明显变窄或布局不对时，再补执行 viewport：',
    viewportCommand,
    '7. 打开目标页面：',
    `agent-browser --cdp "${wsUrl}" open "https://example.com"`,
    '8. 验证连接：',
    `agent-browser --cdp "${wsUrl}" get url`,
    `agent-browser --cdp "${wsUrl}" get title`,
    '9. 读取页面：',
    `agent-browser --cdp "${wsUrl}" snapshot`,
    `agent-browser --cdp "${wsUrl}" get text 'body'`,
    '关键注意事项',
    '- 每次命令都要带完整的 `--cdp` 参数。本地浏览器没准备好时，可以远程调用启动接口。',
    '- 不要依赖配置文件里的 cdpUrl 来重连。优先使用 `snapshot` 理解页面结构。',
    '返回信息要求',
    '- 最终使用的完整命令（含 `--cdp`）',
    '- 是否使用了远程启动，以及最终拉起的是哪种模式',
    '- 是否连接成功',
    '- 当前页面 URL 和标题',
    '- 如果失败，返回实际命令和错误信息'
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
      'Clean reinstall guide',
      '',
      'Use the installer option named "Clean reinstall" if the packaged app still opens an old window or a stale instance hijacks the packaged build.',
      '',
      'It is designed to solve:',
      '- old installed versions still surviving',
      '- leftover user data or updater state',
      '- stale tray/window state after reinstall'
    ].join('\n');
  }

  return[
    '清洁安装说明',
    '',
    '如果安装版仍然打开旧窗口，或者旧实例仍然劫持当前安装版，请在安装器里勾选 “Clean reinstall”。',
    '',
    '它主要解决：',
    '- 旧安装版仍然残留',
    '- 用户数据或更新器残留冲突',
    '- 重装后托盘/窗口状态残留'
  ].join('\n');
}

function enhanceSnapshot(snapshot) {
  return {
    ...snapshot,
    appVersion: app.getVersion(),
    packageVersion: packageMetadata.version,
    installPath: process.execPath,
    configPath: getConfigPath(),
    isPackaged: app.isPackaged,
    userDataPath: app.getPath('userData'),
    appDir: getAppDir(),
    portableMode
  };
}

function buildAgentPayload(kind, snapshot) {
  switch (kind) {
    case 'generic-agent':
      return { text: buildGenericAgentPrompt(snapshot), notice: t(snapshot.language ?? 'zh-CN', 'copiedPrompt') };
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
  if (portableMode) {
    showNotification(supervisor.getSnapshot().language === 'en-US' ? 'Portable build has no uninstaller.' : '绿色版没有卸载程序。');
    return;
  }
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

function openDataDir() {
  void shell.openPath(getAppDir());
}

function stopOtherBridgeInstances() {
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-Command', [
      "$currentPid = " + process.pid,
      "Get-CimInstance Win32_Process | Where-Object {",
      "  $_.ProcessId -ne $currentPid -and (",
      "    $_.Name -like 'CDP Bridge*.exe' -or",
      "    ($_.ExecutablePath -and $_.ExecutablePath -like '*CDP Bridge*.exe') -or",
      "    ($_.CommandLine -and $_.CommandLine -like '*cdp-bridge*')",
      '  )',
      '} | ForEach-Object {',
      "  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue",
      '}'
    ].join('; ')], { windowsHide: true });
  } catch {
  }
}

function buildTrayMenu(snapshot) {
  const language = snapshot.language ?? 'zh-CN';
  return Menu.buildFromTemplate([
    { label: `${t(language, 'trayStatus')}: ${snapshot.phase}`, enabled: false },
    { label: t(language, 'startBridge'), click: () => void startBridge() },
    { label: t(language, 'copyPrompt'), click: () => void copyAgentPayload('generic-agent'), enabled: Boolean(snapshot.wsEndpoint) },
    { label: t(language, 'copyPlaywright'), click: () => void copyAgentPayload('playwright'), enabled: Boolean(snapshot.wsEndpoint) },
    { label: t(language, 'copyRaw'), click: () => void copyAgentPayload('raw'), enabled: Boolean(snapshot.wsEndpoint) },
    { type: 'separator' },
    { label: t(language, 'openWindow'), click: showWindow },
    { label: t(language, 'rotateToken'), click: () => void supervisor.rotateToken() },
    { label: t(language, 'openConfig'), click: () => void shell.showItemInFolder(getConfigPath()) },
    { label: t(language, 'openDataDir'), click: openDataDir },
    { label: t(language, 'openLogs'), click: () => void shell.openPath(snapshot.logDir ?? snapshot.appDir) },
    ...(!portableMode ? [{ label: t(language, 'openUninstaller'), click: openUninstaller }] : []),
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

  const enriched = enhanceSnapshot(snapshot);

  tray.setImage(createTrayIcon(enriched.phase));
  tray.setToolTip(`${isDevBuild ? t(enriched.language ?? 'zh-CN', 'devAppName') : t(enriched.language ?? 'zh-CN', 'appName')} · ${enriched.phase}${enriched.tailscale?.tailscaleIp ? ` · ${enriched.tailscale.tailscaleIp}` : ''}`);
  tray.setContextMenu(buildTrayMenu(enriched));
  mainWindow?.webContents.send('bridge-state', enriched);
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

async function startBridge() {
  return supervisor.repair();
}

async function restartBridge() {
  return supervisor.repair();
}

async function reconfigureBridge(mutator, reason) {
  return supervisor.reconfigure(mutator, reason);
}

function wireIpc() {
  ipcMain.handle('bridge:get-state', async () => enhanceSnapshot(await supervisor.refresh()));
  ipcMain.handle('bridge:start', async () => startBridge());
  ipcMain.handle('bridge:restart', async () => restartBridge());
  ipcMain.handle('bridge:repair', async () => restartBridge());
  ipcMain.handle('bridge:rotate-token', async () => supervisor.rotateToken());
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
  ipcMain.handle('bridge:set-browser-mode', async (_event, payload) => {
    supervisor.updateConfig((config) => ({
      ...config,
      browserMode: payload.mode === 'advanced' ? 'advanced' : 'clean'
    }));
    if (payload.mode === 'advanced') {
      return supervisor.prepareAdvancedReplica('Browser mode switched to advanced');
    }
    return supervisor.refresh();
  });
  ipcMain.handle('bridge:set-advanced-profile', async (_event, payload) => {
    supervisor.updateConfig((config) => ({
      ...config,
      advancedProfileDirectory: payload.profile || 'Default'
    }));
    return supervisor.prepareAdvancedReplica('Advanced profile changed');
  });
  ipcMain.handle('bridge:set-device-mode', async (_event, payload) => {
    supervisor.updateConfig((config) => ({
      ...config,
      deviceMode: payload.mode === 'mobile' ? 'mobile' : 'desktop'
    }));
    return supervisor.refresh();
  });
  ipcMain.handle('bridge:open-uninstaller', async () => openUninstaller());
  ipcMain.handle('bridge:open-data-dir', async () => openDataDir());
  ipcMain.handle('bridge:copy-clean-install-guide', async () => {
    const snapshot = supervisor.getSnapshot();
    clipboard.writeText(buildCleanInstallGuide(snapshot));
    showNotification(snapshot.language === 'en-US' ? 'Clean reinstall guide copied.' : '已复制清洁重装说明。');
  });
  ipcMain.handle('bridge:reset-advanced-replica', async () => {
    const snapshot = await supervisor.resetAdvancedReplica();
    showNotification(t(snapshot.language ?? 'zh-CN', 'resetReplicaDone'));
    return snapshot;
  });
}

async function bootstrap() {
  if (portableMode) {
    stopOtherBridgeInstances();
  }

  if (!app.requestSingleInstanceLock({ version: packageMetadata.version, execPath: process.execPath })) {
    app.quit();
    return;
  }

  app.on('second-instance', (_event, _commandLine, _workingDirectory, additionalData) => {
    showWindow();
    const snapshot = supervisor.getSnapshot();
    const language = snapshot.language ?? 'zh-CN';
    const detail = additionalData?.execPath && additionalData.execPath !== process.execPath
      ? `${t(language, 'portableConflictDetail')}\n\nRunning: ${additionalData.execPath}`
      : t(language, 'portableConflictDetail');
    void dialog.showMessageBox(mainWindow ?? undefined, {
      type: 'warning',
      title: t(language, 'portableConflictTitle'),
      message: t(language, 'portableConflictBody'),
      detail,
      buttons: ['OK']
    });
  });

  await app.whenReady();
  app.setAppUserModelId('ai.cosymart.cdpbridge');
  createWindow();
  wireIpc();

  tray = new Tray(createTrayIcon('starting'));
  tray.on('click', showWindow);
  supervisor.events.on('state', syncUi);

  try {
    const snapshot = await supervisor.initialize();
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
