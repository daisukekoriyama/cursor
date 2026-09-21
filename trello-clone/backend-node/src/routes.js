const express = require("express");
const { randomUUID } = require("crypto");
const db = require("./db");

const router = express.Router();

function getBoardDetail(boardId) {
  const board = db.prepare("SELECT * FROM boards WHERE id = ?").get(boardId);
  if (!board) return null;

  const lists = db
    .prepare('SELECT * FROM lists WHERE board_id = ? ORDER BY "order" ASC')
    .all(boardId);

  const cards = db
    .prepare(
      `SELECT cards.* FROM cards
       JOIN lists ON lists.id = cards.list_id
       WHERE lists.board_id = ?
       ORDER BY cards."order" ASC`
    )
    .all(boardId);

  const cardIds = cards.map((card) => card.id);
  const subtasksByCard = {};
  if (cardIds.length) {
    const placeholders = cardIds.map(() => "?").join(",");
    const subtasks = db
      .prepare(`SELECT * FROM subtasks WHERE card_id IN (${placeholders})`)
      .all(...cardIds);
    subtasks.forEach((subtask) => {
      if (!subtasksByCard[subtask.card_id]) subtasksByCard[subtask.card_id] = [];
      subtasksByCard[subtask.card_id].push({
        id: subtask.id,
        text: subtask.text,
        done: !!subtask.done,
      });
    });
  }

  return {
    id: board.id,
    name: board.name,
    lists: lists.map((list) => ({ id: list.id, name: list.name, order: list.order })),
    cards: cards.map((card) => ({
      id: card.id,
      listId: card.list_id,
      order: card.order,
      text: card.text,
      due: card.due || "",
      completedAt: card.completed_at || "",
      subtasks: subtasksByCard[card.id] || [],
    })),
  };
}

// GET /boards
router.get("/boards", (req, res) => {
  const boards = db.prepare("SELECT id, name FROM boards").all();
  res.json(boards);
});

// POST /boards
router.post("/boards", (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  const id = randomUUID();
  db.prepare("INSERT INTO boards (id, name) VALUES (?, ?)").run(id, name.trim());
  res.status(201).json({ id, name: name.trim() });
});

// GET /boards/:boardId
router.get("/boards/:boardId", (req, res) => {
  const board = getBoardDetail(req.params.boardId);
  if (!board) return res.status(404).json({ error: "board not found" });
  res.json(board);
});

// POST /boards/:boardId/lists
router.post("/boards/:boardId/lists", (req, res) => {
  const board = db.prepare("SELECT id FROM boards WHERE id = ?").get(req.params.boardId);
  if (!board) return res.status(404).json({ error: "board not found" });

  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const maxOrder = db
    .prepare('SELECT MAX("order") AS maxOrder FROM lists WHERE board_id = ?')
    .get(board.id).maxOrder;
  const order = maxOrder === null ? 0 : maxOrder + 1;

  const id = randomUUID();
  db.prepare('INSERT INTO lists (id, board_id, name, "order") VALUES (?, ?, ?, ?)').run(
    id,
    board.id,
    name.trim(),
    order
  );
  res.status(201).json({ id, boardId: board.id, name: name.trim(), order });
});

// PATCH /lists/:listId
router.patch("/lists/:listId", (req, res) => {
  const list = db.prepare("SELECT * FROM lists WHERE id = ?").get(req.params.listId);
  if (!list) return res.status(404).json({ error: "list not found" });

  const name = req.body.name !== undefined ? req.body.name.trim() : list.name;
  const order = req.body.order !== undefined ? req.body.order : list.order;

  if (!name) return res.status(400).json({ error: "name cannot be empty" });

  db.prepare('UPDATE lists SET name = ?, "order" = ? WHERE id = ?').run(name, order, list.id);
  res.json({ id: list.id, boardId: list.board_id, name, order });
});

// DELETE /lists/:listId
router.delete("/lists/:listId", (req, res) => {
  const result = db.prepare("DELETE FROM lists WHERE id = ?").run(req.params.listId);
  if (result.changes === 0) return res.status(404).json({ error: "list not found" });
  res.status(204).send();
});

