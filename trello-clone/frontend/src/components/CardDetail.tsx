import { useState, type FormEvent } from 'react'
import {
  useCreateSubtask,
  useDeleteCard,
  useDeleteSubtask,
  useMoveCard,
  useToggleSubtask,
  useUpdateCard,
} from '../api/queries'
import type { CardResponse, ListResponse, SubtaskResponse } from '../api/types'
import styles from './CardDetail.module.css'

interface Props {
  card: CardResponse
}

export function CardDetail({ card, lists }: Props & { lists: ListResponse[] }) {
  return (
    <div className={styles.detail}>
      <EditCardForm card={card} />
      <MoveCardSelect card={card} lists={lists} />
      <SubtaskList card={card} />
      <DeleteCardButton card={card} />
    </div>
  )
}

function ErrorMessage({ show, children }: { show: boolean; children: string }) {
  return show ? (
    <p role="alert" className={styles.error}>
      {children}
    </p>
  ) : null
}

function EditCardForm({ card }: Props) {
  const [text, setText] = useState(card.text)
  const [due, setDue] = useState(card.due ?? '')
  const update = useUpdateCard(card.id)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed === '') return
    update.mutate({ text: trimmed, due })
  }

  return (
    <form className={styles.row} onSubmit={submit}>
      <input
        className={styles.grow}
        aria-label="カードの内容を編集"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <input
        type="date"
        aria-label="期限を編集"
        value={due}
        onChange={(e) => setDue(e.target.value)}
      />
      <button type="submit" disabled={update.isPending || text.trim() === ''}>
        保存
      </button>
      <ErrorMessage show={update.isError}>カードを保存できませんでした。</ErrorMessage>
    </form>
  )
}

function MoveCardSelect({ card, lists }: Props & { lists: ListResponse[] }) {
  const move = useMoveCard(card.id)

  return (
    <div className={styles.row}>
      <label>
        移動先{' '}
        <select
          value={card.listId}
          disabled={move.isPending}
          onChange={(e) => move.mutate(e.target.value)}
        >
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </label>
      <ErrorMessage show={move.isError}>カードを移動できませんでした。</ErrorMessage>
    </div>
  )
}

function SubtaskList({ card }: Props) {
  const [text, setText] = useState('')
  const create = useCreateSubtask(card.id)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed === '') return
    create.mutate(trimmed, { onSuccess: () => setText('') })
  }

  return (
    <div>
      <ul className={styles.subtasks}>
        {card.subtasks.map((subtask) => (
          <SubtaskRow key={subtask.id} subtask={subtask} />
        ))}
      </ul>
      <form className={styles.row} onSubmit={submit}>
        <input
          className={styles.grow}
          aria-label="小項目の内容"
          placeholder="小項目を追加"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={create.isPending || text.trim() === ''}>
          小項目追加
        </button>
        <ErrorMessage show={create.isError}>小項目を追加できませんでした。</ErrorMessage>
      </form>
    </div>
  )
}

function SubtaskRow({ subtask }: { subtask: SubtaskResponse }) {
  const toggle = useToggleSubtask(subtask.id)
  const remove = useDeleteSubtask(subtask.id)

  return (
    <li className={styles.subtask}>
      <label className={subtask.done ? styles.done : undefined}>
        <input
          type="checkbox"
          checked={subtask.done}
          disabled={toggle.isPending}
          onChange={(e) => toggle.mutate(e.target.checked)}
        />{' '}
        {subtask.text}
      </label>
      <button
        type="button"
        aria-label={`小項目「${subtask.text}」を削除`}
        disabled={remove.isPending}
        onClick={() => remove.mutate()}
      >
        削除
      </button>
      <ErrorMessage show={toggle.isError || remove.isError}>
        小項目を更新できませんでした。
      </ErrorMessage>
    </li>
  )
}

function DeleteCardButton({ card }: Props) {
  const remove = useDeleteCard(card.id)

  function confirmAndDelete() {
    if (window.confirm(`カード「${card.text}」を削除しますか?`)) remove.mutate()
  }

  return (
    <div>
      <button type="button" disabled={remove.isPending} onClick={confirmAndDelete}>
        カードを削除
      </button>
      <ErrorMessage show={remove.isError}>カードを削除できませんでした。</ErrorMessage>
    </div>
  )
}
