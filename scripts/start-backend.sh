#!/usr/bin/env bash
# バックエンドを固定ポート 8080 で起動する。使用中なら先にそのプロセスを停止する。
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
"$root/scripts/free-port.sh" 8080

# 環境変数 SERVER_PORT / PORT で上書きされないよう外し、ポートも明示する
unset SERVER_PORT PORT
cd "$root/trello-clone/backend"
exec ./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=8080
