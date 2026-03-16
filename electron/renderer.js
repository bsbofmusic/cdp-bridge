const statusRoot = document.getElementById('status');
const actionsRoot = document.getElementById('actions');
const diagnosticsRoot = document.getElementById('diagnostics');
const feedbackRoot = document.getElementById('feedback');
const languageSelect = document.getElementById('language-select');

const strings = {
  'zh-CN': {
    heroEyebrow: 'Windows 本地浏览器桥接',
    heroTitle: 'CDP Bridge',
    heroSubtitle: '本地浏览器通过 Tailscale 暴露给远端 OpenClaw。',
    languageLabel: '语言',
    launchOnLogin: '开机启动',
    minimizeToTray: '最小化到托盘',
    statusTitle: '桥接状态',
    actionsTitle: '快捷操作',
    diagnosticsTitle: '诊断信息',
    maintenanceTitle: '维护工具',
    maintenanceCopy: '这里可以处理卸载、清洁安装和版本切换等操作。',
    openUninstaller: '打开卸载程序',
    browser: '浏览器',
    tailscale: 'Tailscale',
    chromeCdp: 'Chrome CDP',
    repairs: '修复次数',
    ws: 'WS 地址',
    http: 'HTTP 地址',
    config: '配置目录',
    logs: '日志目录',
    lastError: '最近错误',
    notDetected: '未检测到',
    offline: '离线',
    ready: '可用',
    unavailable: '不可用',
    none: '无',
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
    copyWs: '复制 WS 地址',
    copyHttp: '复制 HTTP 地址',
    copyPrompt: '复制 OpenClaw Prompt',
    repair: '一键修复',
    restart: '重启桥接',
    rotateToken: '轮换 Token',
    refresh: '刷新状态',
    buttonHints: {
      copyWs: '复制桥接后的 WebSocket 地址，供远端 CDP 客户端使用。',
      copyHttp: '复制桥接后的 HTTP 探测地址，用于诊断和版本发现。',
      copyPrompt: '复制一段完整 prompt，直接发给 OpenClaw 或其他 Agent。',
      repair: '停止残留浏览器进程，重拉 Chrome 并重建桥接。',
      restart: '不轮换 token，直接重启桥接服务。',
      rotateToken: '生成新的 token 并重启桥接，让旧链接失效。',
      refresh: '立即刷新浏览器、Tailscale 和桥接状态。',
      uninstall: '打开已安装版本的卸载程序，正规移除应用。'
    }
  },
  'en-US': {
    heroEyebrow: 'Windows Local Browser Bridge',
    heroTitle: 'CDP Bridge',
    heroSubtitle: 'Expose your local browser to remote OpenClaw over Tailscale.',
    languageLabel: 'Language',
    launchOnLogin: 'Launch on login',
    minimizeToTray: 'Minimize to tray',
    statusTitle: 'Bridge Status',
    actionsTitle: 'Quick Actions',
    diagnosticsTitle: 'Diagnostics',
    maintenanceTitle: 'Maintenance',
    maintenanceCopy: 'Use these controls for uninstall, clean install recovery, and version handoff tasks.',
    openUninstaller: 'Open Uninstaller',
    browser: 'Browser',
    tailscale: 'Tailscale',
    chromeCdp: 'Chrome CDP',
    repairs: 'Repairs',
    ws: 'WS Endpoint',
    http: 'HTTP Endpoint',
    config: 'Config',
    logs: 'Logs',
    lastError: 'Last error',
    notDetected: 'Not detected',
    offline: 'Offline',
    ready: 'Ready',
    unavailable: 'Unavailable',
    none: 'None',
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
    copyWs: 'Copy WS endpoint',
    copyHttp: 'Copy HTTP endpoint',
    copyPrompt: 'Copy OpenClaw Prompt',
    repair: 'One-click repair',
    restart: 'Restart bridge',
    rotateToken: 'Rotate token',
    refresh: 'Refresh status',
    buttonHints: {
      copyWs: 'Copy the bridge WebSocket address for a remote CDP client.',
      copyHttp: 'Copy the bridge HTTP version endpoint for diagnostics and discovery.',
      copyPrompt: 'Copy a ready-to-paste prompt for OpenClaw or another agent.',
      repair: 'Stop stale browser processes, relaunch Chrome, and rebuild the bridge.',
      restart: 'Restart the bridge service without rotating your token.',
      rotateToken: 'Generate a fresh token and restart the bridge to invalidate old links.',
      refresh: 'Refresh browser, Tailscale, and bridge status now.',
      uninstall: 'Open the installed uninstaller for a clean removal.'
    }
  }
};

function text(key, language) {
  return strings[language]?.[key] ?? strings['zh-CN'][key];
}

