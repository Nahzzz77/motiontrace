# 动迹 MotionTrace

**看见动作，记录进步。** 在浏览器里打开摄像头，就能体验动作计数、中文语音反馈、训练计划和个人训练记录。

动迹是一个面向单人训练的健身教练原型：在本机运行姿态模型，再用动作规则分析关节点变化，让每组训练有反馈、每次进步有记录。

[体验入口](https://motiontrace-pi.vercel.app/) · [问题反馈](https://github.com/Nahzzz77/motiontrace/issues) · [MIT 许可证](LICENSE) · [第三方素材说明](THIRD_PARTY_NOTICES.md)

> **当前状态：原型开发中。** 动作库有 100 个条目，其中 27 个在代码中启用实时识别。不同体型、机位和设备下的真人识别效果仍需持续验证；目前只分析单人、已实现规则的动作。

## 能做什么

| 模块 | 当前功能 |
| --- | --- |
| 动作库 | 动作示范、目标肌群、拍摄视角、呼吸提示与注意事项；未启用识别的动作提供教学内容 |
| 实时训练 | 深蹲、开合跳、俯卧撑等动作计数；部分支撑动作累计有效保持时间 |
| 训练反馈 | 动作阶段、完成与合格次数、屏幕提示、规则触发的中文短语音 |
| 训练计划 | 预设课程、条件推荐、自定义计划、组数和组间休息 |
| 训练回顾 | 次数、节奏、问题统计、下一组建议和历史记录 |
| 个人资料 | 身体资料、计划收藏、本机对话记录、加密备份导入与导出 |
| 可选 AI 教练 | DeepSeek 文字问答；未配置或请求失败时回退到本机回答 |

计划推荐和训练总结当前主要由本地规则生成。热量根据动作 MET、体重与有效运动时间估算；未填写体重时不显示默认热量。项目有 PWA 基础支持，尚不能保证完整离线使用。

## 快速开始

准备 **Node.js 24**、npm 和 Git。使用支持摄像头、Web Worker、OffscreenCanvas 与 WebAssembly SIMD 的现代浏览器，建议 Chrome 或 Edge。

```bash
git clone https://github.com/Nahzzz77/motiontrace.git
cd motiontrace
npm ci
npm run dev
```

打开终端显示的地址，通常是 `http://localhost:5173`。默认开发邀请码为 **`FORM-DEMO-2026`**，没有 AI 密钥也能体验本机训练功能。

安装依赖后，macOS 也可双击 `启动健身教练.command`，Windows 可双击 `启动动迹.cmd`。

第一次使用：选择可实时识别的动作 → 按推荐视角固定设备并确保全身入镜 → 开启摄像头 → 等待模型与校准完成 → 开始训练 → 查看记录。邀请制下请保存个人恢复码；迁移训练数据需要另行导出备份。

摄像头需要 HTTPS 或 `localhost` 等安全环境。首次模型加载需要访问 `storage.googleapis.com` 和 `cdn.jsdelivr.net`；加载失败时请检查网络、浏览器支持与站点权限。

## 构建与部署

```bash
npm run build
npm start
```

构建会先检查 TypeScript，再生成 `dist/`；Node.js 服务默认使用 `8000` 端口，提供网页、`/api/*` 与 `/health`。`npm start` 不会自动读取 `.env.local`，部署时需向服务进程注入环境变量。

### 公开体验模式

将服务端环境变量设为 **`FORM_PUBLIC_ACCESS=true`**，即可免邀请码体验本机训练。每个浏览器保留自己的访客标识和训练数据；此模式关闭云端 AI 与账户接口，即使配置了 DeepSeek 密钥也不会调用。

仓库包含 [Vercel 配置](vercel.json) 和 [`api/index.js`](api/index.js)，可导入仓库并设置上述环境变量后部署。公开 GitHub 仓库与网站访问模式分别配置；部署网站时请提供 HTTPS。

### 邀请制部署

关闭公开体验模式，并设置以下生产环境变量：

| 变量 | 用途 |
| --- | --- |
| `NODE_ENV=production` | 启用生产鉴权与配置检查 |
| `SESSION_SECRET` | 独立随机密钥，至少 32 字符，用于签名登录凭证与恢复码 |
| `INVITE_HASH_PEPPER` | 另一个独立随机秘密值，至少 24 字符 |
| `FORM_INVITE_HASHES` | 邀请码哈希，多个以逗号分隔 |
| `PORT` | 可选服务端口，默认 `8000` |

邀请码哈希为 `SHA-256(INVITE_HASH_PEPPER + ":" + 邀请码.trim())` 的十六进制值。生产环境不接受默认开发邀请码，缺少鉴权配置时 API 会拒绝服务。更换签名密钥会影响已有凭证和恢复码。

### 可选：连接 DeepSeek

开发时可在项目根目录创建 `.env.local`，仅填入实际需要的 AI 配置；生产环境将这些变量配置到部署平台或服务进程：

```dotenv
DEEPSEEK_API_KEY=你的服务端API密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=你的账号可用的文本模型ID
```

修改后重启服务。密钥仅供后端读取，不要写入 `src/`、`public/` 或 `VITE_` 前缀变量。模型收到文字问题、近期对话和相关资料摘要，不接收摄像头视频。公开体验模式须关闭后才能使用远程 AI。

## 数据如何保存

- **摄像头与姿态**：训练链路在浏览器内处理，当前实现不上传或保存视频和人体关键点。
- **训练、身体资料与对话**：保存在当前浏览器的 IndexedDB，使用 AES-GCM 加密；密钥也保存在本机，没有自动云同步。
- **跨设备迁移**：使用应用内的加密备份导出与导入。恢复码只恢复身份，不能从云端找回训练记录。
- **AI 与语音**：启用远程 AI 时会发送必要文字摘要；语音输入使用浏览器语音识别，处理方式取决于浏览器。
- **错误诊断**：项目含客户端错误上报接口，具体行为可查看 [`src/error-reporting.ts`](src/error-reporting.ts)。

清除站点数据、更换浏览器或网站地址前，请先导出备份。

## 开发与验证

前端采用 **TypeScript + Vite**，姿态模型使用 **MediaPipe Pose Landmarker Lite**，通过 Web Worker / WebAssembly 推理。计数、纠错、计划与总结由项目规则实现，Node.js 负责静态服务、鉴权及可选 AI 转发。

| 目录或文件 | 内容 |
| --- | --- |
| `src/main.ts`、`src/bootstrap.ts` | 页面、训练流程、访问验证与账户初始化 |
| `src/pose-worker.ts`、`src/analysis/` | 姿态推理、几何计算与动作状态机 |
| `src/exercises.ts`、`src/plan-runner.ts` | 动作库与课程执行 |
| `src/ai/`、`src/data/` | AI 问答、本机加密存储与备份 |
| `server/`、`api/` | Node.js 服务与 Vercel 适配 |
| `public/`、`docs/` | 运行素材与本地启动说明 |

```bash
npm test
npm run build
# 后端与部署适配检查
npx vitest run --config vite.config.js server/form-api.test.mjs server/vercel-api.test.mjs
node --test server/public-access.test.mjs server/static-server.test.mjs
```

`npm test` 默认覆盖 `src/**/*.test.ts`。测试数量以实际输出为准；单元测试不能替代真人训练验证。`tests/browser_smoke.py` 仍含旧版断言，需要更新并准备额外环境后再使用。

欢迎提交 Issue 或 Pull Request。反馈识别问题时，请写明动作、设备、浏览器、拍摄视角、页面提示及预期/实际计数。后续重点包括识别稳定性、真人验证流程、动作规则扩展与更准确的反馈。

公开仓库提供可运行源码与必要素材。生成素材的原始 GIF、大尺寸关键帧图、原始课程、分类和首页封面及竞品研究截图保留在本地开发档案中；本次发布采用独立源码快照，避免历史记录继续携带这些大文件。

## MIT、来源与项目指纹

项目代码采用 [MIT License](LICENSE)，署名 **Copyright (c) 2026 Zhang Han (Nahzzz77)**。使用、修改与再分发时，请保留版权和许可声明。

项目延续自 [fengxinbo558/jiaolian](https://github.com/fengxinbo558/jiaolian)，来源基线为 [`6963e33`](https://github.com/fengxinbo558/jiaolian/commit/6963e33f9a989b6ce838ae0e98f9e6993ede3a29)。维护者、来源及许可范围记载于 [PROVENANCE.json](PROVENANCE.json)；内部 `FORM` 标识为兼容已有流程保留。

第三方依赖、模型、图片、GIF 和研究截图沿用各自许可，不随项目代码自动转为 MIT。来源和使用范围见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

[FINGERPRINT.sha256](FINGERPRINT.sha256) 记录发布文件的 SHA-256 指纹，可在仓库根目录核对：

```bash
node scripts/fingerprint.mjs --check
# 或：shasum -a 256 -c FINGERPRINT.sha256
```

维护者修改文件后，先用 `git add` 暂存新增或变更文件，再运行 `node scripts/fingerprint.mjs --write`，最后暂存更新后的 `FINGERPRINT.sha256`。指纹用于文件完整性核对，不是数字签名、独立所有权证明或防复制措施。
