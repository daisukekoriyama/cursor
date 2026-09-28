import type { CompletedFilter, SearchFilters } from '../api/queries'
import styles from './SearchBar.module.css'

interface Props {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
}

const COMPLETED_OPTIONS: { value: CompletedFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'incomplete', label: '未完了' },
  { value: 'completed', label: '完了' },
]

export function SearchBar({ filters, onChange }: Props) {
  return (
    <form className={styles.searchBar} role="search" onSubmit={(e) => e.preventDefault()}>
      <input
        type="search"
        className={styles.keyword}
        aria-label="キーワード"
        placeholder="カードを検索"
        value={filters.keyword}
        onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
      />
      <select
        className={styles.completed}
        aria-label="完了状態"
        value={filters.completed}
        onChange={(e) => onChange({ ...filters, completed: e.target.value as CompletedFilter })}
      >
        {COMPLETED_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  )
}
