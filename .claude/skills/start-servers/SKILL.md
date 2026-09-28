---
name: start-servers
description: バックエンド(8080)・フロント(5173)の開発サーバーを起動・再起動するときに使う。ポート競合時は使用中のプロセスを止めて、必ず既定ポートで起動する。
---

# 開発サーバーの起動(固定ポート)

| サーバー | ポート | 起動コマンド |
|---|---|---|
| バックエンド(Spring Boot) | 8080 | `./scripts/start-backend.sh` |
| フロント(Vite) | 5173 | `./scripts/start-frontend.sh` |

## 絶対のルール
- **必ず上のスクリプトで起動する。** `./mvnw spring-boot:run` や `npm run dev`、`vite` を直接実行しない。
- **8080 / 5173 以外のポートで起動しない。** 別ポートでは動かない
  (バックエンドのCORS許可が `http://localhost:5173` 固定で、Viteのプロキシ先も `localhost:8080` 固定のため)。
- ポートが使用中なら、逃げずに**使用中のプロセスを停止して**既定ポートで起動する。スクリプトが自動で行う。
  ポートだけ空けたいときは `./scripts/free-port.sh 8080` / `./scripts/free-port.sh 5173`。
- 解放できないとき(Docker がポートを握っている場合など)は、別ポートに逃げず、原因をユーザーに報告する。

## 手順
1. `taskboard-pg`(PostgreSQL)が起動していることを確認する(`docker ps`)。
2. バックエンドを `run_in_background` で `./scripts/start-backend.sh` から起動し、`curl localhost:8080/boards` が 200 になるまで待つ。
   起動には数十秒かかる。競合していた別プロセスが応答しているだけの場合があるので、待つときは 200 を条件にする。
3. フロントを `run_in_background` で `./scripts/start-frontend.sh` から起動する。
4. `curl localhost:5173/api/boards` が 200 なら、プロキシ経由でつながっている。
5. 終了時は `pkill -f vite; pkill -f spring-boot` で止める。

## Claude Code側の強制
`.claude/hooks/guard-dev-server.py`(PreToolUse フック)が、スクリプトを介さない起動と、8080 / 5173 以外のポート指定を拒否する。
