import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from './client'
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

export interface NewCard {
  listId: string
  text: string
  due: string
}

// 作成後は、ボード全体と検索結果の両方を再取得して表示に反映する
export function useCreateCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, text, due }: NewCard) =>
      apiPost<CardResponse>(`/lists/${listId}/cards`, { text, due: due || undefined }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['boards'] }),
        queryClient.invalidateQueries({ queryKey: ['cards'] }),
      ]),
  })
}
