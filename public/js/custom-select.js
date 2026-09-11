export function syncFlagSelect(select, languages) {
  if (!select) return;
  select.classList.add("native-flag-select");
  let control = select.nextElementSibling;
  if (!control?.classList?.contains("platform-logo-select")) {
    control = document.createElement("div");
    control.className = "platform-logo-select flag-logo-select";
    select.insertAdjacentElement("afterend", control);
  }

  const options = [...select.options]
    .filter((option) => !option.disabled && !option.hidden)
    .map((option) => ({
      value: option.value,
      label: option.textContent.trim(),
      image: option.dataset.image || "",
      selected: option.selected,
    }));
  const selected = options.find((option) => option.selected) || options[0] || { value: "", label: "" };

  control.innerHTML = `
    <button class="platform-logo-button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="${escapeHtml(selected.label)}">
      ${choiceMarkup(selected, languages)}
    </button>
    <div class="platform-logo-menu" role="listbox">
      ${options.map((option) => `
        <button class="platform-logo-option ${option.selected ? "is-selected" : ""}" type="button" role="option" aria-selected="${option.selected ? "true" : "false"}" data-value="${escapeHtml(option.value)}">
          ${choiceMarkup(option, languages)}
        </button>
      `).join("")}
    </div>
  `;

  const button = control.querySelector(".platform-logo-button");
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldOpen = !control.classList.contains("is-open");
    closeFlagSelects(control);
    control.classList.toggle("is-open", shouldOpen);
    button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  });

  control.querySelectorAll(".platform-logo-option").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      select.value = option.dataset.value || "";
      closeFlagSelects();
      select.dispatchEvent(new Event("change", { bubbles: true }));
      requestAnimationFrame(() => syncFlagSelect(select, languages));
    });
  });

  control.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeFlagSelects();
    button.focus();
  });
}

export function syncSetSelect(select) {
  if (!select) return;
  select.classList.add("native-flag-select");
  let control = select.nextElementSibling;
  if (!control?.classList?.contains("platform-logo-select")) {
    control = document.createElement("div");
    control.className = "platform-logo-select set-logo-select";
    select.insertAdjacentElement("afterend", control);
  }

  const options = [...select.options]
    .filter((option) => !option.disabled && !option.hidden)
    .map((option) => ({
      value: option.value,
      label: option.textContent.trim(),
      icon: option.dataset.icon || "",
      selected: option.selected,
    }));
  const selected = options.find((option) => option.selected) || options[0] || { value: "", label: "All sets", icon: "" };

  control.innerHTML = `
    <button class="platform-logo-button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="${escapeHtml(selected.label)}">
      ${setChoiceMarkup(selected)}
    </button>
    <div class="platform-logo-menu" role="listbox">
      ${options.map((option) => `
        <button class="platform-logo-option ${option.selected ? "is-selected" : ""}" type="button" role="option" aria-selected="${option.selected ? "true" : "false"}" data-value="${escapeHtml(option.value)}">
          ${setChoiceMarkup(option)}
        </button>
      `).join("")}
    </div>
  `;

  const button = control.querySelector(".platform-logo-button");
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldOpen = !control.classList.contains("is-open");
    closeFlagSelects(control);
    control.classList.toggle("is-open", shouldOpen);
    button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  });

  control.querySelectorAll(".platform-logo-option").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      select.value = option.dataset.value || "";
      closeFlagSelects();
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      requestAnimationFrame(() => syncSetSelect(select));
    });
  });

  control.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeFlagSelects();
    button.focus();
  });
}

export function syncCustomSelect(select) {
  if (!select) return;
  select.classList.add("native-flag-select");
  let control = select.nextElementSibling;
  if (!control?.classList?.contains("platform-logo-select")) {
    control = document.createElement("div");
    control.className = "platform-logo-select basic-logo-select";
    select.insertAdjacentElement("afterend", control);
  }

  const options = [...select.options]
    .filter((option) => !option.disabled && !option.hidden)
    .map((option) => ({
      value: option.value,
      label: option.textContent.trim(),
      selected: option.selected,
    }));
  const selected = options.find((option) => option.selected) || options[0] || { value: "", label: "" };

  control.innerHTML = `
    <button class="platform-logo-button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="${escapeHtml(selected.label)}">
      ${basicChoiceMarkup(selected)}
    </button>
    <div class="platform-logo-menu" role="listbox">
      ${options.map((option) => `
        <button class="platform-logo-option ${option.selected ? "is-selected" : ""}" type="button" role="option" aria-selected="${option.selected ? "true" : "false"}" data-value="${escapeHtml(option.value)}">
          ${basicChoiceMarkup(option)}
        </button>
      `).join("")}
    </div>
  `;

  bindCustomControl(select, control, () => syncCustomSelect(select));
}

export function closeFlagSelects(except = null) {
  document.querySelectorAll(".platform-logo-select.is-open").forEach((control) => {
    if (except && control === except) return;
    control.classList.remove("is-open");
    control.querySelector(".platform-logo-button")?.setAttribute("aria-expanded", "false");
  });
}

function choiceMarkup(option, languages) {
  const language = languages.find((item) => item.value === option.value);
  const flag = language?.flag || "us";
  const label = option.label || language?.label || option.value;
  return `
    <span class="platform-logo-choice">
      <span class="platform-logo-choice-icon"><img src="assets/flags/${escapeHtml(flag)}.svg" alt=""></span>
      <span class="platform-logo-choice-label">${escapeHtml(label)}</span>
    </span>
  `;
}

function setChoiceMarkup(option) {
  const icon = setIconUrl(option.icon);
  return `
    <span class="platform-logo-choice">
      <span class="platform-logo-choice-icon">${icon ? `<img src="${escapeHtml(icon)}" alt="">` : ""}</span>
      <span class="platform-logo-choice-label">${escapeHtml(option.label || option.value || "All sets")}</span>
    </span>
  `;
}

function basicChoiceMarkup(option) {
  return `
    <span class="platform-logo-choice">
      ${option.image ? `<span class="platform-logo-choice-thumb"><img src="${escapeHtml(option.image)}" alt=""></span>` : ""}
      <span class="platform-logo-choice-label">${escapeHtml(option.label || option.value)}</span>
    </span>
  `;
}

function bindCustomControl(select, control, sync) {
  const button = control.querySelector(".platform-logo-button");
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldOpen = !control.classList.contains("is-open");
    closeFlagSelects(control);
    control.classList.toggle("is-open", shouldOpen);
    button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  });

  control.querySelectorAll(".platform-logo-option").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      select.value = option.dataset.value || "";
      closeFlagSelects();
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      requestAnimationFrame(sync);
    });
  });

  control.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeFlagSelects();
    button.focus();
  });
}

function setIconUrl(code) {
  const normalized = String(code || "").trim().toLowerCase();
  if (!normalized) return "";
  const iconCode = normalized === "sld" || normalized.includes("secret lair") ? "star" : normalized;
  return `https://svgs.scryfall.io/sets/${encodeURIComponent(iconCode)}.svg`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
