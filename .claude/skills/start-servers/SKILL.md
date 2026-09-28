---
name: start-servers
description: このプロジェクトのバックエンド(Spring Boot・8080)とフロント(Vite・5173)の開発サーバーを起動・再起動・停止するときの手順とルール。ポートが使用中のときは、使用中のプロセスを止めて必ず既定ポートで起動する。ユーザーが「サーバーを起動して」「画面を確認したい」「動作確認して」「ポートが使われている」「Port 8080 was already in use」「EADDRINUSE」と言ったとき、または実機確認・スクリーンショット・API疎通確認のためにアプリを動かす必要があるときは、直接 mvnw や npm run dev を実行せず、必ずこのスキルを使うこと。
---

# 開発サーバーの起動(固定ポート)

## 起動コマンド

| サーバー | ポート | 起動コマンド |
|---|---|---|
| バックエンド(Spring Boot) | 8080 | `./scripts/start-backend.sh` |
| フロント(Vite) | 5173 | `./scripts/start-frontend.sh` |

どちらもリポジトリのルートから実行する。サーバーは動き続けるので、`run_in_background` で起動する。

## ルール

1. **必ず上のスクリプトで起動する。** `./mvnw spring-boot:run`、`npm run dev`、`vite` を直接実行しない。
   スクリプトは、起動前にポートを空ける処理と、環境変数(`SERVER_PORT` / `PORT`)によるポート上書きの無効化を含むため。
2. **8080 / 5173 以外のポートでは、一時的にでも起動しない。**
   バックエンドのCORS許可が `http://localhost:5173` 固定で、Viteのプロキシ先も `localhost:8080` 固定のため、別ポートで起動しても画面からAPIにつながらず、動かない。
3. **ポートが使用中なら、別ポートへ逃げずに、使用中のプロセスを停止して既定ポートで起動する。**
   スクリプトが自動で行う。ポートだけ空けたいときは `./scripts/free-port.sh 8080` / `./scripts/free-port.sh 5173`(この2つ以外は拒否される)。
4. **ポートを解放できないときは、別ポートに逃げず、原因をユーザーに報告する。**
   典型例は、Docker がそのポートを握っている場合。`free-port.sh` は Docker を止めずに報告して終了する。

これらは Claude Code 側でも強制される。`.claude/hooks/guard-dev-server.py`(PreToolUse フック)が、スクリプトを介さない起動と、8080 / 5173 以外のポート指定を拒否する。拒否されたら、回避せずにこのスキルの手順に従う。

## 手順

1. PostgreSQL(コンテナ `taskboard-pg`)が起動していることを `docker ps` で確認する。止まっていれば、バックエンドは起動に失敗するので、先にユーザーへ伝える。
2. `./scripts/start-backend.sh` を `run_in_background` で起動する。起動には数十秒かかる。
3. 起動完了は `curl -s -o /dev/null -w "%{http_code}" localhost:8080/boards` が **200** になることで判断する。
   停止しきれていない別プロセスが 404 などで応答している場合があるので、「応答した」ではなく「200」を待つ条件にする。
4. `./scripts/start-frontend.sh` を `run_in_background` で起動する。
5. `curl -s -o /dev/null -w "%{http_code}" localhost:5173/api/boards` が 200 なら、フロントからプロキシ経由でバックエンドにつながっている。
6. 動作確認用のデータが必要なら、`trello-clone/backend/README.md` の「開発用テストデータ」を参照してシードを投入する。
7. 確認が終わったら停止する: `pkill -f vite; pkill -f spring-boot; pkill -f TaskboardBackendApplication`。停止後、`lsof -nP -iTCP:8080 -iTCP:5173 -sTCP:LISTEN` が空であることを確認する。
