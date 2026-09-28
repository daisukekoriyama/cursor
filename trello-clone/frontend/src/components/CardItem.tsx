import { useState } from 'react'
import { useMoveCard } from '../api/queries'
import type { CardResponse, ListResponse } from '../api/types'
import { CardDetail } from './CardDetail'
import styles from './CardItem.module.css'

interface Props {
  card: CardResponse
  lists: ListResponse[]
}

// "yyyy-MM-dd" を "M/D" に整形する
function formatDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

export function CardItem({ card, lists }: Props) {
  const [open, setOpen] = useState(false)
  const move = useMoveCard(card.id)
  const inDoneList = lists.find((list) => list.id === card.listId)?.done ?? false
  // 並び順が先の完了リストへ移す。完了リストがないボードでは完了操作を出さない
  const doneList = lists.find((list) => list.done)
  const doneCount = card.subtasks.filter((subtask) => subtask.done).length

  return (
    <li className={styles.card}>
      <div className={styles.titleRow}>
        {!inDoneList && doneList && (
          <input
            type="checkbox"
            checked={false}
            disabled={move.isPending}
            aria-label={`${card.text} を完了にする`}
            onChange={() => move.mutate(doneList.id)}
          />
        )}
        <p className={styles.text}>{card.text}</p>
      </div>
      <div className={styles.badges}>
        {!inDoneList && card.due && (
          <span className={styles.badge}>期限 {formatDate(card.due)}</span>
        )}
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
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-label={`${card.text} の詳細`}
        onClick={() => setOpen(!open)}
      >
        {open ? '閉じる' : '詳細'}
      </button>
      {move.isError && (
        <p role="alert" className={styles.error}>
          カードを完了にできませんでした。
        </p>
      )}
      {open && <CardDetail card={card} lists={lists} />}
    </li>
  )
}
