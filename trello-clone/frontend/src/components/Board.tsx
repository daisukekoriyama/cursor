import type { CardResponse, ListResponse } from '../api/types'
import styles from './Board.module.css'
import { AddListForm } from './AddListForm'
import { ListColumn } from './ListColumn'
import { sortCardsByDue } from '../utils/sortCardsByDue'

interface Props {
  boardId: string
  lists: ListResponse[]
  cards: CardResponse[]
}

// 列は常に全リストを出し、カードだけを listId で振り分ける(検索結果は列の中で絞り込まれる)。
// 各列のカードは期限の早い順(期限なしは末尾)に並べる
export function Board({ boardId, lists, cards }: Props) {
  const orderedLists = [...lists].sort((a, b) => a.order - b.order)

  return (
    <div className={styles.board}>
      {orderedLists.map((list) => (
        <ListColumn
          key={list.id}
          list={list}
          lists={orderedLists}
          cards={sortCardsByDue(cards.filter((c) => c.listId === list.id))}
        />
      ))}
      <AddListForm boardId={boardId} />
    </div>
  )
}
