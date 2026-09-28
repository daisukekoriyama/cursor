import type { CardResponse, ListResponse } from '../api/types'
import { buildMonths, collectDueMap, toDateKey } from '../utils/calendar'
import styles from './Calendar.module.css'

interface Props {
  today: Date
  lists: ListResponse[]
  cards: CardResponse[]
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

// ボード全体のカードから作る(検索で絞り込んだ結果には影響されない)
export function Calendar({ today, lists, cards }: Props) {
  const dueMap = collectDueMap(cards, lists)
  const todayKey = toDateKey(today)

  return (
    <section className={styles.calendar} aria-label="直近3ヶ月のカレンダー">
      <div className={styles.months}>
        {buildMonths(today).map((month) => (
          <div key={month.title} className={styles.month}>
            <div className={styles.title}>{month.title}</div>
            <div className={styles.grid}>
              {WEEKDAYS.map((name) => (
                <div key={name} className={styles.weekday}>
                  {name}
                </div>
              ))}
              {Array.from({ length: month.leadingBlanks }, (_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {month.days.map(({ day, key }) => {
                const names = dueMap[key]
                const classes = [styles.day]
                if (key === todayKey) classes.push(styles.today)
                if (names) classes.push(styles.hasDue)
                return (
                  <div
                    key={key}
                    className={classes.join(' ')}
                    aria-current={key === todayKey ? 'date' : undefined}
                    title={names ? `期限: ${names.join('、')}` : undefined}
                  >
                    {day}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
