const statusRoot = document.getElementById('status');
const actionsRoot = document.getElementById('actions');
const handoffRoot = document.getElementById('handoff');
const developerRoot = document.getElementById('developer');
const diagnosticsRoot = document.getElementById('diagnostics');
const feedbackRoot = document.getElementById('feedback');
const feedbackMessageRoot = document.getElementById('feedback-message');
const progressRoot = document.getElementById('progress-root');
const progressTitle = document.getElementById('progress-title');
const progressDetail = document.getElementById('progress-detail');
const progressBar = document.getElementById('progress-bar');
const languageSelect = document.getElementById('language-select');
const browserModeSelect = document.getElementById('browser-mode-select');
const deviceModeSelect = document.getElementById('device-mode-select');
const advancedProfileWrap = document.getElementById('advanced-profile-wrap');
const advancedProfileSelect = document.getElementById('advanced-profile-select');

const strings = {
  'zh-CN': {
    heroEyebrow: 'Windows 本地浏览器桥接',
    heroTitle: 'CDP Bridge',
    heroSubtitle: '本地浏览器通过 Tailscale 暴露给远端 Agent。',
    languageLabel: '语言',
    browserModeLabel: '浏览器模式',
    deviceModeLabel: '页面模式',
    advancedProfileLabel: 'Chrome 用户',
    launchOnLogin: '开机启动',
    minimizeToTray: '最小化到托盘',
    statusTitle: '桥接状态',
    actionsTitle: '快捷操作',
    handoffTitle: 'Agent 接入',
    developerTitle: '开发者区',
    diagnosticsTitle: '诊断信息',
    maintenanceTitle: '维护工具',
    maintenanceCopy: '这里可以处理卸载、清洁重装和版本切换等操作。',
    openUninstaller: '打开卸载程序',
    cleanInstallGuide: '复制清洁重装说明',
    openDataDir: '打开绿色版数据目录',
    browserAutoHeal: '浏览器自愈',
    browser: '浏览器',
    mode: '当前模式',
    appLayer: '应用状态',
    bridgeLayer: 'Bridge 状态',
    cdpLayer: 'Chrome CDP 状态',
    tailscale: 'Tailscale',
    tailscaleReady: '已联通',
    tailscaleLocalOnly: '仅本机可用',
    chromeCdp: 'Chrome CDP',
    repairs: '修复次数',
    ws: 'WS 地址',
    http: 'HTTP 地址',
    control: '远程启动',
    config: '配置目录',
    logs: '日志目录',
    installPath: '安装路径',
    appVersion: '版本',
    userData: '运行目录',
    advancedReplica: '高级副本',
    lastError: '最近错误',
    notDetected: '未检测到',
    offline: '离线',
    ready: '可用',
    startingState: '启动中',
    repairingState: '修复中',
    unavailable: '不可用',
    appReady: '已打开',
    appWorking: '处理中',
    bridgeStarted: '已启动',
    bridgeStopped: '未启动',
    cdpAvailable: '已连接',
    cdpStarting: '等待就绪',
    none: '无',
    progressTitle: '当前进度',
    progressDetailIdle: '等待下一步操作',
    connected: '桥接服务已连接。',
    statusUpdated: '状态已更新：',
    preloadFailed: '桌面桥接 API 未注入，preload 可能加载失败。',
    stateFailed: '读取桥接状态失败：',
    actionSent: '操作已发送，等待状态更新…',
    refreshRequested: '已请求刷新状态。',
    loginEnabled: '已开启开机启动。',
    loginDisabled: '已关闭开机启动。',
    trayEnabled: '已开启最小化到托盘。',
    trayDisabled: '已关闭最小化到托盘。',
    progressStages: {
      'preparing-replica': '正在创建高级模式独立副本',
      'replica-ready': '高级模式副本已就绪',
      starting: '正在启动 bridge',
      restarting: '正在重新桥接',
      repairing: '正在修复连接',
      reconfigure: '正在应用新配置',
      working: '正在处理',
      'rotate-token': '正在轮换 Token',
      'rotating-token': '正在轮换 Token',
      'updating-config': '正在更新配置',
      'stopping-managed-browser': '正在停止受管浏览器',
      'stopping-bridge': '正在停止 bridge',
      'preparing-browser': '正在准备浏览器',
      'launching-browser': '正在启动浏览器',
      'waiting-cdp': '正在等待 CDP 就绪',
      'starting-bridge': '正在启动 bridge 服务'
    },
    
    // 操作按钮文本
    startBridge: '一键启动',
    rotateToken: '轮换 Token',
    refresh: '刷新状态',

    // 接入 Prompt 文本补充完整，解决 undefined 问题
    copyPrompt: '复制通用 Agent Prompt',
    copyPlaywright: '复制 Playwright 代码',
    copyRaw: '复制开发者 CDP 地址',
    resetAdvancedReplica: '重置高级模式副本',

    handoffSummary: '优先把“通用 Agent Prompt”发给 Agent，它会按背景、目标和步骤去连接本地 Chrome bridge。',
    developerSummary: '这里是给熟悉 CDP / Playwright 的开发者用的调试入口，也可以手动重置高级模式副本。',
    developerModes: '干净模式：隔离、稳定、即开即用。高级模式：独立副本、可长期复用，适合在副本里登录并持续同步账号资料。',
    developerMaintainer: '开发者：bsbofmusic',
    maintenanceCopy: '这里可以处理卸载、清洁重装和版本切换等操作。',
    cleanMode: '干净模式',
    advancedMode: '高级模式',
    desktopMode: '电脑模式',
    mobileMode: '手机模式',
    cleanModeHint: '稳定优先，不继承登录态和扩展。',
    advancedModeHint: '创建一个独立且可持久复用的浏览器副本，后续可在这个副本里自行登录并同步账号数据。',
    advancedProfileHint: '高级模式会按所选 Chrome 用户名创建一个独立副本目录，但不会再重度复制原生浏览器数据。',
    desktopModeHint: '桌面网页布局（横屏 1920×1080）。',
    mobileModeHint: '移动网页布局（竖屏 1080×1920）。',
    buttonHints: {
      startBridge: '点击后会提示并重启当前浏览器，然后启动 CDP bridge。',
      copyPrompt: '复制一份通用 Agent Prompt，适合 OpenClaw、OpenCode、Codex 等 Agent。',
      rotateToken: '生成新的 token 并重启桥接，让旧链接失效。',
      refresh: '立即刷新浏览器、Tailscale 和桥接状态。',
      uninstall: '打开已安装版本的卸载程序，正规移除应用。',
      cleanInstall: '复制一段简短说明，告诉用户什么时候该使用 Clean reinstall。',
      playwright: '复制 Playwright connectOverCDP 代码片段。',
      raw: '复制 bridge 的底层 WS 地址，适合熟悉 CDP 的开发者调试使用。',
      resetAdvancedReplica: '删除当前高级模式副本。下次在高级模式点击一键启动时，会重新创建一个新的副本。'
    }
  },
  'en-US': {
    heroEyebrow: 'Windows Local Browser Bridge',
    heroTitle: 'CDP Bridge',
    heroSubtitle: 'Expose your local browser to remote agents over Tailscale.',
    languageLabel: 'Language',
    browserModeLabel: 'Browser Mode',
    deviceModeLabel: 'Page Mode',
    advancedProfileLabel: 'Chrome User',
    launchOnLogin: 'Launch on login',
    minimizeToTray: 'Minimize to tray',
    statusTitle: 'Bridge Status',
    actionsTitle: 'Quick Actions',
    handoffTitle: 'Agent Handoff',
    developerTitle: 'Developer',
    diagnosticsTitle: 'Diagnostics',
    maintenanceTitle: 'Maintenance',
    maintenanceCopy: 'Use these controls for uninstall, clean reinstall recovery, and version handoff tasks.',
    openUninstaller: 'Open Uninstaller',
    cleanInstallGuide: 'Copy Clean Reinstall Guide',
    openDataDir: 'Open Portable Data Folder',
    browserAutoHeal: 'Browser Self-Heal',
    browser: 'Browser',
    mode: 'Current Mode',
    appLayer: 'App',
    bridgeLayer: 'Bridge',
    cdpLayer: 'Chrome CDP',
    tailscale: 'Tailscale',
    tailscaleReady: 'Connected',
    tailscaleLocalOnly: 'Local only',
    chromeCdp: 'Chrome CDP',
    repairs: 'Repairs',
    ws: 'WS Endpoint',
    http: 'HTTP Endpoint',
    control: 'Remote Start',
    config: 'Config',
    logs: 'Logs',
    installPath: 'Install Path',
    appVersion: 'Version',
    userData: 'Runtime Data',
    advancedReplica: 'Advanced Replica',
    lastError: 'Last error',
    notDetected: 'Not detected',
    offline: 'Offline',
    ready: 'Ready',
    startingState: 'Starting',
    repairingState: 'Repairing',
    unavailable: 'Unavailable',
    appReady: 'Open',
    appWorking: 'Working',
    bridgeStarted: 'Started',
    bridgeStopped: 'Stopped',
    cdpAvailable: 'Connected',
    cdpStarting: 'Waiting',
    none: 'None',
    progressTitle: 'Current Progress',
    progressDetailIdle: 'Waiting for the next action',
    connected: 'Bridge service connected.',
    statusUpdated: 'Status updated: ',
    preloadFailed: 'Desktop bridge API was not injected. The preload script may have failed.',
    stateFailed: 'Failed to read bridge state: ',
    actionSent: 'Action sent. Waiting for state refresh…',
    refreshRequested: 'Refresh requested.',
    loginEnabled: 'Launch on login enabled.',
    loginDisabled: 'Launch on login disabled.',
    trayEnabled: 'Minimize to tray enabled.',
    trayDisabled: 'Minimize to tray disabled.',
    progressStages: {
      'preparing-replica': 'Creating the standalone Advanced Mode replica',
      'replica-ready': 'Advanced Mode replica is ready',
      starting: 'Starting bridge',
      restarting: 'Reconnecting bridge',
      repairing: 'Repairing connection',
      reconfigure: 'Applying configuration',
      working: 'Working',
      'rotate-token': 'Rotating token',
      'rotating-token': 'Rotating token',
      'updating-config': 'Updating configuration',
      'stopping-managed-browser': 'Stopping managed browser',
      'stopping-bridge': 'Stopping bridge',
      'preparing-browser': 'Preparing browser',
      'launching-browser': 'Launching browser',
      'waiting-cdp': 'Waiting for CDP',
      'starting-bridge': 'Starting bridge service'
    },
    
    // Action Texts
    startBridge: 'Start CDP',
    rotateToken: 'Rotate token',
    refresh: 'Refresh status',

    // Handoff Texts
    copyPrompt: 'Copy Generic Agent Prompt',
    copyPlaywright: 'Copy Playwright Snippet',
    copyRaw: 'Copy Developer CDP URL',
    resetAdvancedReplica: 'Reset Advanced Replica',

    handoffSummary: 'Start by sending the generic agent prompt. It explains the background, goal, and exact bridge connection steps.',
    developerSummary: 'These entries are for developers who already understand CDP / Playwright, and for manually resetting the Advanced Mode replica.',
    developerModes: 'Clean Mode is isolated, stable, and fast to launch. Advanced Mode keeps a standalone persistent replica that you can sign into and reuse over time.',
    developerMaintainer: 'Maintained by bsbofmusic',
    maintenanceCopy: 'Use these controls for uninstall, clean reinstall recovery, and version handoff tasks.',
    cleanMode: 'Clean Mode',
    advancedMode: 'Advanced Mode',
    desktopMode: 'Desktop Mode',
    mobileMode: 'Mobile Mode',
    cleanModeHint: 'Best for stability. Does not reuse your existing logins or extensions.',
    advancedModeHint: 'Creates a standalone persistent browser replica that you can log into and keep using over time.',
    advancedProfileHint: 'Advanced Mode creates an independent replica directory using the selected Chrome user name, without performing a heavy copy of the native browser data.',
    desktopModeHint: 'Desktop page layout (landscape 1920×1080).',
    mobileModeHint: 'Mobile page layout (portrait 1080×1920).',
    buttonHints: {
      startBridge: 'Restart the current browser and start the managed CDP bridge.',
      copyPrompt: 'Copy one generic agent prompt for OpenClaw, OpenCode, Codex, and similar agents.',
      rotateToken: 'Generate a fresh token and restart the bridge to invalidate old links.',
      refresh: 'Refresh browser, Tailscale, and bridge status now.',
      uninstall: 'Open the installed uninstaller for a clean removal.',
      cleanInstall: 'Copy a short explanation of when to use Clean reinstall.',
      playwright: 'Copy a Playwright connectOverCDP snippet.',
      raw: 'Copy the low-level bridge WS endpoint for CDP-capable developer tools.',
      resetAdvancedReplica: 'Delete the current Advanced Mode replica. The next Advanced Mode start will rebuild it from scratch.'
    }
  }
};

