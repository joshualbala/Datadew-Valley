import Phaser from 'phaser';
import { StartScene } from './scenes/StartScene';
import { TitleScene } from './scenes/TitleScene';
import { PlaceholderScene } from './scenes/PlaceholderScene';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';

export function startGame(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    pixelArt: true,
    backgroundColor: '#1b1a17',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [StartScene, TitleScene, PlaceholderScene],
  });
}
