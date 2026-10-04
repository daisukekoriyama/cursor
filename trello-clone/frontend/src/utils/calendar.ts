import type { CardResponse, ListResponse } from '../api/types'

const pad = (n: number) => String(n).padStart(2, '0')

// 端末のローカル日付を "yyyy-MM-dd" にする(カードの期限と同じ形式)
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// "2026年9月28日(月)"
export function formatToday(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

export interface CalendarDay {
  day: number
  key: string
}

export interface CalendarMonth {
  title: string
  // 1日の曜日(日曜=0)。この数だけ、1日の前に空きマスを置く
  leadingBlanks: number
  days: CalendarDay[]
}

// today を含む月から months か月分を作る(月をまたぐ・年をまたぐ場合も正しく進む)
export function buildMonths(today: Date, months = 3): CalendarMonth[] {
  return Array.from({ length: months }, (_, offset) => {
    const first = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    return {
      title: `${first.getFullYear()}年${first.getMonth() + 1}月`,
      leadingBlanks: first.getDay(),
      days: Array.from({ length: daysInMonth }, (_day, i) => {
        const date = new Date(first.getFullYear(), first.getMonth(), i + 1)
        return { day: i + 1, key: toDateKey(date) }
      }),
    }
  })
}

// 期限の日付 → その日が期限のカード名。完了リストのカードは対象外
export function collectDueMap(
  cards: CardResponse[],
  lists: ListResponse[],
): Record<string, string[]> {
  const doneListIds = new Set(lists.filter((list) => list.done).map((list) => list.id))
  const map: Record<string, string[]> = {}
  for (const card of cards) {
    if (!card.due || doneListIds.has(card.listId)) continue
    ;(map[card.due] ??= []).push(card.text)
  }
  return map
}
