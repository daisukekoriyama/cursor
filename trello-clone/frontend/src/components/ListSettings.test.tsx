import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ListResponse } from '../api/types'
import { ListSettings } from './ListSettings'

const list: ListResponse = { id: 'l1', boardId: 'b1', name: '未着手', order: 0, done: false }

function renderSettings() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  render(<ListSettings list={list} />, { wrapper })
}

afterEach(() => vi.unstubAllGlobals())

describe('ListSettings', () => {
  it('renames the list with the trimmed name', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ...list, name: '準備中' }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    renderSettings()

    const input = screen.getByRole('textbox', { name: 'リスト名を編集' })
    await userEvent.clear(input)
    await userEvent.type(input, '  準備中  ')
    await userEvent.click(screen.getByRole('button', { name: '名称を保存' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ name: '準備中' })
  })

  it('deletes the list only after the user confirms', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    renderSettings()

    await userEvent.click(screen.getByRole('button', { name: 'リストを削除' }))
    expect(fetchMock).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'リストを削除' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(confirm).toHaveBeenCalledTimes(2)
    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    expect(url).toBe('/api/lists/l1')
  })
})
