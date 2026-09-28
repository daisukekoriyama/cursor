import { formatLastUpdated } from '../utils/lastUpdated'
import styles from './LastUpdated.module.css'

export function LastUpdated({ updatedAt }: { updatedAt: string | null }) {
  return <footer className={styles.footer}>{formatLastUpdated(updatedAt)}</footer>
}
