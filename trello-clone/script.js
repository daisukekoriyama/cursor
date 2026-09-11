const STORAGE_KEY = "trello-clone-data";

const listIds = ["todo", "doing", "done"];

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
    return { todo: [], doing: [], done: [] };
  }
  const parsed = JSON.parse(raw);
  const normalized = {};
  listIds.forEach((listId) => {
    normalized[listId] = (parsed[listId] || []).map(normalizeCard);
  });
  return normalized;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = loadData();
let editingCard = null;

function formatDue(due) {
  const [year, month, day] = due.split("-");
  return `${month}/${day}`;
}

function isOverdue(due) {
  if (!due) return false;
  const today = new Date().toISOString().slice(0, 10);
  return due < today;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function completeCard(listId, index) {
  const [card] = data[listId].splice(index, 1);
  card.completedAt = todayISO();
  data.done.push(card);
  saveData(data);
  render();
}

function sortByDue(listId) {
  data[listId].sort((a, b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
  });
}

function render() {
  listIds.forEach((listId) => {
    sortByDue(listId);
    const container = document.querySelector(`.cards[data-list-id="${listId}"]`);
    container.innerHTML = "";
    data[listId].forEach((card, index) => {
      container.appendChild(createCardElement(listId, index, card));
    });
  });
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
    data[listId].splice(index, 1);
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
        data[listId][index].subtasks[subIndex].done = checkbox.checked;
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
        data[listId][index].subtasks.splice(subIndex, 1);
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
    data[listId][index].subtasks.push({ text, done: false });
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
    data[listId][index] = {
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

document.querySelectorAll(".add-card-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const textInput = form.querySelector('input[name="text"]');
    const dueInput = form.querySelector('input[name="due"]');
    const text = textInput.value.trim();
    if (!text) return;
    const listId = form.dataset.listId;
    data[listId].push({ text, due: dueInput.value, subtasks: [], completedAt: "" });
    saveData(data);
    textInput.value = "";
    dueInput.value = "";
    render();
  });
});

document.querySelectorAll(".cards").forEach((container) => {
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
    const toListId = container.dataset.listId;

    const [movedCard] = data[fromListId].splice(fromIndex, 1);
    if (toListId === "done") {
      movedCard.completedAt = todayISO();
    } else {
      movedCard.completedAt = "";
    }
    data[toListId].push(movedCard);

    saveData(data);
    render();
  });
});

render();
