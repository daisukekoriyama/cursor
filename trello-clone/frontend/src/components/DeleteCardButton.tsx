import { useDeleteCard } from '../api/queries'
import type { CardResponse } from '../api/types'
import { FormError } from './FormError'
import styles from './CardDetail.module.css'

interface Props {
  card: CardResponse
}

export function DeleteCardButton({ card }: Props) {
  const remove = useDeleteCard(card.id)

  function confirmAndDelete() {
    if (window.confirm(`カード「${card.text}」を削除しますか?`)) remove.mutate()
  }

  return (
    <div>
      <button type="button" disabled={remove.isPending} onClick={confirmAndDelete}>
        カードを削除
      </button>
      <FormError error={remove.error} className={styles.error}>
        カードを削除できませんでした。
      </FormError>
    </div>
  )
}
