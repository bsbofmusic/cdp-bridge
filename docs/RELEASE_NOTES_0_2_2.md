# Release Notes 0.2.2

## 中文

### 更新内容

- 主交付改为 `绿色版优先`，新增 `CDP Bridge-Portable-0.2.2.exe`
- 运行数据默认落到程序目录下的 `data/`，避免继续依赖安装版路径
- 启动时会自动关闭其他已运行的 `CDP Bridge` 实例，避免旧版、新版或不同绿色版目录互相冲突
- 高级模式副本改为固定放在 Chrome 用户目录附近的 `CDP Bridge Profiles/`，并带有 `cdp` 标记与元数据，升级后可自动发现并复用旧副本

### 说明

- 绿色版不再依赖卸载程序，删除整个目录即可移除
- 高级模式副本固定保存在 Chrome 用户目录附近的 `CDP Bridge Profiles/`
- 程序会自动识别并复用已有带标记的 `cdp` 副本，无需手动选择路径

---

## English

### What’s New

- The primary delivery is now `portable-first` with `CDP Bridge-Portable-0.2.2.exe`
- Runtime data now defaults to the app-local `data/` directory instead of installer-owned paths
- Startup now automatically closes older `CDP Bridge` instances so old and new builds do not fight each other
- Advanced Mode replicas now live in a fixed `CDP Bridge Profiles/` directory near Chrome user data, with `cdp` markers and metadata so later versions can rediscover and reuse them automatically

### Notes

- The portable build does not require an uninstaller; removing the folder removes the app
- Advanced Mode replicas now live in `CDP Bridge Profiles/` near Chrome user data
- Existing tagged `cdp` replicas are detected and reused automatically after upgrades
