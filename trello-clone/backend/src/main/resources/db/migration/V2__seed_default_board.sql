WITH new_board AS (
    INSERT INTO boards (id, name) VALUES (gen_random_uuid(), 'マイボード') RETURNING id
)
INSERT INTO lists (id, board_id, name, sort_order)
SELECT gen_random_uuid(), new_board.id, v.name, v.sort_order
FROM new_board,
     (VALUES ('未着手', 0), ('進行中', 1), ('完了', 2)) AS v (name, sort_order);
