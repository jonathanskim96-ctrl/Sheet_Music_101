/** One open Sheet: the dialog panel, so lower sheets can be made inert while another is on top. */
export interface ModalEntry {
  panel: () => HTMLElement | null;
}

const stack: ModalEntry[] = [];

/** Makes the page and every sheet below the top one unreachable; the top sheet stays live. */
function applyInert(): void {
  const root = document.getElementById('root');
  if (root) root.inert = stack.length > 0;
  stack.forEach((entry, i) => {
    const panel = entry.panel();
    const backdrop = panel?.parentElement;
    if (backdrop) backdrop.inert = i < stack.length - 1;
  });
}

/** Registers a newly opened sheet as the top of the stack; returns the function that removes it. */
export function pushModal(entry: ModalEntry): () => void {
  stack.push(entry);
  applyInert();
  return () => {
    const index = stack.indexOf(entry);
    if (index >= 0) stack.splice(index, 1);
    const backdrop = entry.panel()?.parentElement;
    if (backdrop) backdrop.inert = false;
    applyInert();
  };
}

/** True when this sheet is the topmost open one, so only it reacts to Escape. */
export function isTopModal(entry: ModalEntry): boolean {
  return stack[stack.length - 1] === entry;
}
