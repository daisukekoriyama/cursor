import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiGet, apiPost } from './client'

function mockFetch(response: Partial<Response>) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('apiGet', () => {
  it('calls /api with only the defined query parameters', async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => [] })

    await apiGet('/cards', { keyword: 'api', completed: false, listId: undefined, boardId: '' })

    expect(fetchMock).toHaveBeenCalledWith('/api/cards?keyword=api&completed=false')
  })

  it('throws ApiError with the status when the response is not ok', async () => {
    mockFetch({ ok: false, status: 500 })

    await expect(apiGet('/cards')).rejects.toMatchObject({
      name: ApiError.name,
      status: 500,
    })
  })
})

describe('apiPost', () => {
  it('sends the body as JSON and returns the parsed response', async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ id: 'c1' }) })

    const result = await apiPost('/lists/l1/cards', { text: 'a' })

    expect(result).toEqual({ id: 'c1' })
    expect(fetchMock).toHaveBeenCalledWith('/api/lists/l1/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"text":"a"}',
    })
  })

  it('throws ApiError with the status when the response is not ok', async () => {
    mockFetch({ ok: false, status: 400 })

    await expect(apiPost('/lists/l1/cards', {})).rejects.toMatchObject({ status: 400 })
  })
})
