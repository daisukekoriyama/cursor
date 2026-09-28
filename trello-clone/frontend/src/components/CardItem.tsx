import type { CardResponse } from '../api/types'
import styles from './CardItem.module.css'

interface Props {
  card: CardResponse
}

// "yyyy-MM-dd" を "M/D" に整形する
function formatDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

export function CardItem({ card }: Props) {
  const doneCount = card.subtasks.filter((subtask) => subtask.done).length

  return (
    <li className={styles.card}>
      <p className={styles.text}>{card.text}</p>
      <div className={styles.badges}>
        {card.due && <span className={styles.badge}>期限 {formatDate(card.due)}</span>}
        {card.completedAt && (
          <span className={`${styles.badge} ${styles.doneBadge}`}>
            終了日 {formatDate(card.completedAt)}
          </span>
        )}
        {card.subtasks.length > 0 && (
          <span className={styles.badge}>
            サブタスク {doneCount}/{card.subtasks.length}
          </span>
        )}
      </div>
    </li>
  )
}
