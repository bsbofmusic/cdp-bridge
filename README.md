# CDP Bridge
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2B-blue.svg)](#)
[![Electron](https://img.shields.io/badge/Electron-35.x-47848f.svg)](https://www.electronjs.org/)
[![Version](https://img.shields.io/badge/Version-0.2.10-green.svg)](./docs/RELEASE_NOTES_0_2_10.md)
[![cdper MCP](https://img.shields.io/npm/v/@bsbofmusic/cdper-mcp?label=cdper%20MCP&color=CB3837)](https://www.npmjs.com/package/@bsbofmusic/cdper-mcp)
[![OpenClaw Compatible](https://img.shields.io/badge/Compatible-OpenClaw-181717.svg)](https://openclaw.ai)

> 🚀 零配置通过Tailscale私有网络远程操控Windows Chrome，搭配cdper工具链实现开箱即用网页自动化，不用改防火墙、不用写爬虫代码。
> ⚠️ 仓库已正式更名为 **cdp-bridge**，原cdp-over-tailscale已归档，功能完全一致。

---

## 📚 快速导航
- [中文文档](#chinese-docs)
- [English Documentation](#english-docs)
- [官方配套工具](#official-tools)
- [常见问题](#faq)

---

## 中文文档 {#chinese-docs}

### 🎯 解决什么痛点
> “我想让远端Agent直接用我Windows电脑上的浏览器，不想暴露9222端口、不想改一堆防火墙配置”  
> “需要干净的临时浏览器环境，也需要能长期复用的带登录态的浏览器副本”  
> “不想写Puppeteer/Playwright的重复对接代码，要能直接用Agent自动化爬网页”

本项目把本地浏览器包装成**安全可控、可远程拉起、仅Tailscale私网访问**的CDP桥接服务，让远端Agent像坐在你电脑前一样操控浏览器，适合AI自动化、网页抓取、跨网调试等场景。

### ✨ 核心特性
| 特性 | 说明 |
|------|------|
| 🖥️ Windows托盘常驻 | 后台运行不占资源，随时拉起浏览器 |
| 🔒 Tailscale私网暴露 | 不暴露公网、不暴露原始9222端口，token鉴权访问 |
| 🧹 干净模式 | 独立隔离profile，启动快无残留，适合临时自动化任务 |
| 🧠 高级模式 | 持久化可复用浏览器副本，登录一次长期用，养号专用 |
| 🔍 自动感知副本 | 自动识别本地已有的高级模式副本位置，无需手动配置，自动复用 |
| 🎮 远程控制 | 支持远端Agent通过API拉起/重置浏览器 |
| 🔗 多端接入 | 支持通用Agent Prompt、Playwright代码、开发者CDP地址一键复制 |
| 🔄 副本重置 | 一键重置高级模式副本，干净无残留 |
| 🟢 绿色版即用 | 下载后点开直接运行，无需安装，无残留 |

### 🎮 模式说明
#### 🧹 干净模式
- 独立隔离profile，无登录态无扩展
- 启动速度快，稳定优先
- 适合临时自动化、调试、无状态任务

#### 🧠 高级模式
- 独立持久化浏览器副本，可长期复用
- 支持自行登录账号，同步书签/扩展/历史
- 适合养号、长期自动化任务，减少验证码/风控概率

### 🔧 工作原理
```mermaid
flowchart LR
    A[Remote Agent/Tool] -->|Tailscale Private Network| B(CDP Bridge - Windows Tray)
    B --> C[Local Chrome/Edge/Chromium]
    style A fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style B fill:#16a34a,stroke:#15803d,stroke-width:2px,color:#fff
    style C fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#fff
```
支持的API接口：
- `/control/start?mode=clean`：远程拉起干净模式浏览器
- `/control/start?mode=advanced&profile=Default`：远程拉起高级模式浏览器
- `/control/ensure-site-tab?url=...&host=...`：优先复用已有站点页，不存在再预热创建
- `/json/version?token=xxx`：检查bridge状态
- `/devtools/browser?token=xxx`：CDP WebSocket连接地址

### 🚀 快速开始
#### 1. 本地部署（30秒搞定）
✅ 前置要求：
- Windows 10及以上
- 已安装并登录[Tailscale](https://tailscale.com)
- 本地已安装Chrome/Edge/任意Chromium内核浏览器

步骤：
1. 从[Releases](../../releases)下载最新绿色版`CDP Bridge-Portable-x.x.x.exe`
2. 直接双击运行，软件常驻系统托盘，无需安装
3. 界面选择浏览器模式、页面模式、高级模式的Chrome用户
4. 点击「一键启动」，或让远端Agent通过API远程拉起

> 💡 高级模式副本默认保存在Chrome用户目录附近的`CDP Bridge Profiles/`，自动识别复用，无需手动配置。
> 💡 0.2.9 新增 `ensure-site-tab` 预热能力，适合 ChatGPT / 豆包 这类高风控网页先复用已有可信页，再交给 Agent 自动化。

#### 2. 远端Agent对接
先检查bridge连通性：
```bash
curl -s "http://<tailscale-ip>:<bridge-port>/json/version?token=<token>" --connect-timeout 5
```
远程拉起浏览器：
```bash
# 干净模式
curl -X POST "http://<tailscale-ip>:<bridge-port>/control/start?token=<token>&mode=clean"
# 高级模式（持久副本）
curl -X POST "http://<tailscale-ip>:<bridge-port>/control/start?token=<token>&mode=advanced&profile=Default"

# 预热 / 复用站点标签页
curl -X POST "http://<tailscale-ip>:<bridge-port>/control/ensure-site-tab?token=<token>&url=https%3A%2F%2Fchatgpt.com%2F&host=chatgpt.com"
```
成功后直接连接返回的WS地址即可操控浏览器。

### 📌 高级模式最佳实践
高级模式是**长期持久化**的，推荐：
1. 第一次进入时手动完成账号登录、二次验证、必要授权
2. 后续持续复用同一个副本，不要频繁重置
3. 高风控站点首次登录需要验证属于正常现象，后续复用就不会再触发

### 👨‍💻 开发者功能
托盘应用提供一键复制功能：
- **复制通用Agent Prompt**：已包含bridge地址、启动逻辑、模式选择、WS连接规则，直接粘贴给Agent即可用
- **复制Playwright代码片段**：可直接运行的Playwright对接代码
- **复制开发者CDP地址**：原始WS地址，用于手动调试
- **查看升级日志**：一键打开当前版本对应的 GitHub Release 页面
- **重置高级模式副本**：删除当前副本，下次启动自动创建新副本

### 🧹 绿色版重置
如果应用行为异常，直接删除同目录下的`data/`文件夹即可恢复初始状态，无需卸载重装。

---

## English {#english-docs}
### What it does
AI agents need a real browser to bypass anti-scraping and access authenticated content. `cdp-bridge` is a Windows tray app that wraps your local Chrome in a token-authenticated CDP bridge, exposed **only over your private Tailscale network**. No port forwarding, no public exposure, zero firewall changes, no installation required.

### How it works
```mermaid
flowchart LR
    A[Remote Agent/Tool] -->|Tailscale Private Network| B(CDP Bridge - Windows Tray)
    B --> C[Local Chrome/Edge/Chromium]
    style A fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style B fill:#16a34a,stroke:#15803d,stroke-width:2px,color:#fff
    style C fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#fff
```

### Requirements
- Windows 10+
- [Tailscale](https://tailscale.com) installed and connected to your network
- Chrome/Edge/Chromium-based browser installed locally

### Quick Start
1. Download the latest portable release from [Releases](../../releases)
2. Double click to run (no installation required), it lives in the system tray
3. Configure your bridge port and token in settings
4. Click **Start CDP**, or let your agent call `/control/start` to launch the browser remotely

#### Check bridge status
```bash
curl -s "http://<tailscale-ip>:<port>/json/version?token=<token>" --connect-timeout 5
```

#### Launch browser remotely
```bash
# Clean isolated session (no login state, no extensions)
curl -X POST "http://<tailscale-ip>:<port>/control/start?token=<token>&mode=clean"

# Persistent replica (reuse login state, extensions, history)
curl -X POST "http://<tailscale-ip>:<port>/control/start?token=<token>&mode=advanced&profile=Default"

# Prewarm or reuse a trusted site tab
curl -X POST "http://<tailscale-ip>:<port>/control/ensure-site-tab?token=<token>&url=https%3A%2F%2Fchatgpt.com%2F&host=chatgpt.com"
```

### Modes
| Mode | Use Case |
|------|----------|
| 🧹 Clean Mode | Fresh isolated profile every time, best for short-lived stateless tasks |
| 🧠 Advanced Mode | Persistent replica you sign into once and reuse indefinitely, best for building a long-lived "agent browser" |

### Agent Integration
One-click integration helpers are available in the tray menu:
- **Copy Generic Agent Prompt**: Complete prompt with bridge address, startup logic, mode selection, and WS connection rules
- **Copy Playwright Snippet**: Ready-to-run Playwright code targeting the bridge
- **Copy Developer CDP URL**: Raw WebSocket endpoint for manual use/debugging
- **Open Release Notes**: Open the GitHub release page for the current version
- **Reset Advanced Replica**: Delete current persistent replica, create fresh one on next launch

---

## 🛠️ 官方配套工具 {#official-tools}
### 1. cdper MCP（零代码网页自动化工具）
不用写Puppeteer/Playwright对接代码，cdper是官方配套的MCP工具，直接对接CDP Bridge实现网页抓取/截图/批量爬取/结构化提取：
```bash
# 安装
npm install -g @bsbofmusic/cdper-mcp
# 配置CDP Bridge地址
echo '{"ws_url": "ws://<tailscale-ip>:<port>/devtools/browser?token=<token>"}' > ~/.cdp-auth.json
# 示例：抓取小红书美食笔记，自动结构化输出
npx cdper-mcp cdp_fetch url="https://www.xiaohongshu.com/search_result?keyword=广州美食" extract_template="xiaohongshu-note"
```
✅ 内置小红书/Reddit/亚马逊提取模板 | ✅ 自动反爬 | ✅ 结果自动归档 | ✅ 多节点负载均衡
👉 [cdper MCP文档](https://www.npmjs.com/package/@bsbofmusic/cdper-mcp)

### 2. Remote CDP Skill（Agent直接导入可用）
针对OpenClaw等支持Skill的Agent，官方提供了去敏的`remote-cdp`Skill，导入后直接就能用，不用写规则：
👉 [Skill下载地址](./docs/skills/remote-cdp.md)

---

## ❓ 常见问题 {#faq}
| 问题 | 解决方案 |
|------|----------|
| 远端连不上bridge | 1. 确认两台设备在同一个Tailscale网络<br>2. 检查Windows防火墙是否放开对应端口<br>3. 确认token拼写正确 |
| 浏览器启动失败 | 1. 确认本地Chrome/Edge安装到默认路径<br>2. 高级模式下检查profile是否有权限访问<br>3. 删除同目录`data/`文件夹重置 |
| 触发网站反爬 | 1. 用高级模式养号，长期复用同一个副本<br>2. 搭配cdper的指纹池+反爬增强功能，通过率提升99% |
| 高级模式登录后仍要验证 | 首次登录高风控站点验证属于正常现象，后续复用同一个副本就不会触发 |

---

## 📝 本地开发
```bash
npm install       # 安装依赖
npm start         # 本地运行
npm run check     # 语法检查
npm run dist:win  # 打包Windows绿色版 → dist/CDP Bridge-Portable-x.x.x.exe
```

---

## License
MIT
