const STORAGE_KEY = "trello-clone-data";
const UPDATED_AT_KEY = "trello-clone-updated-at";

const DEFAULT_LISTS = [
  { id: "todo", name: "未着手" },
  { id: "doing", name: "進行中" },
  { id: "done", name: "完了" },
];

function normalizeSubtask(subtask) {
  if (typeof subtask === "string") {
    return { text: subtask, done: false };
  }
  return { text: subtask.text, done: !!subtask.done };
}

function normalizeCard(card) {
  if (typeof card === "string") {
    return { text: card, due: "", subtasks: [], completedAt: "" };
  }
  return {
    text: card.text,
    due: card.due || "",
    subtasks: Array.isArray(card.subtasks) ? card.subtasks.map(normalizeSubtask) : [],
    completedAt: card.completedAt || "",
  };
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const cards = {};
    DEFAULT_LISTS.forEach((list) => {
      cards[list.id] = [];
    });
    return { lists: DEFAULT_LISTS.map((list) => ({ ...list })), cards };
  }

  const parsed = JSON.parse(raw);

  if (!parsed.lists) {
    // 旧形式 { todo: [...], doing: [...], done: [...] } からの移行
    const cards = {};
    DEFAULT_LISTS.forEach((list) => {
      cards[list.id] = (parsed[list.id] || []).map(normalizeCard);
    });
    return { lists: DEFAULT_LISTS.map((list) => ({ ...list })), cards };
  }

  const lists = parsed.lists.map((list) => ({ id: list.id, name: list.name || "" }));
  const cards = {};
  lists.forEach((list) => {
    cards[list.id] = ((parsed.cards && parsed.cards[list.id]) || []).map(normalizeCard);
  });
  return { lists, cards };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem(UPDATED_AT_KEY, new Date().toISOString());
}

let data = loadData();
let editingCard = null;
let editingList = null;

function formatDue(due) {
  const [year, month, day] = due.split("-");
  return `${month}/${day}`;
}

function localDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayISO() {
  return localDateISO(new Date());
}

function isOverdue(due) {
  if (!due) return false;
  return due < todayISO();
}

function completeCard(listId, index) {
  const [card] = data.cards[listId].splice(index, 1);
  card.completedAt = todayISO();
  data.cards.done.push(card);
  saveData(data);
  render();
}

function sortByDue(listId) {
  data.cards[listId].sort((a, b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
  });
}

function render() {
  const board = document.getElementById("board");
  board.innerHTML = "";
  data.lists.forEach((list) => {
    sortByDue(list.id);
    board.appendChild(createListElement(list));
  });
  board.appendChild(createAddListElement());
  renderTodayDate();
  renderCalendar();
  renderLastUpdated();
}

function renderTodayDate() {
  const label = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  document.getElementById("today-date").textContent = `今日: ${label}`;
}

function renderLastUpdated() {
  const el = document.getElementById("last-updated");
  const raw = localStorage.getItem(UPDATED_AT_KEY);
  if (!raw) {
    el.textContent = "最終更新: まだ更新されていません";
    return;
  }
  const label = new Date(raw).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  el.textContent = `最終更新: ${label}`;
}

function collectDueMap() {
  const map = {};
  data.lists.forEach((list) => {
    if (list.id === "done") return;
    data.cards[list.id].forEach((card) => {
      if (!card.due) return;
      if (!map[card.due]) map[card.due] = [];
      map[card.due].push(card.text);
    });
  });
  return map;
}

function renderCalendar() {
  const container = document.getElementById("calendar");
  container.innerHTML = "";

  const dueMap = collectDueMap();
  const today = new Date();
  const todayKey = todayISO();

  const months = document.createElement("div");
  months.className = "calendar-months";

  for (let offset = 0; offset < 3; offset++) {
    const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    months.appendChild(createMonthElement(first, dueMap, todayKey));
  }

  container.appendChild(months);
}

function createMonthElement(first, dueMap, todayKey) {
  const monthEl = document.createElement("div");
  monthEl.className = "calendar-month";

  const title = document.createElement("div");
  title.className = "calendar-title";
  title.textContent = `${first.getFullYear()}年${first.getMonth() + 1}月`;
  monthEl.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "calendar-grid";

  ["日", "月", "火", "水", "木", "金", "土"].forEach((name) => {
    const head = document.createElement("div");
    head.className = "calendar-weekday";
    head.textContent = name;
    grid.appendChild(head);
  });

  for (let i = 0; i < first.getDay(); i++) {
    const blank = document.createElement("div");
    grid.appendChild(blank);
  }

  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(first.getFullYear(), first.getMonth(), day);
    const key = localDateISO(date);

    const cell = document.createElement("div");
    cell.className = "calendar-day";
    cell.textContent = day;
    if (key === todayKey) cell.classList.add("today");
    if (dueMap[key]) {
      cell.classList.add("has-due");
      cell.title = `期限: ${dueMap[key].join("、")}`;
    }
    grid.appendChild(cell);
  }

  monthEl.appendChild(grid);
  return monthEl;
}

