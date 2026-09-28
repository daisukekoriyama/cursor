import { useState } from 'react'
import {
  hasActiveFilters,
  NO_FILTERS,
  useBoard,
  useBoards,
  useSearchCards,
  type SearchFilters,
} from './api/queries'
import styles from './App.module.css'
import { Board } from './components/Board'
import { Calendar } from './components/Calendar'
import { AddBoardForm } from './components/AddBoardForm'
import { BoardSelect } from './components/BoardSelect'
import { LastUpdated } from './components/LastUpdated'
import { SearchBar } from './components/SearchBar'
import { TodayDate } from './components/TodayDate'
import { useDebouncedValue } from './hooks/useDebouncedValue'

const SEARCH_DEBOUNCE_MS = 300

function App() {
  // ページを開いた日。日付をまたいだあとは再読み込みで新しくなる
  const [today] = useState(() => new Date())
  const [filters, setFilters] = useState<SearchFilters>(NO_FILTERS)
  const debouncedFilters = useDebouncedValue(filters, SEARCH_DEBOUNCE_MS)

  const boards = useBoards()
  const [selectedBoardId, setSelectedBoardId] = useState<string>()
  const boardId = selectedBoardId ?? boards.data?.[0]?.id
  const board = useBoard(boardId)
  const search = useSearchCards(boardId, debouncedFilters)

  const searching = hasActiveFilters(debouncedFilters)
  // 検索結果が届くまでは全件を表示しておき、画面が空にならないようにする
  const cards = (searching ? search.data : undefined) ?? board.data?.cards
  const error = boards.error ?? board.error ?? (searching ? search.error : null)
  const loading = boards.isPending || (boardId !== undefined && board.isPending)

  function retry() {
    void boards.refetch()
    void board.refetch()
    if (searching) void search.refetch()
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <TodayDate today={today} />
        <h1 className={styles.title}>タスクボード</h1>
        <div className={styles.boardBar}>
          {boards.data && (
            <BoardSelect boards={boards.data} selectedId={boardId} onChange={setSelectedBoardId} />
          )}
          <AddBoardForm onCreated={setSelectedBoardId} />
        </div>
      </header>
      <SearchBar filters={filters} onChange={setFilters} />
      {error ? (
        <div role="alert" className={styles.message}>
          データを取得できませんでした。
          <button type="button" onClick={retry}>
            再試行
          </button>
        </div>
      ) : loading ? (
        <p className={styles.message}>読み込み中…</p>
      ) : board.data && cards ? (
        <>
          {searching && search.data?.length === 0 && (
            <p className={styles.message}>該当するカードはありません。</p>
          )}
          <Board boardId={board.data.id} lists={board.data.lists} cards={cards} />
          <Calendar today={today} lists={board.data.lists} cards={board.data.cards} />
          <LastUpdated updatedAt={board.data.updatedAt} />
        </>
      ) : (
        <p className={styles.message}>ボードがありません。</p>
      )}
    </div>
  )
}

export default App
