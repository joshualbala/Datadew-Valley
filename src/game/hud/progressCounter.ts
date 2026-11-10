import Phaser from 'phaser';
import { getContent } from '../../content/store';
import { progress } from '../../state/progress';
import { FONT } from '../constants';
import { CREAM_TEXT, WOOD, WOOD_DARK, WOOD_LIGHT } from '../ui/theme';

/**
 * Everything that counts toward completion: hotspots on all loaded maps plus
 * HUD widgets (portrait, noise). New entries in the JSON raise the total automatically.
 */
export function completionIds(): string[] {
  const content = getContent();
  const onMaps = Object.values(content.maps).flatMap((map) =>
    map.hotspots.filter((h) => h.countsTowardCompletion).map((h) => h.id),
  );
  const onHud = content.hud.widgets.filter((w) => w.countsTowardCompletion).map((w) => w.id);
  return [...onMaps, ...onHud];
}

/** "x / N read" in a small wooden sign, fixed to the screen at (x, y). */
export function addProgressCounter(scene: Phaser.Scene, depth: number, x = 20, y = 36): () => void {
  const template = getContent().ui.map.progress;
  const text = scene.add
    .text(0, 0, '', { fontFamily: FONT, fontSize: '30px', color: CREAM_TEXT, stroke: '#5b3a1e', strokeThickness: 4 })
    .setOrigin(0, 0.5);
  const bg = scene.add.graphics();
  scene.add.container(x, y, [bg, text]).setDepth(depth).setScrollFactor(0);

  const refresh = () => {
    const ids = completionIds();
    const read = progress.readIds();
    text.setText(template.replace('{read}', String(ids.filter((id) => read.has(id)).length)).replace('{total}', String(ids.length)));
    text.setX(14);
    const w = text.width + 28;
    bg.clear();
    bg.fillStyle(WOOD_DARK).fillRect(-4, -26, w + 8, 52);
    bg.fillStyle(WOOD).fillRect(0, -22, w, 44);
    bg.fillStyle(WOOD_LIGHT).fillRect(0, -22, w, 4);
  };
  refresh();
  const unsubscribe = progress.onChange(refresh);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  return refresh;
}
