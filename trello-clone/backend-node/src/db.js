const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "..", "data.sqlite3");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lists (
    id       TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name     TEXT NOT NULL,
    "order"  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id           TEXT PRIMARY KEY,
    list_id      TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    text         TEXT NOT NULL,
    due          TEXT,
    completed_at TEXT,
    "order"      INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id      TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    text    TEXT NOT NULL,
    done    INTEGER NOT NULL DEFAULT 0
  );
`);

function seedDefaultBoard() {
  const boardCount = db.prepare("SELECT COUNT(*) AS count FROM boards").get().count;
  if (boardCount > 0) return;

  const { randomUUID } = require("crypto");
  const boardId = randomUUID();
  db.prepare("INSERT INTO boards (id, name) VALUES (?, ?)").run(boardId, "マイボード");

  const defaultLists = [
    { name: "未着手", order: 0 },
    { name: "進行中", order: 1 },
    { name: "完了", order: 2 },
  ];
  const insertList = db.prepare(
    'INSERT INTO lists (id, board_id, name, "order") VALUES (?, ?, ?, ?)'
  );
  defaultLists.forEach((list) => {
    insertList.run(randomUUID(), boardId, list.name, list.order);
  });
}

seedDefaultBoard();

module.exports = db;
