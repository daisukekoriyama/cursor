import { useState, type FormEvent } from 'react'
import { useDeleteList, useRenameList } from '../api/queries'
import type { ListResponse } from '../api/types'
import styles from './ListSettings.module.css'

interface Props {
  list: ListResponse
}

export function ListSettings({ list }: Props) {
  const [name, setName] = useState(list.name)
  const rename = useRenameList(list.id, list.boardId)
  const remove = useDeleteList(list.id)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed === '') return
    rename.mutate(trimmed)
  }

  function confirmAndDelete() {
    if (
      window.confirm(`リスト「${list.name}」を削除しますか?リスト内のカードもすべて削除されます。`)
    ) {
      remove.mutate()
    }
  }

  return (
    <div className={styles.settings}>
      <form className={styles.row} onSubmit={submit}>
        <input
          className={styles.name}
          aria-label="リスト名を編集"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" disabled={rename.isPending || name.trim() === ''}>
          名称を保存
        </button>
      </form>
      <button type="button" disabled={remove.isPending} onClick={confirmAndDelete}>
        リストを削除
      </button>
      {(rename.isError || remove.isError) && (
        <p role="alert" className={styles.error}>
          {rename.isError ? 'リスト名を保存できませんでした。' : 'リストを削除できませんでした。'}
        </p>
      )}
    </div>
  )
}
