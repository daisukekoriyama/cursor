const API_BASE = '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | boolean | undefined>,
): Promise<T> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  const queryString = query.size > 0 ? `?${query}` : ''

  const response = await fetch(`${API_BASE}${path}${queryString}`)
  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed (${response.status})`)
  }
  return (await response.json()) as T
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new ApiError(response.status, `POST ${path} failed (${response.status})`)
  }
  return (await response.json()) as T
}
