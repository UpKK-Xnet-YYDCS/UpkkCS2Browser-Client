# Desktop Frontend Conventions

本文件适用于 `desktop/`，覆盖 React/Vite 前端和 Tauri 集成边界。用户在当前任务中的明确要求优先。

## 技术栈与边界

- 前端使用 React、TypeScript strict mode、Vite、Tailwind CSS 和 Tauri 2。版本与命令以 `package.json`、`tsconfig*.json`、`vite.config.ts` 和 `src-tauri/Cargo.toml` 为准。
- `src/pages/` 负责页面组合，`src/components/` 负责 UI 与局部交互，`src/hooks/` 负责可复用状态编排，`src/services/` 负责 Tauri/网络/存储等外部能力，`src/store/` 负责全局状态，`src/types/` 负责共享契约。
- 页面和展示组件不得直接散落 Tauri `invoke`、插件调用、网络协议或持久化细节；这些能力通过 service/hook 边界接入，并为浏览器开发模式定义明确的不可用或降级行为。
- API 响应、服务器状态和本地存储数据必须先标准化为共享类型，再进入 UI；避免页面各自维护同一字段的兼容逻辑。

## 拆分与可维护性

- 新增生产 `.ts` / `.tsx` 文件目标不超过 400 行；修改超过约 800 行的文件时，优先抽出本次涉及的服务、hook、区块组件或纯转换逻辑。
- 页面只组合数据和功能区块。大型表格、图表、弹窗、设置分组和队列逻辑应各自成为可测试组件或 hook。
- 纯计算、标准化、过滤、重试和调度逻辑不得依赖 React，使用 Node 内置测试运行器增加 `*.test.ts` 防回归用例。
- 保留稳定的 barrel/public export；内部拆分不应迫使无关调用方了解目录实现。
- Tauri 命令参数、返回值和错误必须强类型且可诊断；不要静默吞掉插件或 IPC 错误。

## UI 与运行时

- 复用现有组件、主题和 store 模式；交互控件覆盖 loading、empty、error、disabled、focus 和键盘操作状态。
- 浏览器开发模式与 Tauri WebView 的能力差异必须显式检测。不得假设 `window.__TAURI_INTERNALS__`、通知、shell、HTTP 或安全存储插件始终存在。
- 高频刷新、探测和批处理必须有并发上限、超时、取消或过期结果淘汰；避免组件卸载后写状态和无界队列。
- 敏感凭据只通过现有安全存储服务处理，不写入日志、普通 `localStorage` 或测试 fixture。

## 强制基线

所有 `desktop/src/`、前端配置或依赖变更必须从仓库根目录运行：

```bash
bash scripts/frontend-check.sh desktop
```

CI 入口为 `.github/workflows/frontends-check.yml`。统一检查顺序固定为：

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`
6. `npm audit --omit=dev --audit-level=high`

单项脚本只用于快速开发和故障定位，不能替代交付前统一基线。修改 `src-tauri/` Rust 代码时还必须运行 `cargo fmt --check`、`cargo check`、`cargo test` 和 `cargo clippy -- -D warnings`；平台安装包仍由现有 Tauri build workflow 验证。

## 交付要求

- 新增依赖使用 npm 更新 `package.json` 与 `package-lock.json`，不手工编辑锁文件。
- 行为或配置变化同步更新测试、类型、README、版本/更新说明中受影响部分。
- 不提交 `dist/`、`src-tauri/target/`、真实凭据、日志或本地临时文件。
