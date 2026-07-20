const EDITABLE_SELECTOR =
  "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

/**
 * True when a keystroke is going into text entry — a form field, or the
 * command palette's search box. Bare-letter shortcuts must bail out here, or
 * typing "d" in the search field would trigger them.
 */
export function isEditableTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null;
}

/** Leave modified keys to the browser (bookmark, history, word jumps, ...). */
export function hasModifier(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;
}
