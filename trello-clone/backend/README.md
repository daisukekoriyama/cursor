# trello-clone backend

requirements.html の10章(バックエンド・API設計)を実装したAPIサーバー。
Node.js(Express)+ SQLite(better-sqlite3)構成。

## セットアップ

```
cd backend
npm install
npm start
```

`http://localhost:3000` で起動する。初回起動時、DBファイル(`data.sqlite3`)が自動生成され、
デフォルトボード(未着手・進行中・完了の3リスト)が作られる。

## エンドポイント

requirements.html の10章「APIエンドポイント(案)」を参照。