function text(key, language) {
  return strings[language]?.[key] ?? strings['zh-CN'][key];
}

function setFeedback(message, type = 'info') {
  feedbackMessageRoot.textContent = message;
  feedbackRoot.dataset.state = type;
}

function progressText(stage, language) {
  return strings[language]?.progressStages?.[stage] ?? stage ?? text('progressDetailIdle', language);
}

function renderProgress(progress, language, titleKey = 'progressTitle') {
  if (!progress?.active) {
    progressRoot.hidden = true;
    progressBar.style.width = '0%';
    progressDetail.textContent = text('progressDetailIdle', language);
    return;
  }

  progressRoot.hidden = false;
  progressTitle.textContent = text(titleKey, language);
  const percent = typeof progress.percent === 'number' ? Math.max(4, Math.min(progress.percent, 100)) : 15;
  progressBar.style.width = `${percent}%`;
  const detail = progress.detail ? ` · ${progress.detail}` : '';
  progressDetail.textContent = `${progressText(progress.stage, language)}${detail}`;
}

function setBusyState(isBusy) {
  for (const element of document.querySelectorAll('button, select, input[type="checkbox"]')) {
    if (element.id === 'language-select') {
      continue;
    }
    element.disabled = Boolean(isBusy);
  }
}

let renderedLanguage = null;
let renderedProfileSignature = null;

