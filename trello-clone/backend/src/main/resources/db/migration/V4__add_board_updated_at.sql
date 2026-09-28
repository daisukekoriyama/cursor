-- ボードの中身(リスト・カード・小項目)を最後に変更した日時。NULL は「まだ更新されていない」。
ALTER TABLE boards ADD COLUMN updated_at TIMESTAMPTZ;
