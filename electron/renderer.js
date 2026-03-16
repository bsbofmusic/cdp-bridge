const statusRoot = document.getElementById('status');
const actionsRoot = document.getElementById('actions');
const handoffRoot = document.getElementById('handoff');
const developerRoot = document.getElementById('developer');
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
    handoffTitle: 'Agent 接入',
    developerTitle: '开发者区',
    diagnosticsTitle: '诊断信息',
    maintenanceTitle: '维护工具',
    maintenanceCopy: '这里可以处理卸载、清洁安装和版本切换等操作。',
    openUninstaller: '打开卸载程序',
    cleanInstallGuide: '复制清洁安装说明',
    browserAutoHeal: '浏览器自愈',
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
    
    // 操作按钮文本
    copyWs: '复制 WS 地址',
    copyHttp: '复制 HTTP 地址',
    repair: '修复连接',
    restart: '重新桥接',
    rotateToken: '轮换 Token',
    refresh: '刷新状态',

    // 接入 Prompt 文本补充完整，解决 undefined 问题
    copyPrompt: '复制通用 Agent Prompt',
    copyClaude: '复制 Claude Prompt',
    copyPlaywright: '复制 Playwright 代码',
    copyRaw: '复制开发者 CDP 地址',

    handoffSummary: '优先把“通用 Agent Prompt”发给 Agent，它会按背景、目标和步骤去连接本地 Chrome bridge。',
    developerSummary: '这里是给熟悉 CDP / Playwright 的开发者用的调试入口，普通使用场景通常不需要。',
    maintenanceCopy: '这里可以处理卸载、清洁安装和版本切换等操作。关闭浏览器后被自动重新拉起属于自愈机制，不是 bug。',
    buttonHints: {
      copyWs: '复制桥接后的 WebSocket 地址，供远端 CDP 客户端使用。',
      copyHttp: '复制桥接后的 HTTP 探测地址，用于诊断和版本发现。',
      copyPrompt: '复制一份通用 Agent Prompt，适合 OpenClaw、OpenCode、Codex 等 Agent。',
      repair: '自动结束残留进程、重新拉起浏览器并恢复连接。',
      restart: '不轮换 token，直接重新建立桥接服务。',
      rotateToken: '生成新的 token 并重启桥接，让旧链接失效。',
      refresh: '立即刷新浏览器、Tailscale 和桥接状态。',
      uninstall: '打开已安装版本的卸载程序，正规移除应用。',
      cleanInstall: '复制一段简短说明，告诉用户什么时候该使用 Clean install。',
      claude: '复制适合 Claude Code 类 Agent 的接入说明。',
      playwright: '复制 Playwright connectOverCDP 代码片段。',
      raw: '复制 bridge 的底层 WS 地址，适合熟悉 CDP 的开发者调试使用。'
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
    handoffTitle: 'Agent Handoff',
    developerTitle: 'Developer',
    diagnosticsTitle: 'Diagnostics',
    maintenanceTitle: 'Maintenance',
    maintenanceCopy: 'Use these controls for uninstall, clean install recovery, and version handoff tasks.',
    openUninstaller: 'Open Uninstaller',
    cleanInstallGuide: 'Copy Clean Install Guide',
    browserAutoHeal: 'Browser Self-Heal',
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
    
    // Action Texts
    copyWs: 'Copy WS endpoint',
    copyHttp: 'Copy HTTP endpoint',
    repair: 'Fix connection',
    restart: 'Reconnect bridge',
    rotateToken: 'Rotate token',
    refresh: 'Refresh status',

    // Handoff Texts
    copyPrompt: 'Copy Generic Agent Prompt',
    copyClaude: 'Copy Claude Prompt',
    copyPlaywright: 'Copy Playwright Snippet',
    copyRaw: 'Copy Developer CDP URL',

    handoffSummary: 'Start by sending the generic agent prompt. It explains the background, goal, and exact bridge connection steps.',
    developerSummary: 'These entries are for developers who already understand CDP / Playwright. Most users do not need them.',
    maintenanceCopy: 'Use these controls for uninstall, clean install recovery, and version handoff tasks. If the browser reopens after you close it, that is the self-heal mechanism, not a bug.',
    buttonHints: {
      copyWs: 'Copy the bridge WebSocket address for a remote CDP client.',
      copyHttp: 'Copy the bridge HTTP version endpoint for diagnostics and discovery.',
      copyPrompt: 'Copy one generic agent prompt for OpenClaw, OpenCode, Codex, and similar agents.',
      repair: 'Automatically stop stale processes, relaunch the browser, and restore the connection.',
      restart: 'Reconnect the bridge service without rotating your token.',
      rotateToken: 'Generate a fresh token and restart the bridge to invalidate old links.',
      refresh: 'Refresh browser, Tailscale, and bridge status now.',
      uninstall: 'Open the installed uninstaller for a clean removal.',
      cleanInstall: 'Copy a short explanation of when to use Clean install.',
      claude: 'Copy a handoff for Claude Code-style agents.',
      playwright: 'Copy a Playwright connectOverCDP snippet.',
      raw: 'Copy the low-level bridge WS endpoint for CDP-capable developer tools.'
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
  document.getElementById('handoff-panel-title').textContent = text('handoffTitle', language);
  document.getElementById('developer-panel-title').textContent = text('developerTitle', language);
  document.getElementById('diagnostics-panel-title').textContent = text('diagnosticsTitle', language);
  document.getElementById('maintenance-panel-title').textContent = text('maintenanceTitle', language);
  document.getElementById('maintenance-copy').textContent = text('maintenanceCopy', language);
  document.getElementById('open-uninstaller-button').textContent = text('openUninstaller', language);
  document.getElementById('open-uninstaller-button').title = strings[language].buttonHints.uninstall;
  document.getElementById('clean-install-guide-button').textContent = text('cleanInstallGuide', language);
  document.getElementById('clean-install-guide-button').title = strings[language].buttonHints.cleanInstall;
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

  // 快捷操作区：严格保留针对 Bridge 的基础控制
  actionsRoot.innerHTML = `
    <button data-action="copy-ws" title="${strings[language].buttonHints.copyWs}">${text('copyWs', language)}</button>
    <button data-action="copy-http" title="${strings[language].buttonHints.copyHttp}">${text('copyHttp', language)}</button>
    <button data-action="repair" title="${strings[language].buttonHints.repair}">${text('repair', language)}</button>
    <button data-action="restart" title="${strings[language].buttonHints.restart}">${text('restart', language)}</button>
    <button data-action="rotate-token" title="${strings[language].buttonHints.rotateToken}">${text('rotateToken', language)}</button>
    <button data-action="refresh" title="${strings[language].buttonHints.refresh}">${text('refresh', language)}</button>
  `;

  // Agent 接入区：所有涉及到提供给大模型和外部调用的 Prompt 均汇聚于此
  handoffRoot.innerHTML = `
    <button data-action="copy-openclaw-prompt" title="${strings[language].buttonHints.copyPrompt}">${text('copyPrompt', language)}</button>
    <div class="handoff-copy">${text('handoffSummary', language)}</div>
  `;

  developerRoot.innerHTML = `
    <button data-action="copy-claude-prompt" title="${strings[language].buttonHints.claude}">${text('copyClaude', language)}</button>
    <button data-action="copy-playwright-snippet" title="${strings[language].buttonHints.playwright}">${text('copyPlaywright', language)}</button>
    <button data-action="copy-raw-cdp" title="${strings[language].buttonHints.raw}">${text('copyRaw', language)}</button>
    <div class="handoff-copy">${text('developerSummary', language)}</div>
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
    await window.bridgeApp.invoke('bridge:copy-agent-payload', { kind: 'generic-agent' });
  }
  if (action === 'copy-claude-prompt') {
    await window.bridgeApp.invoke('bridge:copy-agent-payload', { kind: 'claude' });
  }
  if (action === 'copy-playwright-snippet') {
    await window.bridgeApp.invoke('bridge:copy-agent-payload', { kind: 'playwright' });
  }
  if (action === 'copy-raw-cdp') {
    await window.bridgeApp.invoke('bridge:copy-agent-payload', { kind: 'raw' });
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
