#!/usr/bin/env python3
"""PreToolUse フック(Bash): 開発サーバーは固定ポート(8080 / 5173)で、scripts/ 経由でのみ起動させる。

- スクリプトを介さないサーバー起動(spring-boot:run / npm run dev / vite)を拒否する
- 8080 / 5173 以外のポート指定(--port, server.port, SERVER_PORT, PORT)を拒否する
拒否するときは、終了コード2と理由(stderr)を返す。
"""
import json
import re
import sys

ALLOWED_PORTS = {"5173", "8080"}

DIRECT_START = [
    (re.compile(r"spring-boot:run"), "scripts/start-backend.sh"),
    (re.compile(r"^(npm|pnpm|yarn)\s+(run\s+)?(dev|start)\b"), "scripts/start-frontend.sh"),
    (re.compile(r"^(npx\s+)?vite(\s+(dev|serve))?(\s+-|\s+(dev|serve)\b|$)"), "scripts/start-frontend.sh"),
]

PORT_OPTIONS = re.compile(
    r"(?:--port|--server\.port|server\.port|\bSERVER_PORT|\bPORT)(?:=|\s+)(\d+)"
)


def command_segments(command: str) -> list[str]:
    """ヒアドキュメントの本文と引用符の中身を除き、コマンドごとに分割する。"""
    command = command.split("<<", 1)[0]
    command = re.sub(r"'[^']*'|\"[^\"]*\"", "''", command)
    segments = []
    for raw in re.split(r"&&|\|\||[;|\n(]", command):
        segment = raw.strip()
        # 先頭の環境変数代入と nohup / exec を読み飛ばす
        segment = re.sub(r"^((\w+=\S*|nohup|exec)\s+)+", "", segment)
        if segment:
            segments.append(segment)
    return segments


def check(command: str) -> str | None:
    for segment in command_segments(command):
        for pattern, script in DIRECT_START:
            if pattern.search(segment) and "scripts/start-" not in segment:
                return f"開発サーバーは {script} で起動してください(ポート競合時に既定ポートを解放して起動します)。"
    # ポート指定は、引用符除去前の全文で調べる(環境変数の指定も含めるため)
    for match in PORT_OPTIONS.finditer(command.split("<<", 1)[0]):
        if match.group(1) not in ALLOWED_PORTS:
            return (
                f"ポート {match.group(1)} は使えません。バックエンドは 8080、フロントは 5173 の固定です"
                "(他のポートではCORS・プロキシの設定が合わず動きません)。"
                "競合している場合は scripts/free-port.sh でそのポートを解放してください。"
            )
    return None


def main() -> int:
    data = json.load(sys.stdin)
    command = data.get("tool_input", {}).get("command", "")
    reason = check(command)
    if reason:
        print(reason, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
