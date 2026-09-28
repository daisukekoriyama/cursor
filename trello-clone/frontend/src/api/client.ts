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

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    throw new ApiError(response.status, `${method} ${path} failed (${response.status})`)
  }
  return response
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return (await (await send('POST', path, body)).json()) as T
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return (await (await send('PATCH', path, body)).json()) as T
}

// 成功すると 204 No Content が返るので、本文は読まない
export async function apiDelete(path: string): Promise<void> {
  await send('DELETE', path)
}