function buildProfileSignature(availableProfiles) {
  return JSON.stringify((availableProfiles ?? []).map((profile) => ({
    directory: profile.directory,
    label: profile.label,
  })));
}

function syncAdvancedProfiles(state) {
  const availableProfiles = Array.isArray(state.availableProfiles) ? state.availableProfiles : [];
  const signature = buildProfileSignature(availableProfiles);

  if (signature !== renderedProfileSignature) {
    advancedProfileSelect.innerHTML = availableProfiles.length > 0
      ? availableProfiles
        .map((profile) => `<option value="${profile.directory}">${profile.label}</option>`)
        .join('')
      : '<option value="Default">Default</option>';
    renderedProfileSignature = signature;
  }

  advancedProfileSelect.value = state.advancedProfileDirectory || 'Default';
}

function renderStaticSections(language) {
  actionsRoot.innerHTML = `
    <button data-action="start" title="${strings[language].buttonHints.startBridge}">${text('startBridge', language)}</button>
    <button data-action="rotate-token" title="${strings[language].buttonHints.rotateToken}">${text('rotateToken', language)}</button>
    <button data-action="refresh" title="${strings[language].buttonHints.refresh}">${text('refresh', language)}</button>
  `;

  handoffRoot.innerHTML = `
    <button data-action="copy-openclaw-prompt" title="${strings[language].buttonHints.copyPrompt}">${text('copyPrompt', language)}</button>
    <div class="handoff-copy">${text('handoffSummary', language)}</div>
  `;

  developerRoot.innerHTML = `
    <button data-action="copy-playwright-snippet" title="${strings[language].buttonHints.playwright}">${text('copyPlaywright', language)}</button>
    <button data-action="copy-raw-cdp" title="${strings[language].buttonHints.raw}">${text('copyRaw', language)}</button>
    <button data-action="reset-advanced-replica" title="${strings[language].buttonHints.resetAdvancedReplica}">${text('resetAdvancedReplica', language)}</button>
    <div class="handoff-copy">${text('developerSummary', language)}</div>
    <div class="handoff-copy">${text('developerModes', language)}</div>
    <div class="handoff-copy">${text('developerMaintainer', language)}</div>
  `;
}

