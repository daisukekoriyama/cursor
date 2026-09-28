# タスクボード(Trello風タスク管理アプリ)

Trello風のタスク管理アプリを個人開発するプロジェクト。IT系講座の課題として、**要件定義 → 実装 → Gitでのバージョン管理**という一連の開発の流れを体験することを目的にしている。

ブラウザ(React)の画面から、Spring Boot のAPIを通して PostgreSQL のデータを表示する構成。

```
[ブラウザ: React + TypeScript] —HTTP/JSON→ [Spring Boot(Java 21)] —JDBC→ [PostgreSQL]
       localhost:5173                            localhost:8080              localhost:5432
```

## 現在できること

| 領域 | 状況 |
|---|---|
| バックエンドAPI | ボード・リスト・カード・サブタスクの作成/取得/更新/削除、カード検索(キーワード・ボード・リスト・完了状態)まで**実装済み** |
| フロントエンド(React) | カード検索の結果を**ボード画面(リスト列+カード)として表示**、ボード切替。**カード・リスト・ボードの追加**、カードの編集・削除、小項目の操作、リストの名称変更・削除、カードの別リストへの移動(セレクト)、完了チェック(完了リストへ移動し終了日を記録)が可能で、各列は期限順に表示される(ドラッグ&ドロップ、カレンダーは未移行) |
| 旧プロトタイプ(バニラJS) | `trello-clone/index.html` を開くだけで動く。カードの追加・編集・ドラッグ&ドロップ・カレンダー等が localStorage 保存で動作する |

機能ごとの実装状況は、要件定義書の6章(機能要件)を参照。

## リポジトリ構成

```
.
├── README.md                  このファイル
├── CLAUDE.md                  Claude Code 向けの運用ルール(Issue→ブランチ→PR、固定ポートなど)
├── scripts/                   開発サーバーの起動・ポート解放スクリプト
├── .claude/                   Claude Code の設定(フック・スキル)
├── .github/                   Issue / PR のテンプレート
└── trello-clone/
    ├── requirements.html      要件定義書(ブラウザで開く)
    ├── backend/               バックエンド API(Java + Spring Boot + PostgreSQL)
    ├── frontend/              フロントエンド(React + TypeScript + Vite)
    ├── backend-node/          旧バックエンド(Node.js + SQLite)。比較用の参考実装
    └── index.html, script.js, style.css   旧プロトタイプ(バニラJS + localStorage)
```

## 技術スタックとバージョン

動作確認した環境のバージョン(2026-09-28 時点)。

### 実行環境

| 項目 | バージョン | 備考 |
|---|---|---|
| OS | macOS(Darwin 21.6.0) | |
| Node.js | v24.18.0(npm 11.16.0) | フロントの実行に必要 |
| JDK | OpenJDK 21.0.12.1(LTS) | バックエンドの実行に必要。`pom.xml` の `java.version` は 21 |
| Maven | 3.9.16 | 同梱の Maven Wrapper(`./mvnw`)が取得する。単体のインストールは不要 |
| PostgreSQL | 17.11(Docker イメージ `postgres:17`) | 要件は 16 以降。UUID・DATE・BOOLEAN 型と `ON DELETE CASCADE` を使う |
| Docker | PostgreSQL を動かす場合に必要 | |

### バックエンド(`trello-clone/backend`)

| 項目 | バージョン |
|---|---|
| Spring Boot | 4.1.1(Web MVC / Data JPA / Validation) |
| DBマイグレーション | Flyway(Spring Boot が管理するバージョン)+ PostgreSQL 用モジュール |
| API仕様書(Swagger UI) | springdoc-openapi 3.1.1 |
| DBドライバ | PostgreSQL JDBC(Spring Boot が管理するバージョン) |

### フロントエンド(`trello-clone/frontend`)

`package-lock.json` で固定されている、実際にインストールされるバージョン。

| 項目 | バージョン |
|---|---|
| React / React DOM | 19.3.0 |
| TypeScript | 6.0.3 |
| Vite(+ `@vitejs/plugin-react`) | 8.3.1(6.1.1) |
| TanStack Query | 5.104.0 |
| Vitest | 5.0.2 |
| React Testing Library(`react` / `jest-dom` / `user-event`) | 16.3.3 / 7.0.1 / 14.6.7 |
| jsdom | 30.1.1 |
| oxlint(静的解析) | 1.85.0 |
| Prettier | 3.9.9 |

選定理由は、要件定義書の11章(技術スタック)を参照。

## セットアップ

### 1. PostgreSQL を用意する(初回のみ)

開発用 `taskboard` とテスト用 `taskboard_test` の2つのDBを、同じサーバーに作る。接続情報は開発用の既定値(ユーザー `taskboard` / パスワード `taskboard`)。

```bash
docker run -d --name taskboard-pg \
  -e POSTGRES_USER=taskboard -e POSTGRES_PASSWORD=taskboard -e POSTGRES_DB=taskboard \
  -p 5432:5432 -v taskboard-pgdata:/var/lib/postgresql/data \
  postgres:17

docker exec taskboard-pg psql -U taskboard -d taskboard -c "CREATE DATABASE taskboard_test"
```

コンテナを止めた後は `docker start taskboard-pg` で再開する。Docker を使わず直接インストールする場合の手順は、[backend/README.md](trello-clone/backend/README.md) を参照。テーブルはバックエンドの初回起動時に Flyway が自動で作る。

### 2. フロントの依存関係を入れる(初回のみ)

```bash
cd trello-clone/frontend
npm install
```

## 起動

