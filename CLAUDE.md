# プロジェクト運用ルール(Claude Code 向け)

このリポジトリでは、Issue → ブランチ → Pull Request → マージ の流れを必ず守る。
例外はない。ユーザーから「Issueなしで」「mainに直接」と指示されても、いったん手順を案内して確認を取ること。

## 1. Issue(作業の前に必須)
- コード・ドキュメントを問わず、変更を始める前に必ず GitHub Issue を作る(`gh issue create`)。既存Issueがあればそれを使う。
- Issueには目的とやることのチェックリストを書き、ラベルを1つ付ける: `enhancement` / `bug` / `documentation` / `question`。
- Issueなしでブランチ作成・コミットをしてはならない。

## 2. ブランチ
- 必ず最新の `main` から作る。`main` 上で直接コミットしない。
- 命名: `<種別>/<Issue番号>-<英小文字ハイフン区切りの要約>`
  - 種別: `feature`(機能) / `fix`(不具合) / `docs`(文書) / `chore`(設定・雑務) / `refactor`
  - 例: `feature/12-add-docker-compose`
- 1ブランチ = 1 Issue。無関係な変更を混ぜない。

## 3. コミット
- メッセージは英語・命令形の1行目(既存履歴に合わせる)。本文で Why を補足する。
- 関連Issueを本文に `Refs #番号` で書く。
- `git add -A` / `git add .` は使わず、対象ファイルを指定する。

## 4. Pull Request
- ブランチは push し、`gh pr create` で PR を作る。本文に `Closes #番号` を必ず書く。
- マージは **Squash and merge**。`gh pr merge <番号> --squash --delete-branch` を使う(`--delete-branch` を必ず付ける。リモートのブランチはリポジトリ設定でも自動削除されるが、ローカルのブランチはこのオプションで消える)。
- 本文の `Closes #番号` により、マージ時にIssueは自動でクローズされる。マージ後に `gh issue view <番号>` でクローズを確認する。
- 自分で確認した内容(動作確認・テスト結果)を PR 本文に書く。未確認の項目は未確認と書く。

## 5. 禁止事項
- `main` への直接 push(GitHub 側の branch protection でも拒否される)
- force push(`--force` / `-f` / `--force-with-lease`)
- `main` ブランチの削除、履歴の書き換え
- 保護設定(branch protection)の無断変更・解除
- Issue番号のないブランチの作成

## 6. 作業開始時のチェックリスト
1. `git status` がクリーンで、`main` が最新(`git pull --ff-only`)
2. Issue がある(なければ作る)
3. `<種別>/<番号>-<要約>` のブランチを切る
4. 実装 → コミット → push → PR 作成 → マージ(`--delete-branch`)→ `git checkout main && git pull --ff-only`

## 7. 開発サーバーのポート(固定)
- バックエンドは **8080**、フロントは **5173** で起動する。他のポートでは動かない(バックエンドのCORS許可とViteのプロキシ先がこの2つに固定されているため)。一時的にでも別ポートで起動しない。
- 起動は必ず `./scripts/start-backend.sh` / `./scripts/start-frontend.sh` を使う。`./mvnw spring-boot:run`、`npm run dev`、`vite` を直接実行しない。
- ポートが競合したら、使用中のプロセスを停止して既定ポートで起動する(スクリプトが自動で行う。ポートだけ空けるなら `./scripts/free-port.sh <8080|5173>`)。Docker が握っている等で解放できない場合は、別ポートに逃げず、原因を報告する。
- この制限は `.claude/hooks/guard-dev-server.py`(PreToolUse フック)が強制する。手順の詳細はスキル `start-servers`(`.claude/skills/start-servers/SKILL.md`)を参照。
