import { formatToday } from '../utils/calendar'
import styles from './TodayDate.module.css'

export function TodayDate({ today }: { today: Date }) {
  return <p className={styles.today}>今日: {formatToday(today)}</p>
}
