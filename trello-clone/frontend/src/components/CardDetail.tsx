import type { CardResponse, ListResponse } from '../api/types'
import { DeleteCardButton } from './DeleteCardButton'
import { EditCardForm } from './EditCardForm'
import { MoveCardSelect } from './MoveCardSelect'
import { SubtaskList } from './SubtaskList'
import styles from './CardDetail.module.css'

interface Props {
  card: CardResponse
  lists: ListResponse[]
}

export function CardDetail({ card, lists }: Props) {
  return (
    <div className={styles.detail}>
      {/* サーバーの内容が変わったら入力欄も作り直し、古い値を残さない */}
      <EditCardForm key={`${card.text}|${card.due ?? ''}`} card={card} />
      <MoveCardSelect card={card} lists={lists} />
      <SubtaskList card={card} />
      <DeleteCardButton card={card} />
    </div>
  )
}