function renderFrame(language) {
  document.documentElement.lang = language;
  document.getElementById('hero-eyebrow').textContent = text('heroEyebrow', language);
  document.getElementById('hero-title').textContent = text('heroTitle', language);
  document.getElementById('hero-subtitle').textContent = text('heroSubtitle', language);
  document.getElementById('language-label').textContent = text('languageLabel', language);
  document.getElementById('browser-mode-label').textContent = text('browserModeLabel', language);
  document.getElementById('device-mode-label').textContent = text('deviceModeLabel', language);
  document.getElementById('advanced-profile-label').textContent = text('advancedProfileLabel', language);
  document.getElementById('launch-on-login-label').textContent = text('launchOnLogin', language);
  document.getElementById('minimize-to-tray-label').textContent = text('minimizeToTray', language);
  document.getElementById('status-panel-title').textContent = text('statusTitle', language);
  document.getElementById('actions-panel-title').textContent = text('actionsTitle', language);
  document.getElementById('handoff-panel-title').textContent = text('handoffTitle', language);
  document.getElementById('developer-panel-title').textContent = text('developerTitle', language);
  document.getElementById('diagnostics-panel-title').textContent = text('diagnosticsTitle', language);
  document.getElementById('maintenance-panel-title').textContent = text('maintenanceTitle', language);
  document.getElementById('maintenance-copy').textContent = text('maintenanceCopy', language);
  document.getElementById('open-data-dir-button').textContent = text('openDataDir', language);
  document.getElementById('open-data-dir-button').title = text('openDataDir', language);
  document.getElementById('open-uninstaller-button').textContent = text('openUninstaller', language);
  document.getElementById('open-uninstaller-button').title = strings[language].buttonHints.uninstall;
  document.getElementById('clean-install-guide-button').textContent = text('cleanInstallGuide', language);
  document.getElementById('clean-install-guide-button').title = strings[language].buttonHints.cleanInstall;
  if (renderedLanguage !== language) {
    renderStaticSections(language);
    renderedLanguage = language;
  }
}