function setFeedback(message, type = 'info') {
  feedbackRoot.textContent = message;
  feedbackRoot.dataset.state = type;
}

function renderFrame(language) {
  document.documentElement.lang = language;
  document.getElementById('hero-eyebrow').textContent = text('heroEyebrow', language);
  document.getElementById('hero-title').textContent = text('heroTitle', language);
  document.getElementById('hero-subtitle').textContent = text('heroSubtitle', language);
  document.getElementById('language-label').textContent = text('languageLabel', language);
  document.getElementById('launch-on-login-label').textContent = text('launchOnLogin', language);
  document.getElementById('minimize-to-tray-label').textContent = text('minimizeToTray', language);
  document.getElementById('status-panel-title').textContent = text('statusTitle', language);
  document.getElementById('actions-panel-title').textContent = text('actionsTitle', language);
  document.getElementById('diagnostics-panel-title').textContent = text('diagnosticsTitle', language);
  document.getElementById('maintenance-panel-title').textContent = text('maintenanceTitle', language);
  document.getElementById('maintenance-copy').textContent = text('maintenanceCopy', language);
  document.getElementById('open-uninstaller-button').textContent = text('openUninstaller', language);
  document.getElementById('open-uninstaller-button').title = strings[language].buttonHints.uninstall;
}

function render(state) {
  const language = state.language ?? 'zh-CN';
  renderFrame(language);
  languageSelect.value = language;

  setFeedback(state.lastError ? `${text('statusUpdated', language)}${state.lastError}` : text('connected', language));

  statusRoot.innerHTML = `
    <div class="status-hero">
      <div class="status-pill status-${state.phase}">${state.phase}</div>
      <div class="status-value">${state.tailscale?.online ? state.tailscale.tailscaleIp : text('offline', language)}</div>
    </div>
    <div class="status-grid cards-grid">
      <div class="metric-card"><strong>${text('browser', language)}</strong><span>${state.browserName ?? text('notDetected', language)}</span></div>
      <div class="metric-card"><strong>${text('tailscale', language)}</strong><span>${state.tailscale?.online ? state.tailscale.tailscaleIp : text('offline', language)}</span></div>
      <div class="metric-card"><strong>${text('chromeCdp', language)}</strong><span>${state.chromeReachable ? text('ready', language) : text('unavailable', language)}</span></div>
      <div class="metric-card"><strong>${text('repairs', language)}</strong><span>${state.repairCount ?? 0}</span></div>
    </div>
  `;

  actionsRoot.innerHTML = `
    <button data-action="copy-ws" title="${strings[language].buttonHints.copyWs}">${text('copyWs', language)}</button>
    <button data-action="copy-http" title="${strings[language].buttonHints.copyHttp}">${text('copyHttp', language)}</button>
    <button data-action="copy-openclaw-prompt" title="${strings[language].buttonHints.copyPrompt}">${text('copyPrompt', language)}</button>
    <button data-action="repair" title="${strings[language].buttonHints.repair}">${text('repair', language)}</button>
    <button data-action="restart" title="${strings[language].buttonHints.restart}">${text('restart', language)}</button>
    <button data-action="rotate-token" title="${strings[language].buttonHints.rotateToken}">${text('rotateToken', language)}</button>
    <button data-action="refresh" title="${strings[language].buttonHints.refresh}">${text('refresh', language)}</button>
  `;

  diagnosticsRoot.innerHTML = `
    <div><strong>${text('ws', language)}</strong><span>${state.wsEndpoint ?? text('unavailable', language)}</span></div>
    <div><strong>${text('http', language)}</strong><span>${state.versionEndpoint ?? text('unavailable', language)}</span></div>
    <div><strong>${text('config', language)}</strong><span>${state.appDir}</span></div>
    <div><strong>${text('logs', language)}</strong><span>${state.logDir}</span></div>
    <div><strong>${text('lastError', language)}</strong><span>${state.lastError ?? text('none', language)}</span></div>
  `;

  document.querySelector('[data-setting="launchOnLogin"]').checked = Boolean(state.launchOnLogin);
  document.querySelector('[data-setting="minimizeToTray"]').checked = Boolean(state.minimizeToTray);
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
  if (action === 'copy-ws') {
    await window.bridgeApp.invoke('bridge:copy', { type: 'ws' });
  }
  if (action === 'copy-http') {
    await window.bridgeApp.invoke('bridge:copy', { type: 'http' });
  }
  if (action === 'copy-openclaw-prompt') {
    await window.bridgeApp.invoke('bridge:copy-openclaw-prompt');
  }
  if (action === 'repair') {
    await window.bridgeApp.invoke('bridge:repair');
  }
  if (action === 'restart') {
    await window.bridgeApp.invoke('bridge:restart');
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
