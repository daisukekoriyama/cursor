const STORAGE_KEY = "trello-clone-data";

const listIds = ["todo", "doing", "done"];

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    return JSON.parse(raw);
  }
  return { todo: [], doing: [], done: [] };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = loadData();

function render() {
  listIds.forEach((listId) => {
    const container = document.querySelector(`.cards[data-list-id="${listId}"]`);
    container.innerHTML = "";
    data[listId].forEach((cardText, index) => {
      container.appendChild(createCardElement(listId, index, cardText));
    });
  });
}

function createCardElement(listId, index, text) {
  const card = document.createElement("div");
  card.className = "card";
  card.draggable = true;
  card.dataset.listId = listId;
  card.dataset.index = index;

  const label = document.createElement("span");
  label.textContent = text;
  card.appendChild(label);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", () => {
    data[listId].splice(index, 1);
    saveData(data);
    render();
  });
  card.appendChild(deleteBtn);

  card.addEventListener("dragstart", () => {
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });

  return card;
}

document.querySelectorAll(".add-card-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    const listId = form.dataset.listId;
    data[listId].push(text);
    saveData(data);
    input.value = "";
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

    const [movedText] = data[fromListId].splice(fromIndex, 1);
    data[toListId].push(movedText);

    saveData(data);
    render();
  });
});

render();