リポジトリのルートで、**2つのターミナル**を使って起動する。

```bash
./scripts/start-backend.sh     # http://localhost:8080
./scripts/start-frontend.sh    # http://localhost:5173
```

ブラウザで http://localhost:5173 を開く。

- **ポートは 8080(バックエンド)と 5173(フロント)で固定**。他のポートでは動かない(バックエンドの CORS 許可とフロントのプロキシ先がこの2つに固定されているため)。使用中のときは、スクリプトが使っているプロセスを止めてから起動する。
- 直接 `./mvnw spring-boot:run` や `npm run dev` を実行するより、上のスクリプトを使うこと。

### 動作確認用のサンプルデータ

初回起動でテーブルができた後、サンプルのボード・リスト・カードを入れられる(何度実行しても同じ状態になる)。

```bash
docker exec -i taskboard-pg psql -U taskboard -d taskboard < trello-clone/backend/dev-data/seed-test-data.sql
```

画面左上のボード選択で「サンプルボード」に切り替える。検索欄に `api` と入力すると、「進行中」列の「カード検索APIを実装する」だけが残る。

## 画面の使い方(現在のフロント)

- **ボード選択**: 表示するボードを切り替える。
- **検索欄**: 入力から 0.3 秒後に、カード本文の部分一致(大文字小文字を区別しない)で絞り込む。
- **完了状態**: 「すべて / 未完了 / 完了」で絞り込む。検索と組み合わせられる(AND条件)。
- リスト列は常にすべて表示され、絞り込みの結果はその列の中に反映される。該当が無いときは「該当するカードはありません。」と表示する。
- カードには、期限・終了日・サブタスクの進捗(例: 1/2)が表示される。

## API(バックエンド)

主なエンドポイント。詳細は起動後に http://localhost:8080/swagger-ui.html(OpenAPI定義は `/v3/api-docs`)、または要件定義書の10章を参照。

| メソッド | パス | 内容 |
|---|---|---|
| GET / POST | `/boards` | ボード一覧 / 作成 |
| GET | `/boards/{boardId}` | ボード詳細(リストと全カード) |
| POST | `/boards/{boardId}/lists` | リストを作成 |
| PATCH / DELETE | `/lists/{listId}` | リストの更新 / 削除 |
| POST | `/lists/{listId}/cards` | カードを作成 |
| GET | `/cards` | カード検索。クエリ `keyword` `boardId` `listId` `completed`(すべて任意、AND条件) |
| GET / PATCH / DELETE | `/cards/{cardId}` | カードの取得 / 更新 / 削除 |
| POST | `/cards/{cardId}/subtasks` | サブタスクを作成 |
| PATCH / DELETE | `/subtasks/{subtaskId}` | サブタスクの更新 / 削除 |

```bash
curl "localhost:8080/cards?boardId=00000000-0000-4000-8000-000000000001&keyword=api"
```

フロントからは `/api/...` で呼ぶ。Vite の開発サーバーが `/api` を外して `localhost:8080` へ転送する(例: `/api/cards` → `/cards`)。

## テストと品質チェック

```bash
# バックエンド(taskboard_test DB への結合テスト)
cd trello-clone/backend && ./mvnw test

# フロントエンド
cd trello-clone/frontend
npm test          # Vitest(単体・画面テスト)
npm run lint      # oxlint
npm run build     # 型チェック(tsc)+ 本番ビルド
```

## 開発の進め方

このリポジトリでは、**Issue → ブランチ → Pull Request → マージ**の流れを必ず守る(詳細は [CLAUDE.md](CLAUDE.md))。

1. 作業の前に GitHub Issue を作る(ラベルは `enhancement` / `bug` / `documentation` / `question` のいずれか)。
2. 最新の `main` から `<種別>/<Issue番号>-<要約>` のブランチを切る(例: `feature/12-add-docker-compose`)。`main` に直接コミットしない。
3. コミットは英語・命令形の1行目で、本文に `Refs #番号` を書く。
4. push して PR を作り、本文に `Closes #番号` と確認した内容を書く。
5. **Squash and merge** でマージし、ブランチを削除する(`gh pr merge <番号> --squash --delete-branch`)。

Claude Code で開発する場合は、`.claude/` のフックとスキルが次を支える。

- `.claude/hooks/guard-dev-server.py`: 開発サーバーを固定ポート・起動スクリプト経由でしか起動できないようにする。
- `.claude/skills/start-servers`: サーバーの起動・再起動の手順。

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [要件定義書](trello-clone/requirements.html) | 目的・スコープ・機能要件・非機能要件・画面・データモデル・API・技術スタック・リスク・ロードマップ・改訂履歴(ブラウザで開く) |
| [backend/README.md](trello-clone/backend/README.md) | バックエンドの起動・DB準備・設定(環境変数) |
| [frontend/README.md](trello-clone/frontend/README.md) | フロントの起動・コマンド・バックエンドとの接続 |
| [backend-node/README.md](trello-clone/backend-node/README.md) | 旧バックエンド(参考実装) |
| [CLAUDE.md](CLAUDE.md) | Issue / ブランチ / コミット / PR / 固定ポートのルール |

## 今後の予定

要件定義書の14章(今後の拡張候補)のとおり。主な残りは次の3つ。

1. フロントで、カードのドラッグ&ドロップ移動ができるようにする(React への移行を完了し、REQ-14 を完了させる)。
2. カードの並び替え(ドラッグ&ドロップ)。
3. 認証(ユーザー登録・ログイン)。現状はAPIも認証なしのため、**インターネットには公開せず、手元の環境でのみ使う**。
