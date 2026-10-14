#!/bin/zsh
PROJECT_DIR="${0:A:h}"
APP_PORT="5173"
cd "$PROJECT_DIR" || exit 1
NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node)"
fi
if [[ ! -x "$NODE_BIN" || ! -f "$PROJECT_DIR/node_modules/vite/bin/vite.js" ]]; then
  echo "运行环境或依赖缺失。请安装 Node.js 24，并在项目目录执行 npm ci。"
  read -r
  exit 1
fi
APP_URL="http://localhost:$APP_PORT/"
EXISTING_PAGE="$(/usr/bin/curl --noproxy '*' --silent --fail --max-time 2 "$APP_URL" 2>/dev/null)"
if [[ "$EXISTING_PAGE" == *MotionTrace* ]]; then
  echo "动迹已经在运行：$APP_URL"
  if [[ "${MOTIONTRACE_OPEN_BROWSER:-1}" != "0" ]]; then /usr/bin/open "$APP_URL"; fi
  exit 0
fi
echo "正在启动动迹 MotionTrace……"
"$NODE_BIN" "$PROJECT_DIR/node_modules/vite/bin/vite.js" --host 127.0.0.1 --port "$APP_PORT" --strictPort &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT
trap 'exit 0' HUP INT TERM
for attempt in {1..100}; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "启动失败，请查看上方提示。"
    wait "$SERVER_PID"
    exit 1
  fi
  if /usr/bin/curl --noproxy '*' --silent --fail "$APP_URL" >/dev/null 2>&1; then
    echo "动迹已就绪：$APP_URL"
    if [[ "${MOTIONTRACE_OPEN_BROWSER:-1}" != "0" ]]; then /usr/bin/open "$APP_URL"; fi
    wait "$SERVER_PID"
    exit $?
  fi
  sleep 0.2
done
echo "启动没有完成，请查看上方提示。"
exit 1
