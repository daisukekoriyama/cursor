import { describe, expect, it } from 'vitest'
import { CARD_DRAG_TYPE, isCardDrag, readDraggedCard } from './cardDrag'

const withData = (data: string) => ({ getData: () => data })

describe('cardDrag', () => {
  it('recognises a card drag by its MIME type', () => {
    expect(isCardDrag({ types: [CARD_DRAG_TYPE, 'text/plain'] })).toBe(true)
    expect(isCardDrag({ types: ['text/plain', 'Files'] })).toBe(false)
  })

  it('reads a dragged card', () => {
    expect(readDraggedCard(withData('{"cardId":"c1","listId":"l1"}'))).toEqual({
      cardId: 'c1',
      listId: 'l1',
    })
  })

  it('returns null for empty, broken or malformed data', () => {
    expect(readDraggedCard(withData(''))).toBeNull()
    expect(readDraggedCard(withData('not json'))).toBeNull()
    expect(readDraggedCard(withData('null'))).toBeNull()
    expect(readDraggedCard(withData('{"cardId":1,"listId":"l1"}'))).toBeNull()
    expect(readDraggedCard(withData('{"cardId":"c1"}'))).toBeNull()
  })
})
