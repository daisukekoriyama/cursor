import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type {
  BoardDetail,
  BoardSummary,
  CardResponse,
  ListResponse,
  SubtaskResponse,
} from './types'

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

// 書き込み後は、ボード全体と検索結果の両方を再取得して表示に反映する
function useRefreshCards() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['boards'] }),
      queryClient.invalidateQueries({ queryKey: ['cards'] }),
    ])
}

export function useCreateCard() {
  const refresh = useRefreshCards()
  return useMutation({
    mutationFn: ({ listId, text, due }: NewCard) =>
      apiPost<CardResponse>(`/lists/${listId}/cards`, { text, due: due || undefined }),
    onSuccess: refresh,
  })
}

// due は空文字を送ると期限が消える
export function useUpdateCard(cardId: string) {
  const refresh = useRefreshCards()
  return useMutation({
    mutationFn: (changes: { text: string; due: string }) =>
      apiPatch<CardResponse>(`/cards/${cardId}`, changes),
    onSuccess: refresh,
  })
}

// order を送らないので、バックエンドが移動先リストの末尾に置く
export function useMoveCard(cardId: string) {
  const refresh = useRefreshCards()
  return useMutation({
    mutationFn: (listId: string) => apiPatch<CardResponse>(`/cards/${cardId}`, { listId }),
    onSuccess: refresh,
  })
}

export function useDeleteCard(cardId: string) {
  const refresh = useRefreshCards()
  return useMutation({
    mutationFn: () => apiDelete(`/cards/${cardId}`),
    onSuccess: refresh,
  })
}

export function useCreateSubtask(cardId: string) {
  const refresh = useRefreshCards()
  return useMutation({
    mutationFn: (text: string) => apiPost<SubtaskResponse>(`/cards/${cardId}/subtasks`, { text }),
    onSuccess: refresh,
  })
}

export function useToggleSubtask(subtaskId: string) {
  const refresh = useRefreshCards()
  return useMutation({
    mutationFn: (done: boolean) => apiPatch<SubtaskResponse>(`/subtasks/${subtaskId}`, { done }),
    onSuccess: refresh,
  })
}

export function useDeleteSubtask(subtaskId: string) {
  const refresh = useRefreshCards()
  return useMutation({
    mutationFn: () => apiDelete(`/subtasks/${subtaskId}`),
    onSuccess: refresh,
  })
}

export function useRenameList(listId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => apiPatch<ListResponse>(`/lists/${listId}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards', boardId] }),
  })
}

export function useSetListDone(listId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (done: boolean) => apiPatch<ListResponse>(`/lists/${listId}`, { done }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards', boardId] }),
  })
}

// リストを消すとカードも消えるので、検索結果のキャッシュも再取得する
export function useDeleteList(listId: string) {
  const refresh = useRefreshCards()
  return useMutation({
    mutationFn: () => apiDelete(`/lists/${listId}`),
    onSuccess: refresh,
  })
}

export function useCreateList(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => apiPost<ListResponse>(`/boards/${boardId}/lists`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards', boardId] }),
  })
}

export function useCreateBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => apiPost<BoardSummary>('/boards', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards'] }),
  })
}
