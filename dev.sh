#!/usr/bin/env bash
#
# dev.sh — start/stop the Hops & Glory dev stack (backend :9000 + storefront :8000)
#
#   ./dev.sh start      # docker infra + backend + storefront (background)
#   ./dev.sh stop       # stop backend + storefront (leaves docker running)
#   ./dev.sh stop --all # also stop the docker infra (postgres/redis/meili/minio)
#   ./dev.sh restart    # stop then start app servers
#   ./dev.sh status     # show what's running
#   ./dev.sh logs [backend|storefront]   # tail logs (default: backend)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/.dev"
mkdir -p "$LOG_DIR"

BACKEND_PORT=9000
STOREFRONT_PORT=8000

# --- make sure the right node + pnpm are on PATH ----------------------------
export PATH="/opt/homebrew/bin:$PATH"
if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env 2>/dev/null)" || true
  (cd "$ROOT" && fnm use >/dev/null 2>&1) || true
fi

port_pids() { lsof -nP -ti "tcp:$1" -sTCP:LISTEN 2>/dev/null || true; }
is_up()     { [ -n "$(port_pids "$1")" ]; }

wait_for_port() { # port, label, max_seconds
  local port=$1 label=$2 max=${3:-60} i=0
  printf "  waiting for %s on :%s" "$label" "$port"
  while [ "$i" -lt "$max" ]; do
    if is_up "$port"; then echo " ✓"; return 0; fi
    printf "."; sleep 1; i=$((i + 1))
  done
  echo " (timeout — check $LOG_DIR/$label.log)"; return 1
}

start_app() { # name, port, pnpm-filter
  local name=$1 port=$2 filter=$3
  if is_up "$port"; then
    echo "• $name already running on :$port — skipping"
    return 0
  fi
  echo "• starting $name…"
  ( cd "$ROOT" && nohup pnpm --filter "$filter" dev >"$LOG_DIR/$name.log" 2>&1 & echo $! >"$LOG_DIR/$name.pid" )
}

stop_port() { # port, label
  local port=$1 label=$2 pids
  pids="$(port_pids "$port")"
  if [ -n "$pids" ]; then
    echo "• stopping $label (:$port)…"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 2
    pids="$(port_pids "$port")"
    # shellcheck disable=SC2086
    [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
  else
    echo "• $label not running"
  fi
  rm -f "$LOG_DIR/$label.pid"
}

cmd_start() {
  echo "Bringing up docker infra…"
  ( cd "$ROOT" && docker compose up -d ) >/dev/null
  start_app backend "$BACKEND_PORT" backend
  start_app storefront "$STOREFRONT_PORT" storefront
  echo
  wait_for_port "$BACKEND_PORT" backend 90 || true
  wait_for_port "$STOREFRONT_PORT" storefront 90 || true
  echo
  echo "Ready:"
  echo "  Admin      → http://localhost:$BACKEND_PORT/app"
  echo "  Storefront → http://localhost:$STOREFRONT_PORT"
  echo "  Logs       → ./dev.sh logs backend   |   ./dev.sh logs storefront"
}

cmd_stop() {
  stop_port "$BACKEND_PORT" backend
  stop_port "$STOREFRONT_PORT" storefront
  # belt & suspenders: kill stragglers by command pattern
  pkill -f "medusa develop" 2>/dev/null || true
  pkill -f "next dev --turbopack -p $STOREFRONT_PORT" 2>/dev/null || true
  if [ "${1:-}" = "--all" ]; then
    echo "• stopping docker infra…"
    ( cd "$ROOT" && docker compose down ) >/dev/null
  fi
  echo "Stopped."
}

cmd_status() {
  echo "App servers:"
  is_up "$BACKEND_PORT"    && echo "  backend    :$BACKEND_PORT    UP" || echo "  backend    :$BACKEND_PORT    down"
  is_up "$STOREFRONT_PORT" && echo "  storefront :$STOREFRONT_PORT    UP" || echo "  storefront :$STOREFRONT_PORT    down"
  echo
  echo "Docker infra:"
  ( cd "$ROOT" && docker compose ps --format "  {{.Service}}\t{{.Status}}" 2>/dev/null ) || echo "  (docker not available)"
}

cmd_logs() {
  local which=${1:-backend}
  local f="$LOG_DIR/$which.log"
  [ -f "$f" ] || { echo "No log at $f — is $which running?"; exit 1; }
  echo "Tailing $f (Ctrl-C to stop)…"
  tail -f "$f"
}

case "${1:-start}" in
  start)   cmd_start ;;
  stop)    cmd_stop "${2:-}" ;;
  restart) cmd_stop; echo; cmd_start ;;
  status)  cmd_status ;;
  logs)    cmd_logs "${2:-backend}" ;;
  *) echo "usage: ./dev.sh {start|stop [--all]|restart|status|logs [backend|storefront]}"; exit 1 ;;
esac
