import { getContent } from '../content/store';
import { audio } from '../game/audio/audioManager';
import { renderBlock } from './blocks';

/**
 * The pop-up window: an HTML panel (wood frame, parchment) laid over the game
 * canvas. Any trigger (a "!" on the map, a HUD button, a flow step) opens a
 * pop-up by its id in public/content/popups.json.
 */

let layer: HTMLDivElement | null = null;
let open: { close: () => void } | null = null;

export function isPopupOpen(): boolean {
  return open !== null;
}

/** Show pop-up `id`; resolves when the player presses Continue (or Enter / Space / Esc). */
export function openPopup(id: string): Promise<void> {
  const popup = getContent().popups.popups[id];
  if (!popup) {
    console.warn(`No pop-up "${id}" in popups.json`);
    return Promise.resolve();
  }
  open?.close();
  const root = ensureLayer();

  const backdrop = document.createElement('div');
  backdrop.className = 'popup-backdrop';

  const panel = document.createElement('section');
  panel.className = 'popup';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'popup-title');

  const title = document.createElement('h2');
  title.className = 'popup-title';
  title.id = 'popup-title';
  title.textContent = popup.title;

  const body = document.createElement('div');
  body.className = 'popup-body';
  const cleanups: (() => void)[] = [];
  body.append(...popup.body.map((block) => renderBlock(block, { onClose: (fn) => cleanups.push(fn) })));

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'popup-continue';
  button.textContent = popup.button ?? getContent().ui.popup.continueButton;

  panel.append(title, body, button);
  root.replaceChildren(backdrop, panel);
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add('is-open'));
  const previousFocus = document.activeElement as HTMLElement | null;
  button.focus({ preventScroll: true });
  audio.sfx('open');

  return new Promise((resolve) => {
    // Capture-phase listener on window so the game never sees these keys while a pop-up is open.
    const onKey = (e: KeyboardEvent) => {
      // Let Enter/Space work normally on other controls inside the pop-up (e.g. the audio player).
      const onOtherControl = e.target instanceof HTMLElement && panel.contains(e.target) && e.target !== button;
      if (onOtherControl && (e.key === 'Enter' || e.key === ' ')) {
        e.stopImmediatePropagation();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) close();
      } else if (e.key !== 'Tab' && e.key.toLowerCase() !== 'm') {
        e.stopImmediatePropagation(); // e.g. arrows/WASD don't move Alex behind the pop-up
      }
    };
    const close = () => {
      window.removeEventListener('keydown', onKey, true);
      cleanups.forEach((fn) => fn());
      audio.sfx('close');
      open = null;
      root.classList.remove('is-open');
      root.hidden = true;
      root.replaceChildren();
      previousFocus?.focus?.({ preventScroll: true });
      resolve();
    };
    window.addEventListener('keydown', onKey, true);
    button.addEventListener('click', close);
    open = { close };
  });
}

/** One overlay element, kept exactly on top of the game canvas (it scales with it). */
function ensureLayer(): HTMLDivElement {
  if (layer) return layer;
  layer = document.createElement('div');
  layer.className = 'popup-layer';
  layer.hidden = true;
  document.body.append(layer);
  const fit = () => {
    const canvas = document.querySelector<HTMLCanvasElement>('#game canvas');
    if (!canvas || !layer) return;
    const r = canvas.getBoundingClientRect();
    Object.assign(layer.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    layer.style.setProperty('--u', `${r.width / 960}px`); // 1 game pixel in CSS pixels
  };
  fit();
  window.addEventListener('resize', fit);
  new ResizeObserver(fit).observe(document.getElementById('game')!);
  return layer;
}
