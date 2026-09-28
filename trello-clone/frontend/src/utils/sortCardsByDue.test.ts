import { describe, expect, it } from 'vitest'
import type { CardResponse } from '../api/types'
import { sortCardsByDue } from './sortCardsByDue'

function card(id: string, due: string | null, order = 0): CardResponse {
  return { id, listId: 'l1', order, text: id, due, completedAt: null, subtasks: [] }
}

const ids = (cards: CardResponse[]) => cards.map((c) => c.id)

describe('sortCardsByDue', () => {
  it('sorts by due date ascending with undated cards last', () => {
    const sorted = sortCardsByDue([
      card('none', null),
      card('late', '2026-12-01'),
      card('early', '2026-10-01'),
      card('mid', '2026-11-15'),
    ])

    expect(ids(sorted)).toEqual(['early', 'mid', 'late', 'none'])
  })

  it('compares across month and year boundaries', () => {
    const sorted = sortCardsByDue([card('y27', '2027-01-01'), card('dec', '2026-12-31')])

    expect(ids(sorted)).toEqual(['dec', 'y27'])
  })

  it('keeps the API order (order) among cards with the same due date, or with none', () => {
    const sorted = sortCardsByDue([
      card('b', '2026-10-01', 2),
      card('n2', null, 5),
      card('a', '2026-10-01', 1),
      card('n1', null, 3),
    ])

    expect(ids(sorted)).toEqual(['a', 'b', 'n1', 'n2'])
  })

  it('does not mutate the input', () => {
    const input = [card('b', '2026-11-01'), card('a', '2026-10-01')]

    sortCardsByDue(input)

    expect(ids(input)).toEqual(['b', 'a'])
  })
})
