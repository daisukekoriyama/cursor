// backend の Dtos.java に対応する型。日付は "yyyy-MM-dd" の文字列で届く。

export interface BoardSummary {
  id: string
  name: string
}

export interface ListResponse {
  id: string
  boardId: string
  name: string
  order: number
  // 完了リストか。ここへ移したカードには終了日が自動で入る
  done: boolean
}

export interface SubtaskResponse {
  id: string
  cardId: string
  text: string
  done: boolean
}

export interface CardResponse {
  id: string
  listId: string
  order: number
  text: string
  due: string | null
  completedAt: string | null
  subtasks: SubtaskResponse[]
}

export interface BoardDetail {
  id: string
  name: string
  lists: ListResponse[]
  cards: CardResponse[]
}
