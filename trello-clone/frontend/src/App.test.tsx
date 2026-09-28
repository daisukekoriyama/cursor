import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BoardDetail, CardResponse } from './api/types'
import App from './App'

const BOARD_ID = 'board-1'

function card(id: string, listId: string, text: string, extra: Partial<CardResponse> = {}) {
  return { id, listId, order: 0, text, due: null, completedAt: null, subtasks: [], ...extra }
}

const cards: CardResponse[] = [
  card('c1', 'l1', '要件定義書を読む', {
    due: '2026-10-05',
    subtasks: [
      { id: 's1', cardId: 'c1', text: '10章を読む', done: true },
      { id: 's2', cardId: 'c1', text: '11章を読む', done: false },
    ],
  }),
  card('c2', 'l2', 'カード検索APIを実装する'),
  card('c3', 'l3', '運用ルールを決める', { completedAt: '2026-09-28' }),
]

const board: BoardDetail = {
  id: BOARD_ID,
  name: 'サンプルボード',
  lists: [
    { id: 'l1', boardId: BOARD_ID, name: '未着手', order: 0 },
    { id: 'l2', boardId: BOARD_ID, name: '進行中', order: 1 },
    { id: 'l3', boardId: BOARD_ID, name: '完了', order: 2 },
  ],
  cards,
}

const OTHER_BOARD: BoardDetail = {
  id: 'board-2',
  name: '別のボード',
  lists: [{ id: 'x1', boardId: 'board-2', name: '準備中', order: 0 }],
  cards: [card('x-c1', 'x1', '別ボードのカード')],
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body }
}

