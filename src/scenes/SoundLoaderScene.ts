import Phaser from 'phaser';
import { audio, queueAudio } from '../core/audio';

/**
 * Fetches the sound in the background, in a scene of its own that outlives
 * every other scene.
 *
 * Sound used to ride in the title's loader with the art, which meant Begin
 * waited for 2.7 MB of audio the player had not asked for yet — on a phone on
 * mobile data that was most of a minute of a button that did nothing. And a
 * scene's loader dies with the scene, so it could not simply be left running
 * behind the title either. This scene draws nothing and takes no input; it is
 * launched once the art is in and stops itself when the sound is.
 */
export class SoundLoaderScene extends Phaser.Scene {
  constructor() {
    super('SoundLoader');
  }

  create(): void {
    this.input.enabled = false;
    if (!queueAudio(this)) {
      this.scene.stop();
      return;
    }
    this.load.on(Phaser.Loader.Events.FILE_COMPLETE, (key: string) => audio.arrived(key));
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.scene.stop());
    this.load.start();
  }
}
