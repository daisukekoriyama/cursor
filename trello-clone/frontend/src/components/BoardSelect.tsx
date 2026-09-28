import type { BoardSummary } from '../api/types'
import styles from './BoardSelect.module.css'

interface Props {
  boards: BoardSummary[]
  selectedId: string | undefined
  onChange: (boardId: string) => void
}

export function BoardSelect({ boards, selectedId, onChange }: Props) {
  return (
    <select
      className={styles.select}
      aria-label="ボード"
      value={selectedId}
      onChange={(e) => onChange(e.target.value)}
    >
      {boards.map((board) => (
        <option key={board.id} value={board.id}>
          {board.name}
        </option>
      ))}
    </select>
  )
}
