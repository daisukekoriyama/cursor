// カードのドラッグ&ドロップ(ブラウザ標準のHTML5 API)でやり取りするデータ。
// dragover 中は中身を読めず types しか見えないため、独自のMIMEタイプで「カードのドラッグか」を判別する。
export const CARD_DRAG_TYPE = 'application/x-taskboard-card'

export interface DraggedCard {
  cardId: string
  listId: string
}

export function isCardDrag(dataTransfer: Pick<DataTransfer, 'types'>): boolean {
  return Array.from(dataTransfer.types).includes(CARD_DRAG_TYPE)
}

export function writeDraggedCard(dataTransfer: DataTransfer, card: DraggedCard): void {
  dataTransfer.setData(CARD_DRAG_TYPE, JSON.stringify(card))
  dataTransfer.effectAllowed = 'move'
}

// 想定外のデータ(他のドラッグ、壊れた文字列)は null にする
export function readDraggedCard(dataTransfer: Pick<DataTransfer, 'getData'>): DraggedCard | null {
  try {
    const value: unknown = JSON.parse(dataTransfer.getData(CARD_DRAG_TYPE))
    if (
      typeof value === 'object' &&
      value !== null &&
      'cardId' in value &&
      'listId' in value &&
      typeof value.cardId === 'string' &&
      typeof value.listId === 'string'
    ) {
      return { cardId: value.cardId, listId: value.listId }
    }
  } catch {
    // JSON でなければ、カードのドラッグではないものとして扱う
  }
  return null
}
