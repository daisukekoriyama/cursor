import { useState, type FormEvent } from 'react'
import { useCreateList } from '../api/queries'
import { NAME_MAX_LENGTH } from '../api/limits'
import { FormError } from './FormError'
import styles from './AddListForm.module.css'

interface Props {
  boardId: string
}

export function AddListForm({ boardId }: Props) {
  const [name, setName] = useState('')
  const createList = useCreateList(boardId)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed === '') return
    createList.mutate(trimmed, { onSuccess: () => setName('') })
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <input
        aria-label="リスト名"
        placeholder="リストを追加"
        maxLength={NAME_MAX_LENGTH}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" disabled={createList.isPending || name.trim() === ''}>
        リスト追加
      </button>
      <FormError error={createList.error} className={styles.error}>
        リストを追加できませんでした。
      </FormError>
    </form>
  )
}