function render(state) {
  const language = state.language ?? 'zh-CN';
  renderFrame(language);
  languageSelect.value = language;
  browserModeSelect.value = state.browserMode ?? 'clean';
  deviceModeSelect.value = state.deviceMode ?? 'desktop';
  advancedProfileWrap.style.display = Array.isArray(state.availableProfiles) && state.availableProfiles.length > 0 ? 'flex' : 'none';
  syncAdvancedProfiles(state);
  advancedProfileWrap.title = text('advancedProfileHint', language);

  const feedbackMessage = state.lastError
    ? `${text('statusUpdated', language)}${state.lastError}`
    : state.operationProgress?.active
      ? progressText(state.operationProgress.stage, language)
    : state.bridgeState === 'started' && state.cdpState === 'available'
      ? text('connected', language)
      : state.phase === 'starting' || state.phase === 'restarting'
        ? text('startingState', language)
        : state.phase === 'repairing'
          ? text('repairingState', language)
          : state.bridgeState === 'started'
            ? `${text('bridgeLayer', language)}：${text('bridgeStarted', language)}，${text('cdpLayer', language)}：${text('cdpStarting', language)}`
            : `${text('bridgeLayer', language)}：${text('bridgeStopped', language)}`;
  setFeedback(feedbackMessage, state.lastError ? 'error' : 'info');
  renderProgress(state.operationProgress, language, 'progressTitle');
  setBusyState(Boolean(state.operationProgress?.active));

  const browserModeSummary = state.browserMode === 'advanced'
    ? `${text('advancedMode', language)} · ${text('advancedModeHint', language)}`
    : `${text('cleanMode', language)} · ${text('cleanModeHint', language)}`;
  const deviceModeSummary = state.deviceMode === 'mobile'
    ? `${text('mobileMode', language)} · ${text('mobileModeHint', language)}`
    : `${text('desktopMode', language)} · ${text('desktopModeHint', language)}`;
  const tailscaleSummary = state.tailscale?.online
    ? `${text('tailscaleReady', language)} · ${state.tailscale.tailscaleIp ?? 'Tailscale IP unavailable'}`
    : `${text('tailscaleLocalOnly', language)} · 127.0.0.1`;
  const appStatus = state.appState === 'working'
    ? text('appWorking', language)
    : state.appState === 'error'
      ? text('unavailable', language)
      : text('appReady', language);
  const bridgeStatus = state.bridgeState === 'started'
    ? text('bridgeStarted', language)
    : state.phase === 'starting' || state.phase === 'restarting' || state.phase === 'repairing'
      ? text('startingState', language)
      : text('bridgeStopped', language);
  const chromeStatus = state.cdpState === 'available'
    ? `${text('cdpAvailable', language)} · ${deviceModeSummary}`
    : state.cdpState === 'waiting'
      ? text('cdpStarting', language)
      : text('unavailable', language);

  statusRoot.innerHTML = `
    <div class="status-hero">
      <div class="status-pill status-${state.phase}">${state.phase}</div>
      <div class="status-value">${tailscaleSummary}</div>
    </div>
    <div class="status-grid cards-grid">
      <div class="metric-card"><strong>${text('appLayer', language)}</strong><span>${appStatus}</span></div>
      <div class="metric-card"><strong>${text('bridgeLayer', language)}</strong><span>${bridgeStatus}</span></div>
      <div class="metric-card"><strong>${text('cdpLayer', language)}</strong><span>${chromeStatus}</span></div>
      <div class="metric-card"><strong>${text('browser', language)}</strong><span>${state.browserName ?? text('notDetected', language)}</span></div>
      <div class="metric-card"><strong>${text('mode', language)}</strong><span>${browserModeSummary}</span></div>
      <div class="metric-card"><strong>${text('tailscale', language)}</strong><span>${tailscaleSummary}</span></div>
      <div class="metric-card"><strong>${text('repairs', language)}</strong><span>${state.repairCount ?? 0}</span></div>
    </div>
  `;

  diagnosticsRoot.innerHTML = `
    <div><strong>${text('ws', language)}</strong><span>${state.wsEndpoint ?? text('unavailable', language)}</span></div>
    <div><strong>${text('http', language)}</strong><span>${state.versionEndpoint ?? text('unavailable', language)}</span></div>
    <div><strong>${text('control', language)}</strong><span>${state.controlStartBase ?? text('unavailable', language)}</span></div>
    <div><strong>${text('appVersion', language)}</strong><span>${state.appVersion ?? state.packageVersion ?? text('unavailable', language)}</span></div>
    <div><strong>${text('installPath', language)}</strong><span>${state.installPath ?? text('unavailable', language)}</span></div>
    <div><strong>${text('mode', language)}</strong><span>${browserModeSummary} / ${deviceModeSummary}</span></div>
    <div><strong>${text('advancedReplica', language)}</strong><span>${state.advancedReplicaState?.status ?? text('none', language)}${state.advancedReplicaState?.lastError ? ` · ${state.advancedReplicaState.lastError}` : ''}</span></div>
    <div><strong>Replica Root</strong><span>${state.advancedReplicaRootDir ?? text('none', language)}</span></div>
    <div><strong>${text('config', language)}</strong><span>${state.configPath ?? state.appDir}</span></div>
    <div><strong>${text('userData', language)}</strong><span>${state.userDataPath ?? state.appDir}</span></div>
    <div><strong>${text('logs', language)}</strong><span>${state.logDir}</span></div>
    <div><strong>Mode</strong><span>${state.portableMode ? 'Portable 0.2.2' : 'Installed / Dev'}</span></div>
    <div><strong>${text('lastError', language)}</strong><span>${state.lastError ?? text('none', language)}</span></div>
  `;

  document.querySelector('[data-setting="launchOnLogin"]').checked = Boolean(state.launchOnLogin);
  document.querySelector('[data-setting="minimizeToTray"]').checked = Boolean(state.minimizeToTray);
  document.getElementById('open-uninstaller-button').style.display = state.portableMode ? 'none' : '';
}

