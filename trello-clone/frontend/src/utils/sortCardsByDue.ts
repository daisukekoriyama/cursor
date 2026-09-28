import type { CardResponse } from '../api/types'

// 期限("yyyy-MM-dd")の早い順に並べる。期限なしは末尾。同じ期限どうしは API の並び(order)に従う。
// 元の配列は変更しない。
export function sortCardsByDue(cards: CardResponse[]): CardResponse[] {
  return [...cards].sort((a, b) => {
    if (a.due !== b.due) {
      if (!a.due) return 1
      if (!b.due) return -1
      return a.due < b.due ? -1 : 1
    }
    return a.order - b.order
  })
}
