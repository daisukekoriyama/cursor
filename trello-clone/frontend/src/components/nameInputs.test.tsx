import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { NAME_MAX_LENGTH } from '../api/limits'
import type { ListResponse } from '../api/types'
import { AddBoardForm } from './AddBoardForm'
import { AddListForm } from './AddListForm'
import { ListSettings } from './ListSettings'

function withQueryClient(ui: ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
}

const list: ListResponse = { id: 'l1', boardId: 'b1', name: '未着手', order: 0, done: false }

describe('name inputs', () => {
  it('limits the name to 255 characters in every name input', async () => {
    const long = 'a'.repeat(300)

    render(
      withQueryClient(
        <>
          <AddBoardForm onCreated={() => {}} />
          <AddListForm boardId="b1" />
          <ListSettings list={list} />
        </>,
      ),
    )

    const inputs = [
      screen.getByRole('textbox', { name: 'ボード名' }),
      screen.getByRole('textbox', { name: 'リスト名' }),
      screen.getByRole('textbox', { name: 'リスト名を編集' }),
    ]
    for (const input of inputs) {
      expect(input).toHaveAttribute('maxLength', String(NAME_MAX_LENGTH))
      await userEvent.clear(input)
      await userEvent.type(input, long)
      expect(input).toHaveValue('a'.repeat(NAME_MAX_LENGTH))
    }
  }, 30_000)
})
