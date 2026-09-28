import { describe, expect, it } from 'vitest'
import { formatLastUpdated } from './lastUpdated'

describe('formatLastUpdated', () => {
  it('formats an ISO timestamp in local time with zero padding', () => {
    // タイムゾーンに依存しないよう、ローカル時刻から ISO 文字列を作る
    expect(formatLastUpdated(new Date(2026, 8, 28, 15, 30, 45).toISOString())).toBe(
      '最終更新: 2026/09/28 15:30',
    )
    expect(formatLastUpdated(new Date(2027, 0, 5, 3, 7).toISOString())).toBe(
      '最終更新: 2027/01/05 03:07',
    )
  })

  it('reads the backend format with microseconds and a Z suffix', () => {
    const local = new Date('2026-09-28T07:48:12.988580Z')

    expect(formatLastUpdated('2026-09-28T07:48:12.988580Z')).toBe(
      `最終更新: 2026/09/28 ${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`,
    )
  })

  it('says it has not been updated yet for null', () => {
    expect(formatLastUpdated(null)).toBe('最終更新: まだ更新されていません')
  })
})
