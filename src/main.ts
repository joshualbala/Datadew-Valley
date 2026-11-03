import '@fontsource/jersey-10/400.css';
import { loadContent } from './content/loader';
import { setContent } from './content/store';
import { startGame } from './game/game';
import { audio } from './game/audio/audioManager';

function showError(err: unknown): void {
  const box = document.getElementById('error')!;
  const pre = document.createElement('pre');
  pre.textContent = `Datadew Valley could not start.\n\n${err instanceof Error ? err.message : String(err)}`;
  box.replaceChildren(pre);
  box.hidden = false;
  console.error(err);
}

async function boot(): Promise<void> {
  audio.armUnlock();
  try {
    // Phaser draws text onto a canvas, so the pixel font must be loaded first.
    await document.fonts.load('16px "Jersey 10"');
    setContent(await loadContent());
    startGame('game');
  } catch (err) {
    showError(err);
  }
}

boot();
