import { useState, type FormEvent } from 'react'
import { useUpdateCard } from '../api/queries'
import type { CardResponse } from '../api/types'
import { FormError } from './FormError'
import styles from './CardDetail.module.css'

interface Props {
  card: CardResponse
}

export function EditCardForm({ card }: Props) {
  const [text, setText] = useState(card.text)
  const [due, setDue] = useState(card.due ?? '')
  const update = useUpdateCard(card.id)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed === '') return
    update.mutate({ text: trimmed, due })
  }

  return (
    <form className={styles.row} onSubmit={submit}>
      <input
        className={styles.grow}
        aria-label="カードの内容を編集"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <input
        type="date"
        aria-label="期限を編集"
        value={due}
        onChange={(e) => setDue(e.target.value)}
      />
      <button type="submit" disabled={update.isPending || text.trim() === ''}>
        保存
      </button>
      <FormError error={update.error} className={styles.error}>
        カードを保存できませんでした。
      </FormError>
    </form>
  )
}
