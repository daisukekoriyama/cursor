import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import type { BoardDetail, BoardSummary, CardResponse } from './types'

export type CompletedFilter = 'all' | 'completed' | 'incomplete'

export interface SearchFilters {
  keyword: string
  completed: CompletedFilter
}

export const NO_FILTERS: SearchFilters = { keyword: '', completed: 'all' }

export function hasActiveFilters({ keyword, completed }: SearchFilters): boolean {
  return keyword.trim() !== '' || completed !== 'all'
}

export function useBoards() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: () => apiGet<BoardSummary[]>('/boards'),
  })
}

export function useBoard(boardId: string | undefined) {
  return useQuery({
    queryKey: ['boards', boardId],
    queryFn: () => apiGet<BoardDetail>(`/boards/${boardId}`),
    enabled: boardId !== undefined,
  })
}

export function useSearchCards(boardId: string | undefined, filters: SearchFilters) {
  const keyword = filters.keyword.trim()
  return useQuery({
    queryKey: ['cards', boardId, keyword, filters.completed],
    queryFn: () =>
      apiGet<CardResponse[]>('/cards', {
        boardId,
        keyword,
        completed: filters.completed === 'all' ? undefined : filters.completed === 'completed',
      }),
    enabled: boardId !== undefined && hasActiveFilters(filters),
    placeholderData: keepPreviousData,
  })
}
