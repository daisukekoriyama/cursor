import { serverErrorMessage } from '../api/client'

interface Props {
  // 失敗した操作の error(react-query の mutation.error)。null / undefined のときは何も出さない
  error: unknown
  className?: string
  as?: 'p' | 'span'
  children: string
}

// 失敗した操作の近くに出すエラー。サーバーが返した理由があれば、括弧で添える
export function FormError({ error, className, as: Tag = 'p', children }: Props) {
  if (!error) return null
  const reason = serverErrorMessage(error)
  return (
    <Tag role="alert" className={className}>
      {children}
      {reason ? ` (${reason})` : null}
    </Tag>
  )
}
