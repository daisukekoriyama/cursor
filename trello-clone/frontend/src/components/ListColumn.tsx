import type { CardResponse, ListResponse } from '../api/types'
import { AddCardForm } from './AddCardForm'
import { CardItem } from './CardItem'
import styles from './ListColumn.module.css'

interface Props {
  list: ListResponse
  cards: CardResponse[]
}

export function ListColumn({ list, cards }: Props) {
  return (
    <section className={styles.column} aria-label={list.name}>
      <h2 className={styles.title}>
        {list.name} <span className={styles.count}>{cards.length}</span>
      </h2>
      <ul className={styles.cards}>
        {cards.map((card) => (
          <CardItem key={card.id} card={card} />
        ))}
      </ul>
      <AddCardForm listId={list.id} />
    </section>
  )
}
