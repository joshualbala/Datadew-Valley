import '@fontsource/jersey-10/400.css';
import { loadContent } from './content/loader';
import { getContent, setContent } from './content/store';
import { startGame } from './game/game';
import { audio } from './game/audio/audioManager';
import { showError } from './ui/errorBox';
import { startSite } from './site/shell';

async function boot(): Promise<void> {
  audio.armUnlock();
  try {
    // Phaser draws text onto a canvas, so the pixel font must be loaded first.
    await document.fonts.load('16px "Jersey 10"');
    setContent(await loadContent());
    audio.setSfxVolume(getContent().audio.sfxVolume);
    audio.setSoundDefs(getContent().audio.sounds);
    const game = startGame('game');
    startSite(game);
    // Development only: lets automated checks reach the game (never included in the built site).
    if (import.meta.env.DEV) (window as unknown as { __datadew: unknown }).__datadew = game;
  } catch (err) {
    showError(err);
  }
}

boot();
