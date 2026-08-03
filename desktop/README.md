# XProj Desktop

现代化的游戏服务器浏览器桌面客户端，基于 Tauri + React + TypeScript 构建。

## 特性

- 🚀 **高性能**: 基于 Tauri (Rust) 构建，内存占用低，启动速度快
- 🎨 **现代化UI**: 使用 React 19 + Tailwind CSS 4，支持暗色模式
- 🔌 **API对接**: 与 XProj 后端 API 完全对接
- ⭐ **收藏功能**: 本地收藏与登录后的云端收藏共享
- **AI**: 原生流式服务器问答，可只读参考当前账号的云端收藏偏好
- **本地工具**: 本机 A2S 延迟测试、活跃候选延迟排序，以及确认后单次加入或自动排队加入
- 🔍 **搜索功能**: 支持服务器名称、地图、IP搜索
- 🌍 **区域筛选**: 按地区筛选服务器
- 📦 **轻量安装包**: 约 10MB (vs Electron 150MB+)

## 技术栈

- **桌面框架**: [Tauri 2.x](https://tauri.app/) (Rust)
- **前端框架**: React 19 + TypeScript
- **样式**: Tailwind CSS 4
- **构建工具**: Vite 8
- **状态管理**: React Context + useReducer (无外部依赖)
- **HTTP请求**: Tauri HTTP 插件，浏览器开发模式回退原生 Fetch API

## 开发

### 环境要求

- Node.js 24, 25, or 26
- Rust (通过 [rustup](https://rustup.rs/) 安装)
- Windows: Microsoft Visual Studio C++ Build Tools
- Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev`

### 安装依赖

```bash
cd desktop
npm install
```

### 开发模式

```bash
# 仅前端开发 (浏览器)
npm run dev

# Tauri 桌面开发 (带热重载)
npm run tauri:dev
```

### 构建

```bash
# 构建前端
npm run build

# 构建桌面应用
npm run tauri:build
```

### 平台构建脚本

Windows 可以双击 `windows.bat`，或在 PowerShell 中执行：

```powershell
.\windows.bat
# 重复构建时跳过依赖安装和检查
.\windows.bat -SkipInstall -SkipChecks
```

脚本会调用 `build-windows.ps1`，默认生成 `msi` 和 `nsis` 安装包。

macOS 在终端执行：

```bash
chmod +x build-mac.sh
./build-mac.sh
# 重复构建时跳过依赖安装和检查
SKIP_INSTALL=1 SKIP_CHECKS=1 ./build-mac.sh
```

macOS 脚本默认生成当前机器架构的 `.app` 和 `.dmg`，也可以使用
`./build-mac.sh --bundles=app` 只生成应用包。

### 质量基线

从仓库根目录运行完整 Desktop 检查：

```bash
bash scripts/desktop-check.sh
```

该命令依次执行锁定依赖安装、ESLint、TypeScript 类型检查、单元测试、
架构检查、Vite 生产构建、包体检查、高危生产依赖审计，以及 Rust 的
格式、编译、测试和 Clippy 检查。单项命令仅用于开发阶段快速反馈。

架构与性能门禁也可以在 `desktop/` 中单独运行：

```bash
npm run check:architecture
npm run check:performance # 需要先生成 dist/
```

`check:architecture` 规定只有 `src/services/` 可以直接导入 Tauri，新增生产
文件最多 400 行，并锁定历史超大文件不得增长。`check:performance` 强制以下
生产资源预算：

| 指标 | raw 上限 | gzip 上限 |
|------|---------:|----------:|
| 初始资源 | 640 KiB | 170 KiB |
| 全部资源 | 1100 KiB | 300 KiB |

单个 JavaScript chunk 的 gzip 上限为 84 KiB，全部 CSS 的 gzip 上限为
20 KiB。预算配置分别位于 `architecture-budget.json` 和
`performance-budget.json`。

构建产物位于 `src-tauri/target/release/bundle/`:
- Windows: `.msi` 和 `.exe` 安装包
- Linux: `.AppImage` 和 `.deb` 包

## 配置

### API 服务器地址

应用启动后，点击右上角设置按钮，输入 XProj 后端服务器地址。

默认地址: `http://localhost:8216`

### 自动更新

应用启动时会自动检测更新，从以下地址获取更新信息：

```
https://update-software.upkk.com/xproj-server-clients/update.json
```

#### update.json 格式

```json
{
  "version": "1.0.1",
  "release_date": "2026-02-07",
  "download_url": "https://update-software.upkk.com/xproj-server-clients/releases/1.0.1/upkk-server-browser-1.0.1-setup.exe",
  "changelog": "- 新增功能A\n- 修复问题B\n- 优化性能C",
  "mandatory": false,
  "min_version": "0.9.0"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `version` | string | ✅ | 最新版本号 (semver 格式，如 `1.0.1`) |
| `release_date` | string | ❌ | 发布日期 (如 `2026-02-07`) |
| `download_url` | string | ✅ | 安装程序下载地址 (单个 exe 文件) |
| `changelog` | string | ❌ | 更新日志，支持换行符 `\n` |
| `mandatory` | boolean | ❌ | 是否强制更新，默认 `false` |
| `min_version` | string | ❌ | 最低支持版本，低于此版本将强制更新 |

**更新逻辑**：
- 启动时自动检测一次
- 如果有新版本，弹出更新提示
- 用户可选择"稍后提醒"跳过此版本
- 如果 `mandatory` 为 `true` 或当前版本低于 `min_version`，则强制更新

### 自动化构建

项目配置了 GitHub Actions 工作流，推送到 `desktop/` 目录时自动触发构建：

- Windows: 生成 MSI 和 NSIS 安装包
- Linux: 生成 AppImage 和 DEB 包

## 数据存储

应用使用以下位置存储用户数据：

### 云端账号与社区登录

顶部账号状态、AI、云端收藏和地图监控共用 Steam、Upkk、Google 或
Discord OAuth 云端账号。OAuth Bearer token 只在运行期保存在内存中，持久化时写入
设备绑定的 `api-token.enc`；升级后首次启动会自动导入旧版 `xproj_api_token`
localStorage 值并立即删除明文键。浏览器预览模式不持久化云端登录。

云端收藏和 AI 使用同一套登录界面与登录状态。关闭 OAuth 登录窗口会立即结束本次
登录等待并恢复登录按钮，不需要等待超时。

顶部功能导航默认显示图标和文字；可在“设置 > 外观 > 顶部导航文字”中切换为仅显示图标，
该偏好保存在本机。

论坛与签到继续使用 SteamID64/secure code 社区登录，只有进入对应功能时才会请求。

### 安全凭据存储

云端 API token 与社区登录凭据使用 **AES-256-GCM 加密**，分别存储在系统应用数据目录的
`api-token.enc` 和 `credentials.enc`：

| 操作系统 | 存储路径 |
|---------|---------|
| Windows | `%APPDATA%\com.upkk.server-browser\{api-token,credentials}.enc` |
| Linux | `~/.local/share/com.upkk.server-browser/{api-token,credentials}.enc` |
| macOS | `~/Library/Application Support/com.upkk.server-browser/{api-token,credentials}.enc` |

**安全特性**：
- 🔐 **AES-256-GCM 加密**: 凭据使用 AES-256-GCM 算法加密存储
- 🖥️ **设备绑定**: 加密密钥与设备唯一标识符绑定，凭据文件复制到其他设备后无法解密
- 🔄 **自动登录**: 启动时自动使用保存的凭据登录
- **明文迁移**: 旧版云端 token 只导入一次，成功加密后删除 localStorage 明文

### 应用设置存储

应用设置使用浏览器 `localStorage` 存储，数据保存在 WebView 的本地存储中：

| 存储键 | 说明 |
|-------|------|
| `xproj-desktop-state` | 应用状态 (收藏服务器、API地址、区域筛选、游戏类型、视图模式、每页数量) |
| `upkk-theme-settings` | 主题设置 (暗色模式、颜色配置、背景图片、毛玻璃效果) |
| `xproj-navigation-label-mode` | 顶部导航显示模式 (`icons` 或 `labels`，默认 `labels`) |
| `xproj-remember-me` | 记住登录状态选项 |
| `xproj-user-session` | 用户会话信息 |
| `autoRefreshInterval` | 自动刷新间隔 |

### 设备标识符

如果无法获取硬件设备ID，应用会在用户主目录生成备用设备标识符：

| 操作系统 | 存储路径 |
|---------|---------|
| Windows | `%USERPROFILE%\.xproj-device-id` |
| Linux/macOS | `~/.xproj-device-id` |

### 清除数据

在设置页面点击"清除数据并重启"按钮可清除所有本地存储的数据，包括：
- localStorage 数据
- sessionStorage 数据
- IndexedDB 数据
- 加密的云端 API token 与社区登录凭据

> ⚠️ 注意：清除数据后需要重新登录。

## 目录结构

```
desktop/
├── src/                  # React 源代码
│   ├── api/              # API 调用层
│   ├── components/       # UI 组件
│   ├── pages/            # 页面组件
│   ├── services/         # 服务模块 (更新检测等)
│   ├── store/            # 状态管理
│   └── types/            # TypeScript 类型定义
├── src-tauri/            # Tauri/Rust 代码
│   ├── src/              # Rust 源代码
│   ├── icons/            # 应用图标
│   └── tauri.conf.json   # Tauri 配置
├── package.json          # NPM 配置
└── vite.config.ts        # Vite 配置
```

## 许可证

MIT License