function createListElement(list) {
  const listId = list.id;
  const listEl = document.createElement("section");
  listEl.className = "list";
  listEl.dataset.listId = listId;

  if (editingList === listId) {
    listEl.appendChild(createListRenameForm(list));
  } else {
    listEl.appendChild(createListHeader(list));
  }

  const container = document.createElement("div");
  container.className = "cards";
  container.dataset.listId = listId;

  data.cards[listId].forEach((card, index) => {
    container.appendChild(createCardElement(listId, index, card));
  });

  container.addEventListener("dragover", (event) => {
    event.preventDefault();
    container.classList.add("drag-over");
  });

  container.addEventListener("dragleave", () => {
    container.classList.remove("drag-over");
  });

  container.addEventListener("drop", (event) => {
    event.preventDefault();
    container.classList.remove("drag-over");

    const dragging = document.querySelector(".card.dragging");
    if (!dragging) return;

    const fromListId = dragging.dataset.listId;
    const fromIndex = Number(dragging.dataset.index);
    const toListId = listId;
    if (!data.cards[fromListId]) return;

    const [movedCard] = data.cards[fromListId].splice(fromIndex, 1);
    movedCard.completedAt = toListId === "done" ? todayISO() : "";
    data.cards[toListId].push(movedCard);

    saveData(data);
    render();
  });

  listEl.appendChild(container);
  listEl.appendChild(createAddCardForm(listId));

  return listEl;
}

function createListHeader(list) {
  const header = document.createElement("div");
  header.className = "list-header";

  const title = document.createElement("h2");
  title.textContent = list.name;
  header.appendChild(title);

  const actions = document.createElement("div");
  actions.className = "list-actions";

  const renameBtn = document.createElement("button");
  renameBtn.type = "button";
  renameBtn.className = "list-rename-btn";
  renameBtn.textContent = "✎";
  renameBtn.title = "リスト名を変更";
  renameBtn.addEventListener("click", () => {
    editingList = list.id;
    render();
  });
  actions.appendChild(renameBtn);

  if (list.id !== "done") {
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "list-delete-btn";
    deleteBtn.textContent = "×";
    deleteBtn.title = "リストを削除";
    deleteBtn.addEventListener("click", () => {
      const cardCount = data.cards[list.id].length;
      const message = cardCount
        ? `「${list.name}」を削除しますか?リスト内の${cardCount}件のカードも削除されます。`
        : `「${list.name}」を削除しますか?`;
      if (!confirm(message)) return;

      data.lists = data.lists.filter((l) => l.id !== list.id);
      delete data.cards[list.id];
      if (editingCard && editingCard.listId === list.id) editingCard = null;
      if (editingList === list.id) editingList = null;

      saveData(data);
      render();
    });
    actions.appendChild(deleteBtn);
  }

  header.appendChild(actions);
  return header;
}

function createListRenameForm(list) {
  const form = document.createElement("form");
  form.className = "list-rename-form";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = list.name;
  nameInput.required = true;
  form.appendChild(nameInput);

  const buttonRow = document.createElement("div");
  buttonRow.className = "edit-actions";

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.textContent = "保存";
  buttonRow.appendChild(saveBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "キャンセル";
  cancelBtn.addEventListener("click", () => {
    editingList = null;
    render();
  });
  buttonRow.appendChild(cancelBtn);

  form.appendChild(buttonRow);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const target = data.lists.find((l) => l.id === list.id);
    target.name = name;
    editingList = null;
    saveData(data);
    render();
  });

  return form;
}

function createAddCardForm(listId) {
  const form = document.createElement("form");
  form.className = "add-card-form";

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.name = "text";
  textInput.placeholder = "タスクを入力してEnter";
  textInput.required = true;
  form.appendChild(textInput);

  const dueInput = document.createElement("input");
  dueInput.type = "date";
  dueInput.name = "due";
  dueInput.className = "due-input";
  form.appendChild(dueInput);

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "追加";
  form.appendChild(submitBtn);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = textInput.value.trim();
    if (!text) return;
    data.cards[listId].push({ text, due: dueInput.value, subtasks: [], completedAt: "" });
    saveData(data);
    render();
  });

  return form;
}

function createAddListElement() {
  const form = document.createElement("form");
  form.className = "add-list-form";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "リストを追加";
  nameInput.required = true;
  form.appendChild(nameInput);

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "リストを追加";
  form.appendChild(submitBtn);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    data.lists.push({ id, name });
    data.cards[id] = [];
    saveData(data);
    render();
  });

  return form;
}

