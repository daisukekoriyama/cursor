import { useMoveCard } from '../api/queries'
import type { CardResponse, ListResponse } from '../api/types'
import { FormError } from './FormError'
import styles from './CardDetail.module.css'

interface Props {
  card: CardResponse
  lists: ListResponse[]
}

export function MoveCardSelect({ card, lists }: Props) {
  const move = useMoveCard()

  return (
    <div className={styles.row}>
      <label>
        移動先{' '}
        <select
          value={card.listId}
          disabled={move.isPending}
          onChange={(e) => move.mutate({ cardId: card.id, listId: e.target.value })}
        >
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </label>
      <FormError error={move.error} className={styles.error}>
        カードを移動できませんでした。
      </FormError>
    </div>
  )
}
