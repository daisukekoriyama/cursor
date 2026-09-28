import { useState } from 'react'
import type { CardResponse, ListResponse } from '../api/types'
import { AddCardForm } from './AddCardForm'
import { CardItem } from './CardItem'
import { ListSettings } from './ListSettings'
import styles from './ListColumn.module.css'

interface Props {
  list: ListResponse
  lists: ListResponse[]
  cards: CardResponse[]
}

export function ListColumn({ list, lists, cards }: Props) {
  const [editing, setEditing] = useState(false)

  return (
    <section className={styles.column} aria-label={list.name}>
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
      {editing && <ListSettings list={list} />}
      <ul className={styles.cards}>
        {cards.map((card) => (
          <CardItem key={card.id} card={card} lists={lists} />
        ))}
      </ul>
      <AddCardForm listId={list.id} />
    </section>
  )
}
