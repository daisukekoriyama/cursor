const API_BASE = '/api'

export class ApiError extends Error {
  readonly status: number
  // サーバーが { "error": "..." } で返した理由。返されなかったときは null
  readonly reason: string | null

  constructor(status: number, message: string, reason: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.reason = reason
  }
}

// 失敗したときのサーバーの理由を取り出す。本文が JSON でなければ null
async function readReason(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json()
    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      return body.error
    }
  } catch {
    // 本文が JSON でなければ、理由は無いものとして扱う
  }
  return null
}

async function failure(response: Response, label: string): Promise<ApiError> {
  return new ApiError(
    response.status,
    `${label} failed (${response.status})`,
    await readReason(response),
  )
}

// 画面に添えるための、サーバーが返した理由(ApiError 以外は null)
export function serverErrorMessage(error: unknown): string | null {
  return error instanceof ApiError ? error.reason : null
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
    throw await failure(response, `GET ${path}`)
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
    throw await failure(response, `${method} ${path}`)
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