function createCardElement(listId, index, card) {
  const cardEl = document.createElement("div");
  cardEl.className = "card";
  cardEl.dataset.listId = listId;
  cardEl.dataset.index = index;

  const isEditing =
    editingCard && editingCard.listId === listId && editingCard.index === index;

  if (isEditing) {
    cardEl.appendChild(createCardEditForm(listId, index, card));
    return cardEl;
  }

  cardEl.draggable = true;

  const body = document.createElement("div");
  body.className = "card-body";

  if (listId === "done") {
    if (card.completedAt) {
      const doneBadge = document.createElement("span");
      doneBadge.className = "due-badge done-badge";
      doneBadge.textContent = `終了日 ${formatDue(card.completedAt)}`;
      body.appendChild(doneBadge);
    }
  } else if (card.due) {
    const dueBadge = document.createElement("span");
    dueBadge.className = "due-badge";
    if (isOverdue(card.due)) {
      dueBadge.classList.add("overdue");
    }
    dueBadge.textContent = `期限 ${formatDue(card.due)}`;
    body.appendChild(dueBadge);
  }

  const titleRow = document.createElement("div");
  titleRow.className = "card-title-row";

  if (listId !== "done") {
    const completeCheckbox = document.createElement("input");
    completeCheckbox.type = "checkbox";
    completeCheckbox.className = "complete-checkbox";
    completeCheckbox.title = "完了にする";
    completeCheckbox.addEventListener("change", () => {
      completeCard(listId, index);
    });
    titleRow.appendChild(completeCheckbox);
  }

  const label = document.createElement("span");
  label.className = "card-text";
  label.textContent = card.text;
  titleRow.appendChild(label);

  body.appendChild(titleRow);

  body.appendChild(createSubtasksElement(listId, index, card));

  cardEl.appendChild(body);

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn";
  editBtn.textContent = "✎";
  editBtn.type = "button";
  editBtn.addEventListener("click", () => {
    editingCard = { listId, index };
    render();
  });
  actions.appendChild(editBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "×";
  deleteBtn.type = "button";
  deleteBtn.addEventListener("click", () => {
    data.cards[listId].splice(index, 1);
    saveData(data);
    render();
  });
  actions.appendChild(deleteBtn);

  cardEl.appendChild(actions);

  cardEl.addEventListener("dragstart", () => {
    cardEl.classList.add("dragging");
  });
  cardEl.addEventListener("dragend", () => {
    cardEl.classList.remove("dragging");
  });

  return cardEl;
}

function createSubtasksElement(listId, index, card) {
  const wrap = document.createElement("div");
  wrap.className = "subtasks";

  if (card.subtasks.length) {
    const doneCount = card.subtasks.filter((subtask) => subtask.done).length;
    const progress = document.createElement("span");
    progress.className = "subtask-progress";
    progress.textContent = `✓ ${doneCount}/${card.subtasks.length}`;
    wrap.appendChild(progress);

    const list = document.createElement("ul");
    list.className = "subtask-list";

    card.subtasks.forEach((subtask, subIndex) => {
      const li = document.createElement("li");
      li.className = "subtask-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = subtask.done;
      checkbox.addEventListener("change", () => {
        data.cards[listId][index].subtasks[subIndex].done = checkbox.checked;
        saveData(data);
        render();
      });
      li.appendChild(checkbox);

      const subLabel = document.createElement("span");
      subLabel.className = "subtask-text";
      if (subtask.done) subLabel.classList.add("done");
      subLabel.textContent = subtask.text;
      li.appendChild(subLabel);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "subtask-delete-btn";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => {
        data.cards[listId][index].subtasks.splice(subIndex, 1);
        saveData(data);
        render();
      });
      li.appendChild(removeBtn);

      list.appendChild(li);
    });

    wrap.appendChild(list);
  }

  const addForm = document.createElement("form");
  addForm.className = "add-subtask-form";

  const subtaskInput = document.createElement("input");
  subtaskInput.type = "text";
  subtaskInput.placeholder = "小項目を追加";
  addForm.appendChild(subtaskInput);

  addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = subtaskInput.value.trim();
    if (!text) return;
    data.cards[listId][index].subtasks.push({ text, done: false });
    saveData(data);
    render();
  });

  wrap.appendChild(addForm);

  return wrap;
}

function createCardEditForm(listId, index, card) {
  const form = document.createElement("form");
  form.className = "edit-card-form";

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.name = "text";
  textInput.value = card.text;
  textInput.required = true;
  form.appendChild(textInput);

  const dueInput = document.createElement("input");
  dueInput.type = "date";
  dueInput.name = "due";
  dueInput.value = card.due;
  form.appendChild(dueInput);

  const buttonRow = document.createElement("div");
  buttonRow.className = "edit-actions";

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.textContent = "保存";
  buttonRow.appendChild(saveBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "キャンセル";
  cancelBtn.addEventListener("click", () => {
    editingCard = null;
    render();
  });
  buttonRow.appendChild(cancelBtn);

  form.appendChild(buttonRow);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = textInput.value.trim();
    if (!text) return;
    data.cards[listId][index] = {
      text,
      due: dueInput.value,
      subtasks: card.subtasks,
      completedAt: card.completedAt,
    };
    editingCard = null;
    saveData(data);
    render();
  });

  return form;
}

render();
