/** Show a readable error over the page (e.g. a broken content file), instead of a blank screen. */
export function showError(err: unknown): void {
  const box = document.getElementById('error')!;
  const pre = document.createElement('pre');
  pre.textContent = `Datadew Valley could not start.\n\n${err instanceof Error ? err.message : String(err)}`;
  box.replaceChildren(pre);
  box.hidden = false;
  console.error(err);
}
