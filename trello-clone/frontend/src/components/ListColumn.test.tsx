import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CardResponse, ListResponse } from '../api/types'
import { CARD_DRAG_TYPE } from '../utils/cardDrag'
import { ListColumn } from './ListColumn'

const lists: ListResponse[] = [
  { id: 'todo', boardId: 'b1', name: '未着手', order: 0, done: false },
  { id: 'doing', boardId: 'b1', name: '進行中', order: 1, done: false },
]

const cardInDoing: CardResponse = {
  id: 'c2',
  listId: 'doing',
  order: 0,
  text: '進行中のカード',
  due: null,
  completedAt: null,
  subtasks: [],
}

afterEach(() => vi.unstubAllGlobals())

describe('ListColumn', () => {
  it('moves a card dropped from another list to the end of this list', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ...cardInDoing, listId: 'todo' }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    render(<ListColumn list={lists[0]} lists={lists} cards={[]} />, { wrapper })

    const column = screen.getByRole('region', { name: '未着手' })
    const dataTransfer = {
      types: [CARD_DRAG_TYPE],
      getData: () => JSON.stringify({ cardId: 'c2', listId: 'doing' }),
    }
    fireEvent.drop(column, { dataTransfer })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/cards/c2')
    expect(JSON.parse(String(init.body))).toEqual({ listId: 'todo' })
  })

  it('does nothing when a card is dropped on its own list', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    render(<ListColumn list={lists[1]} lists={lists} cards={[cardInDoing]} />, { wrapper })

    fireEvent.drop(screen.getByRole('region', { name: '進行中' }), {
      dataTransfer: {
        types: [CARD_DRAG_TYPE],
        getData: () => JSON.stringify({ cardId: 'c2', listId: 'doing' }),
      },
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