async function boot() {
  if (!window.bridgeApp) {
    setFeedback(strings['zh-CN'].preloadFailed, 'error');
    return;
  }

  try {
    const state = await window.bridgeApp.invoke('bridge:get-state');
    render(state);
    window.bridgeApp.onState((nextState) => {
      render(nextState);
    });
  } catch (error) {
    setFeedback(`${strings['zh-CN'].stateFailed}${error.message}`, 'error');
  }
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  if (action === 'start') {
    await window.bridgeApp.invoke('bridge:start');
  }
  if (action === 'copy-openclaw-prompt') {
    await window.bridgeApp.invoke('bridge:copy-agent-payload', { kind: 'generic-agent' });
  }
  if (action === 'copy-playwright-snippet') {
    await window.bridgeApp.invoke('bridge:copy-agent-payload', { kind: 'playwright' });
  }
  if (action === 'copy-raw-cdp') {
    await window.bridgeApp.invoke('bridge:copy-agent-payload', { kind: 'raw' });
  }
  if (action === 'reset-advanced-replica') {
    await window.bridgeApp.invoke('bridge:reset-advanced-replica');
  }
  if (action === 'rotate-token') {
    await window.bridgeApp.invoke('bridge:rotate-token');
  }
  if (action === 'refresh') {
    await window.bridgeApp.invoke('bridge:get-state');
    setFeedback(text('refreshRequested', languageSelect.value));
    return;
  }
  if (action === 'open-uninstaller') {
    await window.bridgeApp.invoke('bridge:open-uninstaller');
    return;
  }
  if (action === 'open-data-dir') {
    await window.bridgeApp.invoke('bridge:open-data-dir');
    return;
  }
  if (action === 'copy-clean-install-guide') {
    await window.bridgeApp.invoke('bridge:copy-clean-install-guide');
    return;
  }
  setFeedback(text('actionSent', languageSelect.value));
});