// POST /lists/:listId/cards
router.post("/lists/:listId/cards", (req, res) => {
  const list = db.prepare("SELECT * FROM lists WHERE id = ?").get(req.params.listId);
  if (!list) return res.status(404).json({ error: "list not found" });

  const { text, due } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  const maxOrder = db
    .prepare('SELECT MAX("order") AS maxOrder FROM cards WHERE list_id = ?')
    .get(list.id).maxOrder;
  const order = maxOrder === null ? 0 : maxOrder + 1;

  const id = randomUUID();
  db.prepare(
    'INSERT INTO cards (id, list_id, text, due, completed_at, "order") VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, list.id, text.trim(), due || "", "", order);

  res.status(201).json({
    id,
    listId: list.id,
    order,
    text: text.trim(),
    due: due || "",
    completedAt: "",
    subtasks: [],
  });
});

// PATCH /cards/:cardId
router.patch("/cards/:cardId", (req, res) => {
  const card = db.prepare("SELECT * FROM cards WHERE id = ?").get(req.params.cardId);
  if (!card) return res.status(404).json({ error: "card not found" });

  if (req.body.listId !== undefined) {
    const targetList = db.prepare("SELECT id FROM lists WHERE id = ?").get(req.body.listId);
    if (!targetList) return res.status(400).json({ error: "listId not found" });
  }

  const text = req.body.text !== undefined ? req.body.text.trim() : card.text;
  const due = req.body.due !== undefined ? req.body.due : card.due;
  const listId = req.body.listId !== undefined ? req.body.listId : card.list_id;
  const order = req.body.order !== undefined ? req.body.order : card.order;
  const completedAt =
    req.body.completedAt !== undefined ? req.body.completedAt : card.completed_at;

  if (!text) return res.status(400).json({ error: "text cannot be empty" });

  db.prepare(
    'UPDATE cards SET text = ?, due = ?, list_id = ?, "order" = ?, completed_at = ? WHERE id = ?'
  ).run(text, due || "", listId, order, completedAt || "", card.id);

  res.json({
    id: card.id,
    listId,
    order,
    text,
    due: due || "",
    completedAt: completedAt || "",
  });
});

// DELETE /cards/:cardId
router.delete("/cards/:cardId", (req, res) => {
  const result = db.prepare("DELETE FROM cards WHERE id = ?").run(req.params.cardId);
  if (result.changes === 0) return res.status(404).json({ error: "card not found" });
  res.status(204).send();
});

// POST /cards/:cardId/subtasks
router.post("/cards/:cardId/subtasks", (req, res) => {
  const card = db.prepare("SELECT id FROM cards WHERE id = ?").get(req.params.cardId);
  if (!card) return res.status(404).json({ error: "card not found" });

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  const id = randomUUID();
  db.prepare("INSERT INTO subtasks (id, card_id, text, done) VALUES (?, ?, ?, 0)").run(
    id,
    card.id,
    text.trim()
  );
  res.status(201).json({ id, cardId: card.id, text: text.trim(), done: false });
});

// PATCH /subtasks/:subtaskId
router.patch("/subtasks/:subtaskId", (req, res) => {
  const subtask = db.prepare("SELECT * FROM subtasks WHERE id = ?").get(req.params.subtaskId);
  if (!subtask) return res.status(404).json({ error: "subtask not found" });

  const text = req.body.text !== undefined ? req.body.text.trim() : subtask.text;
  const done = req.body.done !== undefined ? (req.body.done ? 1 : 0) : subtask.done;

  if (!text) return res.status(400).json({ error: "text cannot be empty" });

  db.prepare("UPDATE subtasks SET text = ?, done = ? WHERE id = ?").run(text, done, subtask.id);
  res.json({ id: subtask.id, cardId: subtask.card_id, text, done: !!done });
});

// DELETE /subtasks/:subtaskId
router.delete("/subtasks/:subtaskId", (req, res) => {
  const result = db.prepare("DELETE FROM subtasks WHERE id = ?").run(req.params.subtaskId);
  if (result.changes === 0) return res.status(404).json({ error: "subtask not found" });
  res.status(204).send();
});

module.exports = router;
