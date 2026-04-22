const DEFAULT_BASES = ["紅茶", "綠茶"];
const DEFAULT_TOPPINGS = ["百香", "青梅", "梅子"];
const STORAGE_KEYS = {
  bases: "drink-web:bases",
  toppings: "drink-web:toppings",
  hiddenBases: "drink-web:hidden-bases",
  hiddenToppings: "drink-web:hidden-toppings",
};

const state = {
  bases: loadList(STORAGE_KEYS.bases, DEFAULT_BASES),
  toppings: loadList(STORAGE_KEYS.toppings, DEFAULT_TOPPINGS),
  hiddenBases: loadList(STORAGE_KEYS.hiddenBases, []),
  hiddenToppings: loadList(STORAGE_KEYS.hiddenToppings, []),
};

const elements = {
  baseList: document.querySelector("#base-list"),
  toppingList: document.querySelector("#topping-list"),
  baseCount: document.querySelector("#base-count"),
  toppingCount: document.querySelector("#topping-count"),
  baseForm: document.querySelector("#base-form"),
  toppingForm: document.querySelector("#topping-form"),
  baseInput: document.querySelector("#base-input"),
  toppingInput: document.querySelector("#topping-input"),
  comboCount: document.querySelector("#combo-count"),
  generateButton: document.querySelector("#generate-button"),
  resetButton: document.querySelector("#reset-button"),
  resultOutput: document.querySelector("#result-output"),
  notice: document.querySelector("#notice"),
};

elements.baseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addItem("bases", elements.baseInput);
});

elements.toppingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addItem("toppings", elements.toppingInput);
});

elements.generateButton.addEventListener("click", generateDrink);
elements.comboCount.addEventListener("input", () => {
  normalizeComboCount();
  clearNotice();
});

elements.resetButton.addEventListener("click", () => {
  const shouldReset = window.confirm("要恢復預設茶底與配料嗎？");

  if (!shouldReset) {
    return;
  }

  state.bases = [...DEFAULT_BASES];
  state.toppings = [...DEFAULT_TOPPINGS];
  state.hiddenBases = [];
  state.hiddenToppings = [];
  saveAll();
  render();
  elements.resultOutput.textContent = "點一下產生飲料";
  setNotice("已恢復預設資料。");
});

render();

function loadList(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    const parsedValue = rawValue ? JSON.parse(rawValue) : null;

    if (!Array.isArray(parsedValue)) {
      return [...fallback];
    }

    const cleanItems = parsedValue
      .map((item) => String(item).trim())
      .filter(Boolean);

    return uniqueItems(cleanItems).length ? uniqueItems(cleanItems) : [...fallback];
  } catch {
    return [...fallback];
  }
}

function uniqueItems(items) {
  return [...new Set(items)];
}

function saveAll() {
  localStorage.setItem(STORAGE_KEYS.bases, JSON.stringify(state.bases));
  localStorage.setItem(STORAGE_KEYS.toppings, JSON.stringify(state.toppings));
  localStorage.setItem(STORAGE_KEYS.hiddenBases, JSON.stringify(state.hiddenBases));
  localStorage.setItem(STORAGE_KEYS.hiddenToppings, JSON.stringify(state.hiddenToppings));
}

function addItem(type, input) {
  const value = input.value.trim();
  const label = type === "bases" ? "茶底" : "配料";

  if (!value) {
    setNotice(`請先輸入${label}名稱。`, true);
    return;
  }

  if (state[type].includes(value)) {
    setNotice(`${value} 已經在清單裡。`, true);
    input.select();
    return;
  }

  state[type].push(value);
  input.value = "";
  saveAll();
  render();
  setNotice(`已新增${value}。`);
  input.focus();
}

function removeItem(type, item) {
  const hiddenType = getHiddenType(type);

  state[type] = state[type].filter((currentItem) => currentItem !== item);
  state[hiddenType] = state[hiddenType].filter((currentItem) => currentItem !== item);
  saveAll();
  render();
  setNotice(`已刪除${item}。`);
}

