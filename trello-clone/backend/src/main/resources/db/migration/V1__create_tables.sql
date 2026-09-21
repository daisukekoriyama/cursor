CREATE TABLE boards (
    id   UUID         PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE lists (
    id         UUID         PRIMARY KEY,
    board_id   UUID         NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    sort_order INTEGER      NOT NULL
);

CREATE TABLE cards (
    id           UUID    PRIMARY KEY,
    list_id      UUID    NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
    text         TEXT    NOT NULL,
    due          DATE,
    completed_at DATE,
    sort_order   INTEGER NOT NULL
);

CREATE TABLE subtasks (
    id         UUID    PRIMARY KEY,
    card_id    UUID    NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
    text       TEXT    NOT NULL,
    done       BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL
);

CREATE INDEX idx_lists_board_id ON lists (board_id);
CREATE INDEX idx_cards_list_id ON cards (list_id);
CREATE INDEX idx_subtasks_card_id ON subtasks (card_id);
