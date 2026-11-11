import Phaser from 'phaser';
import { StartScene } from './scenes/StartScene';
import { TitleScene } from './scenes/TitleScene';
import { SequenceScene } from './scenes/SequenceScene';
import { CardScene } from './scenes/CardScene';
import { MapScene } from './scenes/MapScene';
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
    // Only clicks on the canvas itself reach the game (not the site header or pop-up buttons laid over it).
    input: { windowEvents: false },
    scene: [StartScene, TitleScene, SequenceScene, CardScene, MapScene],
  });
}
