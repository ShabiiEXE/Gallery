export function icon(name) {
  return icons[name] || "";
}

const icons = {
  settings: `
    <svg class="settings-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.8 3.7h4.4l.42 2.1c.45.16.87.4 1.25.7l2.02-.68 2.2 3.82-1.6 1.42c.04.31.04.57 0 .88l1.6 1.42-2.2 3.82-2.02-.68c-.38.3-.8.54-1.25.7l-.42 2.1H9.8l-.42-2.1a5.3 5.3 0 0 1-1.25-.7l-2.02.68-2.2-3.82 1.6-1.42a4.1 4.1 0 0 1 0-.88l-1.6-1.42 2.2-3.82 2.02.68c.38-.3.8-.54 1.25-.7l.42-2.1Z"></path>
      <circle cx="12" cy="12" r="2.65"></circle>
    </svg>
  `,
  pencil: `
    <svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path>
      <path d="M13.5 6.5l4 4"></path>
    </svg>
  `,
  plus: `
    <svg class="plus-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14"></path>
      <path d="M5 12h14"></path>
    </svg>
  `,
  search: `
    <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5"></circle>
      <path d="m16 16 4 4"></path>
    </svg>
  `,
  close: `
    <svg class="close-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 6.5l11 11"></path>
      <path d="M17.5 6.5l-11 11"></path>
    </svg>
  `,
  trash: `
    <svg class="trash-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18"></path>
      <path d="M8 6V4h8v2"></path>
      <path d="M19 6l-1 14H6L5 6"></path>
      <path d="M10 11v5"></path>
      <path d="M14 11v5"></path>
    </svg>
  `,
  download: `
    <svg class="download-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5v13.5"></path>
      <path d="M6.5 10.5l5.5 5.5 5.5-5.5"></path>
      <path d="M4.5 20.5h15"></path>
    </svg>
  `,
};
