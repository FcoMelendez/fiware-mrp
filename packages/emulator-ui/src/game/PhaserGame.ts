import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.ts';
import { FactoryScene } from './scenes/FactoryScene.ts';
import { FactorySceneEnhanced } from './scenes/FactorySceneEnhanced.ts';

export function createPhaserGame(parent: string): Phaser.Game {
  const container = document.getElementById(parent);
  const w = container?.clientWidth  || 800;
  const h = container?.clientHeight || 600;

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: w,
    height: h,
    backgroundColor: '#f1f5f9',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NONE,
    },
    scene: [BootScene, FactoryScene, FactorySceneEnhanced],
    audio: { noAudio: true },
  });
}
