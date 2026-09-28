# taskboard-frontend

タスクボードのフロントエンド。React 19 + TypeScript + Vite + TanStack Query。
設計は `../requirements.html` の11章を参照。

## 必要なもの

- Node.js(LTS)
- 起動済みのバックエンド(`../backend/README.md` を参照。PostgreSQL → Spring Boot の順に起動)

## 起動

```
npm install
npm run dev
```

`http://localhost:5173` で開く。

## バックエンドとの接続

コードからは `/api/...` で呼ぶ。Vite の開発サーバーが `/api` を取り除いて `http://localhost:8080` へ転送する
(例: `/api/cards` → `http://localhost:8080/cards`)。転送先を変えるときは環境変数 `BACKEND_URL` を指定する。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm test` | テスト(Vitest) |
| `npm run lint` | 静的解析(oxlint。Vite の雛形の標準) |
| `npm run format` | Prettier で整形 |
| `npm run build` | 型チェックと本番ビルド |
