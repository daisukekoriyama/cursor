import { useState, type FormEvent } from 'react'
import { useCreateCard } from '../api/queries'
import styles from './AddCardForm.module.css'

interface Props {
  listId: string
}

export function AddCardForm({ listId }: Props) {
  const [text, setText] = useState('')
  const [due, setDue] = useState('')
  const createCard = useCreateCard()

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed === '') return
    createCard.mutate(
      { listId, text: trimmed, due },
      {
        onSuccess: () => {
          setText('')
          setDue('')
        },
      },
    )
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <input
        className={styles.text}
        aria-label="カードの内容"
        placeholder="カードを追加"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <input
        type="date"
        className={styles.due}
        aria-label="期限"
        value={due}
        onChange={(e) => setDue(e.target.value)}
      />
      <button type="submit" disabled={createCard.isPending || text.trim() === ''}>
        追加
      </button>
      {createCard.isError && (
        <p role="alert" className={styles.error}>
          カードを追加できませんでした。
        </p>
      )}
    </form>
  )
}
