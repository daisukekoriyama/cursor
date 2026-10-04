import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CardResponse, ListResponse } from '../api/types'
import { CardDetail } from './CardDetail'

const lists: ListResponse[] = [
  { id: 'l1', boardId: 'b1', name: '未着手', order: 0, done: false },
  { id: 'l2', boardId: 'b1', name: '完了', order: 1, done: true },
]

function card(overrides: Partial<CardResponse> = {}): CardResponse {
  return {
    id: 'c1',
    listId: 'l1',
    order: 0,
    text: 'レポートを書く',
    due: null,
    completedAt: null,
    subtasks: [],
    ...overrides,
  }
}

function renderDetail(c: CardResponse) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return render(<CardDetail card={c} lists={lists} />, { wrapper })
}

afterEach(() => vi.unstubAllGlobals())

describe('CardDetail', () => {
  it('shows the reason the server gives when saving fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ error: 'text cannot be empty' }),
      })),
    )
    renderDetail(card())

    await userEvent.type(screen.getByRole('textbox', { name: 'カードの内容を編集' }), '追記')
    await userEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'カードを保存できませんでした。 (text cannot be empty)',
    )
  })

  it('shows the latest card text after the server value changes', () => {
    const { rerender } = renderDetail(card({ text: '古い内容' }))
    expect(screen.getByRole('textbox', { name: 'カードの内容を編集' })).toHaveValue('古い内容')

    rerender(<CardDetail card={card({ text: '新しい内容' })} lists={lists} />)

    expect(screen.getByRole('textbox', { name: 'カードの内容を編集' })).toHaveValue('新しい内容')
  })
})
