#!/usr/bin/env bash
# フロントの開発サーバーを固定ポート 5173 で起動する。使用中なら先にそのプロセスを停止する。
# (バックエンドのCORS許可が 5173 固定のため、他のポートでは動かない)
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
"$root/scripts/free-port.sh" 5173

unset PORT
cd "$root/trello-clone/frontend"
exec npx vite --port 5173 --strictPort
