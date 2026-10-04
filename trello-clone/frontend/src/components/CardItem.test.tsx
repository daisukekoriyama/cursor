import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CardResponse, ListResponse } from '../api/types'
import { CardItem } from './CardItem'

const lists: ListResponse[] = [
  { id: 'todo', boardId: 'b1', name: '未着手', order: 0, done: false },
  { id: 'done', boardId: 'b1', name: '完了', order: 1, done: true },
]

const card: CardResponse = {
  id: 'c1',
  listId: 'todo',
  order: 0,
  text: 'レポートを書く',
  due: null,
  completedAt: null,
  subtasks: [],
}

afterEach(() => vi.unstubAllGlobals())

describe('CardItem', () => {
  it('moves the card to the done list when its checkbox is checked', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ...card, listId: 'done' }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    render(<CardItem card={card} lists={lists} />, { wrapper })

    await userEvent.click(screen.getByRole('checkbox', { name: 'レポートを書く を完了にする' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/cards/c1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(String(init.body))).toEqual({ listId: 'done' })
  })
})
