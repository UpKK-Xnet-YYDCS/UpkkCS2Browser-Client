# XProj Desktop

## 开发

### 环境要求

- Node.js 25+
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

### 登录凭据存储

登录凭据使用 **AES-256-GCM 加密** 存储在系统应用数据目录中：

| 操作系统 | 存储路径 |
|---------|---------|
| Windows | `%APPDATA%\com.upkk.server-browser\credentials.enc` |
| Linux | `~/.local/share/com.upkk.server-browser/credentials.enc` |
| macOS | `~/Library/Application Support/com.upkk.server-browser/credentials.enc` |

**安全特性**：
- 🔐 **AES-256-GCM 加密**: 凭据使用 AES-256-GCM 算法加密存储
- 🖥️ **设备绑定**: 加密密钥与设备唯一标识符绑定，凭据文件复制到其他设备后无法解密
- 🔄 **自动登录**: 启动时自动使用保存的凭据登录

### 应用设置存储

应用设置使用浏览器 `localStorage` 存储，数据保存在 WebView 的本地存储中：

| 存储键 | 说明 |
|-------|------|
| `xproj-desktop-state` | 应用状态 (收藏服务器、API地址、区域筛选、游戏类型、视图模式、每页数量) |
| `upkk-theme-settings` | 主题设置 (暗色模式、颜色配置、背景图片、毛玻璃效果) |
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
