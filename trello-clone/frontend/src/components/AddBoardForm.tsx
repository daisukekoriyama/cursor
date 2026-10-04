import { useState, type FormEvent } from 'react'
import { useCreateBoard } from '../api/queries'
import { NAME_MAX_LENGTH } from '../api/limits'
import { FormError } from './FormError'
import styles from './AddBoardForm.module.css'

interface Props {
  onCreated: (boardId: string) => void
}

export function AddBoardForm({ onCreated }: Props) {
  const [name, setName] = useState('')
  const createBoard = useCreateBoard()

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed === '') return
    createBoard.mutate(trimmed, {
      onSuccess: (board) => {
        setName('')
        onCreated(board.id)
      },
    })
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <input
        className={styles.name}
        aria-label="ボード名"
        placeholder="新しいボード名"
        maxLength={NAME_MAX_LENGTH}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" disabled={createBoard.isPending || name.trim() === ''}>
        ボード作成
      </button>
      <FormError error={createBoard.error} as="span" className={styles.error}>
        ボードを作成できませんでした。
      </FormError>
    </form>
  )
}
