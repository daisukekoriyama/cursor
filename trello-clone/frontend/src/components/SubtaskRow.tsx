import { useDeleteSubtask, useToggleSubtask } from '../api/queries'
import type { SubtaskResponse } from '../api/types'
import { FormError } from './FormError'
import styles from './CardDetail.module.css'

interface Props {
  subtask: SubtaskResponse
}

export function SubtaskRow({ subtask }: Props) {
  const toggle = useToggleSubtask(subtask.id)
  const remove = useDeleteSubtask(subtask.id)

  return (
    <li className={styles.subtask}>
      <label className={subtask.done ? styles.done : undefined}>
        <input
          type="checkbox"
          checked={subtask.done}
          disabled={toggle.isPending}
          onChange={(e) => toggle.mutate(e.target.checked)}
        />{' '}
        {subtask.text}
      </label>
      <button
        type="button"
        aria-label={`小項目「${subtask.text}」を削除`}
        disabled={remove.isPending}
        onClick={() => remove.mutate()}
      >
        削除
      </button>
      <FormError error={toggle.error ?? remove.error} className={styles.error}>
        小項目を更新できませんでした。
      </FormError>
    </li>
  )
}
