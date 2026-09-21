# taskboard-backend

タスクボードのバックエンドAPI。Java 21 + Spring Boot 4 + PostgreSQL 16。
設計は `../requirements.html` の10章(API・DB)と11章(技術スタック)を参照。

## 必要なもの

- JDK 21(Maven単体は不要。同梱の `./mvnw` を使う)
- PostgreSQL 16(ローカルで稼働していること)

## データベースの準備(初回のみ)

開発用とテスト用の2つのDBを、同じPostgreSQLサーバー上に作る。

```sql
CREATE ROLE taskboard LOGIN PASSWORD 'taskboard';
CREATE DATABASE taskboard      OWNER taskboard ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';
CREATE DATABASE taskboard_test OWNER taskboard ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';
```

テーブルは、アプリの起動時にFlyway(`src/main/resources/db/migration`)が自動で作成する。
初回は、デフォルトのボード(「マイボード」と3つのリスト)も作られる。

## 起動

```
./mvnw spring-boot:run
```

`http://localhost:8080` で起動する。

| 用途 | URL |
|---|---|
| API仕様書(Swagger UI) | http://localhost:8080/swagger-ui.html |
| OpenAPI定義(JSON) | http://localhost:8080/v3/api-docs |

## テスト

`taskboard_test` DBに対する結合テストを実行する。

```
./mvnw test
```

## 設定(環境変数)

| 環境変数 | 既定値 |
|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/taskboard` |
| `DB_USERNAME` / `DB_PASSWORD` | `taskboard` / `taskboard`(ローカル開発用) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173`(Viteの開発サーバー) |
| `TEST_DB_URL` | `jdbc:postgresql://localhost:5432/taskboard_test` |

既定の接続情報はローカルのPostgreSQL専用で、インターネットには公開しない前提(認証は未実装)。

## API

エンドポイントの一覧は、要件定義書の10章、またはSwagger UIを参照。
期限・終了日が無いカードは `due` / `completedAt` が `null` になる。
PATCHでは、項目を省略すると変更せず、`due` / `completedAt` に空文字を指定すると値を消す。