function toggleHidden(type, item) {
  const hiddenType = getHiddenType(type);
  const isHidden = state[hiddenType].includes(item);

  state[hiddenType] = isHidden
    ? state[hiddenType].filter((currentItem) => currentItem !== item)
    : [...state[hiddenType], item];

  saveAll();
  render();
  setNotice(isHidden ? `已恢復${item}，可以被隨機抽到。` : `已隱藏${item}，暫時不會被隨機抽到。`);
}

function getHiddenType(type) {
  return type === "bases" ? "hiddenBases" : "hiddenToppings";
}

function render() {
  pruneHiddenItems();
  renderList("bases", elements.baseList);
  renderList("toppings", elements.toppingList);
  elements.baseCount.textContent = formatCount(state.bases, state.hiddenBases);
  elements.toppingCount.textContent = formatCount(state.toppings, state.hiddenToppings);
  normalizeComboCount();
}

function pruneHiddenItems() {
  state.hiddenBases = state.hiddenBases.filter((item) => state.bases.includes(item));
  state.hiddenToppings = state.hiddenToppings.filter((item) => state.toppings.includes(item));
}

function formatCount(items, hiddenItems) {
  const visibleCount = getVisibleItems(items, hiddenItems).length;
  return hiddenItems.length ? `${visibleCount}/${items.length}` : String(items.length);
}

function renderList(type, target) {
  const hiddenType = getHiddenType(type);

  target.replaceChildren();

  state[type].forEach((item) => {
    const isHidden = state[hiddenType].includes(item);
    const chip = document.createElement("span");
    chip.className = isHidden ? "chip is-hidden" : "chip";

    const name = document.createElement("button");
    name.className = "chip-name";
    name.type = "button";
    name.textContent = item;
    name.setAttribute("aria-pressed", String(isHidden));
    name.setAttribute("aria-label", `${isHidden ? "顯示" : "隱藏"}${item}`);
    name.addEventListener("click", () => toggleHidden(type, item));

    const actions = document.createElement("span");
    actions.className = "chip-actions";

    const removeButton = document.createElement("button");
    removeButton.className = "chip-remove";
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `刪除${item}`);
    removeButton.addEventListener("click", () => removeItem(type, item));

    actions.append(removeButton);
    chip.append(name, actions);
    target.append(chip);
  });
}

function normalizeComboCount() {
  const visibleToppings = getVisibleItems(state.toppings, state.hiddenToppings);
  const maxCount = Math.max(1, visibleToppings.length + 1);
  const parsedValue = Number.parseInt(elements.comboCount.value, 10);
  const safeValue = Number.isFinite(parsedValue) ? parsedValue : 1;
  const normalizedValue = Math.min(Math.max(safeValue, 1), maxCount);

  elements.comboCount.min = "1";
  elements.comboCount.max = String(maxCount);
  elements.comboCount.value = String(normalizedValue);
}

function generateDrink() {
  normalizeComboCount();

  const visibleBases = getVisibleItems(state.bases, state.hiddenBases);
  const visibleToppings = getVisibleItems(state.toppings, state.hiddenToppings);

  if (!visibleBases.length) {
    elements.resultOutput.textContent = "沒有可用茶底";
    setNotice("請至少顯示 1 個茶底。", true);
    return;
  }

  const comboCount = Number.parseInt(elements.comboCount.value, 10);
  const toppingCount = Math.max(0, comboCount - 1);
  const randomBase = pickRandom(visibleBases);
  const randomToppings = shuffle([...visibleToppings]).slice(0, toppingCount);

  elements.resultOutput.textContent = `${randomToppings.join("")}${randomBase}`;
  clearNotice();
}

function getVisibleItems(items, hiddenItems) {
  return items.filter((item) => !hiddenItems.includes(item));
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }

  return items;
}

function setNotice(message, isError = false) {
  elements.notice.textContent = message;
  elements.notice.classList.toggle("error", isError);
}

function clearNotice() {
  setNotice("");
}
