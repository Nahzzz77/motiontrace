# Windows 本机开发与体验

克隆仓库后，进入本机的 `motiontrace` 项目目录。以下操作都在该目录内进行。

## 启动

1. 双击项目目录里的 `启动动迹.cmd`，浏览器会自动打开。
2. 本机地址为 `http://127.0.0.1:5173/`。使用期间保留服务窗口。
3. 停止时，在服务窗口按 `Ctrl+C`；如果询问是否终止批处理，输入 `Y`。
4. 本地邀请码会显示在登录页。也可在开发验证时使用 `http://127.0.0.1:5173/?preview=1`，这是项目已有的开发预览入口，仅在开发模式生效。

首次换到其他目录或电脑，需要先安装 Node.js，再在项目目录运行 `npm ci`。
已安装依赖且锁定文件未变化时，无须重复安装。

`5173` 被占用时启动会报错。先关闭之前的服务窗口再启动，不会自动改用另一个端口，以免浏览器里的本机数据空间发生变化。

## 数据与识别

身体资料、训练记录和对话保存在当前浏览器的加密 IndexedDB 中。复制源码不能迁移 Mac 浏览器里的记录；如需旧记录，先在旧电脑页面导出加密备份，再在新页面导入。

摄像头姿态在本机处理；首次加载识别模型需要能访问 jsDelivr 和 Google 模型下载地址。真实动作计数还需要在浏览器允许摄像头并进行实际训练验证。

AI 文字问答是否使用远程服务取决于本机配置。远程调用可能产生 API 费用；未配置服务端密钥时使用本机回答。

## 验证与 Windows 兼容修复

恢复时，已有 300 项前端测试、8 项后端测试及 TypeScript/Vite 构建通过。
构建版服务器原来把路径分隔符写死为 `/`，Windows 会将 JS、CSS、模型和视频错误地返回为主页。现已使用 `node:path` 的 `sep`，新增 6 项 HTTP 集成测试覆盖资源内容、类型、视频分段请求及页面路由。

复查命令：

```powershell
npm.cmd test
npm.cmd run build
node --test server/static-server.test.mjs server/public-access.test.mjs
npm.cmd exec -- vitest run --config vite.config.js server/form-api.test.mjs server/vercel-api.test.mjs
```

相关工具说明：[Node.js 平台路径分隔符](https://nodejs.org/api/path.html#pathsep)、[Vite 启动参数](https://vite.dev/guide/cli.html)。
