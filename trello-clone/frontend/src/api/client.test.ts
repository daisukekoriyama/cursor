import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiGet } from './client'

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
