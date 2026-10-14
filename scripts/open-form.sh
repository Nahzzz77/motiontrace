#!/bin/zsh

set -u

PROJECT_DIR="${0:A:h:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
NPM_BIN="$(command -v npm || true)"
FORM_URL="http://localhost:5173/"
LOG_DIR="$PROJECT_DIR/.runtime"
LOG_FILE="$LOG_DIR/form-launcher.log"
PID_FILE="$LOG_DIR/form-vite.pid"

show_error() {
  local message="$1"
  /usr/bin/osascript - "$message" <<'APPLESCRIPT'
on run argv
  display alert "动迹 MotionTrace 无法启动" message (item 1 of argv) as critical buttons {"知道了"} default button "知道了"
end run
APPLESCRIPT
}

is_form_running() {
  local page
  page="$(/usr/bin/curl --silent --show-error --fail --max-time 1 "$FORM_URL" 2>/dev/null)" || return 1
  [[ "$page" == *"<title>动迹 MotionTrace / 动作教练</title>"* ]]
}

if [[ ! -d "$PROJECT_DIR" ]]; then
  show_error "找不到项目目录。项目可能被移动了。"
  exit 0
fi

if [[ ! -x "$NPM_BIN" ]]; then
  show_error "找不到 npm。请先安装 Node.js，并在项目目录执行 npm ci。"
  exit 0
fi

if is_form_running; then
  /usr/bin/open "$FORM_URL"
  exit 0
fi

if /usr/sbin/lsof -nP -iTCP:5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
  show_error "5173 端口正在被其他程序使用。请先关闭占用该端口的程序。"
  exit 0
fi

/bin/mkdir -p "$LOG_DIR"
{
  echo ""
  echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] 从程序坞启动动迹 MotionTrace"
} >> "$LOG_FILE"

cd "$PROJECT_DIR" || {
  show_error "无法进入项目目录。"
  exit 0
}

/usr/bin/nohup /usr/bin/env PATH="$PATH" \
  "$NPM_BIN" run dev -- --host 127.0.0.1 --port 5173 --strictPort \
  >> "$LOG_FILE" 2>&1 < /dev/null &
server_pid=$!
echo "$server_pid" > "$PID_FILE"

for _ in {1..80}; do
  if is_form_running; then
    /usr/bin/open "$FORM_URL"
    exit 0
  fi
  if ! /bin/kill -0 "$server_pid" 2>/dev/null; then
    break
  fi
  /bin/sleep 0.25
done

show_error "页面没有成功启动。日志位置：$LOG_FILE"
exit 0
