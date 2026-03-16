# CDP Bridge v1

Maintained by `bsbofmusic`.

本地 Windows 托盘工具，负责：

- 自动发现并拉起本地 Chrome / Edge / Chromium
- 自动检测 `Tailscale` 状态并生成可用 endpoint
- 维护本地 CDP WebSocket / HTTP bridge
- 提供一键桥接、一键修复、token 轮换、开机启动
- 给远端 `OpenClaw` / 其他 CDP 客户端提供可直连地址

## 使用

1. 安装依赖：

```bash
npm install
```

2. 确保本机已安装并登录 `Tailscale`

3. 启动 Electron 托盘版：

```bash
npm start
```

4. 如果只想跑命令行 bridge：

```bash
npm run start:bridge
```

5. 首次运行会生成配置：

`%USERPROFILE%/.cdp-bridge/config.json`

## 打包安装

生成 Windows 安装包：

```bash
npm run dist:win
```

构建产物输出到：

`dist/`

安装器特性：

- 可选择安装目录
- 创建桌面快捷方式与开始菜单快捷方式
- 安装完成后自动启动
- 应用内支持开机启动开关
- 安装器提供 `Clean install` 选项，用于清理开发版残留和旧托盘冲突

## 清洁安装

如果你之前运行过开发版，或者遇到“安装后还是旧界面”的情况，先执行：

```bash
clean-install.cmd
```

它会：

- 停掉旧的 `CDP Bridge` / `electron` 进程
- 清理开发版残留目录 `AppData\Roaming\cdp-bridge-dev`
- 清理本地测试安装目录

安装器里的 `Clean install` 选项解决的是：

- 安装后仍然打开旧开发版窗口
- 旧托盘进程抢占新安装版单实例
- 开发版残留目录导致配置和窗口状态混乱

然后再运行最新安装包：

`dist/CDP Bridge-Setup-0.1.0.exe`

## 托盘能力

- 一键桥接
- 一键修复
- 一键复制 WS / HTTP endpoint
- 一键复制给 OpenClaw 的完整配置 prompt
- 一键轮换 token
- 打开配置与日志目录
- 开机启动开关
- 最小化到托盘开关

## 当前范围

- 本地端：仅 Windows
- 远端控制端：任何能加入同一 `Tailscale` tailnet 的系统
- 浏览器：Chrome / Edge / Chromium
