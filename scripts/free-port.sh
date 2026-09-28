#!/usr/bin/env bash
# 指定ポートをLISTENしているプロセスを停止して、ポートを空ける。
# 対象は開発サーバーの固定ポート(バックエンド 8080 / フロント 5173)のみ。
set -euo pipefail

port="${1:-}"
case "$port" in
  5173 | 8080) ;;
  *)
    echo "usage: $0 <5173|8080>  (固定ポート以外は対象外)" >&2
    exit 2
    ;;
esac

pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u || true)"
if [ -z "$pids" ]; then
  echo "port $port is free"
  exit 0
fi

for pid in $pids; do
  name="$(ps -p "$pid" -o comm= 2>/dev/null || true)"
  case "$name" in
    *[Dd]ocker* | *vpnkit*)
      echo "port $port is held by Docker ($name, pid $pid). Stop that container or change its port mapping; not killing Docker." >&2
      exit 1
      ;;
  esac
  echo "stopping pid $pid ($name) that is listening on port $port"
  kill -TERM "$pid" 2>/dev/null || true
done

for _ in $(seq 1 10); do
  if [ -z "$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)" ]; then
    echo "port $port is free"
    exit 0
  fi
  sleep 0.5
done

for pid in $(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u || true); do
  echo "pid $pid did not exit; sending SIGKILL"
  kill -KILL "$pid" 2>/dev/null || true
done
sleep 1

if [ -n "$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)" ]; then
  echo "failed to free port $port" >&2
  exit 1
fi
echo "port $port is free"
