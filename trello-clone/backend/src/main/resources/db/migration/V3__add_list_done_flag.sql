-- 完了リストを名前ではなくフラグで識別する。既存の「完了」という名前のリストは完了リストとして引き継ぐ。
ALTER TABLE lists ADD COLUMN is_done BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE lists SET is_done = TRUE WHERE name = '完了';
