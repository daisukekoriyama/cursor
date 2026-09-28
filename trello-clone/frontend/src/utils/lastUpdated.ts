const pad = (n: number) => String(n).padStart(2, '0')

// ISO 8601 の日時を、端末のローカル時刻の "2026/09/28 15:30" にする。null は「まだ更新されていない」
export function formatLastUpdated(updatedAt: string | null): string {
  if (updatedAt === null) return '最終更新: まだ更新されていません'
  const date = new Date(updatedAt)
  const day = `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
  return `最終更新: ${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
