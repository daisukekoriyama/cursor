import { describe, expect, it } from 'vitest'
import type { CardResponse, ListResponse } from '../api/types'
import { buildMonths, collectDueMap, formatToday, toDateKey } from './calendar'

function card(id: string, listId: string, due: string | null): CardResponse {
  return { id, listId, order: 0, text: id, due, completedAt: null, subtasks: [] }
}

const lists: ListResponse[] = [
  { id: 'todo', boardId: 'b', name: '未着手', order: 0, done: false },
  { id: 'done', boardId: 'b', name: '完了', order: 1, done: true },
]

describe('toDateKey / formatToday', () => {
  it('formats the local date with zero padding', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(toDateKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31')
  })

  it('formats today as year, month, day and weekday', () => {
    expect(formatToday(new Date(2026, 8, 28))).toBe('2026年9月28日(月)')
  })
})

describe('buildMonths', () => {
  it('builds this month and the next two, starting from today', () => {
    const months = buildMonths(new Date(2026, 8, 28))

    expect(months.map((m) => m.title)).toEqual(['2026年9月', '2026年10月', '2026年11月'])
    expect(months.map((m) => m.days.length)).toEqual([30, 31, 30])
    expect(months[0].days[0]).toEqual({ day: 1, key: '2026-09-01' })
    expect(months[0].days[29]).toEqual({ day: 30, key: '2026-09-30' })
  })

  it('places the first day under the right weekday', () => {
    // 2026-09-01 は火曜、2026-10-01 は木曜、2026-11-01 は日曜
    expect(buildMonths(new Date(2026, 8, 28)).map((m) => m.leadingBlanks)).toEqual([2, 4, 0])
  })

  it('crosses the year boundary', () => {
    const months = buildMonths(new Date(2026, 10, 30))

    expect(months.map((m) => m.title)).toEqual(['2026年11月', '2026年12月', '2027年1月'])
    expect(months[2].days[0].key).toBe('2027-01-01')
  })

  it('knows the length of February in a leap year', () => {
    const months = buildMonths(new Date(2028, 0, 15))

    expect(months[1].title).toBe('2028年2月')
    expect(months[1].days).toHaveLength(29)
  })
})

describe('collectDueMap', () => {
  it('groups card names by due date and skips cards without a due date', () => {
    const map = collectDueMap(
      [card('a', 'todo', '2026-10-01'), card('b', 'todo', '2026-10-01'), card('c', 'todo', null)],
      lists,
    )

    expect(map).toEqual({ '2026-10-01': ['a', 'b'] })
  })

  it('excludes cards in a done list', () => {
    const map = collectDueMap(
      [card('open', 'todo', '2026-10-01'), card('finished', 'done', '2026-10-01')],
      lists,
    )

    expect(map).toEqual({ '2026-10-01': ['open'] })
  })
})
