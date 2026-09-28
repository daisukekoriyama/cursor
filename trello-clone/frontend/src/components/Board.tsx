import type { CardResponse, ListResponse } from '../api/types'
import styles from './Board.module.css'
import { ListColumn } from './ListColumn'

interface Props {
  lists: ListResponse[]
  cards: CardResponse[]
}

// 列は常に全リストを出し、カードだけを listId で振り分ける(検索結果は列の中で絞り込まれる)
export function Board({ lists, cards }: Props) {
  const orderedLists = [...lists].sort((a, b) => a.order - b.order)

  return (
    <div className={styles.board}>
      {orderedLists.map((list) => (
        <ListColumn key={list.id} list={list} cards={cards.filter((c) => c.listId === list.id)} />
      ))}
    </div>
  )
}