function stubApi(searchResult: (url: URL) => unknown = () => []) {
  const fetchMock = vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname === '/api/boards')
      return jsonResponse([
        { id: BOARD_ID, name: board.name },
        { id: OTHER_BOARD.id, name: OTHER_BOARD.name },
      ])
    if (url.pathname === `/api/boards/${OTHER_BOARD.id}`) return jsonResponse(OTHER_BOARD)
    if (url.pathname === `/api/boards/${BOARD_ID}`) return jsonResponse(board)
    if (url.pathname === '/api/cards') return jsonResponse(searchResult(url))
    return jsonResponse({}, false)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('App', () => {
  it('shows every list with its cards and badges', async () => {
    stubApi()
    renderApp()

    const todo = await screen.findByRole('region', { name: '未着手' })
    expect(within(todo).getByText('要件定義書を読む')).toBeInTheDocument()
    expect(within(todo).getByText('期限 10/5')).toBeInTheDocument()
    expect(within(todo).getByText('サブタスク 1/2')).toBeInTheDocument()
    const done = screen.getByRole('region', { name: '完了' })
    expect(within(done).getByText('終了日 9/28')).toBeInTheDocument()
  })

  it('switches to the board chosen in the selector', async () => {
    stubApi()
    renderApp()
    await screen.findByRole('region', { name: '未着手' })

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'ボード' }), '別のボード')

    const list = await screen.findByRole('region', { name: '準備中' })
    expect(within(list).getByText('別ボードのカード')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '未着手' })).not.toBeInTheDocument()
  })

  it('shows only the searched cards in their own list columns', async () => {
    const fetchMock = stubApi(() => [cards[1]])
    renderApp()
    await screen.findByRole('region', { name: '未着手' })

    await userEvent.type(screen.getByRole('searchbox', { name: 'キーワード' }), 'api')

    await waitFor(() => expect(screen.queryByText('要件定義書を読む')).not.toBeInTheDocument())
    expect(
      within(screen.getByRole('region', { name: '進行中' })).getByText('カード検索APIを実装する'),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '未着手' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(`/api/cards?boardId=${BOARD_ID}&keyword=api`)
  })

  it('sends the completed filter', async () => {
    const fetchMock = stubApi(() => [cards[2]])
    renderApp()
    await screen.findByRole('region', { name: '未着手' })

    await userEvent.selectOptions(screen.getByRole('combobox', { name: '完了状態' }), 'completed')

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(`/api/cards?boardId=${BOARD_ID}&completed=true`),
    )
  })

  it('tells the user when nothing matches', async () => {
    stubApi(() => [])
    renderApp()
    await screen.findByRole('region', { name: '未着手' })

    await userEvent.type(screen.getByRole('searchbox', { name: 'キーワード' }), 'zzz')

    expect(await screen.findByText('該当するカードはありません。')).toBeInTheDocument()
  })

  it('shows an error with a retry button when the API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({}, false)),
    )
    renderApp()

    expect(await screen.findByRole('alert')).toHaveTextContent('データを取得できませんでした')
    expect(screen.getByRole('button', { name: '再試行' })).toBeInTheDocument()
  })

  it('renders card text as plain text, not HTML', async () => {
    const xss = card('c9', 'l1', '<img src=x onerror=alert(1)>')
    board.cards = [xss]
    stubApi()
    renderApp()

    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
    board.cards = cards
  })

  describe('adding a card', () => {
    function stubCreate(status = 201) {
      const created = card('c-new', 'l2', '新しいカード', { due: '2026-11-01' })
      const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
        const url = new URL(input, 'http://localhost')
        if (init?.method === 'POST') {
          return status === 201
            ? { ok: true, status, json: async () => created }
            : jsonResponse({}, false)
        }
        if (url.pathname === '/api/boards')
          return jsonResponse([{ id: BOARD_ID, name: board.name }])
        if (url.pathname === `/api/boards/${BOARD_ID}`) return jsonResponse(board)
        return jsonResponse([])
      })
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }

    it('posts the text and due date to the list and clears the form', async () => {
      const fetchMock = stubCreate()
      renderApp()
      const column = await screen.findByRole('region', { name: '進行中' })

      await userEvent.type(within(column).getByLabelText('カードの内容'), ' 新しいカード ')
      await userEvent.type(within(column).getByLabelText('期限'), '2026-11-01')
      await userEvent.click(within(column).getByRole('button', { name: '追加' }))

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/lists/l2/cards',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ text: '新しいカード', due: '2026-11-01' }),
          }),
        ),
      )
      await waitFor(() => expect(within(column).getByLabelText('カードの内容')).toHaveValue(''))
    })

    it('does not submit blank text', async () => {
      const fetchMock = stubCreate()
      renderApp()
      const column = await screen.findByRole('region', { name: '進行中' })

      await userEvent.type(within(column).getByLabelText('カードの内容'), '   ')

      expect(within(column).getByRole('button', { name: '追加' })).toBeDisabled()
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
    })

    it('shows an error and keeps the input when the API fails', async () => {
      stubCreate(500)
      renderApp()
      const column = await screen.findByRole('region', { name: '進行中' })

      await userEvent.type(within(column).getByLabelText('カードの内容'), '失敗するカード')
      await userEvent.click(within(column).getByRole('button', { name: '追加' }))

      expect(await within(column).findByRole('alert')).toHaveTextContent('追加できませんでした')
      expect(within(column).getByLabelText('カードの内容')).toHaveValue('失敗するカード')
    })
  })

  describe('adding a list', () => {
    function stubCreateList(ok = true) {
      const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
        const url = new URL(input, 'http://localhost')
        if (init?.method === 'POST')
          return ok
            ? jsonResponse({ id: 'l-new', boardId: BOARD_ID, name: 'レビュー', order: 3 })
            : jsonResponse({}, false)
        if (url.pathname === '/api/boards')
          return jsonResponse([{ id: BOARD_ID, name: board.name }])
        if (url.pathname === `/api/boards/${BOARD_ID}`) return jsonResponse(board)
        return jsonResponse([])
      })
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }

    it('posts the name to the board and clears the form', async () => {
      const fetchMock = stubCreateList()
      renderApp()
      const input = await screen.findByLabelText('リスト名')

      await userEvent.type(input, ' レビュー ')
      await userEvent.click(screen.getByRole('button', { name: 'リスト追加' }))

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          `/api/boards/${BOARD_ID}/lists`,
          expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'レビュー' }) }),
        ),
      )
      await waitFor(() => expect(input).toHaveValue(''))
    })

    it('does not submit a blank name', async () => {
      stubCreateList()
      renderApp()

      await userEvent.type(await screen.findByLabelText('リスト名'), '   ')

      expect(screen.getByRole('button', { name: 'リスト追加' })).toBeDisabled()
    })

    it('shows an error and keeps the input when the API fails', async () => {
      stubCreateList(false)
      renderApp()
      const input = await screen.findByLabelText('リスト名')

      await userEvent.type(input, '失敗')
      await userEvent.click(screen.getByRole('button', { name: 'リスト追加' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('リストを追加できませんでした')
      expect(input).toHaveValue('失敗')
    })
  })

  describe('adding a board', () => {
    function stubCreateBoard(ok = true) {
      const summaries = [{ id: BOARD_ID, name: board.name }]
      const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
        const url = new URL(input, 'http://localhost')
        if (init?.method === 'POST') {
          if (!ok) return jsonResponse({}, false)
          summaries.push({ id: 'board-new', name: '新しいボード' })
          return jsonResponse({ id: 'board-new', name: '新しいボード' })
        }
        if (url.pathname === '/api/boards') return jsonResponse(summaries)
        if (url.pathname === '/api/boards/board-new')
          return jsonResponse({ id: 'board-new', name: '新しいボード', lists: [], cards: [] })
        if (url.pathname === `/api/boards/${BOARD_ID}`) return jsonResponse(board)
        return jsonResponse([])
      })
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }

    it('posts the name, then switches to the new empty board', async () => {
      const fetchMock = stubCreateBoard()
      renderApp()
      const input = await screen.findByLabelText('ボード名')

      await userEvent.type(input, ' 新しいボード ')
      await userEvent.click(screen.getByRole('button', { name: 'ボード作成' }))

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/boards',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: '新しいボード' }),
          }),
        ),
      )
      await waitFor(() =>
        expect(screen.getByRole('combobox', { name: 'ボード' })).toHaveValue('board-new'),
      )
      expect(screen.queryByRole('region', { name: '未着手' })).not.toBeInTheDocument()
      expect(screen.getByLabelText('リスト名')).toBeInTheDocument()
      expect(input).toHaveValue('')
    })

    it('does not submit a blank name', async () => {
      stubCreateBoard()
      renderApp()

      await userEvent.type(await screen.findByLabelText('ボード名'), '   ')

      expect(screen.getByRole('button', { name: 'ボード作成' })).toBeDisabled()
    })

    it('shows an error and keeps the input when the API fails', async () => {
      stubCreateBoard(false)
      renderApp()
      const input = await screen.findByLabelText('ボード名')

      await userEvent.type(input, '失敗')
      await userEvent.click(screen.getByRole('button', { name: 'ボード作成' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('ボードを作成できませんでした')
      expect(input).toHaveValue('失敗')
    })
  })

  describe('card detail', () => {
    function stubWrites(failWrites = false) {
      const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
        const url = new URL(input, 'http://localhost')
        if (init?.method && init.method !== 'GET') {
          if (failWrites) return jsonResponse({}, false)
          return init.method === 'DELETE'
            ? { ok: true, status: 204, json: async () => Promise.reject(new Error('no body')) }
            : jsonResponse({})
        }
        if (url.pathname === '/api/boards')
          return jsonResponse([{ id: BOARD_ID, name: board.name }])
        if (url.pathname === `/api/boards/${BOARD_ID}`) return jsonResponse(board)
        return jsonResponse([])
      })
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }

    async function openDetail() {
      const column = await screen.findByRole('region', { name: '未着手' })
      await userEvent.click(within(column).getByRole('button', { name: '要件定義書を読む の詳細' }))
      return column
    }

    function calls(fetchMock: ReturnType<typeof stubWrites>, method: string) {
      return fetchMock.mock.calls.filter(([, init]) => init?.method === method)
    }

    it('is closed by default and toggles open and closed', async () => {
      stubWrites()
      renderApp()
      const column = await screen.findByRole('region', { name: '未着手' })
      expect(within(column).queryByLabelText('カードの内容を編集')).not.toBeInTheDocument()

      await openDetail()
      expect(within(column).getByLabelText('カードの内容を編集')).toHaveValue('要件定義書を読む')
      expect(within(column).getByLabelText('期限を編集')).toHaveValue('2026-10-05')

      await userEvent.click(within(column).getByRole('button', { name: '要件定義書を読む の詳細' }))
      expect(within(column).queryByLabelText('カードの内容を編集')).not.toBeInTheDocument()
    })

    it('patches the edited text and due date', async () => {
      const fetchMock = stubWrites()
      renderApp()
      const column = await openDetail()

      const text = within(column).getByLabelText('カードの内容を編集')
      await userEvent.clear(text)
      await userEvent.type(text, ' 書き換えた ')
      await userEvent.clear(within(column).getByLabelText('期限を編集'))
      await userEvent.click(within(column).getByRole('button', { name: '保存' }))

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/cards/c1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ text: '書き換えた', due: '' }),
          }),
        ),
      )
    })

    it('does not save blank text', async () => {
      stubWrites()
      renderApp()
      const column = await openDetail()

      await userEvent.clear(within(column).getByLabelText('カードの内容を編集'))

      expect(within(column).getByRole('button', { name: '保存' })).toBeDisabled()
    })

    it('deletes the card only after confirmation', async () => {
      const fetchMock = stubWrites()
      const confirm = vi
        .spyOn(window, 'confirm')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
      renderApp()
      const column = await openDetail()

      await userEvent.click(within(column).getByRole('button', { name: 'カードを削除' }))
      expect(calls(fetchMock, 'DELETE')).toHaveLength(0)

      await userEvent.click(within(column).getByRole('button', { name: 'カードを削除' }))
      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/cards/c1',
          expect.objectContaining({ method: 'DELETE' }),
        ),
      )
      expect(confirm).toHaveBeenCalledTimes(2)
      confirm.mockRestore()
    })

    it('adds a subtask and clears the input', async () => {
      const fetchMock = stubWrites()
      renderApp()
      const column = await openDetail()

      const input = within(column).getByLabelText('小項目の内容')
      await userEvent.type(input, ' 12章を読む ')
      await userEvent.click(within(column).getByRole('button', { name: '小項目追加' }))

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/cards/c1/subtasks',
          expect.objectContaining({ method: 'POST', body: JSON.stringify({ text: '12章を読む' }) }),
        ),
      )
      await waitFor(() => expect(input).toHaveValue(''))
    })

    it('toggles and deletes a subtask', async () => {
      const fetchMock = stubWrites()
      renderApp()
      const column = await openDetail()

      await userEvent.click(within(column).getByRole('checkbox', { name: '11章を読む' }))
      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/subtasks/s2',
          expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ done: true }) }),
        ),
      )
      expect(within(column).getByRole('checkbox', { name: '10章を読む' })).toBeChecked()

      await userEvent.click(
        within(column).getByRole('button', { name: '小項目「10章を読む」を削除' }),
      )
      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/subtasks/s1',
          expect.objectContaining({ method: 'DELETE' }),
        ),
      )
    })

    it('shows an error when saving fails', async () => {
      stubWrites(true)
      renderApp()
      const column = await openDetail()

      await userEvent.click(within(column).getByRole('button', { name: '保存' }))

      expect(await within(column).findByRole('alert')).toHaveTextContent(
        'カードを保存できませんでした',
      )
    })
  })
})
