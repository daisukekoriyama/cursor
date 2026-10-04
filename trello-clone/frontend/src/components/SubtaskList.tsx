import { useState, type FormEvent } from 'react'
import { useCreateSubtask } from '../api/queries'
import type { CardResponse } from '../api/types'
import { FormError } from './FormError'
import { SubtaskRow } from './SubtaskRow'
import styles from './CardDetail.module.css'

interface Props {
  card: CardResponse
}

export function SubtaskList({ card }: Props) {
  const [text, setText] = useState('')
  const create = useCreateSubtask(card.id)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed === '') return
    create.mutate(trimmed, { onSuccess: () => setText('') })
  }

  return (
    <div>
      <ul className={styles.subtasks}>
        {card.subtasks.map((subtask) => (
          <SubtaskRow key={subtask.id} subtask={subtask} />
        ))}
      </ul>
      <form className={styles.row} onSubmit={submit}>
        <input
          className={styles.grow}
          aria-label="小項目の内容"
          placeholder="小項目を追加"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={create.isPending || text.trim() === ''}>
          小項目追加
        </button>
        <FormError error={create.error} className={styles.error}>
          小項目を追加できませんでした。
        </FormError>
      </form>
    </div>
  )
}