document.addEventListener('change', async (event) => {
  const languagePicker = event.target.closest('[data-setting="language"]');
  if (languagePicker) {
    await window.bridgeApp.invoke('bridge:set-language', {
      language: languagePicker.value
    });
    return;
  }

  const browserModePicker = event.target.closest('[data-setting="browserMode"]');
  if (browserModePicker) {
    await window.bridgeApp.invoke('bridge:set-browser-mode', {
      mode: browserModePicker.value
    });
    setFeedback(browserModePicker.value === 'advanced' ? text('advancedModeHint', languageSelect.value) : text('cleanModeHint', languageSelect.value));
    return;
  }

  const advancedProfilePicker = event.target.closest('[data-setting="advancedProfileDirectory"]');
  if (advancedProfilePicker) {
    await window.bridgeApp.invoke('bridge:set-advanced-profile', {
      profile: advancedProfilePicker.value
    });
    setFeedback(text('advancedProfileHint', languageSelect.value));
    return;
  }

  const deviceModePicker = event.target.closest('[data-setting="deviceMode"]');
  if (deviceModePicker) {
    await window.bridgeApp.invoke('bridge:set-device-mode', {
      mode: deviceModePicker.value
    });
    setFeedback(deviceModePicker.value === 'mobile' ? text('mobileModeHint', languageSelect.value) : text('desktopModeHint', languageSelect.value));
    return;
  }

  const loginCheckbox = event.target.closest('[data-setting="launchOnLogin"]');
  if (loginCheckbox) {
    await window.bridgeApp.invoke('bridge:set-launch-on-login', {
      enabled: loginCheckbox.checked
    });
    setFeedback(loginCheckbox.checked ? text('loginEnabled', languageSelect.value) : text('loginDisabled', languageSelect.value));
    return;
  }

  const trayCheckbox = event.target.closest('[data-setting="minimizeToTray"]');
  if (trayCheckbox) {
    await window.bridgeApp.invoke('bridge:set-minimize-to-tray', {
      enabled: trayCheckbox.checked
    });
    setFeedback(trayCheckbox.checked ? text('trayEnabled', languageSelect.value) : text('trayDisabled', languageSelect.value));
  }
});

void boot();
