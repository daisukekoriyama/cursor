import { useState } from 'react'
import { useMoveCard } from '../api/queries'
import type { CardResponse, ListResponse } from '../api/types'
import { isCardDrag, readDraggedCard } from '../utils/cardDrag'
import { AddCardForm } from './AddCardForm'
import { CardItem } from './CardItem'
import { FormError } from './FormError'
import { ListSettings } from './ListSettings'
import styles from './ListColumn.module.css'

interface Props {
  list: ListResponse
  lists: ListResponse[]
  cards: CardResponse[]
}

export function ListColumn({ list, lists, cards }: Props) {
  const [editing, setEditing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const move = useMoveCard()

  return (
    <section
      className={`${styles.column} ${dragOver ? styles.dragOver : ''}`}
      aria-label={list.name}
      onDragOver={(e) => {
        if (!isCardDrag(e.dataTransfer)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        // 列の中の子要素へ移っただけのときは、ハイライトを消さない
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const dragged = readDraggedCard(e.dataTransfer)
        if (dragged && dragged.listId !== list.id) {
          move.mutate({ cardId: dragged.cardId, listId: list.id })
        }
      }}
    >
      <h2 className={styles.title}>
        {list.name} <span className={styles.count}>{cards.length}</span>
        <button
          type="button"
          className={styles.edit}
          aria-expanded={editing}
          aria-label={`${list.name} の編集`}
          onClick={() => setEditing(!editing)}
        >
          {editing ? '閉じる' : '編集'}
        </button>
      </h2>
      {editing && <ListSettings key={list.name} list={list} />}
      <ul className={styles.cards}>
        {cards.map((card) => (
          <CardItem key={card.id} card={card} lists={lists} />
        ))}
      </ul>
      <FormError error={move.error} className={styles.error}>
        カードを移動できませんでした。
      </FormError>
      <AddCardForm listId={list.id} />
    </section>
  )
}
