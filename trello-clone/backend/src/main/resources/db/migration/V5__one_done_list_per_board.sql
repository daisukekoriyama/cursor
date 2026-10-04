-- 1 ボードに完了リストは 1 つまで。API でも検査するが、同時に送られた場合に備えて DB でも守る。
CREATE UNIQUE INDEX uq_lists_one_done_per_board ON lists (board_id) WHERE is_done;
